import { useEffect, useRef, useState } from 'react';
import { useNetworkState } from 'expo-network';
import { leerPendientes, Pendiente, sincronizarPendientes, suscribirPendientes } from './reportes';

type Oyente = (folios: string[]) => void;
const oyentesEnvio = new Set<Oyente>();

/** Avisa cuando se enviaron reportes que estaban pendientes. */
export function suscribirEnvios(fn: Oyente) {
  oyentesEnvio.add(fn);
  return () => {
    oyentesEnvio.delete(fn);
  };
}

const ESPERAS_S = [5, 10, 20, 40, 60];

/**
 * Reintenta automáticamente los reportes pendientes: al abrir la app, al recuperar la red y
 * con intervalos cada vez más largos para no saturar el servidor cuando se recupere.
 */
export function useSincronizador(usuarioId: number | null) {
  const red = useNetworkState();
  const intento = useRef(0);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (usuarioId == null) return;
    let vigente = true;

    const programar = async () => {
      if (temporizador.current) clearTimeout(temporizador.current);
      const pendientes = await leerPendientes(usuarioId);
      if (!vigente || pendientes.length === 0) {
        intento.current = 0;
        return;
      }
      const espera = ESPERAS_S[Math.min(intento.current, ESPERAS_S.length - 1)];
      temporizador.current = setTimeout(ejecutar, espera * 1000);
    };

    const ejecutar = async () => {
      temporizador.current = null;
      if (!vigente) return;
      const r = await sincronizarPendientes(usuarioId);
      if (r.enviados.length) oyentesEnvio.forEach((fn) => fn(r.enviados));
      intento.current = r.restantes > 0 ? intento.current + 1 : 0;
      programar();
    };

    // Al cambiar a "con conexión" se intenta de inmediato.
    if (red.isConnected !== false) {
      intento.current = 0;
      ejecutar();
    }
    const quitar = suscribirPendientes(() => {
      if (!temporizador.current) programar();
    });
    return () => {
      vigente = false;
      quitar();
      if (temporizador.current) clearTimeout(temporizador.current);
      temporizador.current = null;
    };
  }, [usuarioId, red.isConnected]);
}

export function usePendientes(usuarioId: number | null): Pendiente[] {
  const [lista, setLista] = useState<Pendiente[]>([]);
  useEffect(() => {
    if (usuarioId == null) return;
    const cargar = () => leerPendientes(usuarioId).then(setLista);
    cargar();
    return suscribirPendientes(cargar);
  }, [usuarioId]);
  return lista;
}
