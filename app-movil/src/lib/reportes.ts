import { randomUUID } from 'expo-crypto';
import { ErrorApi, solicitar } from './api';
import { borrarLocal, guardarLocal, leerLocal } from './almacenLocal';
import { agregarFoto, persistirFoto } from './plataforma';

export type Categoria = { id: number; nombre: string; icono: string };
export type Ubicacion = { id: number; edificio: string; aula: string; nombre: string };

export type ReporteResumen = {
  id: number;
  folio: string;
  categoria: string;
  icono: string;
  ubicacion: string;
  estado: string;
  estadoEtiqueta: string;
  fechaRegistro: string;
  creadoEn: string;
  miniaturaUrl: string | null;
  autor: string | null;
};

export type Historial = { estado: string; estadoEtiqueta: string; comentario: string | null; responsable: string; fecha: string };

export type ReporteDetalle = Omit<ReporteResumen, 'miniaturaUrl' | 'autor'> & {
  descripcion: string;
  evidenciaUrl: string | null;
  autor: string;
  historial: Historial[];
  latitud: number | null;
  longitud: number | null;
  precisionMetros: number | null;
  notaVozUrl: string | null;
};

type Pagina<T> = { contenido: T[]; pagina: number; tamano: number; totalElementos: number; totalPaginas: number };

export type FotoAdjunta = { uri: string; mime: string; extension: string; tamano: number };

/** Nota de voz grabada con el micrófono (M4A/AAC). */
export type NotaVoz = { uri: string; duracionMs: number; tamano: number };

export type Etapa = 'datos' | 'foto' | 'audio';

export type DatosReporte = {
  idCategoria: number;
  idUbicacion: number;
  descripcion: string;
  fechaRegistro: string;
  claveIdempotencia: string;
  /** Solo se envían si el usuario concedió el permiso de ubicación y pulsó "Agregar ubicación". */
  latitud?: number;
  longitud?: number;
  precisionMetros?: number;
};

/** Reporte guardado en el teléfono porque el servicio no estaba disponible. */
export type Pendiente = {
  datos: DatosReporte;
  foto: FotoAdjunta | null;
  nota?: NotaVoz | null;
  categoria: string;
  icono: string;
  ubicacion: string;
  guardadoEn: string;
  /** Si el reporte ya se creó pero faltó subir la foto. */
  idReporte?: number;
  folio?: string;
  intentos: number;
  ultimoError?: string;
};

export type ReporteCreado = { id: number; folio: string; estado: string; estadoEtiqueta: string; fechaRegistroServidor: string };

export const nuevaClaveIdempotencia = () => randomUUID();

// ------------------------------------------------------------------ catálogos

export async function obtenerCatalogos(): Promise<{ categorias: Categoria[]; ubicaciones: Ubicacion[]; desdeCache: boolean }> {
  try {
    const [categorias, ubicaciones] = await Promise.all([
      solicitar<Categoria[]>('/api/catalogos/categorias'),
      solicitar<Ubicacion[]>('/api/catalogos/ubicaciones'),
    ]);
    await guardarLocal('catalogos', JSON.stringify({ categorias, ubicaciones }));
    return { categorias, ubicaciones, desdeCache: false };
  } catch (e) {
    const cache = await leerLocal('catalogos');
    if (e instanceof ErrorApi && e.sinServicio && cache) return { ...JSON.parse(cache), desdeCache: true };
    throw e;
  }
}

// ------------------------------------------------------------------ consulta

export type ResultadoLista = { reportes: ReporteResumen[]; total: number; desdeCache: boolean; actualizado: string };

const claveCache = (usuarioId: number, todos: boolean) => `lista.${todos ? 'todos' : 'mios'}.${usuarioId}`;

export async function listarReportes(usuarioId: number, todos: boolean, estado: string | null): Promise<ResultadoLista> {
  const filtro = estado ? `&estado=${encodeURIComponent(estado)}` : '';
  const ruta = todos ? `/api/reportes?page=0&size=30${filtro}` : `/api/reportes/mis-reportes?page=0&size=30${filtro}`;
  try {
    const p = await solicitar<Pagina<ReporteResumen>>(ruta);
    const resultado = { reportes: p.contenido, total: p.totalElementos, desdeCache: false, actualizado: new Date().toISOString() };
    if (!estado) await guardarLocal(claveCache(usuarioId, todos), JSON.stringify(resultado));
    return resultado;
  } catch (e) {
    if (e instanceof ErrorApi && e.sinServicio) {
      const cache = await leerLocal(claveCache(usuarioId, todos));
      if (cache) {
        const r = JSON.parse(cache) as ResultadoLista;
        const reportes = estado ? r.reportes.filter((x) => x.estado === estado) : r.reportes;
        return { ...r, reportes, desdeCache: true };
      }
    }
    throw e;
  }
}

export async function borrarCacheListas(usuarioId: number) {
  await borrarLocal(claveCache(usuarioId, false));
  await borrarLocal(claveCache(usuarioId, true));
}

export function obtenerDetalle(id: number) {
  return solicitar<ReporteDetalle>(`/api/reportes/${id}`);
}

export function cambiarEstado(id: number, estado: string, comentario: string) {
  return solicitar<ReporteDetalle>(`/api/reportes/${id}/estado`, {
    method: 'PATCH',
    body: JSON.stringify({ estado, comentario: comentario.trim() || null }),
  });
}

// ------------------------------------------------------------------ registro

async function subirFoto(idReporte: number, foto: FotoAdjunta) {
  const form = new FormData();
  await agregarFoto(form, foto.uri, foto.mime, `evidencia.${foto.extension}`);
  return solicitar<{ referencia: string; url: string }>(`/api/reportes/${idReporte}/evidencia`, { method: 'POST', body: form });
}

async function subirNotaVoz(idReporte: number, nota: NotaVoz) {
  const form = new FormData();
  await agregarFoto(form, nota.uri, 'audio/mp4', 'nota-voz.m4a');
  return solicitar<{ referencia: string; url: string }>(`/api/reportes/${idReporte}/nota-voz`, { method: 'POST', body: form });
}

/**
 * Envía el reporte y después la fotografía. La clave de idempotencia evita duplicados si
 * el servidor recibió el reporte pero la respuesta se perdió.
 */
export async function enviarReporte(
  datos: DatosReporte,
  foto: FotoAdjunta | null,
  nota: NotaVoz | null,
  alAvanzar?: (etapa: Etapa) => void,
  yaCreado?: { id: number; folio: string },
): Promise<{ id: number; folio: string }> {
  let creado = yaCreado;
  if (!creado) {
    alAvanzar?.('datos');
    const r = await solicitar<ReporteCreado>('/api/reportes', { method: 'POST', body: JSON.stringify(datos) });
    creado = { id: r.id, folio: r.folio };
  }
  try {
    if (foto) {
      alAvanzar?.('foto');
      await subirFoto(creado.id, foto);
    }
    if (nota) {
      alAvanzar?.('audio');
      await subirNotaVoz(creado.id, nota);
    }
  } catch (e) {
    // El reporte ya existe: se conserva el id para reintentar solo los archivos.
    if (e instanceof ErrorApi) Object.assign(e, { creado });
    throw e;
  }
  return creado;
}

// ------------------------------------------------------------------ pendientes de envío

type Oyente = () => void;
const oyentes = new Set<Oyente>();
export function suscribirPendientes(fn: Oyente) {
  oyentes.add(fn);
  return () => {
    oyentes.delete(fn);
  };
}
const avisar = () => oyentes.forEach((fn) => fn());

const clavePendientes = (usuarioId: number) => `pendientes.${usuarioId}`;

export async function leerPendientes(usuarioId: number): Promise<Pendiente[]> {
  const v = await leerLocal(clavePendientes(usuarioId));
  return v ? (JSON.parse(v) as Pendiente[]) : [];
}

async function escribirPendientes(usuarioId: number, lista: Pendiente[]) {
  await guardarLocal(clavePendientes(usuarioId), JSON.stringify(lista));
  avisar();
}

export async function guardarPendiente(usuarioId: number, p: Omit<Pendiente, 'guardadoEn' | 'intentos'>) {
  const foto = p.foto ? { ...p.foto, uri: await persistirFoto(p.foto.uri) } : null;
  const lista = (await leerPendientes(usuarioId)).filter((x) => x.datos.claveIdempotencia !== p.datos.claveIdempotencia);
  lista.push({ ...p, foto, guardadoEn: new Date().toISOString(), intentos: 0 });
  await escribirPendientes(usuarioId, lista);
}

let sincronizando = false;

/** Intenta enviar los reportes pendientes. Devuelve cuántos se enviaron. */
export async function sincronizarPendientes(usuarioId: number): Promise<{ enviados: string[]; restantes: number }> {
  if (sincronizando) return { enviados: [], restantes: (await leerPendientes(usuarioId)).length };
  sincronizando = true;
  const enviados: string[] = [];
  try {
    const lista = await leerPendientes(usuarioId);
    const restantes: Pendiente[] = [];
    let sinServicio = false;
    for (const p of lista) {
      if (sinServicio) {
        restantes.push(p);
        continue;
      }
      try {
        const yaCreado = p.idReporte && p.folio ? { id: p.idReporte, folio: p.folio } : undefined;
        const r = await enviarReporte(p.datos, p.foto, p.nota ?? null, undefined, yaCreado);
        enviados.push(r.folio);
      } catch (e) {
        const creado = (e as { creado?: { id: number; folio: string } }).creado;
        const actualizado: Pendiente = {
          ...p,
          intentos: p.intentos + 1,
          ultimoError: e instanceof ErrorApi ? e.message : 'Error inesperado',
          ...(creado ? { idReporte: creado.id, folio: creado.folio } : {}),
        };
        if (e instanceof ErrorApi && e.sinServicio) {
          sinServicio = true;
          restantes.push(actualizado);
        } else if (e instanceof ErrorApi && e.codigo === 401) {
          restantes.push(actualizado);
          break;
        } else if (creado) {
          // La foto fue rechazada (formato o tamaño): el reporte ya existe sin ella.
          enviados.push(creado.folio);
        } else {
          restantes.push(actualizado);
        }
      }
    }
    await escribirPendientes(usuarioId, restantes);
    return { enviados, restantes: restantes.length };
  } finally {
    sincronizando = false;
  }
}
