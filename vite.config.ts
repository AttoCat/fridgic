import { voidSolid } from '@void/solid/plugin';
import { defineConfig } from 'vite-plus';
import { voidPlugin } from 'void';

export default defineConfig({
  plugins: [voidPlugin(), voidSolid()],
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
