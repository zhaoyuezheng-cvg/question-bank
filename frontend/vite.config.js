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
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    'echarts': ['echarts'],
                    'vendor': ['vue', 'vue-router', 'pinia'],
                    'markdown': ['markdown-it', 'katex'],
                },
            },
        },
        chunkSizeWarningLimit: 600,
    },
});
