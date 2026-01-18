const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettierPlugin = require('eslint-plugin-prettier');
const unusedImports = require('eslint-plugin-unused-imports');

module.exports = [
  {
    ignores: ['.eslintrc.js'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
      'unused-imports': unusedImports,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettierPlugin.configs.recommended.rules,
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      'max-len': ['warn', { code: 100 }],
      'prettier/prettier': ['error', { printWidth: 85 }],
    },
  },
];
