import {vitePlugin as remix} from '@remix-run/dev';
import {defineConfig} from 'vite';
import type {HmrOptions, UserConfig} from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

if (
  process.env.HOST &&
  (!process.env.SHOPIFY_APP_URL ||
    process.env.SHOPIFY_APP_URL === process.env.HOST)
) {
  process.env.SHOPIFY_APP_URL = process.env.HOST;
  delete process.env.HOST;
}

const host = new URL(process.env.SHOPIFY_APP_URL || 'http://localhost')
  .hostname;

let hmrConfig: HmrOptions;
if (host === 'localhost') {
  hmrConfig = {
    protocol: 'ws',
    host: 'localhost',
    port: 64999,
    clientPort: 64999,
  };
} else {
  hmrConfig = {
    protocol: 'wss',
    host: host,
    port: parseInt(process.env.FRONTEND_PORT!) || 8002,
    clientPort: 443,
  };
}

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
  server: {
    port: Number(process.env.PORT || 3000),
    hmr: hmrConfig,
    fs: {
      // See https://vitejs.dev/config/server-options.html#server-fs-allow for more information
      allow: ['app', 'config/index.ts', 'node_modules'],
      // cachedChecks: false,
    },
  },
  plugins: [
    remix({
      future: {
        unstable_optimizeDeps: true,
        v3_relativeSplatPath: true,
        v3_lazyRouteDiscovery: true,
        v3_routeConfig: true,
        v3_fetcherPersist: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
      },
      ignoredRouteFiles: ['**/.*'],
    }),
    tsconfigPaths({
      projects: [
        './tsconfig.json',
        './extensions/buyer-subscriptions/tsconfig.json',
        './extensions/admin-subs-action/tsconfig.json',
      ],
    }),
  ],
  build: {
    assetsInlineLimit: 0,
    sourcemap: true,
  },
  esbuild: {
    supported: {
      'top-level-await': true,
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      supported: {
        'top-level-await': true,
      },
    },
    include: [
      '@shopify/admin-graphql-api-utilities',
      '@shopify/app-bridge-react',
      '@shopify/shopify-app-remix/react',
      '@shopify/polaris-icons',
      '@shopify/address',
      '@rvf/remix',
      'zod',
      'uuid',
    ],
  },
}) satisfies UserConfig;
