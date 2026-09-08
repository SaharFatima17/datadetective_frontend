import { ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "./ui";

const num = (n, digits = 0) =>
  n == null
    ? "—"
    : new Intl.NumberFormat(undefined, {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(n);

/**
 * The period-contribution result the backend already returns carries every
 * group's movement, not just the winner. Showing only the winner throws away
 * the context that makes it believable — "South fell 67% while East grew 22%"
 * is a far stronger statement than "South contributed 123%".
 */
export function ContributionBreakdown({ result }) {
  const groups = result?.result || [];
  if (!groups.length) return null;

  const widest = Math.max(...groups.map((g) => Math.abs(g.change)));
  const declineDirection = result.direction === "decline";

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-baseline justify-between">
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Where the movement sits — by {result.by}
        </h4>
        <span className="font-mono text-[11.5px] text-[var(--text-muted)]">
          split at {result.split_date}
        </span>
      </div>

      <ul className="space-y-1.5">
        {groups.map((g, i) => {
          const fell = g.change < 0;
          // the group carrying the movement, in the direction that matters
          const isDriver = i === 0 && fell === declineDirection;
          const width = widest ? (Math.abs(g.change) / widest) * 100 : 0;
          return (
            <li key={g.group} className="flex items-center gap-3">
              <span
                className={`w-24 shrink-0 truncate text-[12.5px] ${
                  isDriver ? "font-semibold" : "text-[var(--text-secondary)]"
                }`}
                title={g.group}
              >
                {g.group}
              </span>

              <span className="relative h-4 flex-1 overflow-hidden rounded">
                <span
                  className="absolute inset-y-0 left-0 rounded transition-[width] duration-500"
                  style={{
                    width: `${width}%`,
                    background: isDriver
                      ? "var(--accent)"
                      : fell
                        ? "color-mix(in srgb, var(--accent) 28%, transparent)"
                        : "color-mix(in srgb, var(--color-amber-soft) 40%, transparent)",
                  }}
                />
              </span>

              <span
                className={`w-20 shrink-0 text-right font-mono text-[12px] ${
                  fell ? "" : "text-[var(--color-amber-deep)] dark:text-[var(--color-amber-soft)]"
                }`}
              >
                {g.change_pct == null ? "—" : `${g.change_pct > 0 ? "+" : ""}${num(g.change_pct, 1)}%`}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-muted)]">
        Bars show each group's change per period. Amber means the group grew while
        the total {declineDirection ? "fell" : "rose"} — which is why one group's
        share of the movement can exceed 100%.
      </p>
    </div>
  );
}

/**
 * The headline. A report that opens with a paragraph of prose makes the reader
 * hunt for the answer; the number they came for should be the first thing they
 * see, with the sentence underneath it.
 */
export function AnswerCard({ finding, calculation }) {
  const result = calculation?.result;
  const groups = result?.result || [];
  const top = groups[0];
  const declining = result?.direction === "decline";

  return (
    <section
      className="overflow-hidden rounded-[14px] border shadow-[var(--shadow-card)]"
      style={{ background: "var(--surface-raised)" }}
    >
      <div
        className="border-b px-5 py-2.5"
        style={{ background: "var(--accent-quiet)" }}
      >
        <span className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--accent)]">
          The answer
        </span>
      </div>

      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {top && result?.by ? (
              <>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[12.5px] text-[var(--text-muted)]">{result.by}</span>
                  <span className="text-[26px] font-semibold leading-none tracking-tight">
                    {top.group}
                  </span>
                </div>
                <p className="mt-2 max-w-lg text-[14.5px] leading-relaxed">
                  carries{" "}
                  <span className="font-mono font-semibold">
                    {num(top.contribution_to_total_change_pct, 1)}%
                  </span>{" "}
                  of the total {result.direction} in {finding.unit}.
                </p>
              </>
            ) : (
              <p className="max-w-lg text-[15px] font-medium leading-relaxed">
                {finding.statement}
              </p>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            <Badge tone={finding.confidence === "high" ? "verified" : "association"}>
              {finding.confidence} confidence
            </Badge>
            {finding.verification_status === "verified" && (
              <Badge tone="verified">
                <ShieldCheck size={11} />
                verified
              </Badge>
            )}
          </div>
        </div>

        {top && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--surface-inset)" }}>
              <div className="text-[11.5px] text-[var(--text-muted)]">Before, per period</div>
              <div className="mt-0.5 font-mono text-[16px]">{num(top.previous_per_period)}</div>
            </div>
            <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--surface-inset)" }}>
              <div className="text-[11.5px] text-[var(--text-muted)]">After, per period</div>
              <div className="mt-0.5 font-mono text-[16px]">{num(top.current_per_period)}</div>
            </div>
            <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--accent-quiet)" }}>
              <div className="text-[11.5px] text-[var(--accent)]">Change</div>
              <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[16px] text-[var(--accent)]">
                {declining ? <TrendingDown size={15} /> : <TrendingUp size={15} />}
                {num(top.change_pct, 1)}%
              </div>
            </div>
          </div>
        )}

        {result && <ContributionBreakdown result={result} />}

        <div className="mt-5 border-t pt-4">
          <p className="text-[12.5px] leading-relaxed text-[var(--text-muted)]">
            {finding.evidence_summary}
          </p>
          {finding.caveats && (
            <p
              className="mt-2 border-l-2 pl-3 text-[12.5px] leading-relaxed text-[var(--text-muted)]"
              style={{ borderColor: "var(--border-strong)" }}
            >
              {finding.caveats}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

const TYPE_NOTE = {
  association: "Two things move together. This is not a cause.",
  measurement: "This describes what changed. It is not an explanation.",
  driver: "The change is concentrated here.",
};

export function SupportingFindings({ findings }) {
  if (!findings.length) return null;
  return (
    <section
      className="rounded-[14px] border shadow-[var(--shadow-card)]"
      style={{ background: "var(--surface-raised)" }}
    >
      <div className="border-b px-5 py-4">
        <h2 className="text-[15px] font-semibold leading-tight">Also established</h2>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          True, and worth knowing — but none of these explains the change
        </p>
      </div>
      <ul className="divide-y">
        {findings.map((f) => (
          <li key={f.id || f.statement} className="flex gap-3 px-5 py-4">
            <span
              className="mt-1 w-1 shrink-0 rounded-full"
              style={{
                background:
                  f.finding_type === "association"
                    ? "var(--color-amber-soft)"
                    : "var(--border-strong)",
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-[14px] font-medium leading-relaxed">{f.statement}</p>
                <Badge tone={f.finding_type}>{f.finding_type}</Badge>
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                {TYPE_NOTE[f.finding_type]}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                {f.evidence_summary}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}