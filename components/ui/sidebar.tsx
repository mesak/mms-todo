import * as React from "react"
import { PanelLeftOpen, PanelLeftClose } from "lucide-react"
import { Button } from "./button"
import { cn } from "../../lib/utils"
import { Tooltip } from "./tooltip"

type SidebarContextType = {
    collapsed: boolean
    toggle: () => void
}

const SidebarContext = React.createContext<SidebarContextType | null>(null)

export function useSidebar() {
    const ctx = React.useContext(SidebarContext)
    if (!ctx) throw new Error("useSidebar must be used within SidebarProvider")
    return ctx
}

const STORAGE_KEY = "sidebarCollapsed"

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [collapsed, setCollapsed] = React.useState(false)

    // restore from storage on mount
    React.useEffect(() => {
        try {
            chrome.storage.local.get([STORAGE_KEY], (res) => {
                const v = res[STORAGE_KEY]
                if (typeof v === "boolean") setCollapsed(v)
            })
        } catch { }
    }, [])

    const toggle = React.useCallback(() => {
        setCollapsed((c) => {
            const next = !c
            try {
                chrome.storage.local.set({ [STORAGE_KEY]: next })
            } catch { }
            return next
        })
    }, [])

    return (
        <SidebarContext.Provider value={{ collapsed, toggle }}>
            <div
                className={"group/sidebar-wrapper flex h-full w-full"}
                data-collapsible={collapsed ? "icon" : "expanded"}
            >
                {children}
            </div>
        </SidebarContext.Provider>
    )
}

export function SidebarTrigger({ className }: { className?: string }) {
    const { collapsed, toggle } = useSidebar()
    return (
        <Tooltip content={collapsed ? "展開清單" : "收合清單"}>
            <Button
                variant="ghost"
                size="sm"
                onClick={toggle}
                className={cn("h-8 w-8 p-0 text-foreground", className)}
            >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
        </Tooltip>
    )
}

export function SidebarInset({ className, children }: { className?: string; children: React.ReactNode }) {
    return <div className={cn("flex flex-1 min-w-0 flex-col", className)}>{children}</div>
}

// Sidebar container and parts (simplified version of shadcn sidebar)
export function Sidebar({ collapsible = "icon", className, children, ...props }: React.ComponentProps<"aside"> & { collapsible?: "icon" | "none" }) {
    const { collapsed } = useSidebar()
    return (
        <aside
            className={cn(
                "border-r border-border transition-[width] duration-200 flex flex-col",
                collapsed && collapsible === "icon" ? "w-14" : "w-56",
                className
            )}
            data-collapsible={collapsed && collapsible === "icon" ? "icon" : "expanded"}
            {...props}
        >
            {children}
        </aside>
    )
}

export function SidebarHeader({ className, children }: React.ComponentProps<"div">) {
    return <div className={cn("h-12 flex items-center justify-center px-2", className)}>{children}</div>
}

export function SidebarContent({ className, children }: React.ComponentProps<"div">) {
    return <div className={cn("flex-1 py-2 overflow-y-auto", className)}>{children}</div>
}

export function SidebarFooter({ className, children }: React.ComponentProps<"div">) {
    return <div className={cn("p-2 text-[10px] text-muted-foreground/70", className)}>{children}</div>
}

export function SidebarRail({ className }: { className?: string }) {
    // Decorative rail on the far left; kept minimal here
    return <div className={cn("sr-only", className)} />
}

// Group and menu primitives
export function SidebarGroup({ className, children }: React.ComponentProps<"div">) {
    return <div className={cn("px-2", className)}>{children}</div>
}

export function SidebarGroupLabel({ className, children }: React.ComponentProps<"div">) {
    return <div className={cn("px-2 text-[11px] uppercase tracking-wider text-muted-foreground/80 mb-2", className)}>{children}</div>
}

export function SidebarMenu({ className, children }: React.ComponentProps<"ul">) {
    return <ul className={cn("space-y-1", className)}>{children}</ul>
}

export function SidebarMenuItem({ className, children }: React.ComponentProps<"li">) {
    return <li className={cn("list-none", className)}>{children}</li>
}

export function SidebarMenuButton({
    className,
    children,
    onClick,
    tooltip
}: React.ComponentProps<"button"> & { tooltip?: string }) {
    const btn = (
        <button
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-3 h-9 text-sm hover:bg-accent rounded-md transition-colors text-foreground",
                className
            )}
        >
            {children}
        </button>
    )
    return tooltip ? <Tooltip content={tooltip}>{btn}</Tooltip> : btn
}

export function SidebarMenuSub({ className, children }: React.ComponentProps<"ul">) {
    return <ul className={cn("mt-1 ml-6 space-y-1", className)}>{children}</ul>
}

export function SidebarMenuSubItem({ className, children }: React.ComponentProps<"li">) {
    return <li className={cn("list-none", className)}>{children}</li>
}

export function SidebarMenuSubButton({ className, children, asChild }: { className?: string; children: React.ReactNode; asChild?: boolean }) {
    if (asChild) return <>{children}</>
    return <button className={cn("w-full text-left px-3 py-1.5 text-sm hover:bg-accent rounded-md", className)}>{children}</button>
}
