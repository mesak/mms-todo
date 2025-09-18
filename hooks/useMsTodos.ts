/*
  Microsoft Graph To Do Hooks
  Docs:
  - Concept overview: https://learn.microsoft.com/en-us/graph/todo-concept-overview
  - Attachments: https://learn.microsoft.com/en-us/graph/todo-attachments?tabs=javascript

  This module provides typed React Query hooks for integrating Microsoft To Do via Graph API.
  You must provide a valid Microsoft Graph access token (Bearer) from your auth flow.
*/

import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query"

// -------------------------
// Types (minimal, extend as needed)
// -------------------------

export type GraphPage<T> = {
  value: T[]
  "@odata.nextLink"?: string
}

export type TodoTaskList = {
  id: string
  displayName: string
  wellknownListName?: string
  isOwner?: boolean
  isShared?: boolean
  // ...keep any extra fields
  [key: string]: any
}

export type TodoTask = {
  id: string
  title: string
  status?: "notStarted" | "inProgress" | "completed" | "waitingOnOthers" | "deferred"
  importance?: "low" | "normal" | "high"
  body?: { content?: string; contentType?: "text" | "html" }
  dueDateTime?: { dateTime?: string; timeZone?: string }
  reminderDateTime?: { dateTime?: string; timeZone?: string }
  createdDateTime?: string
  lastModifiedDateTime?: string
  completedDateTime?: string
  // Link to list
  parentListId?: string
  // ...extra fields
  [key: string]: any
}

export type AttachmentBase = {
  id: string
  name?: string
  contentType?: string
  size?: number
  lastModifiedDateTime?: string
  isInline?: boolean
  // discriminator
  "@odata.type"?: string // e.g., #microsoft.graph.fileAttachment or #microsoft.graph.referenceAttachment
  [key: string]: any
}

export type FileAttachment = AttachmentBase & {
  "@odata.type"?: "#microsoft.graph.fileAttachment"
  contentBytes?: string // base64
}

export type ReferenceAttachment = AttachmentBase & {
  "@odata.type"?: "#microsoft.graph.referenceAttachment"
  sourceUrl?: string
  providerType?: string
  previewUrl?: string
  thumbnailUrl?: string
}

export type AnyAttachment = FileAttachment | ReferenceAttachment | AttachmentBase

// Input payloads for creating attachments (no id required in request body)
export type CreateFileAttachmentInput = {
  "@odata.type": "#microsoft.graph.fileAttachment"
  name: string
  contentBytes: string
  contentType?: string
}

export type CreateReferenceAttachmentInput = {
  "@odata.type": "#microsoft.graph.referenceAttachment"
  name: string
  sourceUrl: string
  providerType?: string
}

// -------------------------
// Helpers
// -------------------------

const GRAPH_BASE = "https://graph.microsoft.com/v1.0"

function assertToken(token?: string): asserts token is string {
  if (!token) throw new Error("Microsoft Graph access token is required")
}

async function graphFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
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
  // Some Graph endpoints may return 204 No Content
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

// Simple paginator to collect all pages. For large data, prefer useInfiniteQuery below.
async function graphCollectAll<T>(first: GraphPage<T>, token: string): Promise<T[]> {
  const items = [...(first.value || [])]
  let next = first["@odata.nextLink"]
  while (next) {
    const res = await fetch(next, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`Graph paging error ${res.status}`)
    const page = (await res.json()) as GraphPage<T>
    items.push(...(page.value || []))
    next = page["@odata.nextLink"]
  }
  return items
}

// -------------------------
// Query Keys
// -------------------------

export const msq = {
  root: ["msgraph"] as const,
  lists: () => ["msgraph", "lists"] as const,
  tasks: (listId: string) => ["msgraph", "tasks", listId] as const,
  task: (listId: string, taskId: string) => ["msgraph", "task", listId, taskId] as const,
  attachments: (listId: string, taskId: string) => ["msgraph", "attachments", listId, taskId] as const,
}

// -------------------------
// Hooks: Lists
// -------------------------

export function useMsTodoLists(token?: string, opts?: { enabled?: boolean; collectAll?: boolean }) {
  const enabled = (opts?.enabled ?? true) && !!token
  return useQuery({
    queryKey: msq.lists(),
    enabled,
    queryFn: async (): Promise<TodoTaskList[]> => {
      assertToken(token)
      const page = await graphFetch<GraphPage<TodoTaskList>>("/me/todo/lists", token)
      if (opts?.collectAll) return graphCollectAll(page, token)
      return page.value ?? []
    }
  })
}

export function useCreateMsTodoList(token?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { displayName: string }) => {
      assertToken(token)
      return graphFetch<TodoTaskList>("/me/todo/lists", token!, {
        method: "POST",
        body: JSON.stringify(payload)
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: msq.lists() })
  })
}

export function useDeleteMsTodoList(token?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (listId: string) => {
      assertToken(token)
      await graphFetch<void>(`/me/todo/lists/${listId}`, token!, { method: "DELETE" })
    },
    onSuccess: (_data, listId) => {
      qc.invalidateQueries({ queryKey: msq.lists() })
      // Invalidate related tasks caches
      qc.invalidateQueries({ queryKey: msq.tasks(listId as any) })
    }
  })
}

// -------------------------
// Hooks: Tasks
// -------------------------

export function useMsTasks(listId?: string, token?: string, opts?: { enabled?: boolean; collectAll?: boolean; search?: string }) {
  const enabled = (opts?.enabled ?? true) && !!token && !!listId
  return useQuery({
    queryKey: listId ? msq.tasks(listId) : msq.tasks("_"),
    enabled,
    queryFn: async (): Promise<TodoTask[]> => {
      assertToken(token)
      if (!listId) return []
      const qp = new URLSearchParams()
      if (opts?.search) qp.set("$search", `\"${opts.search}\"`)
      const path = qp.size > 0 ? `/me/todo/lists/${listId}/tasks?${qp}` : `/me/todo/lists/${listId}/tasks`
      const page = await graphFetch<GraphPage<TodoTask>>(path, token)
      if (opts?.collectAll) return graphCollectAll(page, token)
      return page.value ?? []
    }
  })
}

export function useMsTaskDetails(listId?: string, taskId?: string, token?: string, opts?: { enabled?: boolean }) {
  const enabled = (opts?.enabled ?? true) && !!token && !!listId && !!taskId
  return useQuery({
    queryKey: listId && taskId ? msq.task(listId, taskId) : ["msgraph", "task", "_", "_"],
    enabled,
    queryFn: async (): Promise<TodoTask> => {
      assertToken(token)
      if (!listId || !taskId) throw new Error("listId and taskId are required")
      return graphFetch<TodoTask>(`/me/todo/lists/${listId}/tasks/${taskId}`, token)
    }
  })
}

export function useCreateMsTask(token?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ listId, task }: { listId: string; task: Partial<TodoTask> & { title: string } }) => {
      assertToken(token)
      return graphFetch<TodoTask>(`/me/todo/lists/${listId}/tasks`, token!, {
        method: "POST",
        body: JSON.stringify(task)
      })
    },
    onSuccess: (_t, vars) => {
      qc.invalidateQueries({ queryKey: msq.tasks(vars.listId) })
    }
  })
}

export function useUpdateMsTask(token?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ listId, taskId, patch }: { listId: string; taskId: string; patch: Partial<TodoTask> }) => {
      assertToken(token)
      await graphFetch<void>(`/me/todo/lists/${listId}/tasks/${taskId}`, token!, {
        method: "PATCH",
        body: JSON.stringify(patch)
      })
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: msq.tasks(vars.listId) })
      qc.invalidateQueries({ queryKey: msq.task(vars.listId, vars.taskId) })
    }
  })
}

export function useDeleteMsTask(token?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ listId, taskId }: { listId: string; taskId: string }) => {
      assertToken(token)
      await graphFetch<void>(`/me/todo/lists/${listId}/tasks/${taskId}`, token!, { method: "DELETE" })
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: msq.tasks(vars.listId) })
    }
  })
}

// -------------------------
// Hooks: Attachments (task)
// -------------------------

export function useMsTaskAttachments(listId?: string, taskId?: string, token?: string, opts?: { enabled?: boolean }) {
  const enabled = (opts?.enabled ?? true) && !!token && !!listId && !!taskId
  return useQuery({
    queryKey: listId && taskId ? msq.attachments(listId, taskId) : ["msgraph", "attachments", "_", "_"],
    enabled,
    queryFn: async (): Promise<AnyAttachment[]> => {
      assertToken(token)
      if (!listId || !taskId) return []
      const page = await graphFetch<GraphPage<AnyAttachment>>(`/me/todo/lists/${listId}/tasks/${taskId}/attachments`, token)
      return page.value ?? []
    }
  })
}

// Add a small file attachment (<= 3MB) as fileAttachment using base64 content.
export function useAddMsTaskFileAttachment(token?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ listId, taskId, name, contentBytes, contentType }: { listId: string; taskId: string; name: string; contentBytes: string; contentType?: string }) => {
      assertToken(token)
      const body: CreateFileAttachmentInput = {
        "@odata.type": "#microsoft.graph.fileAttachment",
        name,
        contentBytes,
        contentType,
      }
      return graphFetch<AnyAttachment>(`/me/todo/lists/${listId}/tasks/${taskId}/attachments`, token!, {
        method: "POST",
        body: JSON.stringify(body)
      })
    },
    onSuccess: (_a, vars) => {
      qc.invalidateQueries({ queryKey: msq.attachments(vars.listId, vars.taskId) })
    }
  })
}

// Add a reference attachment (link), e.g., to a file in OneDrive/SharePoint.
export function useAddMsTaskReferenceAttachment(token?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ listId, taskId, name, sourceUrl, providerType }: { listId: string; taskId: string; name: string; sourceUrl: string; providerType?: string }) => {
      assertToken(token)
      const body: CreateReferenceAttachmentInput = {
        "@odata.type": "#microsoft.graph.referenceAttachment",
        name,
        sourceUrl,
        providerType
      }
      return graphFetch<AnyAttachment>(`/me/todo/lists/${listId}/tasks/${taskId}/attachments`, token!, {
        method: "POST",
        body: JSON.stringify(body)
      })
    },
    onSuccess: (_a, vars) => {
      qc.invalidateQueries({ queryKey: msq.attachments(vars.listId, vars.taskId) })
    }
  })
}

export function useDeleteMsTaskAttachment(token?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ listId, taskId, attachmentId }: { listId: string; taskId: string; attachmentId: string }) => {
      assertToken(token)
      await graphFetch<void>(`/me/todo/lists/${listId}/tasks/${taskId}/attachments/${attachmentId}`, token!, { method: "DELETE" })
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: msq.attachments(vars.listId, vars.taskId) })
    }
  })
}

// -------------------------
// Optional: Infinite scrolling for tasks (large lists)
// -------------------------

export function useInfiniteMsTasks(listId?: string, token?: string, opts?: { enabled?: boolean; pageSize?: number }) {
  const enabled = (opts?.enabled ?? true) && !!token && !!listId
  return useInfiniteQuery({
    queryKey: listId ? [...msq.tasks(listId), "infinite"] : ["msgraph", "tasks", "_", "infinite"],
    enabled,
    initialPageParam: `${GRAPH_BASE}/me/todo/lists/${listId}/tasks${opts?.pageSize ? `?$top=${opts.pageSize}` : ""}`,
    queryFn: async ({ pageParam }): Promise<GraphPage<TodoTask>> => {
      assertToken(token)
      const res = await fetch(pageParam as string, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`Graph error ${res.status}`)
      return res.json()
    },
    getNextPageParam: (last) => last["@odata.nextLink"]
  })
}

// -------------------------
// Notes
// -------------------------
// - Ensure your auth flow acquires a token with the scopes needed for To Do, e.g. `Tasks.ReadWrite` (and for attachments where applicable).
// - Some fields are omitted for brevity; extend the types as your UI requires.
// - For large file uploads (> 3MB), use upload sessions (createUploadSession) – implement as needed.
