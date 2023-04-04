/**
 * plugin options 【插件配置】
 */
export interface Options {
    /**
     * the directory of the pages.
     *
     * @default 'src/pages'
     */

    dir: string;

    /**
     * the name of the export.
     *
     * @default 'pages'
     */
    exportName: string;

    /**
     * the directories will be excluded.
     *
     * @default ['components']
     */
    excludes: string[];

    /**
     * the declaration file path.
     *
     * @default 'src/@types/router-page.d.ts'
     */
    dts: string;

    /**
     * pattern of the page file name
     *
     * @default ['page.vue']
     */
    patterns: string[];

    /**
     * the prefix of the ignore dir, which will not as the part of route name
     *
     * @default '_'
     */
    ignoreDirPrefix: string;

    /**
     * names of the buildtin routes, which are necessary
     *
     * @default {root: '/', notFound: 'not-found'}
     */
    builtinRoute: {root: string; notFound: string};

    /**
     * the route's components imported directly, not lazy
     *
     * @default []
     */
    notLazyRoutes: string[];

    /**
     * the page names formatter
     */
    pagesFormatter: (names: string[]) => string[];

    /**
     * the root directory of the project
     */
    rootDir?: string;
}

export interface NameWithModule {
    key: string;
    module: string;
}
