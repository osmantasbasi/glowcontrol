
import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      onInteractOutside={(e) => {
        // Check if the click was on a favorite star or other element that should prevent closing
        const target = e.target as HTMLElement;
        const isStarClick = target.closest('[data-favorite-toggle="true"]') || 
                           target.closest('.favorite-toggle');
        
        if (isStarClick || (e.currentTarget as HTMLElement).hasAttribute('data-stay-open')) {
          e.preventDefault();
          return;
        }
        
        try {
          // Only close if it's not a click on a star
          if (!isStarClick) {
            // Find any open popover and close it more safely
            const popoverElement = document.querySelector('[data-state="open"]');
            if (popoverElement) {
              const trigger = popoverElement.parentElement?.querySelector('[data-radix-trigger]');
              if (trigger && trigger instanceof HTMLElement) {
                trigger.click();
              }
            }
          }
        } catch (error) {
          console.error('Error handling outside click:', error);
        }
      }}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
