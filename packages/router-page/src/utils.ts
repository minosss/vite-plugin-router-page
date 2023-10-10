import type { Options, Page } from './types';
import fastGlob from 'fast-glob';

export function getScanDir(options: Options) {
  const { rootDir, dir, patterns, excludes } = options;

  const scanDir = patterns.map((pattern) => `${rootDir}/${dir}/**/${pattern}`);

  const excludeDirs: string[] = excludes.map((item) => `!${rootDir}/${dir}/**/${item}`);

  return [...scanDir, ...excludeDirs];
}

export function getRouterPageDirs(scanDirs: string[], options: Options): string[] {
  const dirs = fastGlob.sync(scanDirs, {
    ignore: ['node_modules'],
    onlyFiles: true,
    cwd: options.rootDir,
    absolute: true,
  });

  return dirs;
}

const PAGE_DEGREE_SPLIT_MARK = '_';

function getNameFromFilePath(path: string, options: Options) {
  const { rootDir, dir, patterns } = options;

  const prefix = `${rootDir}/${dir}/`;

  let name = path.replace(prefix, '');

  for (const pattern of patterns) {
    const suffix = `/${pattern}`;

    name = name.replace(suffix, '');
    name = name.replaceAll('/', PAGE_DEGREE_SPLIT_MARK);
  }

  return name;
}

function getNamesWithParent(name: string) {
  const names = name.split(PAGE_DEGREE_SPLIT_MARK);

  const namesWithParent: string[] = [];

  for (let i = 1; i <= names.length; i += 1) {
    namesWithParent.push(
      names.slice(0, i).reduce((pre, cur) => pre + PAGE_DEGREE_SPLIT_MARK + cur),
    );
  }

  return namesWithParent;
}

/** 转换需要忽略的目录 */
function transformIgnoreDir(name: string, ignoreDirPrefix: string) {
  let result = name;
  if (name.startsWith(ignoreDirPrefix)) {
    const [, ignoreDir] = name.split(ignoreDirPrefix);

    result = name.replace(ignoreDirPrefix + ignoreDir + PAGE_DEGREE_SPLIT_MARK, '');
  }

  return result;
}

function getModuleStrByGlob(glob: string, options: Options) {
  const { rootDir, dir } = options;
  const prefix = `${rootDir}/${dir}/`;

  const module = `./${glob.replace(prefix, '')}`;

  return module;
}

function getRouteByGlob(glob: string, options: Options) {
  const { rootDir, dir, patterns } = options;
  const prefix = `${rootDir}/${dir}/`;

  const route = glob
    .replace(prefix, '')
    .split('/')
    .filter((v) => !patterns.includes(v) && !v.startsWith('_'))
    .map((v) => v.replace(/^\[(.*?)]$/, ':$1'))
    .join('/');

  return `/${route}`;
}

export function getPages(globs: string[], options: Options): Page[] {
  return [...globs].sort().map((path) => {
    const pagePath = getModuleStrByGlob(path, options);
    const pageRoute = getRouteByGlob(path, options);
    let name = getNameFromFilePath(path, options);
    name = transformIgnoreDir(name, options.ignoreDirPrefix);

    return {
      name,
      dirs: getNamesWithParent(name),
      path: pagePath,
      route: pageRoute,
    };
  });
}
