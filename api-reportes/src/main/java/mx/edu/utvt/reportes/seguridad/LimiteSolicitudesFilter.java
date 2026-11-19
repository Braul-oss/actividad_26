package mx.edu.utvt.reportes.seguridad;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Limita el número de solicitudes por minuto de cada usuario (o IP si no hay sesión).
 * Evita que alguien sature el servicio enviando cientos de reportes falsos.
 */
public class LimiteSolicitudesFilter extends OncePerRequestFilter {
    private static final Logger bitacora = LoggerFactory.getLogger("BITACORA_SEGURIDAD");

    private final int maxPorMinuto;
    private final Map<String, Ventana> contadores = new ConcurrentHashMap<>();

    private record Ventana(long minuto, AtomicInteger cuenta) { }

    public LimiteSolicitudesFilter(int maxPorMinuto) {
        this.maxPorMinuto = maxPorMinuto;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        String uri = req.getRequestURI();
        return "OPTIONS".equals(req.getMethod()) || uri.startsWith("/api/evidencias/") || uri.startsWith("/api/auth/login");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        String clave = (auth != null && auth.getPrincipal() instanceof UsuarioAutenticado u)
                ? "u:" + u.id() : "ip:" + req.getRemoteAddr();
        long minuto = System.currentTimeMillis() / 60_000;
        Ventana v = contadores.compute(clave, (k, actual) ->
                actual == null || actual.minuto() != minuto ? new Ventana(minuto, new AtomicInteger()) : actual);
        if (v.cuenta().incrementAndGet() > maxPorMinuto) {
            bitacora.warn("Limite de solicitudes excedido clave={} uri={}", clave, req.getRequestURI());
            RespuestaJson.escribir(res, 429, "Demasiadas solicitudes. Intenta de nuevo en un minuto.");
            return;
        }
        chain.doFilter(req, res);
    }
}
