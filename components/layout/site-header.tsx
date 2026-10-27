import Image from "next/image";

export function SiteHeader() {
  return (
    <header className="flex flex-col items-center gap-2 rounded-panel border border-line bg-header-gradient px-5 py-7 shadow-container">
      <Image
        src="/logo.png"
        alt="Valorant Logo"
        width={68}
        height={68}
        priority
        className="drop-shadow-[0_0_18px_rgba(255,70,85,0.35)]"
      />
      <h1 className="mt-1 text-center font-heading text-2xl font-bold uppercase tracking-[0.32em] text-ink sm:text-3xl">
        Agent Comp <span className="text-brand">Analyzer</span>
      </h1>
      <p className="text-center text-xs uppercase tracking-[0.24em] text-subtle">
        Historical composition analytics & team prediction
      </p>
    </header>
  );
}
