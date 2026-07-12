import * as React from "react";
import * as S from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";
export function Separator({ className, orientation="horizontal", decorative=true, ...p }: React.ComponentProps<typeof S.Root>) { return <S.Root decorative={decorative} orientation={orientation} className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)} {...p} />; }
