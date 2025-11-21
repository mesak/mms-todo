import * as React from "react"
import { PanelRightOpen, Settings2, User } from "lucide-react"
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
import AuthGate from "./components/ui/auth-gate"
import { useI18n } from "./lib/i18n"

function PopupContent() {
    const auth = useAuth()
    console.log("[popup] PopupContent rendered, isLoggedIn:", auth.isLoggedIn)
    const { isLoggedIn, token } = auth
    const [selectedTodoListId, setSelectedTodoListId] = React.useState<string>("")
    const { data: msLists = [] } = useMsTodoLists(token)
    const { fontFamily, uiFontSize, itemFontSize } = useSettings()
    const { t } = useI18n()

    React.useEffect(() => {
        if (!selectedTodoListId && msLists.length > 0) {
            setSelectedTodoListId(msLists[0].id)
        }
    }, [msLists, selectedTodoListId])

    const openSidePanel = React.useMemo(() => debounce(async () => {
        const c: any = (globalThis as any).chrome
        if (!c?.tabs?.query || !c?.sidePanel?.open) return

        try {
            // 獲取當前活動標籤
            const tabs = await new Promise<any[]>((resolve) => {
                c.tabs.query({ active: true, currentWindow: true }, resolve)
            })

            if (!tabs[0]?.id) return

            const tabId = tabs[0].id

            // 檢查 SidePanel 是否已打開
            const options = await c.sidePanel.getOptions({ tabId })

            if (options?.enabled) {
                // SidePanel 已打開，嘗試切換焦點
                console.log("[popup] SidePanel already open, attempting to focus")

                // 方法 1: 重新打開 SidePanel（會自動聚焦）
                await c.sidePanel.open({ tabId })

                // 方法 2: 嘗試更新窗口焦點（備用）
                const currentWindow = await c.windows.getCurrent()
                if (currentWindow?.id) {
                    await c.windows.update(currentWindow.id, { focused: true })
                }
            } else {
                // SidePanel 未打開，正常打開
                console.log("[popup] Opening SidePanel")
                await c.sidePanel.open({ tabId })
            }
        } catch (error) {
            console.error("[popup] Failed to open/switch SidePanel:", error)
            // 回退：簡單打開
            c.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
                if (tabs[0]?.id) {
                    c.sidePanel.open({ tabId: tabs[0].id }).catch(console.error)
                }
            })
        }
    }, 500, true, false), [])

    const openOptionsPage = React.useMemo(() => debounce(() => (globalThis as any)?.chrome?.runtime?.openOptionsPage?.(), 500, true, false), [])

    // ✅ 改進 13: Popup 登入時打開 SidePanel 並關閉 Popup
    const handlePopupLogin = React.useCallback(async () => {
        console.log("[popup] Opening SidePanel for login...")
        const c: any = (globalThis as any).chrome
        if (!c?.tabs?.query || !c?.sidePanel?.open) {
            console.error("[popup] Chrome API not available")
            // 回退到直接登入
            await auth.login()
            return
        }

        // 打開 SidePanel
        c.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
            if (tabs[0]?.id) {
                c.sidePanel.open({ tabId: tabs[0].id })
                console.log("[popup] SidePanel opened")
            }
        })

        // 延遲後關閉 Popup，讓用戶在 SidePanel 中登入
        setTimeout(() => {
            window.close()
            console.log("[popup] Popup closed")
        }, 500)
    }, [auth.login])

    return (
        <div
            className="w-[420px] min-h-[520px] max-w-[420px] bg-background text-foreground border-none shadow-none overflow-hidden with-ui-scale"
            style={{ fontFamily: fontFamily, ['--ui-font-size' as any]: `${uiFontSize}px`, ['--todo-item-font-size' as any]: `${itemFontSize}px` }}
        >
            <AuthGate auth={auth} className="min-h-[520px]" size="sm" loginTitle={t("login_prompt")} onLoginClick={handlePopupLogin}>
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
                            <UserIndicator auth={auth} />
                            <Tooltip content={t("tooltip_settings")}>
                                <button
                                    onClick={openOptionsPage}
                                    className="p-2 hover:bg-accent rounded-md transition-colors text-foreground shrink-0"
                                    aria-label={t("open_settings")}
                                    title={t("open_settings")}
                                >
                                    <Settings2 className="h-4 w-4" />
                                </button>
                            </Tooltip>
                            <Tooltip content={t("tooltip_open_side_panel")}>
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
                        <TodoList selectedTodoListId={selectedTodoListId} hideCompleted listLabel={t("list_incomplete_tasks")} iconOnlyActions />
                    </div>
                </div>
            </AuthGate>
        </div>
    )
}

interface UserIndicatorProps {
    auth: ReturnType<typeof useAuth>
}

function UserIndicator({ auth }: UserIndicatorProps) {
    const { token, logout } = auth
    console.log("[popup] UserIndicator rendered, logout function:", !!logout)
    const { data: me } = useMsMe(token)
    const { t } = useI18n()
    const name = me?.displayName || me?.userPrincipalName || me?.mail || t("user_placeholder")
    const email = me?.mail || me?.userPrincipalName
    const [open, setOpen] = React.useState(false)
    const onLogout = React.useMemo(() => debounce(async () => {
        console.log("[popup] Logout button clicked")
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
                    <div className="px-2 py-1 text-xs text-muted-foreground">{t("signed_in")}</div>
                    <div className="px-2 py-1 text-sm font-medium truncate">{name}</div>
                    {email ? (
                        <div className="px-2 pb-2 text-xs text-muted-foreground truncate">{email}</div>
                    ) : null}
                    <div className="h-px bg-border my-1" />
                    <button
                        className="w-full text-left px-2 py-2 rounded hover:bg-accent"
                        onClick={onLogout}
                    >
                        {t("sign_out")}
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