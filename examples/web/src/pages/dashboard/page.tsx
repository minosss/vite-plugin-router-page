export async function loader() {
  // sleep 2 s
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return {};
}

export function ErrorBoundary() {
  return <div>something went wrong</div>;
}

export default function Page() {
  return <div>dashboard page</div>;
}
