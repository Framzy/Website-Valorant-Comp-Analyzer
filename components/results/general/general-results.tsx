import { AgentThumbs } from "@/components/results/shared/agent-thumbs";
import { PlaystyleBadge } from "@/components/results/shared/playstyle-badge";
import { RolePatternChips } from "@/components/results/shared/role-pattern";
import { SectionHeading } from "@/components/results/shared/section-heading";
import { StatCard } from "@/components/results/shared/stat-card";
import { Badge, playstyleTone } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { fallbackNote, percentFromFraction } from "@/lib/format";
import type { GeneralAnalyzeResponse, GeneralRecommendation } from "@/lib/types";

function RecommendationCard({ recommendation }: { recommendation: GeneralRecommendation }) {
  return (
    <Card className="bg-white/[0.03] transition-colors hover:border-line-strong">
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <Badge tone="brand">#{recommendation.rank}</Badge>
          <span className="font-heading text-sm font-semibold text-ink">
            {percentFromFraction(recommendation.winrate)} WR
          </span>
        </div>

        <AgentThumbs agents={recommendation.agents} size="sm" />

        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={playstyleTone(recommendation.playstyle)}>
            {recommendation.playstyle.replaceAll("_", " ")}
          </Badge>
          <span className="text-[0.7rem] text-muted">
            {recommendation.role_pattern} • {recommendation.total_maps} Maps •{" "}
            {percentFromFraction(recommendation.pick_rate)} Pick
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function GeneralResults({ data }: { data: GeneralAnalyzeResponse }) {
  const { input, historical, playstyle, recommendations, fallback, fallback_source: fallbackSource } = data;
  const note = fallback ? fallbackNote(fallbackSource) : null;

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden border-line-strong bg-panel-gradient">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/70 to-transparent" />
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-heading text-lg font-bold uppercase tracking-[0.14em] text-ink">
                Historical Composition Analysis
              </h2>
              <p className="mt-1 text-sm text-muted">
                {input.map} • {input.year} • {input.agents.length} Agents
              </p>
            </div>
            <AgentThumbs agents={input.agents} size="sm" />
          </div>
        </CardHeader>

        {note ? (
          <CardContent className="pt-0">
            <div className="rounded-xl border border-playstyle-standard/30 bg-playstyle-standard/10 px-4 py-3 text-sm leading-relaxed text-playstyle-standard">
              {note}
            </div>
          </CardContent>
        ) : null}
      </Card>

      {historical.found ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Pick Rate" value={percentFromFraction(historical.pick_rate)} />
            <StatCard
              label="Historical Winrate"
              value={percentFromFraction(historical.winrate)}
            />
            <StatCard label="Total Maps" value={String(historical.total_maps)} />
          </div>

          <Card>
            <CardHeader>
              <SectionHeading title="Composition Detail" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="font-heading text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-subtle">
                    Playstyle
                  </p>
                  <PlaystyleBadge playstyle={playstyle} className="mt-2" />
                </div>
                <div>
                  <p className="font-heading text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-subtle">
                    Role Pattern
                  </p>
                  <div className="mt-2 space-y-2">
                    <RolePatternChips pattern={historical.role_pattern} />
                    <p className="text-xs tracking-[0.12em] text-muted">{historical.role_pattern}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="border-line bg-white/[0.02]">
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="font-heading text-sm font-semibold uppercase tracking-[0.16em] text-muted">
              Historical composition tidak ditemukan
            </p>
            <p className="max-w-xl text-sm text-subtle">
              Komposisi ini belum pernah tercatat pada map dan tahun yang dipilih, jadi analisis
              menampilkan rekomendasi historis terdekat.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <SectionHeading title="Historical Recommendations" />
        </CardHeader>
        <CardContent>
          {recommendations.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-3">
              {recommendations.map((recommendation) => (
                <RecommendationCard key={recommendation.rank} recommendation={recommendation} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Belum ada historical recommendation.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
