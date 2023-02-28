# vite-plugin-router-page

Vite 插件，自动根据页面文件生成页面的路由声明文件, 基于 [soybeanjs/vite-plugin-vue-page-route v1.0.3](https://github.com/soybeanjs/vite-plugin-vue-page-route/tree/v1.0.3)

- `views` -> `pages`
- `index.vue` -> `page.vue`
- 加了备注关掉过滤

## 用法

```ts
import {defineConfig} from 'vite';
import routerPage from '@tne/vite-plugin-router-page';

export default defineConfig({
	plugins: [
		routerPage({
			dir: 'src/pages',
			excludes: ['components'],
			dts: 'src/@types/router-page.d.ts',
			patterns: ['page.vue'],
			builtinRoute: {
				root: 'root',
				notFound: 'not-found',
			},
			pagesFormatter: (names) =>
				names.map((name) => {
					/** 系统的内置路由，该文件夹名称不作为RouteKey */
					const SYSTEM_VIEW = 'system-view_';
					return name.replace(SYSTEM_VIEW, '');
				}),
		}),
	],
});
```
