import { defineConfig } from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';
import json from '@eslint/json';

export default defineConfig([
  { ignores: ['node_modules/**'] },
  {
    files: ['**/*.json'],
    ignores: ['**/package-lock.json'],
    plugins: { json },
    language: 'json/json',
    extends: ['json/recommended'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      ...js.configs.recommended.rules,
      indent: ['error', 2, { SwitchCase: 1 }],
      quotes: ['error', 'single', { avoidEscape: true }],
      semi: ['error', 'always'],
      'comma-dangle': ['error', 'always-multiline'],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'prefer-const': 'error',
      'object-shorthand': ['error', 'always'],
      'no-unneeded-ternary': 'error',
      'no-nested-ternary': 'error',
      'no-useless-rename': 'error',
      'prefer-arrow-callback': 'error',
      curly: ['error', 'multi-line'],
      'no-console': 'off',
      'no-process-exit': 'off',
      'no-await-in-loop': 'off',
      'no-param-reassign': 'off',
      'no-continue': 'off',
      'max-len': 'off',
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
]);
