import { useRouteError } from 'react-router-dom';
import 'virtual:svg-icons-register?info';

export async function loader() {
  // sleep 1 s
  await new Promise((resolve) => setTimeout(resolve, 1000));
  throw new Error('Boom');
}

export function ErrorBoundary() {
  const err = useRouteError() as Error;

  return (
    <div>
      <h3>Error</h3>
      <p>{err.message}</p>
    </div>
  );
}

export default function Page() {
  return <div>user page</div>;
}
