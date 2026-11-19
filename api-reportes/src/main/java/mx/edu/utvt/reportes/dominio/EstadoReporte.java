package mx.edu.utvt.reportes.dominio;

public enum EstadoReporte {
    PENDIENTE("Pendiente"),
    EN_REVISION("En revisión"),
    ATENDIDO("Atendido"),
    CERRADO("Cerrado");

    private final String etiqueta;

    EstadoReporte(String etiqueta) { this.etiqueta = etiqueta; }

    public String getEtiqueta() { return etiqueta; }
}
