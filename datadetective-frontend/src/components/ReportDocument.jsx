import { useEffect, useState } from "react";
import { api } from "../api";
import { Panel, Skeleton } from "./ui";

const num = (n, digits = 0) =>
  n == null
    ? "—"
    : new Intl.NumberFormat(undefined, {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(n);

/**
 * A section heading.
 *
 * These were pale grey uppercase text — the weakest thing on a page whose
 * content is the point. In dark mode they nearly vanished. A short accent rule
 * gives the section a visible start without colouring the words themselves,
 * which matters because in this report colour carries meaning: teal is
 * verified, amber is caution. A heading is neither, so it stays neutral and
 * the rule does the work.
 */
function SectionHeading({ children, tone = "var(--accent)" }) {
  return (
    <h3 className="flex items-center gap-2.5 text-[12px] font-semibold uppercase
      tracking-[0.08em] text-[var(--text-secondary)]">
      <span
        className="inline-block h-[3px] w-6 shrink-0 rounded-full"
        style={{ background: tone }}
      />
      {children}
    </h3>
  );
}

const TYPE_LABEL = {
  driver: "Explanation",
  association: "Association",
  measurement: "Measurement",
};

const TYPE_COLOUR = {
  driver: "var(--accent)",
  association: "var(--color-amber-soft)",
  measurement: "var(--border-strong)",
};

/**
 * A chart inside the printed report.
 *
 * Charts sit behind the same authentication as everything else, so the image is
 * fetched with the session token and handed to the tag as an object URL. It is
 * also drawn at print time: a reader checks "the fall is concentrated in one
 * group" far faster from a picture than from a paragraph, and the report is the
 * artefact that leaves the application.
 */
function ReportChart({ chart }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let url;
    api
      .chartBlob(chart.id)
      .then((u) => {
        url = u;
        setSrc(u);
      })
      .catch(() => setFailed(true));
    return () => url && URL.revokeObjectURL(url);
  }, [chart.id]);

  if (failed) return null;          // a missing picture must not break the report

  return (
    <figure className="mt-3">
      {src ? (
        // The chart is rendered server-side on white, which the server must do
        // because it cannot know the reader's theme. On a dark page that white
        // block reads as a hole in the layout, so it is mounted on a padded
        // plate — the same way a printed figure sits on paper inside a darker
        // binding. In light mode the plate is invisible.
        <div
          className="max-w-2xl rounded-lg border p-3"
          style={{ background: "#ffffff", borderColor: "var(--border-hairline)" }}
        >
          <img src={src} alt={chart.title} className="w-full" />
        </div>
      ) : (
        <Skeleton className="h-52 w-full max-w-2xl" />
      )}
      <figcaption className="mt-1.5 text-[12px] text-[var(--text-muted)]">
        {chart.title} — the breakdown the finding above rests on.
      </figcaption>
    </figure>
  );
}

/**
 * The report is a deliverable someone else reads, often on paper. It has to
 * carry the answer, the numbers behind it and the caveats, without any of the
 * application around it.
 *
 * Everything here survives printing: colour is used only as a thin rule or a
 * label, never as the sole carrier of meaning, so a black-and-white printout
 * loses nothing.
 */
const CHANGE_LINE = {
  stable: "The cause is the one found previously — the earlier answer held up on new data.",
  replaced: "The cause has changed since the previous investigation. Acting on the earlier answer would address a problem that has moved.",
  disappeared: "What explained the change previously no longer does — either it was fixed, or it was specific to that period.",
  increased: "The same cause, now carrying a larger share of the movement.",
};

export default function ReportDocument({ report, state, calculations = {},
                                         comparison = null }) {
  const findings = report.findings || [];
  const driver = findings.find((f) => f.finding_type === "driver");
  const breakdown = driver ? calculations[driver.id]?.result : null;
  const groups = breakdown?.result || [];
  const forecast = (report.forecasts || [])[0];

  return (
    <Panel className="print-sheet p-6 sm:p-9">
      {/* ------------------------------ masthead ------------------------------ */}
      <header className="border-b pb-5">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-mono text-[11.5px] uppercase tracking-wide text-[var(--text-muted)]">
            Investigation report
          </p>
          <p className="font-mono text-[11.5px] text-[var(--text-muted)]">
            {new Date().toLocaleDateString()} · v{report.version ?? 1}
          </p>
        </div>
        <h2 className="mt-2.5 text-[24px] font-semibold leading-tight tracking-tight">
          {report.question}
        </h2>
        <dl className="mt-3.5 flex flex-wrap gap-x-7 gap-y-1.5 text-[12.5px]">
          <div className="flex gap-2">
            <dt className="text-[var(--text-muted)]">Metric</dt>
            <dd className="font-mono">{state?.target_metric || report.target_metric || "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-[var(--text-muted)]">Findings</dt>
            <dd className="font-mono">{findings.length}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-[var(--text-muted)]">Verified</dt>
            <dd className="font-mono" style={{ color: "var(--accent)" }}>
              {findings.filter((f) => f.verification_status === "verified").length} of{" "}
              {findings.length}
            </dd>
          </div>
        </dl>
      </header>

      {/* ------------------------------ headline ------------------------------ */}
      {driver && (
        <Panel
          as="section"
          elevate={3}
          spotlight
          tilt
          className="mt-6 overflow-hidden border-l-4 py-4 pl-5 pr-4 no-print"
          style={{
            borderLeftColor: "var(--accent)",
            background: "var(--accent-quiet)",
          }}
        >
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--accent)]">
            Headline
          </p>
          <p className="mt-1.5 max-w-[64ch] text-[16px] font-medium leading-relaxed">
            {driver.statement}
          </p>
        </Panel>
      )}
      {/* the printed version stays flat — depth effects are a screen-only
          affordance and would either vanish or look like a stray box on paper */}
      {driver && (
        <section
          className="mt-6 hidden rounded-lg border-l-4 py-4 pl-5 pr-4 print:block"
          style={{ borderColor: "var(--accent)", background: "var(--accent-quiet)" }}
        >
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[var(--accent)]">
            Headline
          </p>
          <p className="mt-1.5 max-w-[64ch] text-[16px] font-medium leading-relaxed">
            {driver.statement}
          </p>
        </section>
      )}

      {/* ------------------------------- summary ------------------------------ */}
      <section className="mt-7 rise" style={{ animationDelay: "0.04s" }}>
        <SectionHeading>Summary</SectionHeading>
        <p className="mt-2 max-w-[68ch] text-[14px] leading-relaxed">
          {report.executive_summary}
        </p>
      </section>

      {/* ------------------------------ breakdown ----------------------------- */}
      {groups.length > 0 && (
        <section className="mt-7 rise" style={{ animationDelay: "0.08s" }}>
          <SectionHeading>Breakdown by {breakdown.by}</SectionHeading>
          <table className="mt-2 w-full text-[13px]">
            <thead>
              <tr className="border-b text-left text-[11.5px] text-[var(--text-muted)]">
                <th className="py-2 pr-3 font-medium">{breakdown.by}</th>
                <th className="py-2 pr-3 text-right font-medium">Before</th>
                <th className="py-2 pr-3 text-right font-medium">After</th>
                <th className="py-2 pr-3 text-right font-medium">Change</th>
                <th className="py-2 text-right font-medium">Share of movement</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {groups.map((g, i) => (
                <tr key={g.group} className="border-b last:border-0">
                  <td className={`py-2 pr-3 ${i === 0 ? "font-semibold" : ""}`}>
                    <span className="font-sans">{g.group}</span>
                  </td>
                  <td className="py-2 pr-3 text-right">{num(g.previous_per_period)}</td>
                  <td className="py-2 pr-3 text-right">{num(g.current_per_period)}</td>
                  <td className="py-2 pr-3 text-right">
                    {g.change_pct == null
                      ? "—"
                      : `${g.change_pct > 0 ? "+" : ""}${num(g.change_pct, 1)}%`}
                  </td>
                  <td className="py-2 text-right">
                    {num(g.contribution_to_total_change_pct, 1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 max-w-[68ch] text-[12px] leading-relaxed text-[var(--text-muted)]">
            Values are normalised per period, so periods of unequal length do not
            appear as a change. A share above 100% means other groups moved the
            other way.
          </p>
        </section>
      )}

      {/* -------------------------------- chart -------------------------------- */}
      {(report.charts || []).map((c) => (
        <section key={c.id} className="mt-7">
          <SectionHeading>{c.title}</SectionHeading>
          <ReportChart chart={c} />
        </section>
      ))}

      {/* ------------------------------ findings ------------------------------ */}
      {findings.length > 0 && (
        <section className="mt-7 rise" style={{ animationDelay: "0.12s" }}>
          <SectionHeading>Findings</SectionHeading>
          <ol className="mt-2 space-y-4">
            {findings.map((f, i) => (
              <li key={f.id || i} className="flex gap-3">
                <span
                  className="mt-1 w-[3px] shrink-0 rounded-full"
                  style={{ background: TYPE_COLOUR[f.finding_type] }}
                />
                <div className="min-w-0 max-w-[66ch]">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-mono text-[11.5px] text-[var(--text-muted)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[11.5px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                      {TYPE_LABEL[f.finding_type] || f.finding_type}
                    </span>
                  </div>
                  <p className="mt-1 text-[14px] leading-relaxed">{f.statement}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                    {f.evidence_summary}
                  </p>
                  {f.caveats && (
                    <p className="mt-1 text-[12.5px] italic leading-relaxed text-[var(--text-muted)]">
                      {f.caveats}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ------------------------------ forecast ------------------------------ */}
      {forecast && (
        <section className="mt-7 rise" style={{ animationDelay: "0.16s" }}>
          <SectionHeading>Outlook</SectionHeading>
          {forecast.reliability === "ok" && forecast.predictions?.length ? (
            <>
              <table className="mt-2 w-full max-w-md text-[13px]">
                <thead>
                  <tr className="border-b text-left text-[11.5px] text-[var(--text-muted)]">
                    <th className="py-2 font-medium">Period</th>
                    <th className="py-2 text-right font-medium">Projected</th>
                    <th className="py-2 text-right font-medium">Range</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {forecast.predictions.map((p) => (
                    <tr key={p.period} className="border-b last:border-0">
                      <td className="py-2">{p.period}</td>
                      <td className="py-2 text-right">{num(p.point)}</td>
                      <td className="py-2 text-right text-[var(--text-muted)]">
                        {num(p.lower)} – {num(p.upper)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 max-w-[68ch] text-[12px] leading-relaxed text-[var(--text-muted)]">
                {forecast.model} model, backtest error {forecast.backtest?.mape}% against a
                naive baseline of {forecast.backtest?.naive_mape}%. The range is the 95%
                interval; it assumes current patterns continue.
              </p>
            </>
          ) : (
            <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed">
              No projection is offered.{" "}
              <span className="text-[var(--text-muted)]">
                {forecast.withheld_reason ||
                  "The model failed its accuracy check on held-out periods."}
              </span>
            </p>
          )}
        </section>
      )}

      {/* --------------------------- recommendations -------------------------- */}
      {report.recommendations?.length > 0 && (
        <section className="mt-7 rise" style={{ animationDelay: "0.20s" }}>
          <SectionHeading>Recommended actions</SectionHeading>
          <ol className="mt-2 space-y-3">
            {report.recommendations.map((r, i) => (
              <li key={i} className="max-w-[68ch]">
                <p className="text-[14px] leading-relaxed">
                  <span className="font-mono text-[11.5px] text-[var(--text-muted)]">
                    {String(r.rank ?? i + 1).padStart(2, "0")}
                  </span>
                  <span className="ml-3">{r.action}</span>
                </p>
                {r.expected_impact && (
                  <p className="ml-8 mt-1 font-mono text-[12.5px] text-[var(--text-muted)]">
                    Estimated recovery {num(r.expected_impact.low)} –{" "}
                    {num(r.expected_impact.high)} {r.expected_impact.unit} ·{" "}
                    {r.confidence} confidence · {r.urgency} urgency
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* ----------------------------- unresolved ----------------------------- */}
      {report.unresolved_hypotheses?.length > 0 && (
        <section className="mt-7 rise" style={{ animationDelay: "0.24s" }}>
          <SectionHeading>Left unresolved</SectionHeading>
          <ul className="mt-2 space-y-1.5">
            {report.unresolved_hypotheses.map((h, i) => (
              <li key={i} className="max-w-[68ch] text-[13.5px] leading-relaxed">
                {h}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------ against last time --------------------------- */}
      {comparison?.available && (
        <section className="mt-7 rise" style={{ animationDelay: "0.28s" }}>
          <SectionHeading>Compared with the previous investigation</SectionHeading>
          <p className="mt-2 max-w-[68ch] text-[14px] leading-relaxed">
            {CHANGE_LINE[comparison.driver_change] || comparison.summary}
          </p>
          <div className="mt-2 grid max-w-[68ch] gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[11.5px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Previously
              </p>
              {(comparison.previous_drivers || ["No driver found"]).map((d, i) => (
                <p key={i} className="mt-0.5 text-[12.5px] leading-relaxed">{d}</p>
              ))}
            </div>
            <div>
              <p className="text-[11.5px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Now
              </p>
              {(comparison.current_drivers || ["No driver found"]).map((d, i) => (
                <p key={i} className="mt-0.5 text-[12.5px] leading-relaxed">{d}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --------------------------- reviewer concerns ------------------------ */}
      {report.critique?.concerns?.length > 0 && (
        <section className="mt-7 rise" style={{ animationDelay: "0.28s" }}>
          <SectionHeading tone="var(--color-amber-soft)">Reviewer concerns</SectionHeading>
          {/* These are the critic agent's objections to the findings above. A
              report that keeps its own reviewer's doubts out of the document is
              exactly the kind of answer this system is built to avoid, so they
              are printed alongside the conclusions rather than filed elsewhere. */}
          <ul className="mt-2.5 space-y-2">
            {report.critique.concerns.map((c, i) => (
              <li
                key={i}
                className="max-w-[68ch] border-l-2 pl-3 text-[13px] leading-relaxed"
                style={{ borderColor: "var(--color-amber-soft)" }}
              >
                {c}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --------------------------- what was read ---------------------------- */}
      {(report.retrieval?.context_documents?.length > 0 ||
        report.retrieval?.definitions_used?.length > 0) && (
        <section className="mt-7 rise" style={{ animationDelay: "0.28s" }}>
          <SectionHeading>Background consulted</SectionHeading>
          <ul className="mt-2 space-y-1.5">
            {[...(report.retrieval.definitions_used || []),
              ...(report.retrieval.context_documents || [])].map((d, i) => (
              <li key={i} className="max-w-[68ch] text-[13px] leading-relaxed">
                {d}
              </li>
            ))}
          </ul>
          <p className="mt-2 max-w-[68ch] text-[12px] leading-relaxed text-[var(--text-muted)]">
            Consulted while planning, not only when writing up. A reader can check
            what shaped the question as well as what answered it.
          </p>
        </section>
      )}

      {/* ---------------------------- limitations ----------------------------- */}
      {report.limitations?.length > 0 && (
        <section className="mt-8 border-t pt-6">
          <SectionHeading tone="var(--border-strong)">Limitations</SectionHeading>
          {/* Previously the palest text on the page. What an answer does not
              claim is part of the answer, so it is set at reading weight. */}
          <ul className="mt-2.5 space-y-2">
            {report.limitations.map((l, i) => (
              <li
                key={i}
                className="max-w-[68ch] border-l-2 pl-3 text-[12.5px] leading-relaxed
                  text-[var(--text-secondary)]"
                style={{ borderColor: "var(--border-hairline)" }}
              >
                {l}
              </li>
            ))}
          </ul>
        </section>
      )}
    </Panel>
  );
}