import { Suspense, type ReactNode } from "react";
import { LoadingMark } from "@/app/loading-mark";

export function AwaitParams<T>({
  params,
  children,
}: {
  params: Promise<T>;
  children: (value: T) => ReactNode;
}) {
  return (
    <Suspense fallback={<LoadingMark />}>
      <ResolveParams params={params}>{children}</ResolveParams>
    </Suspense>
  );
}

async function ResolveParams<T>({
  params,
  children,
}: {
  params: Promise<T>;
  children: (value: T) => ReactNode;
}) {
  return <>{children(await params)}</>;
}

export function SessionIdPage({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: (id: string) => ReactNode;
}) {
  return <AwaitParams params={params}>{(value) => children(value.id)}</AwaitParams>;
}
