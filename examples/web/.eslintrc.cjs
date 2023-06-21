module.exports = {
  env: { browser: true, es2020: true },
  extends: [
    '@yme/react',
  ],
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': 'warn',
    'unicorn/no-abusive-eslint-disable': 'off',
  },
};
