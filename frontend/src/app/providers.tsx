import { Provider as TooltipProvider } from "@radix-ui/react-tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { ModeProvider } from "../components/ui/ModeProvider";
import { queryClient } from "../lib/queryClient";

/** App-wide providers: server state (React Query), Simple/Pro mode, and Radix tooltips. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ModeProvider>
        <TooltipProvider delayDuration={150} skipDelayDuration={300}>
          {children}
        </TooltipProvider>
      </ModeProvider>
    </QueryClientProvider>
  );
}
