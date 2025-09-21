import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query"
import { ToasterProvider, ToastBridgeRegistrar, emitToast } from "./components/ui/toast"
import { persistQueryClient } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import * as React from "react"

// Create a global QueryClient instance
const globalClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error)
      emitToast({ title: "讀取資料失敗", description: message, variant: "destructive" })
    }
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error)
      emitToast({ title: "操作失敗", description: message, variant: "destructive" })
    }
  }),
  defaultOptions: {
    queries: {
      // Most list/task data can be cached; keep reasonably fresh but avoid refetch storms
      staleTime: 1000 * 30, // 30s
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      // Per-mutation errors are handled by mutationCache above
    },
  },
})

// Configure persistence to localStorage for simplicity
const storage = typeof window !== "undefined" ? window.localStorage : undefined

if (storage) {
  const persister = createSyncStoragePersister({ storage: storage as any, key: "rq-mms-todo" })
  persistQueryClient({
    queryClient: globalClient,
    persister,
    maxAge: 1000 * 60 * 60 * 24 // 24h
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={globalClient}>
      <ToasterProvider>
        {/* Bridge allows emitting toasts from non-React modules */}
        <ToastBridgeRegistrar />
        {children}
      </ToasterProvider>
    </QueryClientProvider>
  )
}

// Export the client for direct access if needed
export { globalClient as queryClient }