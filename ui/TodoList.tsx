import * as React from "react"
import { useTodos } from "../hooks/useTodos"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Checkbox } from "../components/ui/checkbox"

interface TodoListProps {
  selectedCategoryId: string
  hideCompleted?: boolean
  listLabel?: string
}

export function TodoList({ selectedCategoryId, hideCompleted = false, listLabel }: TodoListProps) {
  const [title, setTitle] = React.useState("")
  const { data: todos = [], isLoading, add, toggle, remove } = useTodos(selectedCategoryId)

  const onAdd = React.useCallback(() => {
    if (!title.trim()) return
    add.mutate(
      { title: title.trim(), categoryId: selectedCategoryId },
      {
        onSuccess: () => {
          setTitle("")
        },
        onError: (error) => {
          console.error("Failed to add todo:", error)
        }
      }
    )
  }, [title, selectedCategoryId, add])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      onAdd()
    }
  }, [onAdd])

  const visibleTodos = React.useMemo(() => {
    return hideCompleted ? todos.filter((t) => !t.completed) : todos
  }, [todos, hideCompleted])

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="新增任務..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button
          onClick={onAdd}
          disabled={!title.trim() || add.isPending}
          className="px-4"
        >
          {add.isPending ? "新增中..." : "新增"}
        </Button>
      </div>
      {listLabel && (
        <div className="text-xs font-medium text-muted-foreground">{listLabel}</div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">載入中...</div>
      ) : visibleTodos.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          {hideCompleted ? "目前沒有未完成的任務" : "目前沒有任務"}
        </div>
      ) : (
  <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
          {visibleTodos.map((t) => (
            <li key={t.id} className="flex items-center gap-2 p-2 border rounded-md bg-card">
              <Checkbox
                checked={t.completed}
                onCheckedChange={() => toggle.mutate(t.id)}
                disabled={toggle.isPending}
              />
              <span className={`flex-1 text-sm ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                {t.title}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove.mutate(t.id)}
                disabled={remove.isPending}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                刪除
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}