"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LazyMotion, domAnimation } from "framer-motion";
import { useState, type ReactNode } from "react";
import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={domAnimation}>{children}</LazyMotion>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "var(--bg-overlay)",
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
            boxShadow: "none",
          },
        }}
      />
    </QueryClientProvider>
  );
}
