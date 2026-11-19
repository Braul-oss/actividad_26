// Validaciones previas al envío. Mejoran la experiencia, pero la API las repite todas.

export const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;
export const DESCRIPCION_MIN = 10;
export const DESCRIPCION_MAX = 500;

export type TipoImagen = 'image/jpeg' | 'image/png';

export type ResultadoFoto =
  | { ok: true; mime: TipoImagen; extension: 'jpg' | 'png'; tamano: number }
  | { ok: false; motivo: string };

function empiezaCon(bytes: Uint8Array, firma: number[]): boolean {
  return firma.every((valor, i) => bytes[i] === valor);
}

/** Revisa la firma de bytes: la extensión o el tipo declarado se pueden falsificar. */
export function detectarTipoReal(bytes: Uint8Array): TipoImagen | null {
  if (empiezaCon(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (empiezaCon(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  return null;
}

export function validarFoto(bytes: Uint8Array): ResultadoFoto {
  if (bytes.length === 0) return { ok: false, motivo: 'La fotografía está vacía.' };
  if (bytes.length > TAMANO_MAXIMO_BYTES) {
    return { ok: false, motivo: `La fotografía pesa ${formatearTamano(bytes.length)}. El máximo es 5 MB.` };
  }
  const mime = detectarTipoReal(bytes);
  if (!mime) return { ok: false, motivo: 'Formato no permitido. Solo se aceptan imágenes JPG o PNG.' };
  return { ok: true, mime, extension: mime === 'image/png' ? 'png' : 'jpg', tamano: bytes.length };
}

export function formatearTamano(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function hoyISO(): string {
  const d = new Date();
  return aISO(d);
}

export function aISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${dia}`;
}

export type DatosFormulario = {
  idCategoria: number | null;
  idUbicacion: number | null;
  descripcion: string;
  fechaRegistro: string;
};

export type ErroresFormulario = Partial<Record<keyof DatosFormulario, string>>;

export function validarReporte(
  datos: DatosFormulario,
  categoriasValidas: number[],
  ubicacionesValidas: number[],
): ErroresFormulario {
  const errores: ErroresFormulario = {};
  if (datos.idCategoria == null) errores.idCategoria = 'Selecciona la categoría del problema.';
  else if (categoriasValidas.length && !categoriasValidas.includes(datos.idCategoria)) {
    errores.idCategoria = 'La categoría no pertenece al catálogo.';
  }
  if (datos.idUbicacion == null) errores.idUbicacion = 'Selecciona el edificio y el aula.';
  else if (ubicacionesValidas.length && !ubicacionesValidas.includes(datos.idUbicacion)) {
    errores.idUbicacion = 'La ubicación no pertenece al catálogo.';
  }
  const texto = datos.descripcion.trim();
  if (texto.length === 0) errores.descripcion = 'La descripción es obligatoria.';
  else if (texto.length < DESCRIPCION_MIN || texto.length > DESCRIPCION_MAX) {
    errores.descripcion = `La descripción debe tener entre ${DESCRIPCION_MIN} y ${DESCRIPCION_MAX} caracteres.`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaRegistro)) errores.fechaRegistro = 'La fecha no es válida.';
  else if (datos.fechaRegistro > hoyISO()) errores.fechaRegistro = 'La fecha no puede ser futura.';
  return errores;
}
