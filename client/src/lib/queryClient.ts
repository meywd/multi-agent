import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  methodOrConfig: string | { url: string, method: string, body?: unknown },
  url?: string,
  body?: unknown
): Promise<any> {
  let requestUrl: string;
  let requestMethod: string;
  let requestBody: unknown | undefined;

  if (typeof methodOrConfig === 'string') {
    // Handle legacy format: apiRequest(method, url, body)
    requestMethod = methodOrConfig;
    requestUrl = url!;
    requestBody = body;
  } else {
    // Handle object format: apiRequest({ method, url, body })
    requestMethod = methodOrConfig.method;
    requestUrl = methodOrConfig.url;
    requestBody = methodOrConfig.body;
  }

  const res = await fetch(requestUrl, {
    method: requestMethod,
    headers: requestBody ? { "Content-Type": "application/json" } : {},
    body: requestBody ? JSON.stringify(requestBody) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      // Use proper URL construction for query params
      let url = queryKey[0] as string;
      
      // Log the request for debugging
      console.log('Fetching:', url, 'QueryKey:', queryKey);
      
      const res = await fetch(url, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      console.error('Query error for', queryKey, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
