import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@dev-credentials': path.resolve(
          __dirname,
          isProd ? 'src/dev/devCredentials.prod.ts' : 'src/dev/devCredentials.ts'
        ),
        '@dev-supabase': path.resolve(
          __dirname,
          isProd ? 'src/dev/devSupabaseOverride.prod.ts' : 'src/dev/devSupabaseOverride.ts'
        ),
        '@dev-inspector': path.resolve(
          __dirname,
          isProd ? 'src/dev/devInspector.prod.tsx' : 'src/dev/devInspector.tsx'
        ),
        '@dev-quickswitch': path.resolve(
          __dirname,
          isProd ? 'src/dev/devQuickSwitch.prod.tsx' : 'src/dev/devQuickSwitch.tsx'
        ),
        '@dev-logindemo': path.resolve(
          __dirname,
          isProd ? 'src/dev/devLoginDemoAccounts.prod.tsx' : 'src/dev/devLoginDemoAccounts.tsx'
        ),
        '@dev-settings': path.resolve(
          __dirname,
          isProd ? 'src/dev/devSettingsConfig.prod.tsx' : 'src/dev/devSettingsConfig.tsx'
        ),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
