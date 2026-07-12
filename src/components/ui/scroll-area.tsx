import * as React from "react";
import * as S from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";
export const ScrollArea=React.forwardRef<React.ElementRef<typeof S.Root>,React.ComponentPropsWithoutRef<typeof S.Root>>(({className,children,...p},ref)=><S.Root ref={ref} className={cn("relative overflow-hidden",className)} {...p}><S.Viewport className="h-full w-full rounded-[inherit]">{children}</S.Viewport><S.Scrollbar orientation="vertical" className="flex touch-none select-none p-0.5"><S.Thumb className="relative flex-1 rounded-full bg-border"/></S.Scrollbar><S.Corner/></S.Root>); ScrollArea.displayName="ScrollArea";
