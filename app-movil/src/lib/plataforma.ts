// Versión web. En Android e iOS Metro usa plataforma.native.ts.

export async function leerBytes(uri: string): Promise<Uint8Array> {
  const r = await fetch(uri);
  return new Uint8Array(await r.arrayBuffer());
}

/** En web la URI del selector (blob:) se pierde al recargar; se convierte a data: para el borrador. */
export async function persistirFoto(uri: string): Promise<string> {
  if (uri.startsWith('data:')) return uri;
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result));
    lector.onerror = () => reject(lector.error);
    lector.readAsDataURL(blob);
  });
}

export async function agregarFoto(form: FormData, uri: string, mime: string, nombre: string): Promise<void> {
  const blob = await (await fetch(uri)).blob();
  form.append('archivo', new Blob([blob], { type: mime }), nombre);
}
