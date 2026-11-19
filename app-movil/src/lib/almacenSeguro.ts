// Versión web (solo para la demostración en navegador). En Android e iOS Metro usa
// almacenSeguro.native.ts con expo-secure-store. En web se usa sessionStorage: los tokens
// se borran al cerrar la pestaña y nunca se guardan en localStorage.

function almacen(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export async function guardarSeguro(clave: string, valor: string): Promise<void> {
  almacen()?.setItem(clave, valor);
}

export async function leerSeguro(clave: string): Promise<string | null> {
  return almacen()?.getItem(clave) ?? null;
}

export async function borrarSeguro(clave: string): Promise<void> {
  almacen()?.removeItem(clave);
}
