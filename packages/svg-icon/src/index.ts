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
      debug('resolvedConfig:', resolvedConfig);
    },
    resolveId(id) {
      if ([SVG_ICONS_REGISTER_NAME, SVG_ICONS_CLIENT].includes(id)) {
        return id;
      }
      return null;
    },

    async load(id, ssr) {
      if (!isBuild && !ssr) return null;

      const isRegister = id.endsWith(SVG_ICONS_REGISTER_NAME);
      const isClient = id.endsWith(SVG_ICONS_CLIENT);

      if (ssr && !isBuild && (isRegister || isClient)) {
        return 'export default {}';
      }

      const { code, idSet } = await createModuleCode(cache, optimizeOptions, options);
      if (isRegister) {
        return code;
      }
      if (isClient) {
        return idSet;
      }
    },
    configureServer: ({ middlewares }) => {
      middlewares.use(cors({ origin: '*' }));
      middlewares.use(async (req, res, next) => {
        const url = normalizePath(req.url!);

        const registerId = `/@id/${SVG_ICONS_REGISTER_NAME}`;
        const clientId = `/@id/${SVG_ICONS_CLIENT}`;
        if ([clientId, registerId].some((item) => url.endsWith(item))) {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-cache');
          const { code, idSet } = await createModuleCode(
            cache,
            optimizeOptions,
            options,
          );
          const content = url.endsWith(registerId) ? code : idSet;

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
) {
  const { insertHtml, idSet } = await compilerIcons(cache, svgoOptions, options);

  const xmlns = `xmlns="${XMLNS}"`;
  const xmlnsLink = `xmlns:xlink="${XMLNS_LINK}"`;
  const html = insertHtml
    .replaceAll(new RegExp(xmlns, 'g'), '')
    .replaceAll(new RegExp(xmlnsLink, 'g'), '');

  const code = `
       if (typeof window !== 'undefined') {
         function loadSvg() {
           var body = document.body;
           var svgDom = document.getElementById('${options.customDomId}');
           if(!svgDom) {
             svgDom = document.createElementNS('${XMLNS}', 'svg');
             svgDom.style.position = 'absolute';
             svgDom.style.width = '0';
             svgDom.style.height = '0';
             svgDom.id = '${options.customDomId}';
             svgDom.setAttribute('xmlns','${XMLNS}');
             svgDom.setAttribute('xmlns:link','${XMLNS_LINK}');
           }
           svgDom.innerHTML = ${JSON.stringify(html)};
           ${domInject(options.inject)}
         }
         if(document.readyState === 'loading') {
           document.addEventListener('DOMContentLoaded', loadSvg);
         } else {
           loadSvg()
         }
      }
        `;
  return {
    code: `${code}\nexport default {}`,
    idSet: `export default ${JSON.stringify([...idSet])}`,
  };
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

// /**
//  * Preload all icons in advance
//  * @param cache
//  * @param options
//  */
export async function compilerIcons(
  cache: Map<string, any>,
  svgOptions: OptimizeOptions,
  options: ViteSvgIconsPlugin,
) {
  const { iconDirs } = options;

  let insertHtml = '';
  const idSet = new Set<string>();

  for (const dir of iconDirs) {
    const svgFilsStats = fg.sync('**/*.svg', {
      cwd: dir,
      stats: true,
      absolute: true,
    });

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
