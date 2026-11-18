import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

// ライブラリのビルド。依存パッケージは同梱せず、導入側のバンドラーで解決させる
const external = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)]

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: {
        index: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
        vue: fileURLToPath(new URL('./src/vue/index.ts', import.meta.url)),
        server: fileURLToPath(new URL('./src/server/index.ts', import.meta.url)),
      },
      formats: ['es'],
      cssFileName: 'monawallet-kit',
    },
    rolldownOptions: {
      external: (id) => external.some((dep) => id === dep || id.startsWith(`${dep}/`)),
    },
  },
})
