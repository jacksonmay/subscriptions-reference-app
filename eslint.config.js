import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import testingLibrary from 'eslint-plugin-testing-library';
import jestDom from 'eslint-plugin-jest-dom';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser,
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.jest, // Jest global declarations
        shopify: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      'testing-library': testingLibrary,
      'jest-dom': jestDom,
    },
    rules: {
      // Recommended rule presets:
      ...tsPlugin.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...testingLibrary.configs.react.rules,
      ...jestDom.configs.recommended.rules, // Jest-dom recommended rules

      // eslint core
      'no-empty-function': 'off',

      // jest-dom customizations
      'jest-dom/prefer-to-have-value': 'warn',

      // react
      'react/react-in-jsx-scope': 'off',
      'react/no-unknown-property': 'warn',
      'react/prop-types': 'warn',
      'react/display-name': 'warn',

      // @typescript-eslint
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',

      // jsx-a11y
      'jsx-a11y/label-has-associated-control': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-autofocus': 'warn',

      // testing-library
      'testing-library/no-node-access': 'warn',
      'testing-library/await-async-events': 'warn',
      'testing-library/prefer-presence-queries': 'warn',
      'testing-library/no-dom-import': 'warn',
      'testing-library/no-await-sync-events': [
        'error',
        {
          eventModules: ['fire-event'],
        },
      ],
    },
    settings: {
      react: {
        version: 'detect',
      },
      jest: {
        version: 'latest',
      },
    },
  },
  prettierConfig,
  {
    ignores: [
      'node_modules/',
      'build/',
      'public/build/',
      'shopify-app-remix/',
      '*.yml',
      '.shopify/',
      'types/*.generated.d.ts',
      'extensions/*/dist/',
      'extensions/*/types/*.generated.d.ts',
    ],
  },
];
