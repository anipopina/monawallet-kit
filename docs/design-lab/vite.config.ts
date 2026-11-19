import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const src = (path: string) => fileURLToPath(new URL(`../../src/${path}`, import.meta.url))
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// デザイン案の比較ページ（参考資料。pnpm design-lab で起動）
export default defineConfig({
  root: here('.'),
  plugins: [vue()],
  resolve: {
    alias: [
      { find: /^monawallet-kit\/vue$/, replacement: src('vue/index.ts') },
      { find: /^monawallet-kit$/, replacement: src('index.ts') },
    ],
  },
  server: { host: true, allowedHosts: ['.ts.net'], port: 5180 },
  build: { rolldownOptions: { input: { index: here('index.html'), frame: here('frame.html') } } },
})
