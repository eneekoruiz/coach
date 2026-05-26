module.exports = [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    ignores: ['node_modules/**', '.next/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: { '@typescript-eslint': require('@typescript-eslint/eslint-plugin') },
    rules: {},
  },
];
