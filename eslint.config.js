import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["android/", "dist/", "node_modules/", "test-results/"] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2023, sourceType: "module" },
    rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }] },
  },
  { files: ["public/js/**/*.js"], languageOptions: { globals: globals.browser } },
  { files: ["public/sw.js"], languageOptions: { sourceType: "script", globals: globals.serviceworker } },
  { files: ["tools/**/*.mjs", "test/**/*.js", "eslint.config.js"], languageOptions: { globals: globals.node } },
  /* e2e tests pass callbacks to page.evaluate(), which run in the browser */
  { files: ["test/e2e/**/*.js"], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
];
