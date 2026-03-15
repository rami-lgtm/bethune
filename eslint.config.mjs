import tseslint from "typescript-eslint";
import convexPlugin from "@convex-dev/eslint-plugin";

export default tseslint.config(
  {
    ignores: ["convex/_generated/**", "convex/components/**"],
  },
  {
    extends: [...tseslint.configs.recommended],
    files: ["convex/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  ...convexPlugin.configs.recommended,
);
