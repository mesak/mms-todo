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
        <div className="w-[360px] min-h-[400px] max-w-[360px] bg-background text-foreground border-none shadow-none overflow-hidden">
            <div className="p-3 space-y-3 w-full max-w-full box-border">
                <div className="flex items-center justify-between gap-2 w-full max-w-full">
                    <div className="flex-1 min-w-0">
                        <CategoryCombobox
                            categories={categories}
                            selectedCategoryId={selectedCategoryId}
                            onChange={setSelectedCategoryId}
                        />
                    </div>
                    <Tooltip content="開啟側邊面板">
                        <button
                            onClick={openSidePanel}
                            className="p-2 hover:bg-accent rounded-md transition-colors text-foreground shrink-0"
                        >
                            <PanelRightOpen className="h-4 w-4" />
                        </button>
                    </Tooltip>
                </div>
                <div className="w-full max-w-full overflow-hidden">
                    <TodoList selectedCategoryId={selectedCategoryId} hideCompleted listLabel="未完成任務" iconOnlyActions />
                </div>
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