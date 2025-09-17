import * as React from "react"
import { Settings } from "lucide-react"
import { Providers } from "./providers"
import "./styles/globals.css"
import { TodoList } from "./ui/TodoList"
import { CategoryCombobox } from "./components/ui/category-combobox"
import { useCategories } from "./hooks/useTodos"

function PopupContent() {
    const [selectedCategoryId, setSelectedCategoryId] = React.useState("work")
    const { data: categories = [] } = useCategories()

    const openSidePanel = () => {
        // 使用更簡單的方式開啟側邊面板
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.sidePanel.open({ tabId: tabs[0].id })
            }
        })
    }

    return (
        <div className="w-[360px] min-h-[400px] bg-background text-foreground border-none shadow-none">
            <div className="p-3 space-y-3">
                <div className="flex items-center justify-between">
                    <CategoryCombobox
                        categories={categories}
                        selectedCategoryId={selectedCategoryId}
                        onChange={setSelectedCategoryId}
                    />
                    <button
                        onClick={openSidePanel}
                        className="p-2 hover:bg-accent rounded-md transition-colors text-foreground"
                        title="開啟側邊面板"
                    >
                        <Settings className="h-4 w-4" />
                    </button>
                </div>
                <TodoList selectedCategoryId={selectedCategoryId} />
            </div>
        </div>
    )
}

export default function IndexPopup() {
    return (
        <Providers>
            <PopupContent />
        </Providers>
    )
}