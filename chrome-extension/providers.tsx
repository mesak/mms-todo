import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query"
import { ToasterProvider, ToastBridgeRegistrar, emitToast } from "./components/ui/toast"
import { persistQueryClient } from "@tanstack/react-query-persist-client"
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister"
import * as React from "react"
import { t } from "./lib/i18n"

// Create a global QueryClient instance
const globalClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error)
      emitToast({ title: t("toast_fetch_error_title"), description: message, variant: "destructive" })
    }
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      const message = error instanceof Error ? error.message : String(error)
      emitToast({ title: t("toast_mutation_error_title"), description: message, variant: "destructive" })
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
  React.useEffect(() => {
    function onMessage(msg: any) {
      if (msg?.action === "account_changed") {
        // Clear all cached queries to avoid cross-account mixing
        globalClient.clear()
      }
      if (msg?.action === "rq_invalidate" && Array.isArray(msg.targets)) {
        // Targeted invalidation across contexts (popup/sidepanel/options)
        for (const t of msg.targets as Array<any>) {
          if (t?.type === "lists") {
            globalClient.invalidateQueries({ queryKey: ["msgraph", "lists"] })
          } else if (t?.type === "tasks" && t.listId) {
            globalClient.invalidateQueries({ queryKey: ["msgraph", "tasks", t.listId] })
          } else if (t?.type === "task" && t.listId && t.taskId) {
            globalClient.invalidateQueries({ queryKey: ["msgraph", "task", t.listId, t.taskId] })
          } else if (t?.type === "attachments" && t.listId && t.taskId) {
            globalClient.invalidateQueries({ queryKey: ["msgraph", "attachments", t.listId, t.taskId] })
          }
        }
      }
    }
    try {
      const c: any = (globalThis as any).chrome
      c?.runtime?.onMessage?.addListener?.(onMessage)
      return () => {
        c?.runtime?.onMessage?.removeListener?.(onMessage)
      }
    } catch {
      // non-extension environment
    }
  }, [])
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