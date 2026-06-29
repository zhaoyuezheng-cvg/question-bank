import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

// https://vite.dev/config/server-options.html
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'shared': resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      // 如果浏览器通过 IP 或远程访问，去掉下面这行的注释并改为实际地址
      // clientPort: 5173,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
