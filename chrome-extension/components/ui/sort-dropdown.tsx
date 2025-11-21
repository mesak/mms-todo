import * as React from "react"
import * as Popover from "@radix-ui/react-popover"
import { ArrowUpDown, Check } from "lucide-react"
import { cn } from "../../lib/utils"
import { useI18n } from "../../lib/i18n"

export type SortOption = "created" | "modified" | "title" | "due"

interface SortDropdownProps {
    value: SortOption
    onChange: (value: SortOption) => void
    className?: string
}

export function SortDropdown({ value, onChange, className }: SortDropdownProps) {
    const [open, setOpen] = React.useState(false)
    const { t } = useI18n()

    const options: { value: SortOption; label: string }[] = [
        { value: "created", label: t("sort_by_created") },
        { value: "modified", label: t("sort_by_modified") },
        { value: "title", label: t("sort_by_title") },
        { value: "due", label: t("sort_by_due") },
    ]

    const selectedLabel = options.find((o) => o.value === value)?.label

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    className={cn(
                        "flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors",
                        className
                    )}
                    title={t("sort_tasks")}
                >
                    <ArrowUpDown className="h-3 w-3" />
                    <span>{selectedLabel}</span>
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content side="bottom" align="end" sideOffset={4} className="z-50 w-40 rounded-md border bg-popover p-1 shadow-md outline-none">
                    <div className="flex flex-col gap-1">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value)
                                    setOpen(false)
                                }}
                                className="flex items-center justify-between w-full px-2 py-1.5 text-sm hover:bg-accent rounded transition-colors text-left"
                            >
                                <span>{option.label}</span>
                                {value === option.value && <Check className="h-3 w-3" />}
                            </button>
                        ))}
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    )
}
