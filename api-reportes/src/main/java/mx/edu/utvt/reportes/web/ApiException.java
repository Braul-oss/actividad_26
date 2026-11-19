package mx.edu.utvt.reportes.web;

import org.springframework.http.HttpStatus;

/** Error de negocio con un mensaje apto para mostrarse al usuario. */
public class ApiException extends RuntimeException {
    private final HttpStatus estado;

    public ApiException(HttpStatus estado, String mensaje) {
        super(mensaje);
        this.estado = estado;
    }

    public HttpStatus getEstado() {
        return estado;
    }

    public static ApiException noEncontrado() {
        return new ApiException(HttpStatus.NOT_FOUND, "El reporte no existe.");
    }

    public static ApiException prohibido() {
        return new ApiException(HttpStatus.FORBIDDEN, "No tienes permiso para consultar este reporte.");
    }

    public static ApiException datosInvalidos(String mensaje) {
        return new ApiException(HttpStatus.BAD_REQUEST, mensaje);
    }
}
