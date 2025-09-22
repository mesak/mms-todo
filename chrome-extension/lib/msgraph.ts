export const GRAPH_BASE = "https://graph.microsoft.com/v1.0"

export async function graphFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Graph error ${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

export type MeProfile = {
  id: string
  displayName?: string
  userPrincipalName?: string
  mail?: string
  [key: string]: any
}

export async function fetchMe(accessToken: string): Promise<MeProfile> {
  const res = await fetch(`${GRAPH_BASE}/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`Failed to fetch /me: ${res.status}`)
  return res.json()
}
