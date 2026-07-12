import { useEffect } from "react";

type ModifierKey = "ctrl" | "meta" | "alt" | "shift";

interface ShortcutOptions {
  key: string;
  modifiers?: ModifierKey[];
  onPress: () => void;
  enabled?: boolean;
}

/**
 * Binds a keyboard shortcut. Fires `onPress` when all modifiers
 * and the key are pressed simultaneously.
 *
 * @example
 * useKeyboardShortcut({ key: "k", modifiers: ["ctrl"], onPress: openPalette });
 */
export function useKeyboardShortcut({
  key,
  modifiers = [],
  onPress,
  enabled = true,
}: ShortcutOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const ctrl = modifiers.includes("ctrl") ? e.ctrlKey || e.metaKey : true;
      const meta = modifiers.includes("meta") ? e.metaKey : true;
      const alt = modifiers.includes("alt") ? e.altKey : true;
      const shift = modifiers.includes("shift") ? e.shiftKey : true;

      if (e.key.toLowerCase() === key.toLowerCase() && ctrl && meta && alt && shift) {
        e.preventDefault();
        onPress();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, modifiers, onPress, enabled]);
}
