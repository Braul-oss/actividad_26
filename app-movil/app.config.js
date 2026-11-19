// La configuración principal (incluidos los permisos) está en app.json.
// Este archivo solo agrega un ajuste para el APK de PRUEBAS en el emulador: la API local
// corre en http://10.0.2.2:8095 y Android bloquea HTTP sin cifrar en compilaciones release.
// El perfil de producción de eas.json no define PERMITIR_HTTP_LOCAL, así que ese APK/AAB
// solo puede comunicarse por HTTPS.
module.exports = ({ config }) => {
  if (process.env.PERMITIR_HTTP_LOCAL !== '1') return config;
  return {
    ...config,
    plugins: [...config.plugins, ['expo-build-properties', { android: { usesCleartextTraffic: true } }]],
  };
};
