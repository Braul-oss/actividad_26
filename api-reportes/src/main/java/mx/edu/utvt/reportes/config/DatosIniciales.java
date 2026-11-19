package mx.edu.utvt.reportes.config;

import mx.edu.utvt.reportes.dominio.*;
import mx.edu.utvt.reportes.repositorio.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

/**
 * Carga catálogos y cuentas de prueba la primera vez que arranca la API.
 * La contraseña de las cuentas de prueba se toma de la variable DEMO_PASSWORD.
 */
@Component
public class DatosIniciales implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(DatosIniciales.class);
    private static final ZoneId ZONA = ZoneId.of("America/Mexico_City");

    private final UsuarioRepository usuarios;
    private final CategoriaRepository categorias;
    private final UbicacionRepository ubicaciones;
    private final ReporteRepository reportes;
    private final PasswordEncoder encoder;
    private final String passwordDemo;

    public DatosIniciales(UsuarioRepository usuarios, CategoriaRepository categorias, UbicacionRepository ubicaciones,
                          ReporteRepository reportes, PasswordEncoder encoder,
                          @Value("${DEMO_PASSWORD:Utvt2026!}") String passwordDemo) {
        this.usuarios = usuarios;
        this.categorias = categorias;
        this.ubicaciones = ubicaciones;
        this.reportes = reportes;
        this.encoder = encoder;
        this.passwordDemo = passwordDemo;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (usuarios.count() > 0) return;
        log.info("Base vacía: se cargan catálogos y cuentas de prueba.");

        var computo = categorias.save(new Categoria("Equipo de cómputo", "desktop"));
        var iluminacion = categorias.save(new Categoria("Iluminación", "bulb"));
        var mobiliario = categorias.save(new Categoria("Mobiliario", "chair"));
        var internet = categorias.save(new Categoria("Conexión a internet", "wifi"));
        var electrico = categorias.save(new Categoria("Instalación eléctrica", "flash"));

        var ubic = ubicaciones.saveAll(List.of(
                new Ubicacion("Edificio A", "Aula 101"),
                new Ubicacion("Edificio A", "Aula 102"),
                new Ubicacion("Edificio A", "Laboratorio de cómputo 1"),
                new Ubicacion("Edificio B", "Aula 201"),
                new Ubicacion("Edificio B", "Aula 204"),
                new Ubicacion("Edificio B", "Laboratorio de redes"),
                new Ubicacion("Edificio C", "Biblioteca"),
                new Ubicacion("Edificio C", "Sala de maestros"),
                new Ubicacion("Edificio D", "Auditorio"),
                new Ubicacion("Edificio D", "Cafetería")));

        String hash = encoder.encode(passwordDemo);
        var alumnoA = usuarios.save(new Usuario("Alumno de Prueba", "alumno.prueba@utvt.edu.mx", hash, Rol.ESTUDIANTE));
        var alumnoB = usuarios.save(new Usuario("Alumna Prueba B", "alumna.b@utvt.edu.mx", hash, Rol.ESTUDIANTE));
        var admin = usuarios.save(new Usuario("Personal Administrativo", "administrativo@utvt.edu.mx", hash, Rol.ADMINISTRATIVO));
        usuarios.save(new Usuario("Responsable de Mantenimiento", "mantenimiento@utvt.edu.mx", hash, Rol.MANTENIMIENTO));

        crear(alumnoA, computo, ubic.get(2), "La computadora 12 no enciende; al presionar el botón solo parpadea el led.",
                6, EstadoReporte.EN_REVISION, "Se asignó al técnico de soporte para revisar la fuente de poder.");
        crear(alumnoA, internet, ubic.get(6), "La red Wi-Fi institucional se desconecta cada pocos minutos en la planta alta.",
                2, null, null);
        crear(alumnoB, mobiliario, ubic.get(3), "Dos sillas tienen el respaldo roto y una mesa está floja.",
                4, EstadoReporte.ATENDIDO, "Se reemplazaron las sillas dañadas.");
        crear(admin, electrico, ubic.get(7), "El contacto junto a la ventana está quemado y huele a plástico.",
                1, null, null);
        log.info("Cuentas de prueba creadas: alumno.prueba@utvt.edu.mx, alumna.b@utvt.edu.mx, administrativo@utvt.edu.mx, mantenimiento@utvt.edu.mx");
    }

    private void crear(Usuario autor, Categoria cat, Ubicacion ub, String descripcion, int diasAtras,
                       EstadoReporte siguiente, String comentario) {
        Instant creado = Instant.now().minus(Duration.ofDays(diasAtras)).minus(Duration.ofHours(3));
        Reporte r = new Reporte(autor, cat, ub, descripcion, LocalDate.ofInstant(creado, ZONA), UUID.randomUUID().toString());
        r.setCreadoEn(creado);
        r.cambiarEstado(EstadoReporte.PENDIENTE, "Reporte registrado desde la aplicación móvil.", autor.getNombre())
                .setFecha(creado);
        if (siguiente != null) {
            r.cambiarEstado(siguiente, comentario, "Responsable de Mantenimiento")
                    .setFecha(creado.plus(Duration.ofHours(20)));
        }
        reportes.saveAndFlush(r);
        r.setFolio(String.format("REP-%d-%04d", LocalDate.ofInstant(creado, ZONA).getYear(), r.getId()));
    }
}
