package mx.edu.utvt.reportes.web;

import jakarta.validation.Valid;
import mx.edu.utvt.reportes.dominio.EstadoReporte;
import mx.edu.utvt.reportes.seguridad.UsuarioAutenticado;
import mx.edu.utvt.reportes.servicio.ReporteService;
import mx.edu.utvt.reportes.web.dto.Dtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/reportes")
public class ReporteController {
    private final ReporteService servicio;

    public ReporteController(ReporteService servicio) {
        this.servicio = servicio;
    }

    @PostMapping
    public ResponseEntity<ReporteCreadoDto> registrar(@AuthenticationPrincipal UsuarioAutenticado yo,
                                                      @Valid @RequestBody NuevoReporteRequest req) {
        var r = servicio.registrar(yo, req);
        return ResponseEntity.status(r.creado() ? HttpStatus.CREATED : HttpStatus.OK).body(r.reporte());
    }

    @PostMapping(path = "/{id}/evidencia", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public EvidenciaDto evidencia(@AuthenticationPrincipal UsuarioAutenticado yo, @PathVariable Long id,
                                  @RequestPart("archivo") MultipartFile archivo) {
        return servicio.adjuntarEvidencia(yo, id, archivo);
    }

    @PostMapping(path = "/{id}/nota-voz", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public EvidenciaDto notaVoz(@AuthenticationPrincipal UsuarioAutenticado yo, @PathVariable Long id,
                                @RequestPart("archivo") MultipartFile archivo) {
        return servicio.adjuntarNotaVoz(yo, id, archivo);
    }

    @GetMapping("/mis-reportes")
    public Pagina<ReporteResumenDto> misReportes(@AuthenticationPrincipal UsuarioAutenticado yo,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "10") int size,
                                                 @RequestParam(required = false) String estado) {
        return servicio.misReportes(yo, estado(estado), page, size);
    }

    /** Todos los reportes: solo rol de mantenimiento (restringido en SecurityConfig). */
    @GetMapping
    public Pagina<ReporteResumenDto> todos(@RequestParam(defaultValue = "0") int page,
                                           @RequestParam(defaultValue = "10") int size,
                                           @RequestParam(required = false) String estado) {
        return servicio.todos(estado(estado), page, size);
    }

    @GetMapping("/{id}")
    public ReporteDetalleDto detalle(@AuthenticationPrincipal UsuarioAutenticado yo, @PathVariable Long id) {
        return servicio.detalle(yo, id);
    }

    @PatchMapping("/{id}/estado")
    public ReporteDetalleDto cambiarEstado(@AuthenticationPrincipal UsuarioAutenticado yo, @PathVariable Long id,
                                           @Valid @RequestBody CambioEstadoRequest req) {
        return servicio.cambiarEstado(yo, id, req);
    }

    private static EstadoReporte estado(String valor) {
        if (valor == null || valor.isBlank()) return null;
        try {
            return EstadoReporte.valueOf(valor.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw ApiException.datosInvalidos("Estado no válido.");
        }
    }
}
