package mx.edu.utvt.reportes.repositorio;

import mx.edu.utvt.reportes.dominio.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
}
