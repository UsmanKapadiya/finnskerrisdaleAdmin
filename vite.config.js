import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    // Serve from "/" on an admin subdomain (recommended) or set VITE_BASE_PATH=/admin/ to host under a path
    base: env.VITE_BASE_PATH || '/',
    server: { port: 5174, strictPort: true },
    preview: { port: 4174 },
    build: { outDir: 'dist', sourcemap: false },
  };
});
