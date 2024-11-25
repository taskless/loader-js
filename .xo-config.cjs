module.exports = {
  prettier: true,
  space: true,
  nodeVersion: false,
  ignore: ["src/__generated__/**"],
  rules: {
    "@typescript-eslint/naming-convention": "off",
    "@typescript-eslint/no-floating-promises": "off",
    "capitalized-comments": "off",
    complexity: ["error", 30],
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
          "object",
          "type",
        ],
        pathGroups: [
          {
            pattern: "@/**",
            group: "internal",
          },
        ],
        alphabetize: {
          order: "asc",
          caseInsensitive: true,
        },
      },
    ],
    "n/no-process-env": "warn",
    "new-cap": "off",
    "no-template-curly-in-string": "warn",
    "unicorn/filename-case": "off",
    "unicorn/no-array-callback-reference": "off",
    "unicorn/no-array-method-this-argument": "off",
    "unicorn/prevent-abbreviations": [
      "error",
      {
        allowList: {
          args: true,
          env: true,
        },
      },
    ],
  },
  plugins: [],
};
