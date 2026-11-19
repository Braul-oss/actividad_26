package mx.edu.utvt.reportes.repositorio;

import mx.edu.utvt.reportes.dominio.EstadoReporte;
import mx.edu.utvt.reportes.dominio.Reporte;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ReporteRepository extends JpaRepository<Reporte, Long> {
    Page<Reporte> findByUsuarioId(Long usuarioId, Pageable pageable);

    Page<Reporte> findByUsuarioIdAndEstado(Long usuarioId, EstadoReporte estado, Pageable pageable);

    Page<Reporte> findByEstado(EstadoReporte estado, Pageable pageable);

    Optional<Reporte> findByUsuarioIdAndClaveIdempotencia(Long usuarioId, String clave);
}
