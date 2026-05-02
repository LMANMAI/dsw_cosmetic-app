module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@': './src',
          },
        },
      ],
      // En Expo SDK 54 / Reanimated 4, el plugin se llama 'react-native-worklets/plugin'.
      // Debe ir SIEMPRE último.
      'react-native-worklets/plugin',
    ],
  };
};
