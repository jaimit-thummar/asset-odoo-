import React from "react";
import { QueryProvider } from "./QueryProvider";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";

/**
 * Composes all global providers in the correct dependency order:
 * QueryProvider → ThemeProvider → ToastProvider
 *
 * Usage: wrap <App> with <AppProviders> in main.tsx
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}
