import type { TeamConfidence, TeamPrediction } from "@/lib/types";
import { percent } from "@/lib/format";

export type TeamConclusionKey = "potential" | "stable" | "risky" | "unknown";

export interface TeamConclusion {
  key: TeamConclusionKey;
  label: string;
  reason: string;
  /** Gauge fill percentage (a conclusion bucket, not the raw prediction). */
  fill: number;
  textClass: string;
}

const GAUGE_FILL: Record<TeamConclusionKey, number> = {
  risky: 30,
  stable: 60,
  potential: 85,
  unknown: 50,
};

const CONCLUSION_LABEL: Record<TeamConclusionKey, string> = {
  potential: "Potensial",
  stable: "Stabil",
  risky: "Beresiko",
  unknown: "—",
};

const CONCLUSION_REASON: Record<TeamConclusionKey, string> = {
  potential: "Komposisi ini diprediksi tampil di atas rata-rata historis tim pada map ini.",
  stable: "Komposisi ini diprediksi sejalan dengan performa historis tim.",
  risky: "Komposisi ini diprediksi di bawah rata-rata historis tim pada map ini.",
  unknown: "Kesimpulan belum dapat ditentukan karena data pembanding tidak tersedia.",
};

const CONCLUSION_TEXT_CLASS: Record<TeamConclusionKey, string> = {
  potential: "text-conclusion-potential",
  stable: "text-conclusion-stable",
  risky: "text-conclusion-risky",
  unknown: "text-muted",
};

function buildConclusion(key: TeamConclusionKey): TeamConclusion {
  return {
    key,
    label: CONCLUSION_LABEL[key],
    reason: CONCLUSION_REASON[key],
    fill: GAUGE_FILL[key],
    textClass: CONCLUSION_TEXT_CLASS[key],
  };
}

/**
 * Legacy parity: the conclusion compares the final prediction against the
 * historical prior. >= +10 points is "Potensial", <= -10 points is
 * "Beresiko", everything else is "Stabil".
 */
export function getTeamConclusion(prediction: TeamPrediction): TeamConclusion {
  const percentage = prediction.percentage;
  const prior = prediction.prior_winrate * 100;

  if (!Number.isFinite(percentage) || !Number.isFinite(prior)) {
    return buildConclusion("unknown");
  }

  const difference = percentage - prior;

  if (difference >= 10) return buildConclusion("potential");
  if (difference <= -10) return buildConclusion("risky");
  return buildConclusion("stable");
}

/** Semicircular arc inside a 220x160 viewBox: center (110,130), radius 80. */
const ARC_PATH = "M 30 130 A 80 80 0 0 1 190 130";
const GAUGE_WIDTH = 220;
const GAUGE_HEIGHT = 160;

export function TeamConclusionGauge({
  prediction,
  confidence,
}: {
  prediction: TeamPrediction;
  confidence: TeamConfidence;
}) {
  const conclusion = getTeamConclusion(prediction);
  const range = prediction.range;
  const rangeText =
    Number.isFinite(range?.low) && Number.isFinite(range?.high)
      ? `${percent(range.low * 100)} – ${percent(range.high * 100)}`
      : "—";

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative h-[160px] w-[220px]">
        <svg
          viewBox={`0 0 ${GAUGE_WIDTH} ${GAUGE_HEIGHT}`}
          className="h-full w-full"
          role="img"
          aria-label={`Kesimpulan prediksi: ${conclusion.label}, prediksi ${percent(
            prediction.percentage,
          )}`}
        >
          <path
            d={ARC_PATH}
            fill="none"
            strokeWidth={14}
            strokeLinecap="round"
            className="stroke-white/10"
          />
          <path
            d={ARC_PATH}
            fill="none"
            stroke="currentColor"
            strokeWidth={14}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 - conclusion.fill}
            className={conclusion.textClass}
            style={{ filter: "drop-shadow(0 0 10px currentColor)" }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span
            className={`font-heading text-xl font-bold uppercase tracking-[0.16em] ${conclusion.textClass}`}
          >
            {conclusion.label}
          </span>
          <span className="text-xs text-muted">
            Predicted {percent(prediction.percentage)}
          </span>
        </div>
      </div>

      <p className="mt-2 max-w-md text-balance text-center text-sm leading-relaxed text-muted">
        {conclusion.reason}
      </p>

      <dl className="mt-5 grid w-full max-w-sm grid-cols-2 gap-3 rounded-xl border border-line bg-white/[0.02] px-4 py-3 text-center">
        <div>
          <dt className="font-heading text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-subtle">
            Estimated Range
          </dt>
          <dd className="mt-1 font-heading text-sm font-semibold text-ink">{rangeText}</dd>
        </div>
        <div>
          <dt className="font-heading text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-subtle">
            Confidence
          </dt>
          <dd className="mt-1 font-heading text-sm font-semibold text-ink">
            {confidence.level.toUpperCase()}
          </dd>
        </div>
      </dl>
    </div>
  );
}
