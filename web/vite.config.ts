import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  server: {
    host: true, // 로컬 네트워크(Wi-Fi) 내 휴대폰 접속 허용
    port: 5173,
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
