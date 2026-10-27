import Image from "next/image";
import { AGENT_ROLE_CODE, agentDisplayName, findAgent, ROLE_LABEL } from "@/lib/catalog/agents";
import type { AgentRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { RoleFilter } from "./role-filter";

const ROLE_TONE: Record<AgentRole, string> = {
  duelist: "bg-role-d/80 text-black",
  initiator: "bg-role-i/80 text-black",
  controller: "bg-role-c/80 text-black",
  sentinel: "bg-role-s/80 text-black",
};

export function AgentGrid({
  agents,
  selected,
  roleFilter,
  onToggle,
}: {
  agents: string[];
  selected: string[];
  roleFilter: RoleFilter;
  onToggle: (name: string) => void;
}) {
  const visible = agents.filter((name) => {
    if (roleFilter === "all") return true;
    return findAgent(name)?.role === roleFilter;
  });

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
      {visible.map((name) => {
        const agent = findAgent(name);
        const isSelected = selected.includes(name);
        const role = agent?.role ?? "duelist";
        return (
          <button
            key={name}
            type="button"
            aria-pressed={isSelected}
            aria-label={agentDisplayName(name) + ", " + ROLE_LABEL[role]}
            onClick={() => onToggle(name)}
            className={cn(
              "group relative aspect-[2/3] overflow-hidden rounded-xl border bg-card-dark text-left transition-all duration-200",
              isSelected
                ? "border-brand shadow-[0_0_0_1px_#ff4655,0_8px_24px_rgba(255,70,85,0.35)]"
                : "border-line hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card",
            )}
          >
            {agent?.imageUrl ? (
              <Image
                src={agent.imageUrl}
                alt={agentDisplayName(name)}
                fill
                sizes="(max-width: 640px) 30vw, (max-width: 1024px) 15vw, 12vw"
                className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-brand/30 to-card-dark font-heading text-lg font-bold uppercase text-ink">
                {name.slice(0, 3)}
              </span>
            )}

            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-2 pb-2 pt-6">
              <span className="block truncate font-heading text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-ink">
                {agentDisplayName(name)}
              </span>
            </span>

            <span
              className={cn(
                "absolute left-2 top-2 rounded px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-[0.1em]",
                ROLE_TONE[role],
              )}
            >
              {AGENT_ROLE_CODE[role]}
            </span>

            {isSelected ? (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[0.65rem] font-bold text-white">
                ✓
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
