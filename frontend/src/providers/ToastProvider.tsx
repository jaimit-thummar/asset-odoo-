import { Toaster } from "react-hot-toast";

/**
 * Configures the global toast notification system.
 * Premium dark-glass style, top-right position, max 3 toasts visible.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        gutter={10}
        containerStyle={{ top: 64 }}
        toastOptions={{
          duration: 4000,
          style: {
            background: "rgb(15 23 42 / 0.95)",
            color: "#f1f5f9",
            border: "1px solid rgb(51 65 85 / 0.6)",
            borderRadius: "12px",
            backdropFilter: "blur(16px)",
            padding: "12px 16px",
            fontSize: "13px",
            fontWeight: 500,
            fontFamily: "'Inter', sans-serif",
            boxShadow: "0 8px 32px rgb(0 0 0 / 0.3)",
            maxWidth: "400px",
          },
          success: {
            iconTheme: { primary: "#10b981", secondary: "#0f172a" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#0f172a" },
            duration: 6000,
          },
          loading: {
            iconTheme: { primary: "#6366f1", secondary: "#0f172a" },
          },
        }}
      />
    </>
  );
}
