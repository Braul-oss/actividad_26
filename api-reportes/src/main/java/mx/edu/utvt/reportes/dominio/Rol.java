package mx.edu.utvt.reportes.dominio;

public enum Rol {
    ESTUDIANTE("Estudiante"),
    ADMINISTRATIVO("Administrativo"),
    MANTENIMIENTO("Responsable de mantenimiento");

    private final String etiqueta;

    Rol(String etiqueta) { this.etiqueta = etiqueta; }

    public String getEtiqueta() { return etiqueta; }
}
