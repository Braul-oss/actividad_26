package mx.edu.utvt.reportes.repositorio;

/**
 * Los repositorios usan Spring Data JPA: todas las consultas son parametrizadas,
 * por lo que el texto que envía el usuario nunca se concatena en SQL.
 */
public final class Repositorios {
    private Repositorios() { }
}
