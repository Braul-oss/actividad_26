// Versión Android/iOS.
import { File } from 'expo-file-system';

export async function leerBytes(uri: string): Promise<Uint8Array> {
  const r = await fetch(uri);
  return new Uint8Array(await r.arrayBuffer());
}

/** En el dispositivo la URI del archivo sigue disponible para el reintento. */
export async function persistirFoto(uri: string): Promise<string> {
  return uri;
}

export async function agregarFoto(form: FormData, uri: string, _mime: string, nombre: string): Promise<void> {
  // Expo SDK 58 reemplaza fetch por expo/fetch, que no acepta partes { uri, name, type } de React Native
  // (lanza "Unsupported FormDataPart implementation" sin llegar a la red). Se adjunta un File de
  // expo-file-system, que expo/fetch lee con bytes(). El servidor valida el tipo por la firma del archivo.
  form.append('archivo', new File(uri) as unknown as Blob, nombre);
}
