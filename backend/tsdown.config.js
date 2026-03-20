'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const tsdown_1 = require('tsdown')
exports.default = (0, tsdown_1.defineConfig)({
  entry: ['./src/server.ts', './src/worker.ts'],
  outDir: './dist',
  format: 'esm',
  sourcemap: true,
  clean: true,
  shims: true, // Adds __dirname/__filename shims for ESM
  // Keep native/binary deps external
  external: [
    '@sentry/profiling-node',
    'bcrypt',
    'pg-native',
    '@prisma/client',
    '.prisma/client',
  ],
  // Bundle workspace packages
  noExternal: [/@shared\/.*/],
  plugins: [
    {
      name: 'typescript-transform-paths',
    },
  ],
})
