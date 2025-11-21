import * as React from "react"
import "./styles/globals.css"
import { Providers } from "./providers"
import { Separator } from "./components/ui/separator"
// import { useTodoLists, useTodoTasks } from "./hooks/useTodos"
import { AppSidebar } from "./components/sidepanel/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "./components/ui/sidebar"
import { TodoList } from "./ui/TodoList"
import { Menu, X } from "lucide-react"
import { Button } from "./components/ui/button"
import { useSettings } from "./hooks/useSettings"
import { useAuth } from "./hooks/useAuth"
import { useMsTodoLists } from "./hooks/useMsTodos"
import { debounce } from "./lib/utils"
import AuthGate from "./components/ui/auth-gate"
import { useI18n } from "./lib/i18n"
// Resolve icon from assets for MV3 build (use Plasmo ~assets alias)
const logoUrl = new URL("~assets/icon.png", import.meta.url).toString()

export default function IndexSidePanel() {
    return (
        <Providers>
            <SidePanelShell />
        </Providers>
    )
}

function SidePanelShell() {
    const auth = useAuth()
    const { token, isLoggedIn } = auth
    const { data: msLists = [], isLoading: listsLoading } = useMsTodoLists(token)
    const [selectedTodoListId, setSelectedTodoListId] = React.useState<string>("")
    const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(false)
    const { fontFamily, uiFontSize, itemFontSize } = useSettings()
    const { t } = useI18n()

    // login handled by AuthGate when logged out

    // Ensure a valid selected todo list when lists load or change
    React.useEffect(() => {
        if (listsLoading) return
        if (msLists.length === 0) return
        const exists = msLists.some((l) => l.id === selectedTodoListId)
        if (!exists) {
            setSelectedTodoListId(msLists[0].id)
        }
    }, [msLists, listsLoading, selectedTodoListId])

    return (
        <div
            className="fixed inset-0 w-screen h-screen bg-background text-foreground overflow-hidden flex flex-col with-ui-scale"
            style={{ fontFamily: fontFamily, ['--ui-font-size' as any]: `${uiFontSize}px`, ['--todo-item-font-size' as any]: `${itemFontSize}px` }}
        >
            {/* Top Navbar */}
            <nav className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0 z-50">
                <div className="flex items-center gap-2">
                    <img src={logoUrl} alt="MMS TODO" className="size-6" />
                    <span className="text-lg font-semibold">mms-todo</span>
                </div>
                {isLoggedIn && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 h-8 w-8 hover:bg-accent transition-colors"
                        title={t("list_management")}
                    >
                        <Menu className="h-4 w-4" />
                    </Button>
                )}
            </nav>

            {/* Main Content Area */}
            <div className="flex-1 flex relative min-h-0 h-full">
                {/* Main Content */}
                <main className="flex-1 p-1 h-full">
                    <AuthGate auth={auth}>
                        <div className="space-y-4 h-full">
                            <div className="flex items-center justify-between">
                                <div className="text-lg font-semibold">{t("tasks")}</div>
                            </div>
                            <Separator />
                            <div className="flex-1">
                                <TodoList selectedTodoListId={selectedTodoListId} listLabel={t("task_list")} maxHeight="calc(100vh - 200px)" />
                            </div>
                        </div>
                    </AuthGate>
                </main>

                {/* Right Sidebar Overlay */}
                {sidebarOpen && (
                    <>
                        {/* Backdrop */}
                        <div
                            className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
                            onClick={() => setSidebarOpen(false)}
                        />
                        {/* Sidebar Panel */}
                        <div className="fixed right-0 top-12 bottom-0 w-80 bg-background border-l border-border shadow-xl z-50 transform transition-transform duration-200 ease-in-out">
                            <div className="h-full flex flex-col">
                                <div className="p-4 border-b border-border flex items-center justify-between bg-card">
                                    <span className="font-semibold text-card-foreground">{t("list_management")}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSidebarOpen(false)}
                                        className="p-1 h-6 w-6 hover:bg-accent"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="flex-1 overflow-y-auto">
                                    <AppSidebar
                                        todoLists={msLists.map(l => ({ id: l.id, name: l.displayName, createdAt: Date.now() }))}
                                        selectedTodoListId={selectedTodoListId}
                                        onSelectTodoList={setSelectedTodoListId}
                                        isOverlay={true}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Collapsed Sidebar Icon */}
                {!sidebarOpen && isLoggedIn && (
                    <div className="fixed right-3 top-1/2 -translate-y-1/2 z-30">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 h-8 w-8 rounded-full shadow-lg bg-background border-border hover:bg-accent transition-colors"
                            title={t("open_list_management")}
                        >
                            <Menu className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
