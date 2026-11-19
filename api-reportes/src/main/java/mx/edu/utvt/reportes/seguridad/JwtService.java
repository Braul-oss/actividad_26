package mx.edu.utvt.reportes.seguridad;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import mx.edu.utvt.reportes.dominio.Rol;
import mx.edu.utvt.reportes.dominio.Usuario;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;

@Service
public class JwtService {
    private static final String EMISOR = "api-reportes-utvt";

    private final LlaveSecreta llave;
    private final Duration vigencia;

    public JwtService(LlaveSecreta llave, @Value("${app.jwt.access-minutos}") long minutos) {
        this.llave = llave;
        this.vigencia = Duration.ofMinutes(minutos);
    }

    public long segundosDeVigencia() {
        return vigencia.toSeconds();
    }

    public String generar(Usuario u) {
        Instant ahora = Instant.now();
        return Jwts.builder()
                .issuer(EMISOR)
                .subject(String.valueOf(u.getId()))
                .claim("correo", u.getCorreo())
                .claim("nombre", u.getNombre())
                .claim("rol", u.getRol().name())
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(ahora.plus(vigencia)))
                .signWith(llave.jwt())
                .compact();
    }

    /** Valida firma, emisor y vigencia. Si algo falla devuelve vacío. */
    public Optional<UsuarioAutenticado> validar(String token) {
        try {
            Claims c = Jwts.parser()
                    .verifyWith(llave.jwt())
                    .requireIssuer(EMISOR)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Optional.of(new UsuarioAutenticado(
                    Long.valueOf(c.getSubject()),
                    c.get("correo", String.class),
                    c.get("nombre", String.class),
                    Rol.valueOf(c.get("rol", String.class))));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
