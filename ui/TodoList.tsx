import * as React from "react"
import { useTodos } from "../hooks/useTodos"
import { ExpandableInput } from "../components/ui/expandable-input"
import { Button } from "../components/ui/button"
import { Trash2 } from "lucide-react"
import { Checkbox } from "../components/ui/checkbox"
import { Tooltip } from "../components/ui/tooltip"

interface TodoListProps {
  selectedCategoryId: string
  hideCompleted?: boolean
  listLabel?: string
  iconOnlyActions?: boolean
  maxHeight?: string
}

export function TodoList({ selectedCategoryId, hideCompleted = false, listLabel, iconOnlyActions = false, maxHeight = "60vh" }: TodoListProps) {
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onAdd()
    }
  }, [onAdd])

  const handleChange = React.useCallback((value: string) => {
    setTitle(value)
  }, [])

  const visibleTodos = React.useMemo(() => {
    return hideCompleted ? todos.filter((t) => !t.completed) : todos
  }, [todos, hideCompleted])

  return (
    <div className="space-y-3 w-full max-w-full overflow-hidden">
      <div className="w-full max-w-full">
        <ExpandableInput
          placeholder="新增任務..."
          value={title}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full max-w-full"
        />
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
        <ul className="space-y-2 overflow-y-auto w-full max-w-full" style={{ maxHeight }}>
          {visibleTodos.map((t) => (
            <li key={t.id} className="flex items-start gap-2 p-2 border rounded-md bg-card w-full max-w-full overflow-hidden">
              <Checkbox
                checked={t.completed}
                onCheckedChange={() => toggle.mutate(t.id)}
                disabled={toggle.isPending}
                className="mt-0.5 shrink-0"
              />
              <span className={`flex-1 text-sm break-words min-w-0 ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                {t.title}
              </span>
              {iconOnlyActions ? (
                <Tooltip content="刪除">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove.mutate(t.id)}
                    disabled={remove.isPending}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </Tooltip>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove.mutate(t.id)}
                  disabled={remove.isPending}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  刪除
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}