import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Todo, Category } from "../types/todo"

const TODOS_STORAGE_KEY = "todos"
const CATEGORIES_STORAGE_KEY = "categories"

async function getTodos(): Promise<Todo[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([TODOS_STORAGE_KEY], (result) => {
      resolve((result[TODOS_STORAGE_KEY] as Todo[]) ?? [])
    })
  })
}

async function setTodos(todos: Todo[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [TODOS_STORAGE_KEY]: todos }, () => resolve())
  })
}

async function getCategories(): Promise<Category[]> {
  return new Promise((resolve) => {
    chrome.storage.local.get([CATEGORIES_STORAGE_KEY], (result) => {
      const categories = (result[CATEGORIES_STORAGE_KEY] as Category[]) ?? []
      // 如果沒有類別，創建預設的"工作"類別
      if (categories.length === 0) {
        const defaultCategory: Category = {
          id: "work",
          name: "工作",
          createdAt: Date.now()
        }
        setCategories([defaultCategory])
        resolve([defaultCategory])
      } else {
        resolve(categories)
      }
    })
  })
}

async function setCategories(categories: Category[]): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [CATEGORIES_STORAGE_KEY]: categories }, () => resolve())
  })
}

export function useTodos(selectedCategoryId?: string) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ["todos", selectedCategoryId],
    queryFn: async () => {
      const todos = await getTodos()
      if (selectedCategoryId) {
        return todos.filter(todo => todo.categoryId === selectedCategoryId)
      }
      return todos
    }
  })

  const add = useMutation({
    mutationFn: async ({ title, categoryId }: { title: string; categoryId: string }) => {
      const current = await getTodos()
      const next: Todo[] = [
        {
          id: crypto.randomUUID(),
          title,
          completed: false,
          categoryId,
          createdAt: Date.now()
        },
        ...current
      ]
      await setTodos(next)
      return { todos: next, categoryId }
    },
    onSuccess: () => {
      // 強制重新獲取所有相關的查詢
      queryClient.invalidateQueries({ queryKey: ["todos"] })
    }
  })

  const toggle = useMutation({
    mutationFn: async (id: string) => {
      const current = await getTodos()
      const next = current.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
      await setTodos(next)
      return { todos: next, id }
    },
    onSuccess: () => {
      // 強制重新獲取所有相關的查詢
      queryClient.invalidateQueries({ queryKey: ["todos"] })
    }
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const current = await getTodos()
      const next = current.filter((t) => t.id !== id)
      await setTodos(next)
      return { todos: next, id }
    },
    onSuccess: () => {
      // 強制重新獲取所有相關的查詢
      queryClient.invalidateQueries({ queryKey: ["todos"] })
    }
  })

  return { ...query, add, toggle, remove }
}

export function useCategories() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ["categories"], queryFn: getCategories })

  const add = useMutation({
    mutationFn: async (name: string) => {
      const current = await getCategories()
      const next: Category[] = [
        ...current,
        {
          id: crypto.randomUUID(),
          name,
          createdAt: Date.now()
        }
      ]
      await setCategories(next)
      return next
    },
    onSuccess: () => {
      // 強制重新獲取類別查詢
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    }
  })

  const update = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const current = await getCategories()
      const next = current.map((c) => (c.id === id ? { ...c, name } : c))
      await setCategories(next)
      return next
    },
    onSuccess: () => {
      // 強制重新獲取類別查詢
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    }
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const current = await getCategories()
      // 不允許刪除預設的"工作"類別
      if (id === "work") return current
      const next = current.filter((c) => c.id !== id)
      await setCategories(next)
      return next
    },
    onSuccess: () => {
      // 強制重新獲取類別查詢
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    }
  })

  return { ...query, add, update, remove }
}