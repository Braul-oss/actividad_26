package mx.edu.utvt.reportes.dominio;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "reportes", uniqueConstraints =
        @UniqueConstraint(name = "uk_reporte_idempotencia", columnNames = {"usuario_id", "clave_idempotencia"}))
public class Reporte {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, length = 20)
    private String folio;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @ManyToOne(optional = false)
    @JoinColumn(name = "categoria_id")
    private Categoria categoria;

    @ManyToOne(optional = false)
    @JoinColumn(name = "ubicacion_id")
    private Ubicacion ubicacion;

    @Column(nullable = false, length = 500)
    private String descripcion;

    /** Fecha del problema indicada por el usuario (no puede ser futura). */
    @Column(name = "fecha_registro", nullable = false)
    private LocalDate fechaRegistro;

    /** Momento en que el servidor guardó el reporte. */
    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoReporte estado = EstadoReporte.PENDIENTE;

    @Column(name = "clave_idempotencia", nullable = false, length = 64)
    private String claveIdempotencia;

    /** Nombre del archivo en el almacenamiento privado (no es una URL pública). */
    @Column(name = "evidencia", length = 80)
    private String evidencia;

    /** Nota de voz opcional (M4A) en el almacenamiento privado. */
    @Column(name = "nota_voz", length = 80)
    private String notaVoz;

    /** Coordenadas GPS opcionales obtenidas con permiso de ubicación en primer plano. */
    private Double latitud;
    private Double longitud;

    @Column(name = "precision_metros")
    private Double precisionMetros;

    @OneToMany(mappedBy = "reporte", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("fecha ASC")
    private List<HistorialEstado> historial = new ArrayList<>();

    protected Reporte() { }

    public Reporte(Usuario usuario, Categoria categoria, Ubicacion ubicacion, String descripcion,
                   LocalDate fechaRegistro, String claveIdempotencia) {
        this.usuario = usuario;
        this.categoria = categoria;
        this.ubicacion = ubicacion;
        this.descripcion = descripcion;
        this.fechaRegistro = fechaRegistro;
        this.claveIdempotencia = claveIdempotencia;
        this.creadoEn = Instant.now();
    }

    public HistorialEstado cambiarEstado(EstadoReporte nuevo, String comentario, String responsable) {
        this.estado = nuevo;
        HistorialEstado h = new HistorialEstado(this, nuevo, comentario, responsable);
        historial.add(h);
        return h;
    }

    public Long getId() { return id; }
    public String getFolio() { return folio; }
    public void setFolio(String folio) { this.folio = folio; }
    public Usuario getUsuario() { return usuario; }
    public Categoria getCategoria() { return categoria; }
    public Ubicacion getUbicacion() { return ubicacion; }
    public String getDescripcion() { return descripcion; }
    public LocalDate getFechaRegistro() { return fechaRegistro; }
    public Instant getCreadoEn() { return creadoEn; }
    public void setCreadoEn(Instant creadoEn) { this.creadoEn = creadoEn; }
    public EstadoReporte getEstado() { return estado; }
    public String getClaveIdempotencia() { return claveIdempotencia; }
    public String getEvidencia() { return evidencia; }
    public void setEvidencia(String evidencia) { this.evidencia = evidencia; }
    public List<HistorialEstado> getHistorial() { return historial; }
    public String getNotaVoz() { return notaVoz; }
    public void setNotaVoz(String notaVoz) { this.notaVoz = notaVoz; }
    public Double getLatitud() { return latitud; }
    public Double getLongitud() { return longitud; }
    public Double getPrecisionMetros() { return precisionMetros; }

    public void setCoordenadas(Double latitud, Double longitud, Double precisionMetros) {
        this.latitud = latitud;
        this.longitud = longitud;
        this.precisionMetros = precisionMetros;
    }
}
