export function notifyLoginSuccess(username?: string) {
  const c: any = (globalThis as any).chrome
  c?.runtime?.sendMessage?.({ action: "notify_login_success", username })?.catch?.(() => {})
}

export function notifyError(title: string, message: string) {
  const c: any = (globalThis as any).chrome
  c?.runtime?.sendMessage?.({ action: "notify_error", title, message })?.catch?.(() => {})
}

// Cross-context React Query invalidation message
export type RQInvalidateTarget =
  | { type: "lists" }
  | { type: "tasks"; listId: string }
  | { type: "task"; listId: string; taskId: string }
  | { type: "attachments"; listId: string; taskId: string }

export function notifyRQInvalidate(targets: RQInvalidateTarget[]) {
  try {
    const c: any = (globalThis as any).chrome
    c?.runtime?.sendMessage?.({ action: "rq_invalidate", targets })?.catch?.(() => {})
  } catch {}
}
