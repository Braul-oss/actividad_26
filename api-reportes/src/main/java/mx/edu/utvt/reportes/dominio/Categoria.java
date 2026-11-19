package mx.edu.utvt.reportes.dominio;

import jakarta.persistence.*;

@Entity
@Table(name = "categorias")
public class Categoria {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 60)
    private String nombre;

    /** Nombre del icono que muestra la app. */
    @Column(nullable = false, length = 40)
    private String icono;

    protected Categoria() { }

    public Categoria(String nombre, String icono) {
        this.nombre = nombre;
        this.icono = icono;
    }

    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public String getIcono() { return icono; }
}
