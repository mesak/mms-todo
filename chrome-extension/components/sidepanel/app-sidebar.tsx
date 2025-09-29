import * as React from "react"
import { ListTodo, Plus, Edit2, Trash2 } from "lucide-react"
import {
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarRail,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    useSidebar
} from "../ui/sidebar"
import type { TodoList } from "../../types/todo"
import { cn } from "../../lib/utils"
// import { useTodoLists, useTodoTasks } from "../../hooks/useTodos"
import { useAuth } from "../../hooks/useAuth"
import { useMsTodoLists, useCreateMsTodoList, useDeleteMsTodoList, useRenameMsTodoList, usePendingCountsCache } from "../../hooks/useMsTodos"
import { Button } from "../ui/button"
import { Tooltip } from "../ui/tooltip"
import { useI18n, type TranslateFunction } from "../../lib/i18n"
// Resolve icon from assets for MV3 build (use Plasmo ~assets alias)
const logoUrl = new URL("~assets/icon.png", import.meta.url).toString()

export type NavKey = "todoTasks" | "todoLists"

type AppSidebarProps = {
    todoLists: TodoList[]
    selectedTodoListId: string
    onSelectTodoList: (id: string) => void
    isOverlay?: boolean
}

export function AppSidebar({ todoLists, selectedTodoListId, onSelectTodoList, isOverlay = false }: AppSidebarProps) {
    const { t } = useI18n()
    if (isOverlay) {
        return (
            <div className="h-full">
                <div className="p-4">
                    <NavMainOverlay
                        todoLists={todoLists}
                        selectedTodoListId={selectedTodoListId}
                        onSelectTodoList={onSelectTodoList}
                        t={t}
                    />
                </div>
            </div>
        )
    }

    return (
        <Sidebar collapsible="icon" className={cn("bg-background")}>
            <SidebarHeader>
                <div className="flex items-center gap-2">
                    <img src={logoUrl} alt="icon" className="size-6" />
                    <span className="text-sm font-semibold">mms-todo</span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <NavMain
                    todoLists={todoLists}
                    selectedTodoListId={selectedTodoListId}
                    onSelectTodoList={onSelectTodoList}
                    t={t}
                />
            </SidebarContent>
            <SidebarFooter>v1.0</SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}

function NavMainOverlay({ todoLists, selectedTodoListId, onSelectTodoList, t }: { todoLists: TodoList[]; selectedTodoListId: string; onSelectTodoList: (id: string) => void; t: TranslateFunction }) {
    const { token } = useAuth()
    const { /* data: msLists = [] */ } = useMsTodoLists(token)
    const createList = useCreateMsTodoList(token)
    const deleteList = useDeleteMsTodoList(token)
    const renameList = useRenameMsTodoList(token)

    const [adding, setAdding] = React.useState(false)
    const [newName, setNewName] = React.useState("")
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [editName, setEditName] = React.useState("")

    const listIds = React.useMemo(() => todoLists.map((l) => l.id), [todoLists])
    const counts = usePendingCountsCache(listIds)

    const handleAdd = () => {
        if (!newName.trim()) return
        createList.mutate({ displayName: newName.trim() }, {
            onSuccess: () => {
                setNewName("")
                setAdding(false)
            }
        })
    }

    const startEdit = (c: TodoList) => {
        setEditingId(c.id)
        setEditName(c.name)
    }

    const handleSaveEdit = () => {
        if (!editingId || !editName.trim()) return
        renameList.mutate({ listId: editingId, displayName: editName.trim() }, {
            onSuccess: () => {
                setEditingId(null)
                setEditName("")
            }
        })
    }

    const handleDelete = (id: string) => {
        if (id === "work") return
        const incomplete = counts.get(id) ?? 0
        if (incomplete > 0) {
            const ok = window.confirm(t("confirm_delete_list_with_count", String(incomplete)))
            if (!ok) return
        }
        deleteList.mutate(id, {
            onSuccess: () => {
                // 若刪除的是目前選取的類別，嘗試切到第一個類別
                if (selectedTodoListId === id && todoLists.length > 0) {
                    const next = todoLists.find(c => c.id !== id)
                    if (next) onSelectTodoList(next.id)
                }
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* 待辦事項標題 */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-md">
                <ListTodo className="size-4" />
                <span>{t("tasks")}</span>
            </div>

            {/* 類別管理 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-3">
                    <span className="text-sm font-medium">{t("lists")}</span>
                    <Tooltip content={adding ? t("tooltip_cancel") : t("tooltip_add_list")}>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => {
                                setAdding((s) => !s)
                                setNewName("")
                            }}
                        >
                            {adding ? <span className="text-xs">{t("cancel")}</span> : <Plus className="h-4 w-4" />}
                        </Button>
                    </Tooltip>
                </div>

                <div className="space-y-1">
                    {adding && (
                        <div className="flex items-center gap-2 px-3">
                            <input
                                className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm"
                                placeholder={t("category_name_placeholder")}
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleAdd()
                                    if (e.key === "Escape") { setAdding(false); setNewName("") }
                                }}
                            />
                            <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || createList.isPending} className="h-8 px-3">
                                {t("add")}
                            </Button>
                        </div>
                    )}

                    {todoLists.map((c) => (
                        <div key={c.id} className="px-3">
                            {editingId === c.id ? (
                                <div className="flex items-center gap-2">
                                    <input
                                        className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm"
                                        value={editName}
                                        autoFocus
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveEdit()
                                            if (e.key === "Escape") { setEditingId(null); setEditName("") }
                                        }}
                                    />
                                    <Button size="sm" onClick={handleSaveEdit} disabled={!editName.trim() || renameList.isPending} className="h-8 px-3">
                                        {t("save")}
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        className={cn(
                                            "flex-1 justify-start h-8 px-2",
                                            selectedTodoListId === c.id && "bg-accent text-accent-foreground"
                                        )}
                                        onClick={() => onSelectTodoList(c.id)}
                                    >
                                        <span className="truncate">{c.name}</span>
                                        <span className="ml-auto text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                                            {counts.get(c.id) ?? 0}
                                        </span>
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        <Tooltip content={t("tooltip_rename")}>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(c)}>
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </Tooltip>
                                        <Tooltip content={c.id === "work" ? t("tooltip_cannot_delete_default_list") : t("tooltip_delete_list")}>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                                                onClick={() => handleDelete(c.id)}
                                                disabled={c.id === "work" || deleteList.isPending}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </Tooltip>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function NavMain({ todoLists, selectedTodoListId, onSelectTodoList, t }: { todoLists: TodoList[]; selectedTodoListId: string; onSelectTodoList: (id: string) => void; t: TranslateFunction }) {
    const { collapsed } = useSidebar()
    const { token } = useAuth()
    const createList = useCreateMsTodoList(token)
    const deleteList = useDeleteMsTodoList(token)
    const renameList = useRenameMsTodoList(token)

    const [adding, setAdding] = React.useState(false)
    const [newName, setNewName] = React.useState("")
    const [editingId, setEditingId] = React.useState<string | null>(null)
    const [editName, setEditName] = React.useState("")

    const listIds = React.useMemo(() => todoLists.map((l) => l.id), [todoLists])
    const counts = usePendingCountsCache(listIds)

    const handleAdd = () => {
        if (!newName.trim()) return
        createList.mutate({ displayName: newName.trim() }, {
            onSuccess: () => {
                setNewName("")
                setAdding(false)
            }
        })
    }

    const startEdit = (c: TodoList) => {
        setEditingId(c.id)
        setEditName(c.name)
    }

    const handleSaveEdit = () => {
        if (!editingId || !editName.trim()) return
        renameList.mutate({ listId: editingId, displayName: editName.trim() }, {
            onSuccess: () => {
                setEditingId(null)
                setEditName("")
            }
        })
    }

    const handleDelete = (id: string) => {
        if (id === "work") return
        const incomplete = counts.get(id) ?? 0
        if (incomplete > 0) {
            const ok = window.confirm(t("confirm_delete_list_with_count", String(incomplete)))
            if (!ok) return
        }
        deleteList.mutate(id, {
            onSuccess: () => {
                // 若刪除的是目前選取的類別，嘗試切到第一個類別
                if (selectedTodoListId === id && todoLists.length > 0) {
                    const next = todoLists.find(c => c.id !== id)
                    if (next) onSelectTodoList(next.id)
                }
            }
        })
    }
    return (
        <>
            <SidebarGroup>
                <SidebarMenu>
                    <SidebarMenuItem>
                                <SidebarMenuButton tooltip={t("tasks")}>
                            <ListTodo className="size-4" />
                                    <span className={cn(collapsed && "hidden")}>{t("tasks")}</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarGroup>

            <SidebarGroup>
                <SidebarGroupLabel>
                    <div className="flex items-center justify-between">
                                <span>{t("lists")}</span>
                        {!collapsed && (
                                    <Tooltip content={adding ? t("tooltip_cancel") : t("tooltip_add_list")}>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => {
                                        setAdding((s) => !s)
                                        setNewName("")
                                    }}
                                >
                                            {adding ? <span className="text-xs">{t("cancel")}</span> : <Plus className="h-4 w-4" />}
                                </Button>
                            </Tooltip>
                        )}
                    </div>
                </SidebarGroupLabel>
                <SidebarMenu>
                    {adding && !collapsed && (
                        <SidebarMenuItem>
                            <div className="flex items-center gap-2 px-1">
                                <input
                                    className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm"
                                            placeholder={t("category_name_placeholder")}
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleAdd()
                                        if (e.key === "Escape") { setAdding(false); setNewName("") }
                                    }}
                                />
                                        <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || createList.isPending} className="h-8 px-3">
                                            {t("add")}
                                </Button>
                            </div>
                        </SidebarMenuItem>
                    )}
                    {todoLists.map((c) => (
                        <SidebarMenuItem key={c.id}>
                            {editingId === c.id && !collapsed ? (
                                <div className="flex items-center gap-2 px-1">
                                    <input
                                        className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm"
                                        value={editName}
                                        autoFocus
                                        onChange={(e) => setEditName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleSaveEdit()
                                            if (e.key === "Escape") { setEditingId(null); setEditName("") }
                                        }}
                                    />
                                    <Button size="sm" onClick={handleSaveEdit} disabled={!editName.trim() || renameList.isPending} className="h-8 px-3">
                                        {t("save")}
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <SidebarMenuButton
                                        tooltip={c.name}
                                        className={cn("flex-1", selectedTodoListId === c.id && "bg-accent/60 text-accent-foreground")}
                                        onClick={() => onSelectTodoList(c.id)}
                                    >
                                        <span className={cn("truncate", collapsed && "hidden")}>{c.name}</span>
                                        {!collapsed && (
                                            <span className="ml-auto text-[11px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                                                {counts.get(c.id) ?? 0}
                                            </span>
                                        )}
                                    </SidebarMenuButton>
                                    {!collapsed && (
                                        <div className="flex items-center gap-1 pr-1">
                                            <Tooltip content={t("tooltip_rename")}>
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => startEdit(c)}>
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </Tooltip>
                                            <Tooltip content={c.id === "work" ? t("tooltip_cannot_delete_default_list") : t("tooltip_delete_list")}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-50"
                                                    onClick={() => handleDelete(c.id)}
                                                    disabled={c.id === "work" || deleteList.isPending}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </Tooltip>
                                        </div>
                                    )}
                                </div>
                            )}
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </SidebarGroup>
        </>
    )
}

