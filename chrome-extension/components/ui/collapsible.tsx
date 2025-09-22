import * as React from "react"
import * as RC from "@radix-ui/react-collapsible"
import { cn } from "../../lib/utils"

export const Collapsible = ({ className, ...props }: React.ComponentProps<typeof RC.Root>) => (
    <RC.Root className={cn(className)} {...props} />
)

export const CollapsibleTrigger = ({ className, ...props }: React.ComponentProps<typeof RC.Trigger>) => (
    <RC.Trigger className={cn(className)} {...props} />
)

export const CollapsibleContent = ({ className, ...props }: React.ComponentProps<typeof RC.Content>) => (
    <RC.Content className={cn(className)} {...props} />
)

export type CollapsibleProps = React.ComponentProps<typeof RC.Root>
export type CollapsibleTriggerProps = React.ComponentProps<typeof RC.Trigger>
export type CollapsibleContentProps = React.ComponentProps<typeof RC.Content>
