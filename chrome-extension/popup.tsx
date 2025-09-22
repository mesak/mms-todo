import * as React from "react"
import { PanelRightOpen, Settings2, LogIn, User } from "lucide-react"
import * as Popover from "@radix-ui/react-popover"
import { Providers } from "./providers"
import "./styles/globals.css"
import { TodoList } from "./ui/TodoList"
import { Tooltip } from "./components/ui/tooltip"
import { TodoListCombobox } from "./components/ui/todolist-combobox"
// import { useTodoLists } from "./hooks/useTodos"
import { useSettings } from "./hooks/useSettings"
import { useAuth } from "./hooks/useAuth"
import { useMsMe, useMsTodoLists } from "./hooks/useMsTodos"
import { debounce } from "./lib/utils"

function PopupContent() {
    const { isLoggedIn, isLoading, login, token } = useAuth()
    const [selectedTodoListId, setSelectedTodoListId] = React.useState<string>("")
    const { data: msLists = [] } = useMsTodoLists(token)
    const { fontFamily, uiFontSize, itemFontSize } = useSettings()

    React.useEffect(() => {
        if (!selectedTodoListId && msLists.length > 0) {
            setSelectedTodoListId(msLists[0].id)
        }
    }, [msLists, selectedTodoListId])

    const openSidePanel = React.useMemo(() => debounce(() => {
        // 使用更簡單的方式開啟側邊面板
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.id) {
                chrome.sidePanel.open({ tabId: tabs[0].id })
            }
        })
    }, 500, true, false), [])

    const onLoginClick = React.useMemo(() => debounce(() => { login() }, 800, true, false), [login])
    const openOptionsPage = React.useMemo(() => debounce(() => chrome.runtime.openOptionsPage?.(), 500, true, false), [])

    if (isLoading) {
        return (
            <div className="w-[360px] min-h-[500px] flex items-center justify-center text-sm text-muted-foreground">
                載入中...
            </div>
        )
    }

    if (!isLoggedIn) {
        return (
            <div className="w-[360px] min-h-[500px] bg-background text-foreground flex flex-col items-center justify-center gap-4">
                <div className="text-base font-medium">請先登入 Microsoft 帳號</div>
                <button
                    onClick={onLoginClick}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition"
                >
                    <LogIn className="h-4 w-4" />
                    登入
                </button>
            </div>
        )
    }

    return (
        <div
            className="w-[420px] min-h-[500px] max-w-[420px] bg-background text-foreground border-none shadow-none overflow-hidden with-ui-scale"
            style={{ fontFamily: fontFamily, ['--ui-font-size' as any]: `${uiFontSize}px`, ['--todo-item-font-size' as any]: `${itemFontSize}px` }}
        >
            <div className="p-3 space-y-3 w-full max-w-full box-border">
                <div className="flex items-center justify-between gap-2 w-full max-w-full">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <TodoListCombobox
                            todoLists={msLists.map((l) => ({ id: l.id, name: l.displayName }))}
                            selectedTodoListId={selectedTodoListId}
                            onChange={setSelectedTodoListId}
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <UserIndicator />
                        <Tooltip content="設定">
                            <button
                                onClick={openOptionsPage}
                                className="p-2 hover:bg-accent rounded-md transition-colors text-foreground shrink-0"
                                aria-label="開啟設定"
                                title="開啟設定"
                            >
                                <Settings2 className="h-4 w-4" />
                            </button>
                        </Tooltip>
                        <Tooltip content="開啟側邊面板">
                            <button
                                onClick={openSidePanel}
                                className="p-2 hover:bg-accent rounded-md transition-colors text-foreground shrink-0"
                            >
                                <PanelRightOpen className="h-4 w-4" />
                            </button>
                        </Tooltip>
                    </div>
                </div>
                <div className="w-full max-w-full overflow-hidden">
                    <TodoList selectedTodoListId={selectedTodoListId} hideCompleted listLabel="未完成任務" iconOnlyActions />
                </div>
            </div>
        </div>
    )
}

function UserIndicator() {
    const { token, logout } = useAuth()
    const { data: me } = useMsMe(token)
    const name = me?.displayName || me?.userPrincipalName || me?.mail || "使用者"
    const email = me?.mail || me?.userPrincipalName
    const [open, setOpen] = React.useState(false)
    const onLogout = React.useMemo(() => debounce(async () => {
        await logout()
        setOpen(false)
    }, 600, true, false), [logout])
    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <div>
                    <Tooltip content={name}>
                        <button
                            className="p-2 hover:bg-accent rounded-md transition-colors text-foreground shrink-0"
                            aria-label={name}
                            title={name}
                        >
                            <User className="h-4 w-4" />
                        </button>
                    </Tooltip>
                </div>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content side="bottom" align="end" sideOffset={6} className="z-50 w-56 rounded-md border bg-background text-foreground shadow-md p-2">
                    <div className="px-2 py-1 text-xs text-muted-foreground">已登入</div>
                    <div className="px-2 py-1 text-sm font-medium truncate">{name}</div>
                    {email ? (
                        <div className="px-2 pb-2 text-xs text-muted-foreground truncate">{email}</div>
                    ) : null}
                    <div className="h-px bg-border my-1" />
                    <button
                        className="w-full text-left px-2 py-2 rounded hover:bg-accent"
                        onClick={onLogout}
                    >
                        登出
                    </button>
                    <Popover.Arrow className="fill-background" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    )
}

export default function IndexPopup() {
    return (
        <Providers>
            <PopupContent />
        </Providers>
    )
}