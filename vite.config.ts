import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// GitHub Pages のサブパス配信に対応するため、base を環境変数から決定する。
// リポジトリ名が「shikounohako」であれば /shikounohako/ となる。
// ローカル開発時は / で動く。
const base = process.env.GH_PAGES_BASE ?? '/shikounohako/'

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
})
