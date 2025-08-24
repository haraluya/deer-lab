module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
  ],
  ignorePatterns: [
    "/lib/**/*", // Ignore built files.
  ],
  rules: {
    "no-unused-vars": "warn",
    "no-console": "off",
  },
};
