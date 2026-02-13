import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

export default defineConfig({
    plugins: [
        react(),
        dts({ insertTypesEntry: true }),
        {
            name: 'copy-css',
            closeBundle() {
                try {
                    copyFileSync(
                        resolve(__dirname, 'src/styles/loopkit.css'),
                        resolve(__dirname, 'dist/styles.css'),
                    );
                } catch {
                    // CSS file may not exist during first build
                }
            },
        },
    ],
    build: {
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            name: 'LoopKitReact',
            formats: ['es', 'cjs'],
            fileName: 'loopkit-react',
        },
        rollupOptions: {
            external: ['react', 'react-dom', 'react/jsx-runtime'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                    'react/jsx-runtime': 'jsxRuntime',
                },
            },
        },
    },
});
