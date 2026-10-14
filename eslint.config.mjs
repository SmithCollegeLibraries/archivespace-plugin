import js from "@eslint/js";
import globals from "globals";

export default [
  {
    files: ["src/**/*.{js,mjs,cjs}", "scripts/**/*.{js,mjs,cjs}", "test/**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      complexity: ["error", { max: 10 }],
      "max-lines-per-function": ["error", { max: 40, skipBlankLines: true, skipComments: true }],
    },
  },
];
