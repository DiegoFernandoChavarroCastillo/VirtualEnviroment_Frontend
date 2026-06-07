import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      {
        find: /^react-native-svg$/,
        replacement: path.resolve(__dirname, './src/shared/shims/react-native-svg.jsx'),
      },
      { find: /^react-native(\/.*)?$/, replacement: path.resolve(__dirname, './src/shared/shims/react-native.js') },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
});
