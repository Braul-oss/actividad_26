package mx.edu.utvt.reportes.servicio;

import mx.edu.utvt.reportes.dominio.*;
import mx.edu.utvt.reportes.repositorio.*;
import mx.edu.utvt.reportes.seguridad.UsuarioAutenticado;
import mx.edu.utvt.reportes.web.ApiException;
import mx.edu.utvt.reportes.web.dto.Dtos.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.time.Year;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;

@Service
public class ReporteService {
    private static final Logger bitacora = LoggerFactory.getLogger("BITACORA_SEGURIDAD");
    private static final ZoneId ZONA = ZoneId.of("America/Mexico_City");

    private final ReporteRepository reportes;
    private final UsuarioRepository usuarios;
    private final CategoriaRepository categorias;
    private final UbicacionRepository ubicaciones;
    private final AlmacenamientoService almacenamiento;
    private final UrlFirmadaService urls;

    public ReporteService(ReporteRepository reportes, UsuarioRepository usuarios, CategoriaRepository categorias,
                          UbicacionRepository ubicaciones, AlmacenamientoService almacenamiento, UrlFirmadaService urls) {
        this.reportes = reportes;
        this.usuarios = usuarios;
        this.categorias = categorias;
        this.ubicaciones = ubicaciones;
        this.almacenamiento = almacenamiento;
        this.urls = urls;
    }

    public record Resultado(ReporteCreadoDto reporte, boolean creado) { }

    /**
     * El autor del reporte se toma del token, nunca del formulario.
     * Si llega dos veces la misma clave de idempotencia se devuelve el reporte ya creado.
     */
    @Transactional
    public Resultado registrar(UsuarioAutenticado yo, NuevoReporteRequest req) {
        var existente = reportes.findByUsuarioIdAndClaveIdempotencia(yo.id(), req.claveIdempotencia());
        if (existente.isPresent()) {
            return new Resultado(aCreado(existente.get()), false);
        }
        String descripcion = limpiar(req.descripcion());
        if (descripcion.length() < 10) {
            throw ApiException.datosInvalidos("La descripción debe tener entre 10 y 500 caracteres.");
        }
        if (req.fechaRegistro().isAfter(LocalDate.now(ZONA))) {
            throw ApiException.datosInvalidos("La fecha no puede ser futura.");
        }
        Categoria categoria = categorias.findById(req.idCategoria())
                .orElseThrow(() -> ApiException.datosInvalidos("La categoría seleccionada no existe."));
        Ubicacion ubicacion = ubicaciones.findById(req.idUbicacion())
                .orElseThrow(() -> ApiException.datosInvalidos("La ubicación seleccionada no existe."));
        Usuario autor = usuarios.getReferenceById(yo.id());
        if ((req.latitud() == null) != (req.longitud() == null)) {
            throw ApiException.datosInvalidos("Las coordenadas deben incluir latitud y longitud.");
        }

        Reporte r = new Reporte(autor, categoria, ubicacion, descripcion, req.fechaRegistro(), req.claveIdempotencia());
        if (req.latitud() != null) r.setCoordenadas(req.latitud(), req.longitud(), req.precisionMetros());
        r.cambiarEstado(EstadoReporte.PENDIENTE, "Reporte registrado desde la aplicación móvil.", yo.nombre());
        reportes.saveAndFlush(r);
        r.setFolio(String.format(Locale.ROOT, "REP-%d-%04d", Year.now(ZONA).getValue(), r.getId()));
        return new Resultado(aCreado(r), true);
    }

    @Transactional
    public EvidenciaDto adjuntarEvidencia(UsuarioAutenticado yo, Long id, MultipartFile archivo) {
        Reporte r = reportes.findById(id).orElseThrow(ApiException::noEncontrado);
        if (!r.getUsuario().getId().equals(yo.id())) {
            bitacora.warn("403 intento de adjuntar evidencia a reporte ajeno usuario={} reporte={}", yo.id(), id);
            throw new ApiException(HttpStatus.FORBIDDEN, "Solo el autor puede adjuntar evidencia a este reporte.");
        }
        String anterior = r.getEvidencia();
        String nombre = almacenamiento.guardar(archivo);
        r.setEvidencia(nombre);
        if (anterior != null) almacenamiento.eliminar(anterior);
        var firmada = urls.firmar(nombre);
        return new EvidenciaDto(nombre, firmada.url(), firmada.expira());
    }

    @Transactional
    public EvidenciaDto adjuntarNotaVoz(UsuarioAutenticado yo, Long id, MultipartFile archivo) {
        Reporte r = reportes.findById(id).orElseThrow(ApiException::noEncontrado);
        if (!r.getUsuario().getId().equals(yo.id())) {
            bitacora.warn("403 intento de adjuntar nota de voz a reporte ajeno usuario={} reporte={}", yo.id(), id);
            throw new ApiException(HttpStatus.FORBIDDEN, "Solo el autor puede adjuntar evidencia a este reporte.");
        }
        String anterior = r.getNotaVoz();
        String nombre = almacenamiento.guardarAudio(archivo);
        r.setNotaVoz(nombre);
        if (anterior != null) almacenamiento.eliminar(anterior);
        var firmada = urls.firmar(nombre);
        return new EvidenciaDto(nombre, firmada.url(), firmada.expira());
    }

    @Transactional(readOnly = true)
    public Pagina<ReporteResumenDto> misReportes(UsuarioAutenticado yo, EstadoReporte estado, int pagina, int tamano) {
        Pageable p = paginar(pagina, tamano);
        Page<Reporte> page = estado == null
                ? reportes.findByUsuarioId(yo.id(), p)
                : reportes.findByUsuarioIdAndEstado(yo.id(), estado, p);
        return aPagina(page, false);
    }

    @Transactional(readOnly = true)
    public Pagina<ReporteResumenDto> todos(EstadoReporte estado, int pagina, int tamano) {
        Pageable p = paginar(pagina, tamano);
        Page<Reporte> page = estado == null ? reportes.findAll(p) : reportes.findByEstado(estado, p);
        return aPagina(page, true);
    }

    /** Solo el dueño o el responsable de mantenimiento pueden ver el detalle. */
    @Transactional(readOnly = true)
    public ReporteDetalleDto detalle(UsuarioAutenticado yo, Long id) {
        Reporte r = reportes.findById(id).orElseThrow(ApiException::noEncontrado);
        if (!yo.esMantenimiento() && !r.getUsuario().getId().equals(yo.id())) {
            bitacora.warn("403 intento de acceso a reporte ajeno usuario={} reporte={} duenio={}",
                    yo.id(), id, r.getUsuario().getId());
            throw ApiException.prohibido();
        }
        return aDetalle(r);
    }

    @Transactional
    public ReporteDetalleDto cambiarEstado(UsuarioAutenticado yo, Long id, CambioEstadoRequest req) {
        Reporte r = reportes.findById(id).orElseThrow(ApiException::noEncontrado);
        String comentario = req.comentario() == null ? null : limpiar(req.comentario());
        r.cambiarEstado(req.estado(), comentario == null || comentario.isBlank() ? null : comentario, yo.nombre());
        reportes.flush();
        bitacora.info("Estado actualizado reporte={} estado={} por={}", id, req.estado(), yo.id());
        // Aquí se enviaría la notificación push (Firebase Cloud Messaging) al autor del reporte.
        return aDetalle(r);
    }

    // ----------------------------------------------------------------- utilidades

    /** Quita caracteres de control y espacios sobrantes. El texto se guarda tal cual, nunca se interpreta. */
    static String limpiar(String texto) {
        return texto.replaceAll("[\\p{Cntrl}&&[^\\n]]", "").replaceAll("[ \\t]+", " ").trim();
    }

    private static Pageable paginar(int pagina, int tamano) {
        int p = Math.max(0, pagina);
        int t = Math.min(Math.max(1, tamano), 50);
        return PageRequest.of(p, t, Sort.by(Sort.Direction.DESC, "creadoEn"));
    }

    private Pagina<ReporteResumenDto> aPagina(Page<Reporte> page, boolean conAutor) {
        List<ReporteResumenDto> lista = page.getContent().stream().map(r -> new ReporteResumenDto(
                r.getId(), r.getFolio(), r.getCategoria().getNombre(), r.getCategoria().getIcono(),
                r.getUbicacion().getNombre(), r.getEstado().name(), r.getEstado().getEtiqueta(),
                r.getFechaRegistro(), r.getCreadoEn(), urlDe(r), conAutor ? r.getUsuario().getNombre() : null)).toList();
        return new Pagina<>(lista, page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    private ReporteDetalleDto aDetalle(Reporte r) {
        List<HistorialDto> historial = r.getHistorial().stream().map(h -> new HistorialDto(
                h.getEstado().name(), h.getEstado().getEtiqueta(), h.getComentario(), h.getResponsable(), h.getFecha())).toList();
        return new ReporteDetalleDto(r.getId(), r.getFolio(), r.getCategoria().getNombre(), r.getCategoria().getIcono(),
                r.getUbicacion().getNombre(), r.getDescripcion(), r.getEstado().name(), r.getEstado().getEtiqueta(),
                r.getFechaRegistro(), r.getCreadoEn(), urlDe(r), r.getUsuario().getNombre(), historial,
                r.getLatitud(), r.getLongitud(), r.getPrecisionMetros(),
                r.getNotaVoz() == null ? null : urls.firmar(r.getNotaVoz()).url());
    }

    private ReporteCreadoDto aCreado(Reporte r) {
        return new ReporteCreadoDto(r.getId(), r.getFolio(), r.getEstado().name(), r.getEstado().getEtiqueta(), r.getCreadoEn());
    }

    private String urlDe(Reporte r) {
        return r.getEvidencia() == null ? null : urls.firmar(r.getEvidencia()).url();
    }
}
