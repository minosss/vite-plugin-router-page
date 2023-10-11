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
      // 将第一层目录当作分组导入
      // splitting: true
    }),
  ],
});
```

### How to splitting svg sprite

1. enable `splitting` option in plugin config
2. import svg icons with directory name, e.g. `virtual:svg-icons-register?common`

  ```
  src
    - assets
      - icons
        - common <-- directory name
          - icon.svg
  ```

3. if you enable the `splitting` option, the `virtual:svg-icons-register` will only load svg icons in top-level directories, e.g. `assets/icons/*.svg`
4. otherwise, you can load multiple directories, e.g. `virtual:svg-icons-register?common&info`

### How about the svg components?

planning to support in the future (maybe), it should be like this:

```ts
// type-safe
import { IconLock, IconInfoLicense } from 'virtual:svg-icons-component';

// <IconLock />
// <IconInfoLicense />
```

## License

MIT
