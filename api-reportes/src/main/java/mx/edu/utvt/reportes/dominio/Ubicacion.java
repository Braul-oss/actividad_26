package mx.edu.utvt.reportes.dominio;

import jakarta.persistence.*;

@Entity
@Table(name = "ubicaciones", uniqueConstraints = @UniqueConstraint(columnNames = {"edificio", "aula"}))
public class Ubicacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 60)
    private String edificio;

    @Column(nullable = false, length = 60)
    private String aula;

    protected Ubicacion() { }

    public Ubicacion(String edificio, String aula) {
        this.edificio = edificio;
        this.aula = aula;
    }

    public Long getId() { return id; }
    public String getEdificio() { return edificio; }
    public String getAula() { return aula; }
    public String getNombre() { return edificio + ", " + aula; }
}
