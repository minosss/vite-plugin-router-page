import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import routerPage from '@yme/vite-plugin-router-page';
import { createSvgIconsPlugin } from '@yme/vite-plugin-svg-icon';
import Inspect from 'vite-plugin-inspect';

const rootPath = process.cwd();
const srcPath = resolve(rootPath, 'src');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    Inspect(),
    react(),
    routerPage({
      dir: 'src/pages',
      dts: 'src/@types/router-page.d.ts',
      patterns: ['page.tsx'],
      exportRoutePath: true,
    }),
    createSvgIconsPlugin({
      iconDirs: [resolve(srcPath, 'assets/icons')],
      splitting: true,
      symbolId: 'icon-[dir]-[name]',
      inject: 'body-last',
      customDomId: '__SVG_ICON_LOCAL__',
    }),
  ],
});
