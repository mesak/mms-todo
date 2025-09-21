import * as React from "react"

export type Toast = {
  id: string
  title?: string
  description?: string
  variant?: "default" | "destructive" | "success" | "info"
  duration?: number
}

type ToastContextValue = {
  toasts: Toast[]
  dismiss: (id: string) => void
  notify: (t: Omit<Toast, "id">) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within <ToasterProvider>")
  return ctx
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const dismiss = React.useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const notify = React.useCallback((t: Omit<Toast, "id">) => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, duration: 3500, variant: "default", ...t }])
    const dur = t.duration ?? 3500
    if (dur > 0) {
      setTimeout(() => dismiss(id), dur)
    }
  }, [dismiss])

  const value = React.useMemo(() => ({ toasts, dismiss, notify }), [toasts, dismiss, notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-3 right-3 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            "min-w-[240px] max-w-[360px] rounded-md border p-3 shadow bg-background text-foreground " +
            (t.variant === "destructive" ? "border-red-500/40 bg-red-500/10" : "") +
            (t.variant === "success" ? " border-emerald-500/40 bg-emerald-500/10" : "") +
            (t.variant === "info" ? " border-blue-500/40 bg-blue-500/10" : "")
          }
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              {t.title ? <div className="font-medium text-sm">{t.title}</div> : null}
              {t.description ? <div className="text-xs opacity-80 whitespace-pre-wrap break-words">{t.description}</div> : null}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-xs px-1 py-0.5 rounded hover:bg-accent"
              aria-label="關閉通知"
            >
              關閉
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// Convenience helper for non-hook modules
let externalNotify: ToastContextValue["notify"] | null = null

export function ToastBridgeRegistrar() {
  const { notify } = useToast()
  React.useEffect(() => {
    externalNotify = notify
    return () => { externalNotify = null }
  }, [notify])
  return null
}

export function emitToast(t: Omit<Toast, "id">) {
  externalNotify?.(t)
}
