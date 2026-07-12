import { useEffect } from "react";
import { useUIStore } from "../store/uiStore";

/**
 * Syncs the `dark` class on <html> with the theme stored in uiStore.
 * Place inside <AppProviders> so theme is applied before first paint.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      root.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, [theme]);

  return <>{children}</>;
}
