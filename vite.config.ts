import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // Custom plugin to copy mobile optimizations CSS
    const copyMobileCSS = {
      name: 'copy-mobile-css',
      generateBundle() {
        // Copy mobile-optimizations.css to public folder if it exists
        try {
          copyFileSync('./mobile-optimizations.css', './public/mobile-optimizations.css');
        } catch (error) {
          console.warn('Could not copy mobile-optimizations.css:', error);
        }
      }
    };

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), copyMobileCSS],
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
        // Enable CSS code splitting for better performance
        cssCodeSplit: true,
        
        rollupOptions: {
          // Exclude ex-import directory from processing to avoid Astro file conflicts
          external: [
            // Exclude ex-import files
            /ex-import/,
            // Exclude specific Astro-generated files that cause conflicts
            /Analytics\.astro_astro_type_script_index_0/,
            /Navigation\.astro_astro_type_script_index_0/,
            /Authenticator\.astro_astro_type_script_index_0/
          ],
          output: {
            // Advanced chunk splitting for better caching and loading performance
            manualChunks: (id) => {
              // Split React and related libraries
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              
              // Split AI-related libraries
              if (id.includes('@google/genai') || id.includes('gemini')) {
                return 'ai-vendor';
              }
              
              // Split UI utilities
              if (id.includes('html2canvas') || id.includes('jspdf') || 
                  id.includes('framer-motion') || id.includes('react-intersection-observer')) {
                return 'ui-vendor';
              }
              
              // Split PDF processing libraries
              if (id.includes('pdfjs-dist') || id.includes('react-pdf')) {
                return 'pdf-vendor';
              }
              
              // Split document processing libraries
              if (id.includes('mammoth') || id.includes('xlsx') || 
                  id.includes('crypto-js') || id.includes('axios') ||
                  id.includes('markdown-it')) {
                return 'document-vendor';
              }
              
              // Split utility libraries
              if (id.includes('lodash') || id.includes('date-fns') || 
                  id.includes('clsx') || id.includes('tailwindcss')) {
                return 'utils-vendor';
              }
              
              // Split test frameworks
              if (id.includes('vitest') || id.includes('testing-library')) {
                return 'test-vendor';
              }
              
              // Create feature-based chunks for better caching
              if (id.includes('/components/')) {
                // Split components by feature
                if (id.includes('/shared/')) {
                  return 'shared-components';
                }
                if (id.includes('/Interview') || id.includes('/CV')) {
                  return 'interview-components';
                }
                if (id.includes('/Practice') || id.includes('/Quiz')) {
                  return 'practice-components';
                }
                if (id.includes('/Learning') || id.includes('/Study')) {
                  return 'learning-components';
                }
                return 'app-components';
              }
              
              if (id.includes('/services/')) {
                // Split services by functionality
                if (id.includes('/ai') || id.includes('/provider')) {
                  return 'ai-services';
                }
                if (id.includes('/cache') || id.includes('/history')) {
                  return 'utility-services';
                }
                return 'app-services';
              }
              
              if (id.includes('/utils/')) {
                return 'app-utils';
              }
              
              // Default fallback
              return null;
            },
            
            // Optimize chunk naming for better caching
            chunkFileNames: (chunkInfo) => {
              const facadeModuleId = chunkInfo.facadeModuleId
                ? chunkInfo.facadeModuleId.split('/').pop()?.replace('.tsx', '').replace('.ts', '')
                : chunkInfo.name;
              
              // Use deterministic naming based on chunk content
              if (chunkInfo.name === 'react-vendor') return 'assets/vendor-react-[hash].js';
              if (chunkInfo.name === 'ai-vendor') return 'assets/vendor-ai-[hash].js';
              if (chunkInfo.name === 'ui-vendor') return 'assets/vendor-ui-[hash].js';
              if (chunkInfo.name === 'document-vendor') return 'assets/vendor-docs-[hash].js';
              if (chunkInfo.name === 'utils-vendor') return 'assets/vendor-utils-[hash].js';
              
              // Feature-based chunks
              if (chunkInfo.name?.includes('-components')) {
                return `assets/components/${chunkInfo.name}-[hash].js`;
              }
              if (chunkInfo.name?.includes('-services')) {
                return `assets/services/${chunkInfo.name}-[hash].js`;
              }
              
              return `assets/${facadeModuleId}-[hash].js`;
            },
            
            assetFileNames: (assetInfo) => {
              if (assetInfo.name?.endsWith('.css')) {
                return 'assets/css/[name]-[hash][extname]';
              }
              if (assetInfo.name?.endsWith('.ico') || assetInfo.name?.endsWith('.png') || 
                  assetInfo.name?.endsWith('.jpg') || assetInfo.name?.endsWith('.svg')) {
                return 'assets/images/[name]-[hash][extname]';
              }
              return 'assets/[name]-[hash][extname]';
            },
            
            // Preserve module names for better debugging
            preserveModules: false,
          },
        },
        
        // Build optimization settings
        chunkSizeWarningLimit: 1000, // Increased from default 500
        sourcemap: mode === 'development' ? 'inline' : false, // Use inline sourcemaps in dev
        target: 'esnext',
        minify: 'esbuild',
        // Enable compression for production builds
        minifySizeThreshold: 0,
      },
      
      // Dependency optimization for faster cold starts
      optimizeDeps: {
        include: [
          // Core React ecosystem
          'react',
          'react-dom',
          'react-router-dom',
          
          // HTTP client
          'axios',
          
          // Utilities
          'crypto-js',
          'markdown-it',
          'clsx',
          'tailwindcss',
          
          // Date handling
          'date-fns',
          
          // UI helpers
          'react-intersection-observer',
          'react-use'
        ],
        exclude: [
          // Exclude AI libraries from pre-bundling as they're server-side only
          '@google/genai',
          'gemini-api',
          
          // Exclude large libraries that are used sparingly
          'pdfjs-dist',
          'mammoth',
          'xlsx'
        ],
        force: mode === 'development', // Force rebuild in development
      },
      
      // CSS optimization
      css: {
        // Extract CSS into separate files
        devSourcemap: mode === 'development',
        // PostCSS plugins if needed
        postcss: './postcss.config.js'
      },
      
      // Performance monitoring
      performance: {
        // Show warnings for large chunks
        hints: mode === 'production' ? 'warning' : false,
        // Maximum chunk size
        maxEntrypointSize: 500000, // 500kb
        maxAssetSize: 500000, // 500kb
      },
    };
});
