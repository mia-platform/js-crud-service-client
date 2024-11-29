module.exports = {
  ignorePatterns: [".eslintrc.cjs"],
  
  root: true,

  env: { es2022: true },

  extends: [
    "@mia-platform/eslint-config-mia",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/stylistic-type-checked",
  ],

  parser: "@typescript-eslint/parser",

  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    project: ["./tsconfig.json"],
    tsconfigRootDir: __dirname
  },

  plugins: ["import", "@typescript-eslint"], 

  rules: {
    "import/order": [
      "error", 
      {
        groups: [["builtin", "external"]],
        "newlines-between": "always"
      }
    ],
    "sort-imports": 0,

    /**
     * Eslint plugin Typescript
     * @link https://typescript-eslint.io/rules
     */
    "@typescript-eslint/consistent-type-definitions": ["error", "type"],
    "@typescript-eslint/explicit-function-return-type": ["error", {
      allowExpressions: true
    }],
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
      }
    ]
  },

  overrides: [
    {
      files: ["**/*.test.ts"],
      rules: {
        "max-lines": "off",
      }
    }
  ]
}
