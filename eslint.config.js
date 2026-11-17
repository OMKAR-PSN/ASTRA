// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  {
    ignores: [
      "dist/**",
      ".expo/**",
      "web-build/**",
      "node_modules/**",
      "scripts/**",
    ],
  },
  expoConfig,
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
]);
