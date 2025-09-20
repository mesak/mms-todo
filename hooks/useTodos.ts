import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { TodoTask, TodoList } from "../types/todo"

const TODO_TASKS_STORAGE_KEY = "todoTasks"
const TODO_LISTS_STORAGE_KEY = "todoLists"

async function getTodoTasks(): Promise<TodoTask[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([TODO_TASKS_STORAGE_KEY], (result) => {
      resolve((result[TODO_TASKS_STORAGE_KEY] as TodoTask[]) ?? [])
    })
  })
}

async function setTodoTasks(todoTasks: TodoTask[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [TODO_TASKS_STORAGE_KEY]: todoTasks }, () => resolve())
  })
}

async function getTodoLists(): Promise<TodoList[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([TODO_LISTS_STORAGE_KEY], (result) => {
      const todoLists = (result[TODO_LISTS_STORAGE_KEY] as TodoList[]) ?? []
      // 如果沒有清單，創建預設的"工作"清單
      if (todoLists.length === 0) {
        const defaultTodoList: TodoList = {
          id: "work",
          name: "工作",
          createdAt: Date.now()
        }
        setTodoLists([defaultTodoList])
        resolve([defaultTodoList])
      } else {
        resolve(todoLists)
      }
    })
  })
}

async function setTodoLists(todoLists: TodoList[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [TODO_LISTS_STORAGE_KEY]: todoLists }, () => resolve())
  })
}

export function useTodoTasks(selectedTodoListId?: string) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ["todoTasks", selectedTodoListId],
    queryFn: async () => {
      const todoTasks = await getTodoTasks()
      if (selectedTodoListId) {
        return todoTasks.filter(todoTask => todoTask.todoListId === selectedTodoListId)
      }
      return todoTasks
    }
  })

  const add = useMutation({
    mutationFn: async ({ title, todoListId }: { title: string; todoListId: string }) => {
      const current = await getTodoTasks()
      const next: TodoTask[] = [
        {
          id: crypto.randomUUID(),
          title,
          completed: false,
          todoListId,
          createdAt: Date.now()
        },
        ...current
      ]
      await setTodoTasks(next)
      return { todoTasks: next, todoListId }
    },
    onSuccess: () => {
      // 強制重新獲取所有相關的查詢
      queryClient.invalidateQueries({ queryKey: ["todoTasks"] })
    }
  })

  const toggle = useMutation({
    mutationFn: async (id: string) => {
      const current = await getTodoTasks()
      const next = current.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
      await setTodoTasks(next)
      return { todoTasks: next, id }
    },
    onSuccess: () => {
      // 強制重新獲取所有相關的查詢
      queryClient.invalidateQueries({ queryKey: ["todoTasks"] })
    }
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const current = await getTodoTasks()
      const next = current.filter((t) => t.id !== id)
      await setTodoTasks(next)
      return { todoTasks: next, id }
    },
    onSuccess: () => {
      // 強制重新獲取所有相關的查詢
      queryClient.invalidateQueries({ queryKey: ["todoTasks"] })
    }
  })

  return { ...query, add, toggle, remove }
}

export function useTodoLists() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["todoLists"], queryFn: getTodoLists })

  const add = useMutation({
    mutationFn: async (name: string) => {
      const current = await getTodoLists()
      const next: TodoList[] = [
        ...current,
        {
          id: crypto.randomUUID(),
          name,
          createdAt: Date.now()
        }
      ]
      await setTodoLists(next)
      return next
    },
    onSuccess: () => {
      // 強制重新獲取清單查詢
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
    }
  })

  const update = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const current = await getTodoLists()
      const next = current.map((c) => (c.id === id ? { ...c, name } : c))
      await setTodoLists(next)
      return next
    },
    onSuccess: () => {
      // 強制重新獲取清單查詢
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
    }
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const current = await getTodoLists()
      // 不允許刪除預設的"工作"清單
      if (id === "work") return current
      const next = current.filter((c) => c.id !== id)
      await setTodoLists(next)
      return next
    },
    onSuccess: () => {
      // 強制重新獲取清單查詢
      queryClient.invalidateQueries({ queryKey: ["todoLists"] })
    }
  })

  return { ...query, add, update, remove }
}