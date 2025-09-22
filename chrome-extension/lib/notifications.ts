export function notifyLoginSuccess(username?: string) {
  chrome.runtime.sendMessage({ action: "notify_login_success", username }).catch(() => {})
}

export function notifyError(title: string, message: string) {
  chrome.runtime.sendMessage({ action: "notify_error", title, message }).catch(() => {})
}
