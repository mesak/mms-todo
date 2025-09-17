import * as React from "react"
import { Providers } from "./providers"
import "./styles/globals.css"
import { Separator } from "./components/ui/separator"
import { useCategories, useTodos } from "./hooks/useTodos"
import { AppSidebar } from "./components/sidepanel/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from "./components/ui/sidebar"
import { TodoList } from "./ui/TodoList"

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
        <div className="fixed inset-0 w-full h-full bg-background text-foreground overflow-hidden">
            <SidebarProvider>
                <AppSidebar categories={categories} selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} />
                <SidebarInset>
                    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-10">
                        <div className="flex items-center gap-2">
                            <SidebarTrigger className="-ml-1" />
                            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
                            <div className="text-sm font-semibold">Content</div>
                        </div>
                    </header>
                    <div className="flex flex-1 min-h-0 p-4 pt-2">
                        <main className="flex-1 overflow-y-auto min-w-0">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="text-lg font-semibold">待辦事項</div>
                                </div>
                                <Separator />
                                <TodoList selectedCategoryId={selectedCategoryId} listLabel="任務清單" />
                            </div>
                        </main>
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </div>
    )
}
