package mx.edu.utvt.reportes.servicio;

import mx.edu.utvt.reportes.web.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Almacenamiento privado de evidencias. En local usa una carpeta fuera del alcance público;
 * en la nube esta clase se sustituye por un cliente de Google Cloud Storage con la misma interfaz.
 */
@Service
public class AlmacenamientoService {
    public static final long TAMANO_MAXIMO = 5L * 1024 * 1024;
    public static final long TAMANO_MAXIMO_AUDIO = 2L * 1024 * 1024;
    private static final Pattern NOMBRE_VALIDO = Pattern.compile("[0-9a-f\\-]{36}\\.(jpg|png|m4a)");

    private final Path raiz;

    public AlmacenamientoService(@Value("${app.almacenamiento.directorio}") String directorio) throws IOException {
        this.raiz = Path.of(directorio).toAbsolutePath().normalize();
        Files.createDirectories(raiz);
    }

    /** Valida el tipo REAL del archivo (firma de bytes), su tamaño y lo guarda con un nombre aleatorio. */
    public String guardar(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw ApiException.datosInvalidos("No se recibió ninguna fotografía.");
        }
        if (archivo.getSize() > TAMANO_MAXIMO) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "La fotografía supera el tamaño máximo de 5 MB.");
        }
        String extension;
        try (InputStream in = archivo.getInputStream()) {
            byte[] cabecera = in.readNBytes(8);
            extension = detectar(cabecera)
                    .orElseThrow(() -> new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Solo se permiten imágenes JPG o PNG."));
        } catch (IOException e) {
            throw ApiException.datosInvalidos("No fue posible leer la fotografía.");
        }
        return copiar(archivo, extension);
    }

    /** Nota de voz: solo audio M4A/AAC (contenedor MPEG-4, firma "ftyp"), máximo 2 MB. */
    public String guardarAudio(MultipartFile archivo) {
        if (archivo == null || archivo.isEmpty()) {
            throw ApiException.datosInvalidos("No se recibió ninguna nota de voz.");
        }
        if (archivo.getSize() > TAMANO_MAXIMO_AUDIO) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "La nota de voz supera el tamaño máximo de 2 MB.");
        }
        try (InputStream in = archivo.getInputStream()) {
            if (!esM4a(in.readNBytes(8))) {
                throw new ApiException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Solo se permiten notas de voz en formato M4A.");
            }
        } catch (IOException e) {
            throw ApiException.datosInvalidos("No fue posible leer la nota de voz.");
        }
        return copiar(archivo, "m4a");
    }

    private String copiar(MultipartFile archivo, String extension) {
        String nombre = UUID.randomUUID() + "." + extension;
        try (InputStream in = archivo.getInputStream()) {
            Files.copy(in, raiz.resolve(nombre), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo guardar la evidencia", e);
        }
        return nombre;
    }

    static boolean esM4a(byte[] b) {
        return b.length >= 8 && b[4] == 'f' && b[5] == 't' && b[6] == 'y' && b[7] == 'p';
    }

    public Optional<Resource> leer(String nombre) {
        if (nombre == null || !NOMBRE_VALIDO.matcher(nombre).matches()) return Optional.empty();
        Path p = raiz.resolve(nombre).normalize();
        if (!p.startsWith(raiz) || !Files.isRegularFile(p)) return Optional.empty();
        return Optional.of(new FileSystemResource(p));
    }

    public void eliminar(String nombre) {
        leer(nombre).ifPresent(r -> {
            try {
                Files.deleteIfExists(r.getFile().toPath());
            } catch (IOException ignored) {
                // No es crítico: el archivo huérfano no es accesible sin URL firmada.
            }
        });
    }

    static Optional<String> detectar(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) {
            return Optional.of("jpg");
        }
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G'
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A) {
            return Optional.of("png");
        }
        return Optional.empty();
    }
}
