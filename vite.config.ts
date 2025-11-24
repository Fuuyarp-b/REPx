import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
    },
    server: {
      port: 3000,
    },
    define: {
      // Define process.env.API_KEY globally for the client build
      // This allows usage of process.env.API_KEY as required by the @google/genai SDK guidelines
      // We check for both API_KEY (standard) and VITE_API_KEY (Vite convention)
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.VITE_API_KEY),
    }
  };
});