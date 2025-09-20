import * as React from "react"
import "./styles/globals.css"
import { Providers } from "./providers"
import { Separator } from "./components/ui/separator"
import { useCategories, useTodos } from "./hooks/useTodos"
import { AppSidebar } from "./components/sidepanel/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "./components/ui/sidebar"
import { TodoList } from "./ui/TodoList"
import { Menu, X } from "lucide-react"
import { Button } from "./components/ui/button"

export default function IndexSidePanel() {
    return (
        <Providers>
            <SidePanelShell />
        </Providers>
    )
}

function SidePanelShell() {
    const { data: categories = [], isLoading } = useCategories()
    const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("work")
    const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(false)

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
        <div className="fixed inset-0 w-screen h-screen bg-background text-foreground overflow-hidden flex flex-col">
            {/* Top Navbar */}
            <nav className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0 z-50">
                <div className="flex items-center gap-2">
                    <img src="/assets/icon.png" alt="MMS TODO" className="size-6" />
                    <span className="text-lg font-semibold">MMS TODO</span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 h-8 w-8 hover:bg-accent transition-colors"
                >
                    <Menu className="h-4 w-4" />
                </Button>
            </nav>

            {/* Main Content Area */}
            <div className="flex-1 flex relative min-h-0 h-full">
                {/* Main Content */}
                <main className="flex-1 p-1 h-full">
                    <div className="space-y-4 h-full">
                        <div className="flex items-center justify-between">
                            <div className="text-lg font-semibold">待辦事項</div>
                        </div>
                        <Separator />
                        <div className="flex-1">
                            <TodoList selectedCategoryId={selectedCategoryId} listLabel="任務清單" maxHeight="calc(100vh - 200px)" />
                        </div>
                    </div>
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
                                    <span className="font-semibold text-card-foreground">分類管理</span>
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
                                        categories={categories} 
                                        selectedCategoryId={selectedCategoryId} 
                                        onSelectCategory={setSelectedCategoryId}
                                        isOverlay={true}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Collapsed Sidebar Icon */}
                {!sidebarOpen && (
                    <div className="fixed right-3 top-1/2 -translate-y-1/2 z-30">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 h-8 w-8 rounded-full shadow-lg bg-background border-border hover:bg-accent transition-colors"
                            title="開啟分類管理"
                        >
                            <Menu className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    )
}
