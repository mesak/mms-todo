import * as React from "react"
import { PanelRightOpen, Settings2 } from "lucide-react"
import { Providers } from "./providers"
import "./styles/globals.css"
import { TodoList } from "./ui/TodoList"
import { Tooltip } from "./components/ui/tooltip"
import { TodoListCombobox } from "./components/ui/todolist-combobox"
import { useTodoLists } from "./hooks/useTodos"
import { useSettings } from "./hooks/useSettings"

function PopupContent() {
    const [selectedTodoListId, setSelectedTodoListId] = React.useState("work")
    const { data: todoLists = [] } = useTodoLists()
    const { fontFamily, uiFontSize, itemFontSize } = useSettings()

    const openSidePanel = () => {
        // 使用更簡單的方式開啟側邊面板
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.sidePanel.open({ tabId: tabs[0].id })
            }
        })
    }

    return (
        <div
            className="w-[360px] min-h-[500px] max-w-[360px] bg-background text-foreground border-none shadow-none overflow-hidden with-ui-scale"
            style={{ fontFamily: fontFamily, ['--ui-font-size' as any]: `${uiFontSize}px`, ['--todo-item-font-size' as any]: `${itemFontSize}px` }}
        >
            <div className="p-3 space-y-3 w-full max-w-full box-border">
                <div className="flex items-center justify-between gap-2 w-full max-w-full">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Tooltip content="設定">
                            <button
                                onClick={() => chrome.runtime.openOptionsPage?.()}
                                className="p-2 hover:bg-accent rounded-md transition-colors text-foreground shrink-0"
                                aria-label="開啟設定"
                                title="開啟設定"
                            >
                                <Settings2 className="h-4 w-4" />
                            </button>
                        </Tooltip>
                        <TodoListCombobox
                            todoLists={todoLists}
                            selectedTodoListId={selectedTodoListId}
                            onChange={setSelectedTodoListId}
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
                    <TodoList selectedTodoListId={selectedTodoListId} hideCompleted listLabel="未完成任務" iconOnlyActions />
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