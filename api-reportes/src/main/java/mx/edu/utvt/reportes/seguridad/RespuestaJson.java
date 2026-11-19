package mx.edu.utvt.reportes.seguridad;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Escribe errores en JSON con un mensaje genérico, sin detalles internos. */
public final class RespuestaJson {
    private RespuestaJson() { }

    public static void escribir(HttpServletResponse res, int codigo, String mensaje) throws IOException {
        res.setStatus(codigo);
        res.setCharacterEncoding(StandardCharsets.UTF_8.name());
        res.setContentType("application/json");
        String seguro = mensaje.replace("\\", "\\\\").replace("\"", "\\\"");
        res.getWriter().write("{\"codigo\":" + codigo + ",\"error\":\"" + seguro + "\"}");
    }
}
