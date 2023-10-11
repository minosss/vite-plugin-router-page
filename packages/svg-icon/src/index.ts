/* eslint-disable @typescript-eslint/no-shadow */
import type { Plugin } from 'vite';
import type { Config } from 'svgo';
import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import Debug from 'debug';
import { optimize } from 'svgo';
import cors from 'cors';
import { normalizePath } from 'vite';
import etag from 'etag';
import {
  SVG_DOM_ID,
  SVG_ICONS_CLIENT,
  SVG_ICONS_REGISTER_NAME,
  XMLNS,
  XMLNS_LINK,
} from './constants';
import { toSymbol } from './utils';

const debug = Debug.debug('vite-plugin-svg-icons');

export type DomInject = 'body-first' | 'body-last';

type OptimizeOptions = Config;

interface ViteSvgIconsPlugin {
  /**
   * icons folder, all svg files in it will be converted to svg sprite.
   */
  iconDirs: string[];

  /**
   * split svg sprite
   */
  splitting?: boolean;

  /**
   * svgo configuration, used to compress svg
   * @default：true
   */
  svgoOptions?: boolean | OptimizeOptions;

  /**
   * icon format
   * @default: icon-[dir]-[name]
   */
  symbolId?: string;

  /**
   * icon format
   * @default: body-last
   */
  inject?: DomInject;

  /**
   * custom dom id
   * @default: __svg__icons__dom__
   */
  customDomId?: string;
}

export function createSvgIconsPlugin(opt?: ViteSvgIconsPlugin): Plugin {
  const cache = new Map<string, any>();

  let isBuild = false;
  const options: Required<ViteSvgIconsPlugin> = {
    iconDirs: [],
    svgoOptions: true,
    symbolId: 'icon-[dir]-[name]',
    inject: 'body-last' as const,
    customDomId: SVG_DOM_ID,
    splitting: false,
    ...opt,
  };

  const { svgoOptions } = options;
  const { symbolId } = options;

  if (!symbolId?.includes('[name]')) {
    throw new Error('SymbolId must contain [name] string!');
  }

  const optimizeOptions = typeof svgoOptions === 'boolean' ? {} : svgoOptions;

  debug('plugin options:', options);

  return {
    name: 'vite:svg-icons',
    configResolved(resolvedConfig) {
      isBuild = resolvedConfig.command === 'build';
    },
    resolveId(id) {
      debug('resolve', id);
      if ([SVG_ICONS_REGISTER_NAME, SVG_ICONS_CLIENT].some((iconId) => id.includes(iconId))) {
        return id.replace('/@id/', '');
      }
      return null;
    },

    async load(id) {
      const isSvgIcons = [SVG_ICONS_REGISTER_NAME, SVG_ICONS_CLIENT].map((iconId) => id.startsWith(iconId));
      if (isSvgIcons.includes(true)) {
        debug('load', id);

        const [isRegister, isClient] = isSvgIcons;

        const { code, idSet } = await createModuleCode(cache, optimizeOptions, options, id);
        if (isRegister) {
          return code;
        }
        if (isClient) {
          return idSet;
        }
      }
    },
    configureServer: ({ middlewares }) => {
      middlewares.use(cors({ origin: '*' }));
      middlewares.use(async (req, res, next) => {
        const url = normalizePath(req.url!);

        const isSvgIcons = [SVG_ICONS_REGISTER_NAME, SVG_ICONS_CLIENT].map((iconId) => url.startsWith(`/@id/${iconId}`));

        if (isSvgIcons.includes(true)) {
          const [isRegister, isClient] = isSvgIcons;

          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-cache');

          debug('loading', url);

          let content = '';
          const { code, idSet } = await createModuleCode(
            cache,
            optimizeOptions,
            options,
            url,
          );

          if (isRegister) {
            content = code;
          } else if (isClient) {
            content = idSet;
          }

          res.setHeader('Etag', etag(content, { weak: true }));
          res.statusCode = 200;
          res.end(content);
        } else {
          next();
        }
      });
    },
  };
}

export async function createModuleCode(
  cache: Map<string, any>,
  svgoOptions: OptimizeOptions,
  options: ViteSvgIconsPlugin,
  source: string,
) {
  debug('create module', source);

  const { splitting, customDomId, inject } = options;
  // sets
  let elementId = customDomId;
  let sets: string[];
  if (splitting && source.includes('?')) {
    // xxx-id?a&b
    const setList = source.split('?').pop();
    sets = setList?.split('&') || [];
    if (sets.length > 1) {
      const isRegister = source.includes(SVG_ICONS_REGISTER_NAME);
      // const isClient = source.includes(SVG_ICONS_CLIENT);
      return {
        code: `${sets.map((s) => `import '/@id/${isRegister ? SVG_ICONS_REGISTER_NAME : SVG_ICONS_CLIENT}?${s}';`).join('\n')}\nexport default {};`,
        idSet: `export default ${JSON.stringify([])}`,
      };
    }
    elementId = `${customDomId}_${sets.join('_')}`;
  }
  const { insertHtml, idSet } = await compilerIcons(cache, svgoOptions, options, sets);
  const code = getInjectCode(elementId, insertHtml, inject);

  return {
    code: `${code}\nexport default {}`,
    idSet: `export default ${JSON.stringify([...idSet])}`,
  };
}

function getInjectCode(elementId: string, content: string, inject: string) {
  const xmlns = `xmlns="${XMLNS}"`;
  const xmlnsLink = `xmlns:xlink="${XMLNS_LINK}"`;
  const html = content
    .replaceAll(new RegExp(xmlns, 'g'), '')
    .replaceAll(new RegExp(xmlnsLink, 'g'), '');
  const code = `
       if (typeof window !== 'undefined') {
         function loadSvg() {
           var body = document.body;
           var svgDom = document.getElementById('${elementId}');
           if(!svgDom) {
             svgDom = document.createElementNS('${XMLNS}', 'svg');
             svgDom.style.position = 'absolute';
             svgDom.style.width = '0';
             svgDom.style.height = '0';
             svgDom.id = '${elementId}';
             svgDom.setAttribute('xmlns','${XMLNS}');
             svgDom.setAttribute('xmlns:link','${XMLNS_LINK}');
           }
           svgDom.innerHTML = ${JSON.stringify(html)};
           ${domInject(inject)}
         }
         if(document.readyState === 'loading') {
           document.addEventListener('DOMContentLoaded', loadSvg);
         } else {
           loadSvg()
         }
      }
        `;
  return code;
}

function domInject(inject = 'body-last') {
  switch (inject) {
    case 'body-first': {
      return 'body.insertBefore(svgDom, body.firstChild);';
    }
    default: {
      return 'body.insertBefore(svgDom, body.lastChild);';
    }
  }
}

/**
  * Preload all icons in advance
  * @param cache
  * @param options
  */
export async function compilerIcons(
  cache: Map<string, any>,
  svgOptions: OptimizeOptions,
  options: ViteSvgIconsPlugin,
  sets?: string[],
) {
  const { iconDirs, splitting } = options;

  if (splitting && iconDirs.length > 1) {
    console.warn(`[@yme/vite-plugin-svg-icon] splitting option recommended to use with only one iconDirs, found ${iconDirs.length}`);
  }

  let insertHtml = '';
  const idSet = new Set<string>();

  let source: string | (string[]) = '**/*.svg';
  let deep = Number.MAX_SAFE_INTEGER;

  if (splitting) {
    if (Array.isArray(sets) && sets.length > 0) {
      source = sets.map((set) => `${set}/**/*.svg`);
    } else {
      deep = 1;
    }
  }

  for (const dir of iconDirs) {
    debug('scan dir with srouce', dir, source);

    const svgFilsStats = fg.sync(source, {
      cwd: dir,
      stats: true,
      absolute: true,
      deep,
    });

    debug(`found ${svgFilsStats.length} icons`);

    for (const entry of svgFilsStats) {
      const { path, stats: { mtimeMs } = {} } = entry;

      const cacheStat = cache.get(path);
      let svgSymbol;
      let symbolId;
      let relativeName = '';

      // eslint-disable-next-line unicorn/consistent-function-scoping
      const getSymbol = async () => {
        relativeName = normalizePath(path).replace(normalizePath(`${dir}/`), '');
        symbolId = createSymbolId(relativeName, options);
        svgSymbol = await compilerIcon(path, symbolId, svgOptions);
        idSet.add(symbolId);
      };

      if (cacheStat) {
        if (cacheStat.mtimeMs === mtimeMs) {
          svgSymbol = cacheStat.code;
          symbolId = cacheStat.symbolId;
          symbolId && idSet.add(symbolId);
        } else {
          await getSymbol();
        }
      } else {
        await getSymbol();
      }

      svgSymbol &&
                cache.set(path, {
                  mtimeMs,
                  relativeName,
                  code: svgSymbol,
                  symbolId,
                });
      insertHtml += `${svgSymbol || ''}`;
    }
  }
  return { insertHtml, idSet };
}

export async function compilerIcon(
  file: string,
  symbolId: string,
  svgOptions: OptimizeOptions,
): Promise<string | null> {
  if (!file) {
    return null;
  }

  let content = await fs.readFile(file, 'utf8');

  if (svgOptions) {
    const { data } = optimize(content, svgOptions);
    content = data || content;
  }

  // fix cannot change svg color  by  parent node problem
  content = content.replace(/stroke="[\d#A-Za-z]*"/, 'stroke="currentColor"');

  return toSymbol(content, symbolId);
}

export function createSymbolId(name: string, options: ViteSvgIconsPlugin) {
  const { symbolId } = options;

  if (!symbolId) {
    return name;
  }

  let id = symbolId;
  let fName = name;

  const { fileName = '', dirName } = discreteDir(name);
  if (symbolId.includes('[dir]')) {
    id = id.replaceAll('[dir]', dirName);
    if (!dirName) {
      id = id.replace('--', '-');
    }
    fName = fileName;
  }
  id = id.replaceAll('[name]', fName);
  return id.replace(path.extname(id), '');
}

export function discreteDir(name: string) {
  if (!normalizePath(name).includes('/')) {
    return {
      fileName: name,
      dirName: '',
    };
  }
  const strList = name.split('/');
  const fileName = strList.pop();
  const dirName = strList.join('-');
  return { fileName, dirName };
}

export function getSetOptions(sets: string[], options: ViteSvgIconsPlugin): ViteSvgIconsPlugin {
  const setParent = options.iconDirs[0];
  const customDomId = `${options.customDomId}_${sets.join('_')}`;

  return {
    ...options,
    customDomId,
    iconDirs: sets.map((set) => path.join(setParent, set)),
  };
}

export default createSvgIconsPlugin;
