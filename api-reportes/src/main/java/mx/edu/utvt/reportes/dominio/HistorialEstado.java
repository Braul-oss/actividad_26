package mx.edu.utvt.reportes.dominio;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "historial_estados")
public class HistorialEstado {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "reporte_id")
    private Reporte reporte;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoReporte estado;

    @Column(length = 300)
    private String comentario;

    @Column(nullable = false, length = 120)
    private String responsable;

    @Column(nullable = false)
    private Instant fecha;

    protected HistorialEstado() { }

    public HistorialEstado(Reporte reporte, EstadoReporte estado, String comentario, String responsable) {
        this.reporte = reporte;
        this.estado = estado;
        this.comentario = comentario;
        this.responsable = responsable;
        this.fecha = Instant.now();
    }

    public Long getId() { return id; }
    public EstadoReporte getEstado() { return estado; }
    public String getComentario() { return comentario; }
    public String getResponsable() { return responsable; }
    public Instant getFecha() { return fecha; }
    public void setFecha(Instant fecha) { this.fecha = fecha; }
}
