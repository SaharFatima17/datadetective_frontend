import { useState } from "react";
import { ChevronDown, ThumbsDown, ThumbsUp } from "lucide-react";
import { api } from "../api";
import { Badge, Button, Code, Panel } from "./ui";

const money = (n) =>
  n == null
    ? "—"
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

/**
 * Proposal Sec.17: ranked action cards showing the action, expected impact,
 * confidence, and links back to the supporting finding and forecast.
 *
 * The impact range is shown next to how it was derived, because it is a
 * scenario estimate resting on an assumption — presenting the number alone
 * would imply a measurement.
 */
export default function RecommendationCard({ rec, investigationId, rank }) {
  const [showMethod, setShowMethod] = useState(false);
  const [decision, setDecision] = useState(rec.user_decision || "pending");
  const [sending, setSending] = useState(null);

  const impact = rec.expected_impact || {};

  async function rate(rating) {
    setSending(rating);
    try {
      const result = await api.sendFeedback(investigationId, rec.id, rating);
      setDecision(result.user_decision);
    } catch {
      /* the card stays as it was; the rating simply did not save */
    } finally {
      setSending(null);
    }
  }

  return (
    <Panel as="article" elevate={2} spotlight className="group relative overflow-hidden p-5 pl-6">
      {/* accent edge — dim until the card is worth a second look */}
      <span
        className="absolute inset-y-0 left-0 w-[3px] opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        style={{ background: "var(--accent)" }}
        aria-hidden="true"
      />
      <div className="flex items-start gap-3">
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-md font-mono text-[12px]
            font-semibold transition-colors duration-200 group-hover:bg-[var(--accent)]
            group-hover:text-[var(--on-accent)]"
          style={{ background: "var(--accent-quiet)", color: "var(--accent)" }}
        >
          {rank ?? rec.rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-medium leading-relaxed">{rec.action}</p>
          {rec.rationale && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
              {rec.rationale}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--surface-inset)" }}>
          <div className="text-[11.5px] text-[var(--text-muted)]">Estimated recovery</div>
          <div className="mt-0.5 font-mono text-[15px]">
            {money(impact.low)} – {money(impact.high)}
          </div>
          <div className="text-[11.5px] text-[var(--text-muted)]">{impact.unit}</div>
        </div>
        <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--surface-inset)" }}>
          <div className="text-[11.5px] text-[var(--text-muted)]">Confidence</div>
          <div className="mt-1">
            <Badge tone={rec.confidence === "high" ? "verified" : "association"}>
              {rec.confidence}
            </Badge>
          </div>
        </div>
        <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--surface-inset)" }}>
          <div className="text-[11.5px] text-[var(--text-muted)]">Urgency</div>
          <div className="mt-1">
            <Badge tone={rec.urgency === "high" ? "alert" : "neutral"}>{rec.urgency}</Badge>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowMethod(!showMethod)}
        className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-[var(--text-muted)]
          transition-colors hover:text-[var(--text-primary)]"
      >
        How this estimate was calculated
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${showMethod ? "rotate-180" : ""}`}
        />
      </button>
      {showMethod && <Code className="mt-2 whitespace-pre-wrap">{rec.impact_method}</Code>}

      <div className="mt-4 flex items-center gap-2 border-t pt-3">
        <span className="text-[12.5px] text-[var(--text-muted)]">Was this useful?</span>
        <Button
          size="sm"
          variant={decision === "accepted" ? "primary" : "ghost"}
          busy={sending === "useful"}
          onClick={() => rate("useful")}
        >
          <ThumbsUp size={13} />
          Yes
        </Button>
        <Button
          size="sm"
          variant={decision === "rejected" ? "danger" : "ghost"}
          busy={sending === "not_useful"}
          onClick={() => rate("not_useful")}
        >
          <ThumbsDown size={13} />
          No
        </Button>
        {decision !== "pending" && (
          <span className="ml-auto text-[12px] text-[var(--text-muted)]">
            Saved — future investigations will see this
          </span>
        )}
      </div>
    </Panel>
  );
}