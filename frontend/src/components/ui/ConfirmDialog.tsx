import { AlertTriangle, Trash2 } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Confirm action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            variant === "danger"
              ? "bg-red-100 dark:bg-red-950/40"
              : "bg-amber-100 dark:bg-amber-950/40"
          }`}
        >
          {variant === "danger" ? (
            <Trash2
              className={`w-5 h-5 ${variant === "danger" ? "text-red-500" : "text-amber-500"}`}
            />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          )}
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {title}
          </h3>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 w-full pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            className="flex-1"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
