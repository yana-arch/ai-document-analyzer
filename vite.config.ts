import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              // Vendor chunks for large libraries
              'react-vendor': ['react', 'react-dom'],
              'ai-vendor': ['@google/genai'],
              'ui-vendor': ['html2canvas', 'jspdf'],
              'utils-vendor': ['crypto-js', 'axios', 'markdown-it'],
              'pdf-vendor': ['pdfjs-dist', 'react-pdf'],
              'excel-vendor': ['xlsx'],
              'word-vendor': ['mammoth'],
            },
            // Optimize chunk naming for better caching
            chunkFileNames: (chunkInfo) => {
              const facadeModuleId = chunkInfo.facadeModuleId
                ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
                : 'chunk';
              return `assets/${facadeModuleId}-[hash].js`;
            },
            assetFileNames: (assetInfo) => {
              if (assetInfo.name?.endsWith('.css')) {
                return 'assets/css/[name]-[hash][extname]';
              }
              return 'assets/[name]-[hash][extname]';
            },
          },
        },
        // Increase chunk size warning limit
        chunkSizeWarningLimit: 1000,
        // Enable source maps for production debugging
        sourcemap: mode === 'development',
        // Optimize build performance
        target: 'esnext',
        minify: 'esbuild',
      },
      // Optimize dependencies
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'axios',
          'crypto-js',
          'markdown-it'
        ],
        exclude: ['@google/genai'], // Exclude AI libraries from pre-bundling
      },
    };
});
