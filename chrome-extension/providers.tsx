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
    // ✅ 新增：處理 StorageEvent 中的 rq_invalidate_counter 變化
    // 這用於跨 Context（Popup/SidePanel）同步 React Query 緩存失效
    function onStorageChange(e: StorageEvent) {
      if (e.key === "rq_invalidate_counter") {
        try {
          const payload = window.localStorage.getItem("rq_invalidate_payload")
          const targets = payload ? JSON.parse(payload) : []
          console.log("[providers] Received rq_invalidate via StorageEvent:", targets)

          // 執行相同的失效邏輯
          if (Array.isArray(targets)) {
            for (const t of targets as Array<any>) {
              if (t?.type === "lists") {
                globalClient.invalidateQueries({ queryKey: ["msgraph", "lists"] })
                console.log("[providers] Invalidated lists query (via storage)")
              } else if (t?.type === "tasks" && t.listId) {
                globalClient.invalidateQueries({ queryKey: ["msgraph", "tasks", t.listId] })
                console.log("[providers] Invalidated tasks query for list:", t.listId, "(via storage)")
              } else if (t?.type === "task" && t.listId && t.taskId) {
                globalClient.invalidateQueries({ queryKey: ["msgraph", "task", t.listId, t.taskId] })
                console.log("[providers] Invalidated task query (via storage)")
              } else if (t?.type === "attachments" && t.listId && t.taskId) {
                globalClient.invalidateQueries({ queryKey: ["msgraph", "attachments", t.listId, t.taskId] })
                console.log("[providers] Invalidated attachments query (via storage)")
              }
            }
          }
        } catch (err) {
          console.error("[providers] Failed to process rq_invalidate from storage:", err)
        }
      }
    }

    function onMessage(msg: any) {
      // ✅ 改進 9: 處理 account_changed 消息（包括登出）
      if (msg?.action === "account_changed") {
        // Clear all cached queries to avoid cross-account mixing
        // account_changed 可能是：
        // 1. 帳號切換（account = { id, upn, displayName }）
        // 2. 登出（account = null）
        globalClient.clear()
        console.log("React Query cache cleared due to account change:", msg.account)
      }
      if (msg?.action === "logout_completed") {
        // ✅ 額外的登出確認消息
        // 再次確保所有緩存被清除
        globalClient.clear()
        console.log("React Query cache cleared due to logout completion")
      }
      if (msg?.action === "rq_invalidate" && Array.isArray(msg.targets)) {
        // Targeted invalidation across contexts (popup/sidepanel/options)
        console.log("[providers] Received rq_invalidate message:", msg.targets)
        for (const t of msg.targets as Array<any>) {
          if (t?.type === "lists") {
            globalClient.invalidateQueries({ queryKey: ["msgraph", "lists"] })
            console.log("[providers] Invalidated lists query")
          } else if (t?.type === "tasks" && t.listId) {
            globalClient.invalidateQueries({ queryKey: ["msgraph", "tasks", t.listId] })
            console.log("[providers] Invalidated tasks query for list:", t.listId)
          } else if (t?.type === "task" && t.listId && t.taskId) {
            globalClient.invalidateQueries({ queryKey: ["msgraph", "task", t.listId, t.taskId] })
            console.log("[providers] Invalidated task query")
          } else if (t?.type === "attachments" && t.listId && t.taskId) {
            globalClient.invalidateQueries({ queryKey: ["msgraph", "attachments", t.listId, t.taskId] })
            console.log("[providers] Invalidated attachments query")
          }
        }
      }
    }
    try {
      const c: any = (globalThis as any).chrome
      c?.runtime?.onMessage?.addListener?.(onMessage)
      window.addEventListener("storage", onStorageChange)
      return () => {
        c?.runtime?.onMessage?.removeListener?.(onMessage)
        window.removeEventListener("storage", onStorageChange)
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