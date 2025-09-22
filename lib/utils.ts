import { type ClassValue } from "clsx"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Simple debounce with optional leading/trailing behavior
// Returns a function with cancel() and flush() helpers
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait = 300,
  leading = false,
  trailing = true
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: any[] | null = null
  let lastThis: any
  let leadingCalled = false

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const debounced = function (this: any, ...args: any[]) {
    lastArgs = args
    lastThis = this

    if (timer) clearTimer()

    if (leading && !leadingCalled) {
      leadingCalled = true
      fn.apply(lastThis, lastArgs)
      lastArgs = null
    }

    if (trailing) {
      timer = setTimeout(() => {
        if (!leading || lastArgs) {
          fn.apply(lastThis, lastArgs ?? [])
        }
        timer = null
        leadingCalled = false
        lastArgs = null
      }, wait)
    } else if (leading) {
      // Only-leading mode: reset the gate after wait
      timer = setTimeout(() => {
        timer = null
        leadingCalled = false
      }, wait)
    }
  } as T & { cancel: () => void; flush: () => void }

  ;(debounced as any).cancel = () => {
    clearTimer()
    leadingCalled = false
    lastArgs = null
  }

  ;(debounced as any).flush = () => {
    if (timer) {
      clearTimer()
      if (trailing && lastArgs) {
        fn.apply(lastThis, lastArgs)
      }
      leadingCalled = false
      lastArgs = null
    }
  }

  return debounced
}