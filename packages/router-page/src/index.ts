import type { Plugin } from 'vite';
import type { Options } from './types';
import { writeDeclaration, writeViewComponents } from './generate';
import { getPages, getRouterPageDirs, getScanDir } from './utils';

const defaultConfig: Options = {
  dir: 'src/pages',
  exportName: 'pages',
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
  exportRoutePath: false,
};

/**
 * plugin
 * @description generate router page declaration
 */
function routerPagePlugin(options?: Partial<Options>) {
  const opt = { ...defaultConfig, ...options };
  let scanDir: string[] = [];

  const generate = () => {
    const globs = getRouterPageDirs(scanDir, opt);
    const pages = getPages(globs, opt);

    writeDeclaration(pages, opt);
    writeViewComponents(pages, opt);
  };

  const plugin: Plugin = {
    name: 'router-page',
    enforce: 'post',
    configResolved(config) {
      opt.rootDir ??= config.root;
      scanDir = getScanDir(opt);
      generate();
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

export { type Options } from './types';
