import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "./button"
import type { Category } from "../../types/todo"

interface CategorySelectProps {
  categories: Category[]
  selectedCategoryId: string
  onCategoryChange: (categoryId: string) => void
}

export function CategorySelect({
  categories,
  selectedCategoryId,
  onCategoryChange
}: CategorySelectProps) {
  const [open, setOpen] = React.useState(false)

  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-[200px] px-3 py-2 text-sm border border-input rounded-md bg-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
      >
        {selectedCategory ? selectedCategory.name : "選擇類別..."}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute top-full mt-1 w-[200px] bg-popover border border-border rounded-md shadow-md z-50">
          <div className="p-2">
            <input
              placeholder="搜尋類別..."
              className="w-full px-2 py-1 text-sm border border-input rounded bg-background"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => {
                  onCategoryChange(category.id)
                  setOpen(false)
                }}
                className="flex items-center w-full px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedCategoryId === category.id ? "opacity-100" : "opacity-0"
                  )}
                />
                {category.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}