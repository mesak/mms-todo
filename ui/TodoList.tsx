import * as React from "react"
import { useTodos } from "../hooks/useTodos"
import { ExpandableInput } from "../components/ui/expandable-input"
import { Button } from "../components/ui/button"
import { Trash2, ChevronDown, ChevronRight, MessageSquareMore, MessageSquareText } from "lucide-react"
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
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set())
  const [globalExpanded, setGlobalExpanded] = React.useState(false)
  const { data: todos = [], isLoading, add, toggle, remove } = useTodos(selectedCategoryId)

  // 檢查是否為多行內容
  const isMultiline = React.useCallback((text: string) => {
    return text.includes('\n') || text.length > 80
  }, [])

  // 獲取第一行內容
  const getFirstLine = React.useCallback((text: string) => {
    const firstLine = text.split('\n')[0]
    return firstLine.length > 80 ? firstLine.substring(0, 80) + '...' : firstLine
  }, [])

  // 切換單個項目的展開狀態
  const toggleItemExpansion = React.useCallback((id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const visibleTodos = React.useMemo(() => {
    return hideCompleted ? todos.filter((t) => !t.completed) : todos
  }, [todos, hideCompleted])

  // 全部展開/摺疊
  const toggleGlobalExpansion = React.useCallback(() => {
    const newGlobalExpanded = !globalExpanded
    setGlobalExpanded(newGlobalExpanded)
    
    if (newGlobalExpanded) {
      // 展開所有多行項目
      const multilineIds = visibleTodos
        .filter(t => isMultiline(t.title))
        .map(t => t.id)
      setExpandedItems(new Set(multilineIds))
    } else {
      // 摺疊所有項目
      setExpandedItems(new Set())
    }
  }, [globalExpanded, visibleTodos, isMultiline])

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
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-muted-foreground">{listLabel}</div>
          {visibleTodos.some(t => isMultiline(t.title)) && (
            <Tooltip content={globalExpanded ? "全部摺疊" : "全部展開"}>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleGlobalExpansion}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              >
                {globalExpanded ? <MessageSquareMore className="h-3 w-3" /> : <MessageSquareText className="h-3 w-3" />}
              </Button>
            </Tooltip>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="text-sm text-muted-foreground">載入中...</div>
      ) : visibleTodos.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          {hideCompleted ? "目前沒有未完成的任務" : "目前沒有任務"}
        </div>
      ) : (
        <ul className="space-y-2 overflow-y-auto w-full max-w-full" style={{ maxHeight }}>
          {visibleTodos.map((t) => {
            const isMultilineTodo = isMultiline(t.title)
            const isExpanded = expandedItems.has(t.id)
            const displayText = isMultilineTodo && !isExpanded ? getFirstLine(t.title) : t.title

            return (
              <li key={t.id} className="group flex items-start gap-2 p-2 border rounded-md bg-card w-full max-w-full overflow-hidden hover:bg-accent/30 hover:border-accent transition-all duration-200">
                <Checkbox
                  checked={t.completed}
                  onCheckedChange={() => toggle.mutate(t.id)}
                  disabled={toggle.isPending}
                  className="mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm break-words whitespace-pre-wrap ${t.completed ? "line-through text-muted-foreground" : ""}`}>
                    {displayText}
                  </div>
                  {isMultilineTodo && !isExpanded && (
                    <button
                      onClick={() => toggleItemExpansion(t.id)}
                      className="text-xs text-blue-500 hover:text-blue-600 mt-1 flex items-center gap-1 transition-colors"
                    >
                      <ChevronDown className="h-3 w-3" />
                      顯示完整內容
                    </button>
                  )}
                  {isMultilineTodo && isExpanded && (
                    <button
                      onClick={() => toggleItemExpansion(t.id)}
                      className="text-xs text-blue-500 hover:text-blue-600 mt-1 flex items-center gap-1 transition-colors"
                    >
                      <ChevronRight className="h-3 w-3 rotate-90" />
                      收合
                    </button>
                  )}
                </div>
                {iconOnlyActions ? (
                  // POPUP 模式：hover 時顯示刪除按鈕
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0">
                    <Tooltip content="刪除任務">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove.mutate(t.id)}
                        disabled={remove.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/20 h-8 w-8 p-0 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  </div>
                ) : (
                  // SIDEPANEL 模式：一直顯示圖標按鈕
                  <Tooltip content="刪除任務">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove.mutate(t.id)}
                      disabled={remove.isPending}
                      className="text-destructive hover:text-destructive hover:bg-destructive/20 h-8 w-8 p-0 shrink-0 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </Tooltip>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}