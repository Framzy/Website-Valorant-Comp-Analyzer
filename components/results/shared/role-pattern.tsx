import { Badge } from "@/components/ui/badge";

const ROLE_META = [
  { key: "D", label: "Duelist", tone: "role-d" as const },
  { key: "I", label: "Initiator", tone: "role-i" as const },
  { key: "C", label: "Controller", tone: "role-c" as const },
  { key: "S", label: "Sentinel", tone: "role-s" as const },
];

export function RolePatternChips({ pattern }: { pattern: string }) {
  const match = /^(\d+)D-(\d+)I-(\d+)C-(\d+)S$/.exec(pattern);
  if (!match) {
    return <span className="text-sm text-muted">{pattern}</span>;
  }
  const counts = match.slice(1).map(Number);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ROLE_META.map((role, index) =>
        counts[index] > 0 ? (
          <Badge key={role.key} tone={role.tone}>
            {counts[index]} × {role.label}
          </Badge>
        ) : null,
      )}
    </div>
  );
}
