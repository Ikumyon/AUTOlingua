import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const restrictedLayers = (...groups) => [
  'error',
  {
    patterns: groups.map((group) => ({
      group: [`**/${group}/**`, `@/${group}/**`],
      message: `This layer must not depend on src/${group}.`,
    })),
  },
];

export default defineConfig(
  globalIgnores(['dist/**', 'node_modules/**']),
  {
    files: ['**/*.{js,ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedLayers('application', 'infrastructure', 'ui', 'app'),
    },
  },
  {
    files: ['src/application/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedLayers('infrastructure', 'ui', 'app'),
    },
  },
  {
    files: ['src/infrastructure/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedLayers('ui', 'app'),
    },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedLayers('infrastructure', 'app'),
    },
  },
);
