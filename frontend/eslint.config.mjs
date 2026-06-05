import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  ...nextCoreWebVitals,
  {
    rules: {
      // ── TypeScript Strict ──────────────────────────────────────
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',

      // ── React / Next.js ────────────────────────────────────────
      'react/no-unescaped-entities': 'off',

      // ── General quality ────────────────────────────────────────
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      curly: ['error', 'multi-line'],
    },
  },
  {
    ignores: [
      '.next/',
      'node_modules/',
      'public/',
      'components/ui/',
      '*.config.mjs',
      '*.config.ts',
    ],
  },
];

export default eslintConfig;
