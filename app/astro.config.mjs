import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  vite: {
    resolve: {
      alias: {
        // Allows components to import from @data/... -> ../../data/...
        '@data': path.resolve(__dirname, 'src/data'),
      },
    },
  },
});
