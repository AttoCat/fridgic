import { voidSolid } from '@void/solid/plugin';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite-plus';
import { voidPlugin } from 'void';

export default defineConfig({
  plugins: [voidPlugin(), voidSolid()],
  resolve: {
    alias: {
      '@lib': fileURLToPath(new URL('./lib', import.meta.url)),
    },
  },
  fmt: {
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
