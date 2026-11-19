package mx.edu.utvt.reportes.servicio;

import mx.edu.utvt.reportes.seguridad.LlaveSecreta;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

/**
 * Genera URL firmadas que caducan, igual que las "signed URLs" de Cloud Storage:
 * el bucket es privado y solo quien recibe la URL de la API puede ver la foto por unos minutos.
 */
@Service
public class UrlFirmadaService {
    private final byte[] llave;
    private final Duration vigencia;

    public UrlFirmadaService(LlaveSecreta llave, @Value("${app.almacenamiento.url-firmada-minutos}") long minutos) {
        this.llave = llave.bytes();
        this.vigencia = Duration.ofMinutes(minutos);
    }

    public record UrlFirmada(String url, Instant expira) { }

    public UrlFirmada firmar(String archivo) {
        Instant expira = Instant.now().plus(vigencia);
        long exp = expira.getEpochSecond();
        String url = ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/api/evidencias/{archivo}")
                .queryParam("exp", exp)
                .queryParam("firma", calcular(archivo, exp))
                .buildAndExpand(archivo)
                .toUriString();
        return new UrlFirmada(url, expira);
    }

    public boolean esValida(String archivo, long exp, String firma) {
        if (firma == null || Instant.now().getEpochSecond() > exp) return false;
        byte[] esperada = calcular(archivo, exp).getBytes(StandardCharsets.US_ASCII);
        return MessageDigest.isEqual(esperada, firma.getBytes(StandardCharsets.US_ASCII));
    }

    private String calcular(String archivo, long exp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(llave, "HmacSHA256"));
            byte[] h = mac.doFinal((archivo + ":" + exp).getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(h);
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo firmar la URL", e);
        }
    }
}
