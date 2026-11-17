import { Suspense, type ReactNode } from "react";

export function SessionIdPage({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: (id: string) => ReactNode;
}) {
  return (
    <Suspense fallback={<p>Memuat…</p>}>
      <ResolveSessionId params={params}>{children}</ResolveSessionId>
    </Suspense>
  );
}

async function ResolveSessionId({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: (id: string) => ReactNode;
}) {
  const { id } = await params;
  return <>{children(id)}</>;
}
