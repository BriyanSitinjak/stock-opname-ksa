"use client";

import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { LoadingMark } from "@/app/loading-mark";
import { fetchJson } from "@/app/siap/api";
import { ErrorText } from "@/app/siap/ui";

export type QueryProps = Record<string, string | number | null | undefined>;

function queryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        gcTime: 30 * 60 * 1000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });
}

export function SiapQueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(queryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export function siapKey(path: string, props?: QueryProps) {
  return ["siap", path, stableProps(props)] as const;
}

export function useSiapQuery<T>(path: string, props?: QueryProps, enabled = true) {
  const url = withProps(path, props);
  return useQuery({
    queryKey: siapKey(path, props),
    enabled,
    queryFn: async () => {
      const result = await fetchJson<T>(url);
      if (!result.ok) {
        const body = result.data as { error?: string };
        throw new Error(body.error ?? "Gagal memuat.");
      }
      return result.data;
    },
  });
}

export function useSiapInvalidate() {
  const client = useQueryClient();
  return (paths: string[]) => {
    for (const path of paths) {
      void client.invalidateQueries({ queryKey: ["siap", path] });
    }
  };
}

export function useSiapQueryClient() {
  return useQueryClient();
}

export function useDraftRows<T>(id: string, source: T[] | undefined): [T[] | null, Dispatch<SetStateAction<T[] | null>>] {
  const [rows, setRows] = useState<T[] | null>(null);
  const [loadedFor, setLoadedFor] = useState(id);
  if (loadedFor !== id) {
    setLoadedFor(id);
    setRows(null);
  }
  if (rows === null && source) {
    setRows(source);
  }
  return [rows, setRows];
}

export function QueryView<T>({
  path,
  props,
  children,
}: {
  path: string;
  props?: QueryProps;
  children: (data: T) => ReactNode;
}) {
  const query = useSiapQuery<T>(path, props);
  if (query.isPending) {
    return <LoadingMark />;
  }
  if (query.isError) {
    return <ErrorText>{query.error.message}</ErrorText>;
  }
  return children(query.data);
}

function stableProps(props?: QueryProps) {
  const entries = Object.entries(props ?? {}).filter(([, value]) => value !== undefined && value !== null && value !== "");
  entries.sort(([left], [right]) => left.localeCompare(right));
  return Object.fromEntries(entries);
}

function withProps(path: string, props?: QueryProps) {
  const stable = stableProps(props);
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(stable)) {
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${path}?${query}` : path;
}
