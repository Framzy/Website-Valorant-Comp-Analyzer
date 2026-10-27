import { Badge, playstyleTone } from "@/components/ui/badge";
import type { Playstyle } from "@/lib/types";

export function PlaystyleBadge({ playstyle, className }: { playstyle: Playstyle; className?: string }) {
  return (
    <div className={className}>
      <Badge tone={playstyleTone(playstyle.name)}>{playstyle.name.replaceAll("_", " ")}</Badge>
      {playstyle.description ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">{playstyle.description}</p>
      ) : null}
    </div>
  );
}
