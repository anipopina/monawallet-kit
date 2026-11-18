import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const src = (path: string) => fileURLToPath(new URL(`../src/${path}`, import.meta.url))

// デモはパッケージ名でライブラリを読み込む（公開APIだけを使うため）。開発中はビルドせずsrcを直接参照する
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [vue()],
  resolve: {
    alias: [
      { find: /^monawallet-kit\/vue$/, replacement: src('vue/index.ts') },
      { find: /^monawallet-kit\/server$/, replacement: src('server/index.ts') },
      { find: /^monawallet-kit$/, replacement: src('index.ts') },
    ],
  },
  server: {
    // スマートフォン等での確認用。Passkeyには安全なコンテキストが必要なため、
    // LAN越しではなく `tailscale serve` などのHTTPS経由（*.ts.net）でアクセスする
    host: true,
    allowedHosts: ['.ts.net'],
  },
  build: {
    outDir: fileURLToPath(new URL('../dist-demo', import.meta.url)),
    emptyOutDir: true,
  },
})
