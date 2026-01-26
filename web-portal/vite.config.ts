import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@zeeo/shared': path.resolve(__dirname, '../shared/src'),
        },
    },
    server: {
        port: 3003,
    },
})
