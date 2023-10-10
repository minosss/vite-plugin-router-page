import { createHashRouter, RouterProvider } from 'react-router-dom';
import { pages } from './pages';
import RootLayout from './layout';
import './app.css';

const router = createHashRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      {
        path: '/',
        handle: { title: 'Dashboard (loading 2s)', icon: 'lock' },
        async lazy() {
          const { default: Component, loader } = await pages.dashboard();
          return {
            Component,
            loader,
          };
        },
      },
      {
        path: '/system/user',
        handle: { title: 'User (fail after 1s)', icon: 'license' },
        async lazy() {
          const { default: Component, loader, ErrorBoundary } = await pages.system_user();
          return {
            Component,
            loader,
            ErrorBoundary,
          };
        },
      },
      {
        path: '/about',
        handle: { title: 'About', icon: 'bell' },
        async lazy() {
          const { default: Component } = await pages.about();
          return {
            Component,
          };
        },
      },
    ],
  },
], {
  //
});

const menus = router.routes[0].children?.map((route) => ({
  path: route.path,
  meta: route.handle,
}));

interface SvgIconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
}

function SvgIcon({ name, ...props }: SvgIconProps) {
  return (
    <svg className='icon' aria-hidden="true" width="1em" height="1em" {...props}>
      <use xlinkHref={`#icon-${name}`} fill="currentColor" />
    </svg>
  );
}

function App() {
  return (
    <>
      <h1>
        Vite + React + Custom Plugins
        <a className='link-github' href='https://github.com/minosss/vite-plugins' target='_blank' rel="noreferrer">
          <SvgIcon name='brand-github'></SvgIcon>
        </a>
      </h1>
      <div className='layout'>
        <div className='sider'>
          {menus?.map((menu) => (
            <a href={`#${menu.path}`} key={menu.path}>
              {menu.meta?.icon && <SvgIcon name={menu.meta.icon} />}
              {menu.meta?.title}
            </a>
          ))}
        </div>
        <div className='main'>
          <RouterProvider router={router} fallbackElement={<div>loading</div>}></RouterProvider>
        </div>
      </div>
    </>
  );
}

export default App;
