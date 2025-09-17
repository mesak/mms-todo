import * as React from "react"
import { PanelRightOpen } from "lucide-react"
import { Providers } from "./providers"
import "./styles/globals.css"
import { TodoList } from "./ui/TodoList"
import { Tooltip } from "./components/ui/tooltip"
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
                    <Tooltip content="開啟側邊面板">
                        <button
                            onClick={openSidePanel}
                            className="p-2 hover:bg-accent rounded-md transition-colors text-foreground"
                        >
                            <PanelRightOpen className="h-4 w-4" />
                        </button>
                    </Tooltip>
                </div>
                <TodoList selectedCategoryId={selectedCategoryId} hideCompleted listLabel="未完成任務" iconOnlyActions />
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