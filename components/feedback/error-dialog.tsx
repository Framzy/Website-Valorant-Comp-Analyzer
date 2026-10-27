import { Button } from "@/components/ui/button";

export function ErrorDialog({
  title = "Terjadi Kesalahan",
  message,
  onRetry,
  onClose,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm"
    >
      <div className="w-[min(92vw,420px)] rounded-panel border border-line bg-panel-gradient p-6 shadow-container">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>
            ⚠️
          </span>
          <h2 id="error-title" className="font-heading text-lg font-semibold text-ink">
            {title}
          </h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          {onRetry ? (
            <Button variant="outline" onClick={onRetry}>
              Coba Lagi
            </Button>
          ) : null}
          <Button onClick={onClose}>Mengerti</Button>
        </div>
      </div>
    </div>
  );
}
