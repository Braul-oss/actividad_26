package mx.edu.utvt.reportes.web;

import mx.edu.utvt.reportes.servicio.AlmacenamientoService;
import mx.edu.utvt.reportes.servicio.UrlFirmadaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

/** Entrega las fotografías solo si la URL trae una firma válida y vigente. */
@RestController
@RequestMapping("/api/evidencias")
public class EvidenciaController {
    private static final Logger bitacora = LoggerFactory.getLogger("BITACORA_SEGURIDAD");

    private final AlmacenamientoService almacenamiento;
    private final UrlFirmadaService urls;

    public EvidenciaController(AlmacenamientoService almacenamiento, UrlFirmadaService urls) {
        this.almacenamiento = almacenamiento;
        this.urls = urls;
    }

    @GetMapping("/{archivo}")
    public ResponseEntity<Resource> ver(@PathVariable String archivo, @RequestParam long exp,
                                        @RequestParam String firma) {
        if (!urls.esValida(archivo, exp, firma)) {
            bitacora.warn("403 URL de evidencia invalida o caducada archivo={}", archivo);
            throw new ApiException(HttpStatus.FORBIDDEN, "El enlace de la fotografía no es válido o caducó.");
        }
        Resource r = almacenamiento.leer(archivo)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Fotografía no encontrada."));
        MediaType tipo = archivo.endsWith(".png") ? MediaType.IMAGE_PNG
                : archivo.endsWith(".m4a") ? MediaType.parseMediaType("audio/mp4") : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok()
                .contentType(tipo)
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePrivate())
                .header("X-Content-Type-Options", "nosniff")
                .body(r);
    }
}
