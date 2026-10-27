import type { ReactNode } from "react";

import { AgentThumbs } from "@/components/results/shared/agent-thumbs";
import { PlaystyleBadge } from "@/components/results/shared/playstyle-badge";
import { RolePatternChips } from "@/components/results/shared/role-pattern";
import { SectionHeading } from "@/components/results/shared/section-heading";
import { StatCard } from "@/components/results/shared/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { percent, signedPoints } from "@/lib/format";
import type { TeamPredictResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

import { TeamConclusionGauge } from "./gauge";

function DetailLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "font-heading text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-subtle",
        className,
      )}
    >
      {children}
    </p>
  );
}

export function TeamResults({ data }: { data: TeamPredictResponse }) {
  const { prediction, confidence, composition, historical, best_composition: best } = data;
  const adjustment = prediction.pattern_adjustment;
  const strength = historical.composition_strength;
  const confidenceNote =
    confidence.note || adjustment.reason || "Tidak ada konteks tambahan.";

  return (
    <div className="space-y-4">
      {/* 1. Prediction conclusion */}
      <Card className="relative overflow-hidden border-line-strong bg-panel-gradient shadow-container">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/70 to-transparent" />
        <CardHeader>
          <SectionHeading title="Kesimpulan Prediksi" />
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6">
          <TeamConclusionGauge prediction={prediction} confidence={confidence} />
        </CardContent>
      </Card>

      {/* 2. Prediction statistics */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Predicted Winrate" value={percent(prediction.percentage)} />
        <StatCard label="Prior Winrate" value={percent(prediction.prior_winrate * 100)} />
        <StatCard
          label="Historical Composition Strength"
          value={typeof strength === "number" ? strength.toFixed(2) : "—"}
          empty={strength === null}
        />
      </div>

      {/* 3. Selected team composition */}
      <Card>
        <CardHeader>
          <SectionHeading title="Selected Team Composition" />
        </CardHeader>
        <CardContent className="space-y-5">
          <AgentThumbs agents={data.input.agents} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <DetailLabel>Playstyle</DetailLabel>
              <PlaystyleBadge playstyle={composition.playstyle} className="mt-2" />
            </div>
            <div>
              <DetailLabel>Role Pattern</DetailLabel>
              <div className="mt-2">
                <RolePatternChips pattern={composition.role_pattern} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Prediction context */}
      <Card>
        <CardHeader>
          <SectionHeading title="Prediction Context" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <DetailLabel>Pattern Adjustment</DetailLabel>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="font-heading text-base font-semibold text-ink">
                  {signedPoints(adjustment.points)}
                </span>
                {adjustment.tier ? <Badge tone="muted">{adjustment.tier}</Badge> : null}
              </div>
            </div>
            <div>
              <DetailLabel>Confidence Note</DetailLabel>
              <p className="mt-2 text-sm leading-relaxed text-muted">{confidenceNote}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 5. Historical most-used composition */}
      <Card>
        <CardHeader>
          <SectionHeading title="Historical Most-Used Composition" />
        </CardHeader>
        <CardContent>
          {best.found ? (
            <div className="space-y-5">
              <AgentThumbs agents={best.agents} size="sm" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <DetailLabel>Playstyle</DetailLabel>
                  <PlaystyleBadge playstyle={best.playstyle} className="mt-2" />
                </div>
                <div>
                  <DetailLabel>Role Pattern</DetailLabel>
                  <div className="mt-2">
                    <RolePatternChips pattern={best.role_pattern} />
                  </div>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Maps Played" value={String(best.maps_played)} />
                <StatCard label="Winrate" value={percent(best.winrate * 100)} />
                <StatCard
                  label="Composition Strength"
                  value={best.composition_strength.toFixed(2)}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Belum ada data</p>
          )}
        </CardContent>
      </Card>

      {/* 6. Model information footer */}
      <footer className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-white/[0.02] px-4 py-3">
        <span className="font-heading text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-subtle">
          Model Information
        </span>
        <span className="text-xs text-muted">
          {data.inference.feature_count} features digunakan model
        </span>
      </footer>
    </div>
  );
}
