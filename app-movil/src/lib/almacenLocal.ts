// Versión web del almacenamiento local (borradores y última lista consultada).
// En Android e iOS Metro usa almacenLocal.native.ts, que guarda en SQLite (expo-sqlite).
// No se guardan tokens aquí, solo datos que el usuario necesita sin conexión.

function almacen(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export async function leerLocal(clave: string): Promise<string | null> {
  return almacen()?.getItem(clave) ?? null;
}

export async function guardarLocal(clave: string, valor: string): Promise<void> {
  almacen()?.setItem(clave, valor);
}

export async function borrarLocal(clave: string): Promise<void> {
  almacen()?.removeItem(clave);
}
