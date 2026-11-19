package mx.edu.utvt.reportes.seguridad;

import mx.edu.utvt.reportes.dominio.Rol;

/** Datos del usuario que se obtienen del token, nunca del cuerpo de la petición. */
public record UsuarioAutenticado(Long id, String correo, String nombre, Rol rol) {
    public boolean esMantenimiento() {
        return rol == Rol.MANTENIMIENTO;
    }
}
