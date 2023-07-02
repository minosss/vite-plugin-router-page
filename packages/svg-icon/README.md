# vite-plugin-svg-icon

[![NPM Version](https://img.shields.io/npm/v/@yme/vite-plugin-svg-icon)](https://www.npmjs.com/package/@yme/vite-plugin-svg-icon)
[![NPM Downloads](https://img.shields.io/npm/dm/@yme/vite-plugin-svg-icon)](https://www.npmjs.com/package/@yme/vite-plugin-svg-icon)

A vite plugin for generating svg sprite, based on [vite-plugin-svg-icons](https://github.com/vbenjs/vite-plugin-svg-icons)

## Install

```sh
pnpm add @yme/vite-plugin-svg-icon -D
```

## Usage

```ts
import {defineConfig} from 'vite';
import {createSvgIconsPlugin} from '@yme/vite-plugin-svg-icon';

export default defineConfig({
  plugins: [
    createSvgIconsPlugin({
      // 指定需要转换的目录
      iconDirs: [path.resolve(process.cwd(), 'src/assets/icons')],
      // 指定symbolId格式
      symbolId: 'icon-[dir]-[name]',
    }),
  ],
});
```
