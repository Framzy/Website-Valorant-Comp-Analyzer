import Image from "next/image";
import { findAgent, agentDisplayName } from "@/lib/catalog/agents";
import { cn } from "@/lib/utils";

const SIZES = {
  sm: "h-12 w-10",
  md: "h-16 w-13",
  lg: "h-20 w-16",
} as const;

export function AgentThumbs({
  agents,
  size = "md",
  className,
}: {
  agents: string[];
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {agents.map((name) => {
        const agent = findAgent(name);
        return (
          <div key={name} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "relative overflow-hidden rounded-lg border border-line-strong bg-card-dark",
                SIZES[size],
              )}
            >
              {agent?.imageUrl ? (
                <Image
                  src={agent.imageUrl}
                  alt={agentDisplayName(name)}
                  fill
                  sizes="80px"
                  className="object-cover object-top"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-brand/30 to-card-dark font-heading text-sm font-bold uppercase text-ink">
                  {name.slice(0, 3)}
                </div>
              )}
            </div>
            <span className="text-[0.62rem] uppercase tracking-[0.1em] text-muted">
              {agentDisplayName(name)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
