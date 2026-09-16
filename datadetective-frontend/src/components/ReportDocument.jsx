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
        <img
          src={src}
          alt={chart.title}
          className="w-full max-w-2xl rounded-lg border"
        />
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
export default function ReportDocument({ report, state, calculations = {} }) {
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
        <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-[12.5px]">
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
            <dd className="font-mono">
              {findings.filter((f) => f.verification_status === "verified").length} of{" "}
              {findings.length}
            </dd>
          </div>
        </dl>
      </header>

      {/* ------------------------------ headline ------------------------------ */}
      {driver && (
        <section
          className="mt-6 rounded-lg border-l-4 py-4 pl-5 pr-4"
          style={{
            borderColor: "var(--accent)",
            background: "var(--accent-quiet)",
          }}
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
      <section className="mt-7">
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Summary
        </h3>
        <p className="mt-2 max-w-[68ch] text-[14px] leading-relaxed">
          {report.executive_summary}
        </p>
      </section>

      {/* ------------------------------ breakdown ----------------------------- */}
      {groups.length > 0 && (
        <section className="mt-7">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Breakdown by {breakdown.by}
          </h3>
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
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {c.title}
          </h3>
          <ReportChart chart={c} />
        </section>
      ))}

      {/* ------------------------------ findings ------------------------------ */}
      {findings.length > 0 && (
        <section className="mt-7">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Findings
          </h3>
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
        <section className="mt-7">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Outlook
          </h3>
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
        <section className="mt-7">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Recommended actions
          </h3>
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
        <section className="mt-7">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Left unresolved
          </h3>
          <ul className="mt-2 space-y-1.5">
            {report.unresolved_hypotheses.map((h, i) => (
              <li key={i} className="max-w-[68ch] text-[13.5px] leading-relaxed">
                {h}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --------------------------- what was read ---------------------------- */}
      {(report.retrieval?.context_documents?.length > 0 ||
        report.retrieval?.definitions_used?.length > 0) && (
        <section className="mt-7">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Background consulted
          </h3>
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
        <section className="mt-8 border-t pt-5">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Limitations
          </h3>
          <ul className="mt-2 space-y-1.5">
            {report.limitations.map((l, i) => (
              <li
                key={i}
                className="max-w-[68ch] text-[12.5px] leading-relaxed text-[var(--text-muted)]"
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