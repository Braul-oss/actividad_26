package mx.edu.utvt.reportes.web.dto;

import jakarta.validation.constraints.*;
import mx.edu.utvt.reportes.dominio.EstadoReporte;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Objetos que viajan en JSON entre la app y la API. */
public final class Dtos {
    private Dtos() { }

    public record LoginRequest(
            @NotBlank(message = "El correo es obligatorio.")
            @Email(message = "El correo no tiene un formato válido.")
            @Size(max = 120) String correo,
            @NotBlank(message = "La contraseña es obligatoria.")
            @Size(max = 128) String password) { }

    public record UsuarioDto(Long id, String nombre, String correo, String rol, String rolEtiqueta) { }

    public record LoginResponse(String accessToken, String refreshToken, long expiresIn, String tipo, UsuarioDto usuario) { }

    public record RefreshRequest(@NotBlank @Size(max = 200) String refreshToken) { }

    public record TokenResponse(String accessToken, long expiresIn, String tipo) { }

    public record CategoriaDto(Long id, String nombre, String icono) { }

    public record UbicacionDto(Long id, String edificio, String aula, String nombre) { }

    public record NuevoReporteRequest(
            @NotNull(message = "Selecciona la categoría del problema.") Long idCategoria,
            @NotNull(message = "Selecciona la ubicación.") Long idUbicacion,
            @NotBlank(message = "La descripción es obligatoria.")
            @Size(min = 10, max = 500, message = "La descripción debe tener entre 10 y 500 caracteres.") String descripcion,
            @NotNull(message = "La fecha es obligatoria.")
            @PastOrPresent(message = "La fecha no puede ser futura.") LocalDate fechaRegistro,
            @NotBlank(message = "Falta la clave de idempotencia.")
            @Pattern(regexp = "[A-Za-z0-9-]{8,64}", message = "Clave de idempotencia inválida.") String claveIdempotencia,
            // Coordenadas opcionales: solo llegan si el usuario concedió el permiso de ubicación.
            @DecimalMin(value = "-90", message = "Latitud inválida.")
            @DecimalMax(value = "90", message = "Latitud inválida.") Double latitud,
            @DecimalMin(value = "-180", message = "Longitud inválida.")
            @DecimalMax(value = "180", message = "Longitud inválida.") Double longitud,
            @PositiveOrZero(message = "Precisión inválida.")
            @Max(value = 100000, message = "Precisión inválida.") Double precisionMetros) { }

    public record CambioEstadoRequest(
            @NotNull(message = "Indica el nuevo estado.") EstadoReporte estado,
            @Size(max = 300, message = "El comentario admite máximo 300 caracteres.") String comentario) { }

    public record ReporteCreadoDto(Long id, String folio, String estado, String estadoEtiqueta, Instant fechaRegistroServidor) { }

    public record ReporteResumenDto(Long id, String folio, String categoria, String icono, String ubicacion,
                                    String estado, String estadoEtiqueta, LocalDate fechaRegistro, Instant creadoEn,
                                    String miniaturaUrl, String autor) { }

    public record HistorialDto(String estado, String estadoEtiqueta, String comentario, String responsable, Instant fecha) { }

    public record ReporteDetalleDto(Long id, String folio, String categoria, String icono, String ubicacion,
                                    String descripcion, String estado, String estadoEtiqueta, LocalDate fechaRegistro,
                                    Instant creadoEn, String evidenciaUrl, String autor, List<HistorialDto> historial,
                                    Double latitud, Double longitud, Double precisionMetros, String notaVozUrl) { }

    public record EvidenciaDto(String referencia, String url, Instant expira) { }

    public record Pagina<T>(List<T> contenido, int pagina, int tamano, long totalElementos, int totalPaginas) { }
}
