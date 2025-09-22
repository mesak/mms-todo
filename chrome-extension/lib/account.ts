export type MsAccount = {
  id: string // stable AAD object id or user id from Graph /me
  upn?: string // userPrincipalName / email
  displayName?: string
}

const ACCOUNT_KEY = "ms_account"

export async function getMsAccount(): Promise<MsAccount | undefined> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get([ACCOUNT_KEY], (res) => resolve(res[ACCOUNT_KEY]))
    } catch {
      resolve(undefined)
    }
  })
}

export async function setMsAccount(acc: MsAccount): Promise<void> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set({ [ACCOUNT_KEY]: acc }, () => resolve())
    } catch {
      resolve()
    }
  })
}

// Clear user-scoped local data to avoid cross-account leakage
export async function clearUserScopedData(): Promise<void> {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.remove(["todos", "categories"], () => resolve())
    } catch {
      resolve()
    }
  })
}

export function broadcastAccountChanged(newAccount: MsAccount) {
  try {
    chrome.runtime.sendMessage({ action: "account_changed", account: newAccount }).catch(() => {})
  } catch {}
}
