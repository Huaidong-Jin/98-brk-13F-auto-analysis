import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Forbid hardcoded hex in class names (e.g. text-[#18181B]). Use design tokens.
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/\\[#[0-9A-Fa-f]{3,8}\\]/]",
          message: "Do not use arbitrary hex in Tailwind (e.g. text-[#xxx]). Use design tokens from tailwind.config.",
        },
      ],
    },
  },
];

export default eslintConfig;
