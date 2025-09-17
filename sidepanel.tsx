import * as React from "react"
import { Plus, Edit2, Trash2, ListTodo, Folder, ChevronLeft, ChevronRight } from "lucide-react"
import { Providers } from "./providers"
import "./styles/globals.css"
import { Input } from "./components/ui/input"
import { Button } from "./components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card"
import { Separator } from "./components/ui/separator"
import { useCategories } from "./hooks/useTodos"
import type { Category } from "./types/todo"
import { CategoryCombobox } from "./components/ui/category-combobox"
import { TodoList } from "./ui/TodoList"

type View = "todos" | "categories"

function CategoriesManager() {
    const [newCategoryName, setNewCategoryName] = React.useState("")
    const [editingCategory, setEditingCategory] = React.useState<Category | null>(null)
    const [editName, setEditName] = React.useState("")

    const { data: categories = [], isLoading, add, update, remove } = useCategories()

    const onAddCategory = () => {
        if (!newCategoryName.trim()) return
        add.mutate(newCategoryName, {
            onSuccess: () => setNewCategoryName(""),
            onError: (error) => console.error("Add category failed:", error)
        })
    }

    const onEditCategory = (category: Category) => {
        setEditingCategory(category)
        setEditName(category.name)
    }

    const onSaveEdit = () => {
        if (!editName.trim() || !editingCategory) return
        update.mutate(
            { id: editingCategory.id, name: editName },
            {
                onSuccess: () => {
                    setEditingCategory(null)
                    setEditName("")
                },
                onError: (error) => console.error("Update category failed:", error)
            }
        )
    }

    const onDeleteCategory = (categoryId: string) => {
        if (categoryId === "work") return
        remove.mutate(categoryId, {
            onError: (error) => console.error("Delete category failed:", error)
        })
    }

    return (
        <Card className="rounded-xl">
            <CardHeader className="border-b border-border">
                <CardTitle className="text-2xl">類別管理</CardTitle>
                <CardDescription>管理您的任務類別</CardDescription>
            </CardHeader>
            <CardContent className="py-6 space-y-6">
                {/* 新增類別 */}
                <div className="space-y-4">
                    <h2 className="text-base font-semibold text-foreground">新增類別</h2>
                    <div className="flex gap-3">
                        <Input
                            placeholder="輸入類別名稱..."
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault()
                                    onAddCategory()
                                }
                            }}
                            className="flex-1 h-11"
                        />
                        <Button
                            onClick={onAddCategory}
                            size="default"
                            disabled={!newCategoryName.trim() || add.isPending}
                            className="px-6 h-11"
                        >
                            {add.isPending ? "新增中..." : <Plus className="h-4 w-4 mr-2" />}
                            {!add.isPending && "新增"}
                        </Button>
                    </div>
                </div>

                <Separator className="my-2" />

                {/* 類別列表 */}
                <div className="space-y-4">
                    <h2 className="text-base font-semibold text-foreground">類別列表</h2>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-sm text-muted-foreground">載入中...</div>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg bg-muted/20">
                            <div className="text-sm">目前沒有類別</div>
                            <div className="text-xs mt-2">新增一個類別來開始使用</div>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                            {categories.map((category) => (
                                <div
                                    key={category.id}
                                    className="flex items-center gap-4 p-4 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors shadow-sm"
                                >
                                    {editingCategory?.id === category.id ? (
                                        <div className="flex-1 flex gap-3">
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault()
                                                        onSaveEdit()
                                                    }
                                                }}
                                                className="flex-1 h-10"
                                            />
                                            <Button onClick={onSaveEdit} size="sm" variant="default" disabled={update.isPending} className="h-10 px-4">
                                                {update.isPending ? "儲存中..." : "儲存"}
                                            </Button>
                                            <Button onClick={() => setEditingCategory(null)} size="sm" variant="outline" className="h-10 px-4">
                                                取消
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-foreground truncate">{category.name}</div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {new Date(category.createdAt).toLocaleDateString("zh-TW")}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() => onEditCategory(category)}
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-9 w-9 p-0 hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    onClick={() => onDeleteCategory(category.id)}
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={category.id === "work" || remove.isPending}
                                                    className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default function IndexSidePanel() {
    return (
        <Providers>
            <SidePanelShell />
        </Providers>
    )
}

function SidePanelShell() {
    const [collapsed, setCollapsed] = React.useState<boolean>(false)
    const [view, setView] = React.useState<View>("todos")
    const { data: categories = [], isLoading } = useCategories()
    const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("work")

    // Ensure a valid selected category when categories load or change
    React.useEffect(() => {
        if (isLoading) return
        if (categories.length === 0) return
        const exists = categories.some((c) => c.id === selectedCategoryId)
        if (!exists) {
            setSelectedCategoryId(categories[0].id)
        }
    }, [categories, isLoading, selectedCategoryId])

    return (
        <div className="fixed inset-0 w-full h-full bg-background text-foreground flex overflow-hidden">
            {/* Sidebar */}
            <aside className={`border-r border-border transition-all duration-200 ${collapsed ? "w-14" : "w-56"} flex flex-col`}>
                <div className="h-12 flex items-center justify-between px-2">
                    {!collapsed && <div className="px-2 text-sm font-semibold">MMS Todo</div>}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCollapsed((c) => !c)}
                        title={collapsed ? "展開" : "收合"}
                        className="h-8 w-8 p-0"
                    >
                        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                </div>
                <Separator />
                <nav className="flex-1 py-2">
                    <SidebarItem
                        active={view === "todos"}
                        collapsed={collapsed}
                        icon={<ListTodo className="h-4 w-4" />}
                        label="待辦事項"
                        onClick={() => setView("todos")}
                    />
                    <SidebarItem
                        active={view === "categories"}
                        collapsed={collapsed}
                        icon={<Folder className="h-4 w-4" />}
                        label="類別管理"
                        onClick={() => setView("categories")}
                    />
                </nav>
                <div className="p-2 text-[10px] text-muted-foreground/70">{!collapsed && "v0.0.1"}</div>
            </aside>

            {/* Content */}
            <main className="flex-1 p-4">
                {view === "todos" ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="text-lg font-semibold">待辦事項</div>
                        </div>
                        <div className="flex items-center gap-3">
                            <CategoryCombobox
                                categories={categories}
                                selectedCategoryId={selectedCategoryId}
                                onChange={setSelectedCategoryId}
                                className="w-[240px]"
                                placeholder="選擇類別..."
                            />
                        </div>
                        <Separator />
                        <TodoList selectedCategoryId={selectedCategoryId} />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <CategoriesManager />
                    </div>
                )}
            </main>
        </div>
    )
}

function SidebarItem({
    active,
    collapsed,
    icon,
    label,
    onClick
}: {
    active?: boolean
    collapsed?: boolean
    icon: React.ReactNode
    label: string
    onClick?: () => void
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 ${collapsed ? "justify-center px-0" : "px-3"} h-10 text-sm hover:bg-accent transition-colors ${
                active ? "bg-accent/60 text-accent-foreground" : ""
            }`}
            title={label}
        >
            <span className="inline-flex items-center justify-center h-6 w-6 text-muted-foreground">{icon}</span>
            {!collapsed && <span className="truncate">{label}</span>}
        </button>
    )
}