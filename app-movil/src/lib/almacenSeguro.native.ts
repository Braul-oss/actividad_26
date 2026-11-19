// Android: Keystore. iOS: Keychain. El token nunca queda en texto plano.
import * as SecureStore from 'expo-secure-store';

const opciones: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function guardarSeguro(clave: string, valor: string): Promise<void> {
  await SecureStore.setItemAsync(clave, valor, opciones);
}

export async function leerSeguro(clave: string): Promise<string | null> {
  return SecureStore.getItemAsync(clave, opciones);
}

export async function borrarSeguro(clave: string): Promise<void> {
  await SecureStore.deleteItemAsync(clave, opciones);
}
