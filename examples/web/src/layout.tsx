import { useEffect } from 'react';
import { Outlet, useNavigation } from 'react-router-dom';

declare global {
  interface Window {
    NProgress?: {
      start(): void;
      done(): void;
    };
  }
}

export default function RootLayout() {
  const navigation = useNavigation();

  useEffect(() => {
    if (navigation.state === 'loading') {
      window.NProgress?.start();
    } else {
      window.NProgress?.done();
    }
  }, [navigation.state]);

  return (
    <>
      <Outlet />
    </>
  );
}
