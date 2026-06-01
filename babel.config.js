module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // react-native-worklets/plugin powers reanimated v4 worklets and MUST be last.
    plugins: ['nativewind/babel', 'react-native-worklets/plugin'],
  };
};
