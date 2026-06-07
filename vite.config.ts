import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const RN_SHIM = path.resolve(__dirname, './src/shared/shims/react-native.js')

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      // game-icons-react uses react-native-svg, which in turn imports
      // `react-native`. We never run on React Native, so we alias both
      // packages to small web shims.
      {
        find: /^react-native-svg$/,
        replacement: path.resolve(__dirname, './src/shared/shims/react-native-svg.jsx'),
      },
      // Match both `react-native` and deep paths like
      // `react-native/Libraries/Utilities/codegenNativeComponent`.
      { find: /^react-native(\/.*)?$/, replacement: RN_SHIM },
    ],
  },
})
