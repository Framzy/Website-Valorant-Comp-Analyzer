export function LoadingOverlay({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm"
    >
      <div className="flex w-[min(90vw,320px)] flex-col items-center gap-4 rounded-panel border border-line bg-panel-gradient px-8 py-8 shadow-container">
        <span className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-brand" />
        <p className="font-heading text-sm uppercase tracking-[0.18em] text-ink">{message}</p>
      </div>
    </div>
  );
}
