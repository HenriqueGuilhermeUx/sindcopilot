import * as React from "react";
import * as D from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
export const DropdownMenu=D.Root; export const DropdownMenuTrigger=D.Trigger;
export const DropdownMenuContent=React.forwardRef<React.ElementRef<typeof D.Content>,React.ComponentPropsWithoutRef<typeof D.Content>>(({className,sideOffset=4,...p},ref)=><D.Portal><D.Content ref={ref} sideOffset={sideOffset} className={cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",className)} {...p}/></D.Portal>); DropdownMenuContent.displayName="DropdownMenuContent";
export const DropdownMenuItem=React.forwardRef<React.ElementRef<typeof D.Item>,React.ComponentPropsWithoutRef<typeof D.Item>>(({className,...p},ref)=><D.Item ref={ref} className={cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent",className)} {...p}/>); DropdownMenuItem.displayName="DropdownMenuItem";
export const DropdownMenuSeparator=React.forwardRef<React.ElementRef<typeof D.Separator>,React.ComponentPropsWithoutRef<typeof D.Separator>>(({className,...p},ref)=><D.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted",className)} {...p}/>); DropdownMenuSeparator.displayName="DropdownMenuSeparator";
