import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseNamespace: "eslint",
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    // `next lint` ignored build output implicitly; running `eslint .` directly
    // does not, so the generated trees have to be excluded explicitly or the
    // bundled output gets linted.
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "node_modules/**",
      "next-env.d.ts",
    ],
  },
  ...compat.config({
    extends: ["next", "next/core-web-vitals", "next/typescript"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  }),
];

export default eslintConfig;