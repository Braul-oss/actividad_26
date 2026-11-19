import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  borrarSesion,
  guardarSesion,
  leerUsuarioGuardado,
  obtenerRefresh,
  registrarAlExpirar,
  solicitar,
  solicitarPublico,
  Usuario,
} from './api';
import { borrarCacheListas } from './reportes';

type LoginRespuesta = { accessToken: string; refreshToken: string; expiresIn: number; usuario: Usuario };

type Sesion = {
  cargando: boolean;
  usuario: Usuario | null;
  avisoSesion: string | null;
  iniciarSesion: (correo: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

const Contexto = createContext<Sesion | null>(null);

export function SesionProvider({ children }: { children: ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [avisoSesion, setAvisoSesion] = useState<string | null>(null);

  useEffect(() => {
    leerUsuarioGuardado()
      .then(setUsuario)
      .finally(() => setCargando(false));
  }, []);

  useEffect(() => {
    registrarAlExpirar(() => {
      borrarSesion();
      setUsuario(null);
      setAvisoSesion('Tu sesión expiró. Inicia sesión de nuevo.');
    });
    return () => registrarAlExpirar(null);
  }, []);

  const iniciarSesion = useCallback(async (correo: string, password: string) => {
    const r = await solicitarPublico<LoginRespuesta>('/api/auth/login', { correo: correo.trim(), password });
    await guardarSesion(r);
    setAvisoSesion(null);
    setUsuario(r.usuario);
  }, []);

  const cerrarSesion = useCallback(async () => {
    const refreshToken = await obtenerRefresh();
    try {
      await solicitar('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
    } catch {
      // Aunque el servicio no responda, la sesión se elimina del teléfono.
    }
    if (usuario) await borrarCacheListas(usuario.id);
    await borrarSesion();
    setUsuario(null);
  }, [usuario]);

  const valor = useMemo(
    () => ({ cargando, usuario, avisoSesion, iniciarSesion, cerrarSesion }),
    [cargando, usuario, avisoSesion, iniciarSesion, cerrarSesion],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSesion(): Sesion {
  const s = useContext(Contexto);
  if (!s) throw new Error('useSesion debe usarse dentro de SesionProvider');
  return s;
}

export const esMantenimiento = (u: Usuario | null) => u?.rol === 'MANTENIMIENTO';
