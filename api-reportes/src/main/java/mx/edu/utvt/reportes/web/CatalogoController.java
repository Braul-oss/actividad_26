package mx.edu.utvt.reportes.web;

import mx.edu.utvt.reportes.repositorio.CategoriaRepository;
import mx.edu.utvt.reportes.repositorio.UbicacionRepository;
import mx.edu.utvt.reportes.web.dto.Dtos.CategoriaDto;
import mx.edu.utvt.reportes.web.dto.Dtos.UbicacionDto;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class CatalogoController {
    private final CategoriaRepository categorias;
    private final UbicacionRepository ubicaciones;

    public CatalogoController(CategoriaRepository categorias, UbicacionRepository ubicaciones) {
        this.categorias = categorias;
        this.ubicaciones = ubicaciones;
    }

    @GetMapping("/catalogos/categorias")
    public List<CategoriaDto> categorias() {
        return categorias.findAll(Sort.by("id")).stream()
                .map(c -> new CategoriaDto(c.getId(), c.getNombre(), c.getIcono())).toList();
    }

    @GetMapping("/catalogos/ubicaciones")
    public List<UbicacionDto> ubicaciones() {
        return ubicaciones.findAll(Sort.by("edificio", "id")).stream()
                .map(u -> new UbicacionDto(u.getId(), u.getEdificio(), u.getAula(), u.getNombre())).toList();
    }

    /** Permite a la app saber si el servicio está disponible. */
    @GetMapping("/salud")
    public Map<String, String> salud() {
        return Map.of("estado", "disponible");
    }
}
