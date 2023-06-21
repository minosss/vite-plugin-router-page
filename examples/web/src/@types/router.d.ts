declare namespace AppRouter {
  type Component = () => Promise<{
    default: React.ComponentType<any>;
  } & Pick<import('react-router-dom').RouteObject, 'loader' | 'ErrorBoundary'>>;
}
