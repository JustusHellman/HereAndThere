
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages deploys to a subfolder (the repo name), so we must set the base path.
  // This ensures assets like /index.js are correctly mapped to /HereAndThere/index.js
  base: '/HereAndThere/',
  define: {
    // We explicitly define only the necessary environment variables.
    // Using JSON.stringify ensures the values are injected as quoted strings in the final bundle.
    'process.env.HERE_AND_THERE_SUPABASE_URL': JSON.stringify(process.env.HERE_AND_THERE_SUPABASE_URL || ''),
    'process.env.HERE_AND_THERE_SUPABASE_ANON_KEY': JSON.stringify(process.env.HERE_AND_THERE_SUPABASE_ANON_KEY || ''),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
