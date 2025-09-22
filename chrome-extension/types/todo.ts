export type TodoList = {
  id: string
  name: string
  color?: string
  createdAt: number
}

export type TodoTask = {
  id: string
  title: string
  completed: boolean
  todoListId: string
  createdAt: number
}