import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useAuth } from "../hooks/useAuth"
import { useMsTasks, useCreateMsTask, useDeleteMsTask, useUpdateMsTask } from "../hooks/useMsTodos"
import { ExpandableInput } from "../components/ui/expandable-input"
import { Button } from "../components/ui/button"
import { Trash2, ChevronDown, ChevronRight, MessageSquareMore, MessageSquareText, ClipboardList } from "lucide-react"
import { Checkbox } from "../components/ui/checkbox"
import { Tooltip } from "../components/ui/tooltip"
import { debounce } from "../lib/utils"
import { useI18n } from "../lib/i18n"

interface TodoTaskListProps {
  selectedTodoListId: string
  hideCompleted?: boolean
  /** 過濾模式：all=顯示全部, incomplete=只顯示未完成, completed=只顯示已完成 */
  filterMode?: "all" | "incomplete" | "completed"
  listLabel?: string
  iconOnlyActions?: boolean
  maxHeight?: string
}

export function TodoList({ selectedTodoListId, hideCompleted = false, filterMode = "all", listLabel, iconOnlyActions = false, maxHeight = "72vh" }: TodoTaskListProps) {
  const [title, setTitle] = React.useState("")
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set())
  const [globalExpanded, setGlobalExpanded] = React.useState(false)
  const { token } = useAuth()
  const { data: todoTasks = [], isLoading } = useMsTasks(selectedTodoListId, token, { enabled: !!selectedTodoListId })
  const createTask = useCreateMsTask(token)
  const deleteTask = useDeleteMsTask(token)
  const updateTask = useUpdateMsTask(token)
  const { t } = useI18n()

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

  const visibleTodoTasks = React.useMemo(() => {
    // 優先使用 filterMode，如果沒有則回退到 hideCompleted
    if (filterMode !== "all") {
      return todoTasks.filter((t) =>
        filterMode === "incomplete"
          ? t.status !== "completed"
          : t.status === "completed"
      )
    }
    return hideCompleted ? todoTasks.filter((t) => t.status !== "completed") : todoTasks
  }, [todoTasks, hideCompleted, filterMode])

  // 全部展開/摺疊
  const toggleGlobalExpansion = React.useCallback(() => {
    const newGlobalExpanded = !globalExpanded
    setGlobalExpanded(newGlobalExpanded)

    if (newGlobalExpanded) {
      // 展開所有多行項目
      const multilineIds = visibleTodoTasks
        .filter(t => isMultiline(t.title))
        .map(t => t.id)
      setExpandedItems(new Set(multilineIds))
    } else {
      // 摺疊所有項目
      setExpandedItems(new Set())
    }
  }, [globalExpanded, visibleTodoTasks, isMultiline])

  const onAdd = React.useMemo(() => debounce(() => {
    const val = title.trim()
    if (!val) return
    if (createTask.isPending) return
    createTask.mutate(
      { listId: selectedTodoListId, task: { title: val } },
      {
        onSuccess: () => setTitle(""),
        onError: (error) => console.error("Failed to add todo:", error)
      }
    )
  }, 400, true, false), [title, selectedTodoListId, createTask])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onAdd()
    }
  }, [onAdd])

  const handleChange = React.useCallback((value: string) => {
    setTitle(value)
  }, [])

  const makeToggleStatus = React.useCallback((tId: string, status?: string) => debounce(() => updateTask.mutate({ listId: selectedTodoListId, taskId: tId, patch: { status: status === "completed" ? "notStarted" : "completed" } }), 250, true, false), [selectedTodoListId, updateTask])

  const makeDelete = React.useCallback((tId: string) => debounce(() => deleteTask.mutate({ listId: selectedTodoListId, taskId: tId }), 250, true, false), [selectedTodoListId, deleteTask])

  return (
    <div className="space-y-3 w-full max-w-full overflow-hidden">
      <div className="w-full max-w-full">
        <ExpandableInput
          placeholder={t("new_task_placeholder")}
          value={title}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full max-w-full"
        />
      </div>
      {listLabel && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium text-muted-foreground">{listLabel}</div>
            <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-muted px-2 text-[10px] font-medium text-muted-foreground">
              {visibleTodoTasks.length}
            </span>
          </div>
          {visibleTodoTasks.some(t => isMultiline(t.title)) && (
            <Tooltip content={globalExpanded ? t("tooltip_collapse_all") : t("tooltip_expand_all")}>
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
        <div className="text-sm text-muted-foreground">{t("loading")}</div>
      ) : visibleTodoTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-muted-foreground py-10">
          <ClipboardList className="h-12 w-12 opacity-60 mb-2" />
          <div className="text-sm">{t("no_tasks")}</div>
        </div>
      ) : (
        <ul className="space-y-2 nice-scroll w-full max-w-full" style={{ maxHeight }}>
          <AnimatePresence initial={false}>
            {visibleTodoTasks.map((task) => {
              const isMultilineTodo = isMultiline(task.title)
              const isExpanded = expandedItems.has(task.id)
              const displayText = isMultilineTodo && !isExpanded ? getFirstLine(task.title) : task.title

              return (
                <motion.li
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.5 }}
                  className={`group flex items-start gap-2 p-2 border rounded-md bg-card w-full max-w-full overflow-hidden hover:bg-accent/30 hover:border-accent ${iconOnlyActions ? "relative" : ""}`}
                >
                  <Checkbox
                    checked={task.status === "completed"}
                    onCheckedChange={makeToggleStatus(task.id, task.status)}
                    disabled={updateTask.isPending}
                    className="self-center shrink-0"
                  />
                  <motion.div layout className="flex-1 min-w-0 self-center">
                    <motion.div
                      layout
                      className={`break-words whitespace-pre-wrap ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}
                      style={{ fontSize: "var(--todo-item-font-size, 14px)" }}
                      transition={{ layout: { duration: 0.2 } }}
                    >
                      {displayText}
                    </motion.div>
                    {isMultilineTodo && !isExpanded && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => toggleItemExpansion(task.id)}
                        className="text-xs text-blue-500 hover:text-blue-600 mt-1 flex items-center gap-1 transition-colors"
                      >
                        <ChevronDown className="h-3 w-3" />
                        {t("show_full_content")}
                      </motion.button>
                    )}
                    {isMultilineTodo && isExpanded && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => toggleItemExpansion(task.id)}
                        className="text-xs text-blue-500 hover:text-blue-600 mt-1 flex items-center gap-1 transition-colors"
                      >
                        <ChevronRight className="h-3 w-3 rotate-90" />
                        {t("collapse_item")}
                      </motion.button>
                    )}
                  </motion.div>
                  {iconOnlyActions ? (
                    // POPUP 模式：hover 時顯示刪除按鈕（絕對定位，不佔用水平空間）
                    <div
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto"
                    >
                      <Tooltip content={t("tooltip_delete_task")}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={makeDelete(task.id)}
                          disabled={deleteTask.isPending}
                          className="text-destructive hover:text-destructive hover:bg-destructive/20 h-8 w-8 p-0 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                    </div>
                  ) : (
                    // SIDEPANEL 模式：一直顯示圖標按鈕
                    <Tooltip content={t("tooltip_delete_task")}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={makeDelete(task.id)}
                        disabled={deleteTask.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/20 h-8 w-8 p-0 shrink-0 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </Tooltip>
                  )}
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  )
}