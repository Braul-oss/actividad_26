package mx.edu.utvt.reportes.seguridad;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

/**
 * Llave del servidor para firmar tokens JWT y URL de evidencias.
 * Se lee de la variable de entorno JWT_SECRET (Secret Manager en la nube).
 * Nunca forma parte del código de la aplicación móvil.
 */
@Component
public class LlaveSecreta {
    private static final Logger log = LoggerFactory.getLogger(LlaveSecreta.class);

    private final byte[] bytes;

    public LlaveSecreta(@Value("${app.jwt.secreto:}") String secreto) {
        if (secreto == null || secreto.length() < 32) {
            log.warn("JWT_SECRET no definido o muy corto: se genera una llave aleatoria (las sesiones se pierden al reiniciar).");
            this.bytes = new byte[48];
            new SecureRandom().nextBytes(this.bytes);
        } else {
            this.bytes = secreto.getBytes(StandardCharsets.UTF_8);
        }
    }

    public SecretKey jwt() {
        return new SecretKeySpec(bytes, "HmacSHA256");
    }

    public byte[] bytes() {
        return bytes.clone();
    }
}
