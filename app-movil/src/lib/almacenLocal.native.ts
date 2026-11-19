// Almacenamiento local en SQLite para borradores y la última lista consultada.
import * as SQLite from 'expo-sqlite';

let bd: SQLite.SQLiteDatabase | null = null;

async function abrir(): Promise<SQLite.SQLiteDatabase> {
  if (!bd) {
    bd = await SQLite.openDatabaseAsync('reportes_local.db');
    await bd.execAsync('CREATE TABLE IF NOT EXISTS kv (clave TEXT PRIMARY KEY NOT NULL, valor TEXT NOT NULL);');
  }
  return bd;
}

export async function leerLocal(clave: string): Promise<string | null> {
  const fila = await (await abrir()).getFirstAsync<{ valor: string }>('SELECT valor FROM kv WHERE clave = ?', clave);
  return fila?.valor ?? null;
}

export async function guardarLocal(clave: string, valor: string): Promise<void> {
  await (await abrir()).runAsync('INSERT OR REPLACE INTO kv (clave, valor) VALUES (?, ?)', clave, valor);
}

export async function borrarLocal(clave: string): Promise<void> {
  await (await abrir()).runAsync('DELETE FROM kv WHERE clave = ?', clave);
}
