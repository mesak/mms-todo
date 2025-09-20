import * as React from "react"
import { cn } from "../../lib/utils"

export interface ExpandableInputProps {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent) => void
  className?: string
  disabled?: boolean
}

export const ExpandableInput = React.forwardRef<HTMLTextAreaElement, ExpandableInputProps>(
  ({ placeholder, value, onChange, onKeyDown, className, disabled, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    
    // 合併 ref
    React.useImperativeHandle(ref, () => textareaRef.current!, [])

    const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        // Enter 提交（不換行）
        e.preventDefault()
        onKeyDown?.(e)
        return
      }
      
      // Shift+Enter 正常換行，其他按鍵正常處理
      onKeyDown?.(e)
    }, [onKeyDown])

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
    }, [onChange])

    // 自動調整高度
    React.useEffect(() => {
      const textarea = textareaRef.current
      if (textarea) {
        // 重置高度以獲得正確的 scrollHeight
        textarea.style.height = 'auto'
        // 設置新高度，最小 40px（相當於單行），最大 200px
        const scrollHeight = textarea.scrollHeight
        const newHeight = Math.min(Math.max(scrollHeight, 40), 200)
        textarea.style.height = `${newHeight}px`
        
        // 如果內容超過最大高度，顯示滾動條
        if (scrollHeight > 200) {
          textarea.style.overflowY = 'auto'
        } else {
          textarea.style.overflowY = 'hidden'
        }
      }
    }, [value])

    const baseClassName = cn(
      "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 resize-none overflow-hidden",
      "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "leading-relaxed box-border max-w-full",
      className
    )

    return (
      <div className="relative group w-full max-w-full overflow-hidden">
        <textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={baseClassName}
          rows={1}
          style={{ minHeight: '40px', maxHeight: '200px' }}
          {...props}
        />
        <div className="absolute top-2 right-2 text-xs text-muted-foreground/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity pointer-events-none z-10 bg-background/80 px-1 rounded">
          Shift+Enter 換行
        </div>
      </div>
    )
  }
)

ExpandableInput.displayName = "ExpandableInput"