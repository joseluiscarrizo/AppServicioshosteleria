"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/components/ui/useIsMobile"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"

// ── Desktop Select (unchanged Radix) ────────────────────────────────────────

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}>
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}>
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}>
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn("p-1", position === "popper" &&
          "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props} />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}>
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props} />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

// ── Mobile-aware wrapper ────────────────────────────────────────────────────
// Collects SelectItem children and renders a Drawer on mobile instead of a popover.

// Context to pass value/onValueChange down into MobileSelect
const MobileSelectCtx = React.createContext(null)

/**
 * MobileSelect: renders a button trigger + Drawer sheet on mobile.
 * It inspects its children to find SelectItem/SelectLabel/SelectSeparator nodes
 * and renders them as touchable list items inside the drawer.
 */
function MobileSelect({ value, onValueChange, defaultValue, disabled, children }) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '')
  const controlled = value !== undefined
  const currentValue = controlled ? value : internalValue

  // Collect all <SelectItem> nodes recursively to build the label map & items list
  const items = React.useMemo(() => {
    const result = []
    const walk = (nodes) => {
      React.Children.forEach(nodes, (child) => {
        if (!React.isValidElement(child)) return
        if (child.type === SelectItem || child.type === SelectPrimitive.Item) {
          result.push({ value: child.props.value, label: child.props.children, disabled: child.props.disabled })
        } else if (child.props?.children) {
          walk(child.props.children)
        }
      })
    }
    walk(children)
    return result
  }, [children])

  // Find current label
  const currentLabel = React.useMemo(() => {
    const found = items.find(i => i.value === currentValue)
    if (!found) return null
    // Extract text from label (may be JSX)
    if (typeof found.label === 'string') return found.label
    // Try to get text from nested spans
    return found.label
  }, [items, currentValue])

  // Find placeholder from SelectValue inside SelectTrigger
  let placeholder = null
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    if (child.type === SelectTrigger || child.displayName === 'SelectTrigger') {
      React.Children.forEach(child.props.children, (c) => {
        if (React.isValidElement(c) && (c.type === SelectValue || c.type === SelectPrimitive.Value)) {
          placeholder = c.props.placeholder
        }
      })
    }
  })

  // Trigger className from the SelectTrigger child
  let triggerClassName = ''
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === SelectTrigger) {
      triggerClassName = child.props.className || ''
    }
  })

  const handleSelect = (val) => {
    if (!controlled) setInternalValue(val)
    onValueChange?.(val)
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          !currentLabel && "text-muted-foreground",
          triggerClassName
        )}
      >
        <span className="line-clamp-1">{currentLabel ?? placeholder ?? ''}</span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[85vh]">
          {placeholder && (
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-base">{placeholder}</DrawerTitle>
            </DrawerHeader>
          )}
          <div className="overflow-y-auto px-4 pb-safe pb-6">
            {items.map((item) => (
              <button
                key={item.value}
                type="button"
                disabled={item.disabled}
                onClick={() => handleSelect(item.value)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-3.5 text-sm text-left transition-colors active:bg-accent",
                  item.value === currentValue
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "hover:bg-accent/50",
                  item.disabled && "opacity-50 pointer-events-none"
                )}
              >
                <span className="flex-1">{item.label}</span>
                {item.value === currentValue && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}

/**
 * ResponsiveSelect: auto-switches between MobileSelect (drawer) and Radix Select (desktop).
 * Drop-in replacement — same API as Radix <Select>.
 */
function ResponsiveSelect({ children, value, onValueChange, defaultValue, disabled, open: controlledOpen, onOpenChange, ...props }) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <MobileSelect
        value={value}
        onValueChange={onValueChange}
        defaultValue={defaultValue}
        disabled={disabled}
      >
        {children}
      </MobileSelect>
    )
  }

  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      defaultValue={defaultValue}
      disabled={disabled}
      open={controlledOpen}
      onOpenChange={onOpenChange}
      {...props}
    >
      {children}
    </SelectPrimitive.Root>
  )
}

export {
  ResponsiveSelect as Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}