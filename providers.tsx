import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import * as React from "react"

// Create a global QueryClient instance
const globalClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // 數據立即變為陳舊，確保總是重新獲取
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      onError: (error) => {
        console.error("Mutation error:", error)
      },
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={globalClient}>{children}</QueryClientProvider>
}

// Export the client for direct access if needed
export { globalClient as queryClient }