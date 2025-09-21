import * as React from "react"
import * as Popover from "@radix-ui/react-popover"
import { Command } from "cmdk"
import { ChevronsUpDown, Check } from "lucide-react"
import { cn } from "../../lib/utils"
export type ListOption = { id: string; name: string }

interface TodoListComboboxProps {
  todoLists: ListOption[]
  selectedTodoListId?: string
  onChange: (todoListId: string) => void
  placeholder?: string
  className?: string
  size?: "default" | "sm"
}

export function TodoListCombobox({
  todoLists,
  selectedTodoListId,
  onChange,
  placeholder = "選擇清單...",
  className,
  size = "default"
}: TodoListComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selected = todoLists.find((t) => t.id === selectedTodoListId)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-[220px] items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-sm transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
            size === "default" ? "h-9" : "h-8",
            className
          )}
        >
          <span className={cn(!selected && "text-muted-foreground")}>{selected ? selected.name : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content sideOffset={8} className="z-50 w-[260px] rounded-md border bg-popover p-2 shadow-md outline-none">
          <Command className="bg-transparent">
            <Command.Input placeholder="搜尋清單..." className="w-full px-2 py-1 text-sm border border-input rounded bg-background" />
            <div className="max-h-[50vh] overflow-y-auto">
              {todoLists.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    onChange(t.id)
                    setOpen(false)
                  }}
                  className="flex items-center w-full px-2 py-1 text-sm hover:bg-accent rounded transition-colors"
                >
                  <Check className={cn("mr-2 h-4 w-4", selectedTodoListId === t.id ? "opacity-100" : "opacity-0")} />
                  {t.name}
                </button>
              ))}
            </div>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
