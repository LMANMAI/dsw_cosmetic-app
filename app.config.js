/**
 * Config dinamica de Expo. Lee app.json y le agrega lo que no se puede expresar
 * de forma estatica.
 *
 * Por que existe este archivo:
 *   El config plugin de @react-native-google-signin necesita `iosUrlScheme`, que
 *   es el iOS Client ID invertido (com.googleusercontent.apps.XXXX). Derivarlo
 *   aca evita mantener el mismo valor en dos lugares y evita agregar el plugin
 *   con un scheme invalido cuando todavia no hay client de iOS: el plugin valida
 *   el formato y tira error en el prebuild.
 *
 * En Android el plugin no hace nada (el modulo se autolinkea y el webClientId se
 * pasa por codigo), asi que solo se agrega cuando hay iosClientId.
 *
 * app.json sigue siendo la fuente de verdad; esto es una capa encima.
 */
const base = require('./app.json');

/** com.googleusercontent.apps.<id> a partir de <id>.apps.googleusercontent.com */
function iosUrlSchemeDesdeClientId(clientId) {
  const sufijo = '.apps.googleusercontent.com';
  if (!clientId.endsWith(sufijo)) return null;
  return `com.googleusercontent.apps.${clientId.slice(0, -sufijo.length)}`;
}

module.exports = () => {
  const expo = { ...base.expo };
  const google = { ...(expo.extra?.google ?? {}) };

  // La env var permite sobreescribir sin tocar el repo (CI, EAS secrets).
  const iosClientId = process.env.GOOGLE_IOS_CLIENT_ID || google.iosClientId || null;
  const webClientId = process.env.GOOGLE_WEB_CLIENT_ID || google.webClientId || null;

  expo.extra = { ...expo.extra, google: { ...google, webClientId, iosClientId } };

  if (iosClientId) {
    const iosUrlScheme = iosUrlSchemeDesdeClientId(iosClientId);
    if (!iosUrlScheme) {
      throw new Error(
        `[app.config] GOOGLE_IOS_CLIENT_ID invalido: "${iosClientId}". ` +
          'Tiene que terminar en .apps.googleusercontent.com',
      );
    }
    expo.plugins = [
      ...(expo.plugins ?? []),
      ['@react-native-google-signin/google-signin', { iosUrlScheme }],
    ];
  }

  return { expo };
};
