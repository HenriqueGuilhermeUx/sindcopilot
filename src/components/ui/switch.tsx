import * as React from "react";
import * as S from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
export const Switch = React.forwardRef<React.ElementRef<typeof S.Root>, React.ComponentPropsWithoutRef<typeof S.Root>>(({ className, ...p }, ref) => <S.Root ref={ref} className={cn("peer inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-input transition-colors data-[state=checked]:bg-primary", className)} {...p}><S.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" /></S.Root>); Switch.displayName="Switch";
