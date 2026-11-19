package mx.edu.utvt.reportes.seguridad;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Medida adicional de seguridad: tras N intentos fallidos en la ventana de tiempo
 * se bloquea temporalmente la cuenta y la dirección de origen (respuesta 429).
 */
@Service
public class IntentosLoginService {
    private final int maxIntentos;
    private final Duration ventana;
    private final Map<String, Deque<Instant>> fallos = new ConcurrentHashMap<>();

    public IntentosLoginService(@Value("${app.login.max-intentos}") int maxIntentos,
                                @Value("${app.login.ventana-minutos}") long minutos) {
        this.maxIntentos = maxIntentos;
        this.ventana = Duration.ofMinutes(minutos);
    }

    private static String claveCuenta(String correo) {
        return "c:" + (correo == null ? "" : correo.trim().toLowerCase(Locale.ROOT));
    }

    private static String claveIp(String ip) {
        return "ip:" + ip;
    }

    public boolean estaBloqueado(String correo, String ip) {
        return contar(claveCuenta(correo)) >= maxIntentos || contar(claveIp(ip)) >= maxIntentos * 4;
    }

    public void registrarFallo(String correo, String ip) {
        agregar(claveCuenta(correo));
        agregar(claveIp(ip));
    }

    public void limpiar(String correo) {
        fallos.remove(claveCuenta(correo));
    }

    public long minutosParaDesbloqueo(String correo) {
        Deque<Instant> q = fallos.get(claveCuenta(correo));
        if (q == null) return 0;
        synchronized (q) {
            Instant primero = q.peekFirst();
            if (primero == null) return 0;
            long seg = Duration.between(Instant.now(), primero.plus(ventana)).toSeconds();
            return Math.max(1, (seg + 59) / 60);
        }
    }

    private void agregar(String clave) {
        Deque<Instant> q = fallos.computeIfAbsent(clave, k -> new ArrayDeque<>());
        synchronized (q) {
            purgar(q);
            q.addLast(Instant.now());
        }
    }

    private int contar(String clave) {
        Deque<Instant> q = fallos.get(clave);
        if (q == null) return 0;
        synchronized (q) {
            purgar(q);
            return q.size();
        }
    }

    private void purgar(Deque<Instant> q) {
        Instant limite = Instant.now().minus(ventana);
        while (!q.isEmpty() && q.peekFirst().isBefore(limite)) q.pollFirst();
    }
}
