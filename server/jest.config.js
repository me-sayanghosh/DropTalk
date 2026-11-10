export default {
  testMatch: ['**/tests/**/*.test.[jt]s'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': './ts-transformer.cjs',
  },
  testEnvironment: 'node',
  forceExit: true,
  detectOpenHandles: true,
  testTimeout: 30000,
};
