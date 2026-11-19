package mx.edu.utvt.reportes.servicio;

import mx.edu.utvt.reportes.dominio.RefreshToken;
import mx.edu.utvt.reportes.dominio.Usuario;
import mx.edu.utvt.reportes.repositorio.RefreshTokenRepository;
import mx.edu.utvt.reportes.repositorio.UsuarioRepository;
import mx.edu.utvt.reportes.seguridad.IntentosLoginService;
import mx.edu.utvt.reportes.seguridad.JwtService;
import mx.edu.utvt.reportes.web.ApiException;
import mx.edu.utvt.reportes.web.dto.Dtos.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class AuthService {
    private static final Logger bitacora = LoggerFactory.getLogger("BITACORA_SEGURIDAD");
    /** Mismo mensaje para correo inexistente y contraseña errónea: no revela qué cuentas existen. */
    private static final String MENSAJE_FALLO = "Correo o contraseña incorrectos.";

    private final UsuarioRepository usuarios;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final IntentosLoginService intentos;
    private final Duration vigenciaRefresh;
    private final SecureRandom aleatorio = new SecureRandom();
    /** Hash ficticio para que comprobar un correo inexistente tarde lo mismo que uno real. */
    private final String hashFicticio;

    public AuthService(UsuarioRepository usuarios, RefreshTokenRepository refreshTokens, PasswordEncoder encoder,
                       JwtService jwt, IntentosLoginService intentos, @Value("${app.jwt.refresh-dias}") long dias) {
        this.usuarios = usuarios;
        this.refreshTokens = refreshTokens;
        this.encoder = encoder;
        this.jwt = jwt;
        this.intentos = intentos;
        this.vigenciaRefresh = Duration.ofDays(dias);
        this.hashFicticio = encoder.encode("ficticio-" + aleatorio.nextLong());
    }

    @Transactional
    public LoginResponse login(LoginRequest req, String ip) {
        String correo = req.correo().trim();
        if (intentos.estaBloqueado(correo, ip)) {
            bitacora.warn("Login bloqueado por intentos correo={} ip={}", correo, ip);
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Demasiados intentos fallidos. Intenta de nuevo en " + intentos.minutosParaDesbloqueo(correo) + " minutos.");
        }
        Usuario u = usuarios.findByCorreoIgnoreCase(correo).orElse(null);
        boolean ok = encoder.matches(req.password(), u != null ? u.getPasswordHash() : hashFicticio);
        if (u == null || !ok || !u.isActivo()) {
            intentos.registrarFallo(correo, ip);
            bitacora.warn("Login fallido correo={} ip={}", correo, ip);
            throw new ApiException(HttpStatus.UNAUTHORIZED, MENSAJE_FALLO);
        }
        intentos.limpiar(correo);
        bitacora.info("Login correcto usuario={} rol={}", u.getId(), u.getRol());
        return new LoginResponse(jwt.generar(u), emitirRefresh(u), jwt.segundosDeVigencia(), "Bearer", aDto(u));
    }

    @Transactional
    public TokenResponse refrescar(String refreshToken) {
        RefreshToken rt = refreshTokens.findByTokenHash(hash(refreshToken))
                .filter(RefreshToken::esValido)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "La sesión expiró. Inicia sesión de nuevo."));
        return new TokenResponse(jwt.generar(rt.getUsuario()), jwt.segundosDeVigencia(), "Bearer");
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) return;
        refreshTokens.findByTokenHash(hash(refreshToken)).ifPresent(RefreshToken::revocar);
    }

    public static UsuarioDto aDto(Usuario u) {
        return new UsuarioDto(u.getId(), u.getNombre(), u.getCorreo(), u.getRol().name(), u.getRol().getEtiqueta());
    }

    private String emitirRefresh(Usuario u) {
        byte[] b = new byte[32];
        aleatorio.nextBytes(b);
        String valor = Base64.getUrlEncoder().withoutPadding().encodeToString(b);
        refreshTokens.save(new RefreshToken(hash(valor), u, Instant.now().plus(vigenciaRefresh)));
        return valor;
    }

    private static String hash(String valor) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(valor.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
