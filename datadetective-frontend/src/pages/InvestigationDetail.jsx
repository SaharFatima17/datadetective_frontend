import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, GitCompare, HelpCircle, Lightbulb, Upload } from "lucide-react";
import { api } from "../api";
import ForecastChart from "../components/ForecastChart";
import RecommendationCard from "../components/RecommendationCard";
import { EvidencePanel, Timeline } from "../components/Investigation";
import { AnswerCard, SupportingFindings } from "../components/Findings";
import ReportDocument from "../components/ReportDocument";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Input,
  Panel,
  PanelHeader,
  Skeleton,
} from "../components/ui";

const TABS = ["Findings", "Evidence", "Trail", "Report"];

const FINDING_TONE = {
  driver: "driver",
  association: "association",
  measurement: "measurement",
};

const CHANGE_COPY = {
  stable: {
    tone: "verified",
    label: "Same cause as last time",
    body: "The driver behind this change is the one found previously. A "
        + "repeated cause is worth more than a new one: it means the earlier "
        + "answer held up on fresh data.",
  },
  replaced: {
    tone: "association",
    label: "The cause has changed",
    body: "Something different is driving the metric now. Acting on the "
        + "previous answer would address a problem that has already moved.",
  },
  disappeared: {
    tone: "measurement",
    label: "The previous cause is gone",
    body: "What explained the change last time no longer does. Either it was "
        + "fixed, or it was specific to that period.",
  },
  increased: {
    tone: "alert",
    label: "The same cause, now larger",
    body: "The driver is unchanged but its share of the movement has grown.",
  },
};

/**
 * Proposal Sec.14 — comparison against the previous investigation.
 *
 * This was computed and stored from the start, and nothing ever read it back.
 * Noticing that the cause has changed since last quarter is worth little if
 * the system cannot say so.
 */
function DriverChange({ comparison }) {
  const copy = CHANGE_COPY[comparison.driver_change] || {
    tone: "neutral",
    label: comparison.driver_change,
    body: comparison.summary,
  };
  return (
    <Panel>
      <PanelHeader
        title="Compared with the last investigation"
        description={
          comparison.previous_investigation
            ? `Against "${comparison.previous_investigation.question}"`
            : undefined
        }
        action={<Badge tone={copy.tone}>{copy.label}</Badge>}
      />
      <div className="px-5 py-4">
        <p className="max-w-[70ch] text-[13.5px] leading-relaxed">{copy.body}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--surface-inset)" }}>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              <GitCompare size={12} />
              Previously
            </div>
            {(comparison.previous_drivers || []).length ? (
              comparison.previous_drivers.map((d, i) => (
                <p key={i} className="text-[12.5px] leading-relaxed">{d}</p>
              ))
            ) : (
              <p className="text-[12.5px] text-[var(--text-muted)]">No driver found</p>
            )}
          </div>
          <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--accent-quiet)" }}>
            <div className="mb-1.5 text-[11.5px] font-medium uppercase tracking-wide text-[var(--accent)]">
              Now
            </div>
            {(comparison.current_drivers || []).length ? (
              comparison.current_drivers.map((d, i) => (
                <p key={i} className="text-[12.5px] leading-relaxed">{d}</p>
              ))
            ) : (
              <p className="text-[12.5px] text-[var(--text-muted)]">No driver found</p>
            )}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/** A rendered chart, fetched with the session token rather than as a bare URL. */
function ChartPanel({ chart }) {
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
    // the object URL holds the image in memory until it is released
    return () => url && URL.revokeObjectURL(url);
  }, [chart.id]);

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title={chart.title}
        description="The same breakdown the finding above rests on"
      />
      {failed ? (
        <p className="px-5 py-4 text-[13px] text-[var(--text-muted)]">
          The chart image could not be loaded.
        </p>
      ) : src ? (
        <img src={src} alt={chart.title} className="w-full" />
      ) : (
        <div className="p-5">
          <Skeleton className="h-52 w-full" />
        </div>
      )}
    </Panel>
  );
}

export default function InvestigationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Findings");

  const [state, setState] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState(null);

  const [answer, setAnswer] = useState("");
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState(null);

  async function load() {
    setError(null);
    try {
      setState(await api.investigation(id));
    } catch (err) {
      setError(err);
    }
  }

  useEffect(() => {
    load();
    // The findings view and the report both draw the group breakdown, which
    // lives in the evidence payload, so it is fetched once up front rather
    // than only when the Evidence tab is opened.
    api.evidence(id).then(setEvidence).catch(() => {});
    api.comparison(id).then(setComparison).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (tab === "Trail" && !timeline) api.timeline(id).then(setTimeline).catch(setError);
  }, [tab]);

  async function respond(requestId, text) {
    setResuming(true);
    setResumeError(null);
    try {
      setState(await api.resume(id, requestId, text));
      setAnswer("");
      setEvidence(null);
      setTimeline(null);
    } catch (err) {
      setResumeError(err);
    } finally {
      setResuming(false);
    }
  }

  async function supply(requestId, file) {
    setResuming(true);
    setResumeError(null);
    try {
      setState(await api.supplyEvidence(id, requestId, file));
      setEvidence(null);
      setTimeline(null);
    } catch (err) {
      setResumeError(err);
    } finally {
      setResuming(false);
    }
  }

  if (error && !state) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 lg:px-7">
        <ErrorState error={error} onRetry={load} />
      </div>
    );
  }

  if (!state) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 lg:px-7">
        <Skeleton className="h-6 w-2/3" />
        <Panel className="p-5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-3 h-4 w-5/6" />
          <Skeleton className="mt-3 h-4 w-3/4" />
        </Panel>
      </div>
    );
  }

  const report = state.report || {};
  const findings = report.findings || [];
  const requests = state.open_requests || [];

  const calculations = Object.fromEntries(
    (evidence?.findings || [])
      .filter((f) => f.calculation)
      .map((f) => [f.finding_id, f.calculation]),
  );
  const driver = findings.find((f) => f.finding_type === "driver");
  const supporting = findings.filter((f) => f.finding_type !== "driver");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-7">
      <button
        onClick={() => navigate("/investigations")}
        className="no-print mb-4 inline-flex items-center gap-1.5 text-[13px]
          text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={14} />
        All investigations
      </button>

      <div className="no-print flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[22px] font-semibold leading-tight tracking-tight">
            {report.question || "Investigation"}
          </h2>
          <p className="mt-1.5 font-mono text-[12px] text-[var(--text-muted)]">
            {state.target_metric || "no metric identified"} · round {state.round}
          </p>
        </div>
        <Badge tone={state.status === "complete" ? "verified" : "association"}>
          {state.status.replace(/_/g, " ")}
        </Badge>
      </div>

      {/* ------------- the pause: the system asks, rather than guessing ------------- */}
      {requests.map((req) => (
        <Panel
          key={req.id}
          className="no-print mt-5 p-5 rise"
          style={{
            borderColor: "color-mix(in srgb, var(--color-amber-soft) 45%, transparent)",
            background: "color-mix(in srgb, var(--color-amber-soft) 7%, transparent)",
          }}
        >
          <div className="flex items-start gap-3">
            <HelpCircle size={18} className="mt-0.5 shrink-0 text-[var(--color-amber-soft)]" />
            <div className="min-w-0 flex-1">
              <h3 className="text-[14.5px] font-semibold">The data can't answer this yet</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed">{req.question}</p>
              {req.reason && (
                <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">{req.reason}</p>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Answer in a sentence, or upload the data instead"
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  busy={resuming}
                  disabled={!answer.trim()}
                  onClick={() => respond(req.id, answer)}
                >
                  Send answer
                </Button>
                <label className="inline-flex">
                  <input
                    type="file"
                    className="sr-only"
                    accept=".csv,.tsv,.xlsx,.xls,.json,.parquet"
                    onChange={(e) => {
                      if (e.target.files?.[0]) supply(req.id, e.target.files[0]);
                      e.target.value = "";
                    }}
                  />
                  <span
                    className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border
                      bg-[var(--surface-raised)] px-4 text-sm font-medium transition-colors
                      hover:bg-[var(--surface-sunken)]"
                  >
                    <Upload size={14} />
                    Upload data
                  </span>
                </label>
              </div>
              <p className="mt-2 text-[12px] text-[var(--text-muted)]">
                An uploaded file is joined onto this investigation's data, not filed as a
                separate dataset.
              </p>
              {resumeError && (
                <div className="mt-3">
                  <ErrorState error={resumeError} />
                </div>
              )}
            </div>
          </div>
        </Panel>
      ))}

      <div className="no-print mt-5 flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
              tab === t
                ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                : "border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {/* -------------------------- Findings -------------------------- */}
        {tab === "Findings" && (
          <>
            {driver ? (
              <AnswerCard finding={driver} calculation={calculations[driver.id]} />
            ) : (
              <Panel className="p-5">
                <h2 className="text-[15px] font-semibold">No explanation was established</h2>
                <p className="mt-1.5 max-w-lg text-[13.5px] leading-relaxed text-[var(--text-muted)]">
                  Nothing in this data explains the change. What was measured is below,
                  along with the hypotheses that could not be tested.
                </p>
              </Panel>
            )}

            <SupportingFindings findings={supporting} />

            {report.unresolved_hypotheses?.length > 0 && (
              <Panel>
                <PanelHeader
                  title="Left unresolved"
                  description="Generated but not testable with the data available — not treated as answered"
                />
                <ul className="space-y-2 px-5 py-4">
                  {report.unresolved_hypotheses.map((h, i) => (
                    <li key={i} className="text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
                      {h}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {(report.charts || []).map((c) => (
              <ChartPanel key={c.id} chart={c} />
            ))}

            {(report.forecasts || []).map((f) => (
              <ForecastChart key={f.id} forecast={f} />
            ))}

            {report.recommendations?.length > 0 && (
              <div>
                <h3 className="mb-3 text-[15px] font-semibold">Recommended actions</h3>
                <div className="space-y-3">
                  {report.recommendations.map((rec, i) => (
                    <RecommendationCard
                      key={rec.id || i}
                      rec={rec}
                      rank={rec.rank || i + 1}
                      investigationId={id}
                    />
                  ))}
                </div>
              </div>
            )}

            {comparison?.available && <DriverChange comparison={comparison} />}

            {(report.retrieval?.context_documents?.length > 0 ||
              report.retrieval?.definitions_used?.length > 0) && (
              <Panel>
                <PanelHeader
                  title="Background consulted"
                  description="Read while planning this investigation, not only when writing it up"
                />
                <ul className="divide-y">
                  {(report.retrieval.definitions_used || []).map((d, i) => (
                    <li key={`d${i}`} className="flex items-center gap-3 px-5 py-3">
                      <BookOpen size={15} className="shrink-0 text-[var(--text-muted)]" />
                      <span className="min-w-0 flex-1 truncate text-[13.5px]">{d}</span>
                      <Badge tone="neutral">definition</Badge>
                    </li>
                  ))}
                  {(report.retrieval.context_documents || []).map((d, i) => (
                    <li key={`c${i}`} className="flex items-center gap-3 px-5 py-3">
                      <BookOpen size={15} className="shrink-0 text-[var(--text-muted)]" />
                      <span className="min-w-0 flex-1 truncate text-[13.5px]">{d}</span>
                      <Badge tone="neutral">context</Badge>
                    </li>
                  ))}
                </ul>
                <p className="border-t px-5 py-3 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                  The table shows where the change sits. These documents are where
                  an explanation for it can come from — neither is enough alone.
                </p>
              </Panel>
            )}

            {report.critique?.concerns?.length > 0 && (
              <Panel>
                <PanelHeader
                  title="Reviewer concerns"
                  description="Raised by the critic agent against these findings"
                />
                <ul className="space-y-2 px-5 py-4">
                  {report.critique.concerns.map((c, i) => (
                    <li
                      key={i}
                      className="flex gap-2.5 text-[13.5px] leading-relaxed text-[var(--text-secondary)]"
                    >
                      <Lightbulb size={14} className="mt-0.5 shrink-0 text-[var(--color-amber-soft)]" />
                      {c}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </>
        )}

        {tab === "Evidence" && (
          <EvidencePanel evidence={evidence} loading={evidence === null} />
        )}
        {tab === "Trail" && <Timeline timeline={timeline} loading={timeline === null} />}

        {/* --------------------------- Report --------------------------- */}
        {tab === "Report" && (
          <>
            <ReportDocument report={report} state={state} calculations={calculations} />
            <div className="no-print flex gap-2">
              <Button onClick={() => window.print()}>Print or save as PDF</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}