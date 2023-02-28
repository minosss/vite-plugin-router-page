import type {Plugin} from 'vite';
import {writeDeclaration, writeViewComponents} from './generate';
import type {Options} from './types';
import {getNamesFromFilePaths, getNamesWithModule, getRouterPageDirs, getScanDir} from './utils';

const defaultConfig: Options = {
	dir: 'src/pages',
	excludes: ['components'],
	dts: 'src/@types/router-page.d.ts',
	patterns: ['page.vue'],
	ignoreDirPrefix: '_',
	builtinRoute: {
		root: 'root',
		notFound: 'not-found',
	},
	notLazyRoutes: [],
	pagesFormatter: (names) => names,
	rootDir: process.cwd(),
};

/**
 * plugin
 * @description generate router page declaration
 */
function routerPagePlugin(options?: Partial<Options>) {
	const opt = {...defaultConfig, ...options};
	const scanDir = getScanDir(opt);

	const generate = () => {
		const dirs = getRouterPageDirs(scanDir, opt);
		const {names, namesWithFile} = getNamesFromFilePaths(dirs, opt);
		const formatedNames = opt.pagesFormatter(names);
		const formatedNamesWithFile = opt.pagesFormatter(namesWithFile);

		writeDeclaration(formatedNames, formatedNamesWithFile, opt);

		const namesWithModule = getNamesWithModule(dirs, opt);

		writeViewComponents(namesWithModule, opt);
	};

	const plugin: Plugin = {
		name: 'router-page',
		enforce: 'post',
		configResolved(config) {
			opt.rootDir ??= config.root;
		},
		configureServer(server) {
			server.watcher.on('add', () => {
				generate();
			});
			server.watcher.on('unlink', () => {
				generate();
			});
		},
	};

	return plugin;
}

export default routerPagePlugin;

export type {Options};
