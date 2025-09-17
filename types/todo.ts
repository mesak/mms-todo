export type Category = {
  id: string
  name: string
  color?: string
  createdAt: number
}

export type Todo = {
  id: string
  title: string
  completed: boolean
  categoryId: string
  createdAt: number
}