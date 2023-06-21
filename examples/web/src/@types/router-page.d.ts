/* eslint-disable */
/* prettier-ignore */
// @ts-nocheck
// Generated by @yme/vite-plugin-router-page
declare namespace RouterPage {
  /** 根路由 */
  type RootRouteKey = 'root';

  /** 未找到路由(捕获无效路径的路由) */
  type NotFoundRouteKey = 'not-found';

  /** 页面路由 */
  type RouteKey =
    | 'about'
    | 'dashboard'
    | 'login'
    | 'system'
    | 'system_permission'
    | 'system_role'
    | 'system_user';

  /** 最后一级路由(该级路有对应的vue文件) */
  type LastDegreeRouteKey = Extract<RouteKey, 'about' | 'dashboard' | 'login' | 'system_permission' | 'system_role' | 'system_user'>
}