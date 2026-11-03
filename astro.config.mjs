// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    server: {
      // The repo lives on the Windows drive but the dev server runs in WSL,
      // which gets no file-change events for edits made from Windows.
      watch: { usePolling: true, interval: 300 },
    },
  },
});