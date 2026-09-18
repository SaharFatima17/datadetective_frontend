import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Database,
  FileText,
  Search,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Panel,
  PanelHeader,
  Skeleton,
  Stat,
} from "../components/ui";

const SUGGESTIONS = [
  "Why did revenue decline?",
  "Which segment drove the drop last quarter?",
  "What changed between this period and last?",
];

/**
 * Proposal Sec.17 puts "Ask DataDetective" at the centre of the workspace, so
 * the question box is the hero — not a stat strip. The numbers sit underneath
 * it, because they are context for asking, not the point of the screen.
 */
export default function Dashboard({ user }) {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState(null);
  const [investigations, setInvestigations] = useState(null);
  const [healths, setHealths] = useState([]);
  const [error, setError] = useState(null);

  const [question, setQuestion] = useState("");
  const [datasetId, setDatasetId] = useState("");
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState(null);

  async function load() {
    setError(null);
    try {
      const [d, i] = await Promise.all([api.datasets(), api.investigations()]);
      setDatasets(d.datasets);
      setInvestigations(i.investigations);
      if (d.datasets.length && !datasetId) setDatasetId(d.datasets[0].id);

      // health for the most recent few, so the chart says something without
      // firing a request per dataset on a large workspace
      const recent = d.datasets.slice(0, 6);
      const scores = await Promise.all(
        recent.map(async (ds) => {
          try {
            const h = await api.health(ds.id);
            return { name: ds.name.replace(/\.[^.]+$/, ""), score: h.health_score };
          } catch {
            return null;
          }
        }),
      );
      setHealths(scores.filter(Boolean));
    } catch (err) {
      setError(err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function ask(event) {
    event.preventDefault();
    if (!question.trim() || !datasetId) return;
    setRunning(true);
    setRunError(null);
    try {
      const result = await api.startInvestigation({
        dataset_id: datasetId,
        question: question.trim(),
      });
      navigate(`/investigations/${result.investigation_id}`);
    } catch (err) {
      setRunError(err);
    } finally {
      setRunning(false);
    }
  }

  const loading = datasets === null || investigations === null;
  const complete = (investigations || []).filter((i) => i.status === "complete");
  const waiting = (investigations || []).filter((i) => i.status === "awaiting_user");

  const healthTone = (score) =>
    score >= 80
      ? "var(--accent)"
      : score >= 50
        ? "var(--color-amber-soft)"
        : "var(--color-alert-soft)";

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 lg:px-7">
        <ErrorState error={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-7">
      {/* ---------------- Ask ---------------- */}
      <section className="rise">
        <h2 className="text-[24px] font-semibold leading-tight tracking-tight">
          What would you like to find out
          {user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}?
        </h2>
        <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-[var(--text-muted)]">
          Ask in plain language. The agents will form hypotheses, test them against your
          data, verify every number, and tell you what they could not establish.
        </p>

        <Panel className="mt-5 p-4" elevate={3} spotlight>
          {datasets?.length ? (
            <form onSubmit={ask}>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2
                      text-[var(--text-muted)]"
                  />
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Why did revenue decline?"
                    className="h-11 w-full rounded-lg border bg-[var(--surface-inset)] pl-9 pr-3
                      text-[14.5px] outline-none transition-[border-color,box-shadow]
                      placeholder:text-[var(--text-muted)] hover:border-[var(--border-strong)]
                      focus:border-[var(--accent)]
                      focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_14%,transparent)]"
                  />
                </div>
                <select
                  value={datasetId}
                  onChange={(e) => setDatasetId(e.target.value)}
                  className="h-11 rounded-lg border bg-[var(--surface-inset)] px-3 text-[13.5px]
                    outline-none focus:border-[var(--accent)] sm:max-w-[220px]"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  busy={running}
                  disabled={!question.trim()}
                >
                  {running ? "Investigating" : "Investigate"}
                  {!running && (
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  )}
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setQuestion(s)}
                    className="rounded-md px-2.5 py-1 text-[12.5px] text-[var(--text-secondary)]
                      transition-colors hover:bg-[var(--surface-sunken)]"
                    style={{ background: "var(--surface-inset)" }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {running && (
                <p className="mt-3 flex items-center gap-2 text-[12.5px] text-[var(--text-muted)]">
                  <Sparkles size={13} className="text-[var(--accent)]" />
                  Profiling, forming hypotheses, running tests and verifying results. This
                  usually takes a few seconds.
                </p>
              )}
              {runError && (
                <div className="mt-3">
                  <ErrorState error={runError} />
                </div>
              )}
            </form>
          ) : loading ? (
            <div className="space-y-2.5 p-2">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ) : (
            <EmptyState
              icon={Database}
              title="Add data before asking a question"
              body="Upload a spreadsheet or connect a database, and the question box becomes active."
              action={
                <Button variant="primary" onClick={() => navigate("/sources")}>
                  Add a source
                </Button>
              }
            />
          )}
        </Panel>
      </section>

      {/* ---------------- Numbers ---------------- */}
      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Panel key={i} className="p-5">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="mt-3 h-3 w-24" />
            </Panel>
          ))
        ) : (
          <>
            <Panel className="p-5" elevate={2} spotlight>
              <Stat
                icon={Database}
                label="Datasets"
                value={datasets.length}
                hint="available to investigate"
              />
            </Panel>
            <Panel className="p-5" elevate={2} spotlight>
              <Stat
                icon={Search}
                label="Investigations"
                value={investigations.length}
                hint={`${complete.length} completed`}
              />
            </Panel>
            <Panel className="p-5" elevate={2} spotlight>
              <Stat
                icon={Sparkles}
                label="Awaiting your input"
                value={waiting.length}
                hint="paused for missing evidence"
                tone={waiting.length ? "var(--color-amber-soft)" : undefined}
              />
            </Panel>
            <Panel className="p-5" elevate={2} spotlight>
              <Stat
                icon={FileText}
                label="Versions kept"
                value={datasets.reduce((n, d) => n + (d.versions || 0), 0)}
                hint="originals never overwritten"
              />
            </Panel>
          </>
        )}
      </section>

      {/* ---------------- Recent ---------------- */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <PanelHeader
            title="Recent investigations"
            action={
              <Button size="sm" variant="ghost" onClick={() => navigate("/investigations")}>
                View all
              </Button>
            }
          />
          {loading ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : investigations.length ? (
            <ul className="divide-y">
              {investigations.slice(0, 6).map((inv) => (
                <li key={inv.id}>
                  <button
                    onClick={() => navigate(`/investigations/${inv.id}`)}
                    className="flex w-full items-center gap-3 px-5 py-3 text-left
                      transition-colors hover:bg-[var(--surface-sunken)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{inv.question}</p>
                      <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
                        {inv.target_metric || "metric not identified"}
                      </p>
                    </div>
                    <Badge
                      tone={
                        inv.status === "complete"
                          ? "verified"
                          : inv.status === "awaiting_user"
                            ? "association"
                            : "neutral"
                      }
                    >
                      {inv.status.replace(/_/g, " ")}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Search}
              title="No investigations yet"
              body="Ask a question above and the first one will appear here."
            />
          )}
        </Panel>

        <Panel>
          <PanelHeader
            title="Data health"
            description="Check this before trusting an answer built on it"
          />
          {loading ? (
            <div className="p-5">
              <Skeleton className="h-44 w-full" />
            </div>
          ) : healths.length ? (
            <div className="px-2 py-4">
              <ResponsiveContainer width="100%" height={Math.max(150, healths.length * 34)}>
                <BarChart
                  data={healths}
                  layout="vertical"
                  margin={{ left: 6, right: 26, top: 4, bottom: 4 }}
                >
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={104}
                    tick={{ fontSize: 11.5, fill: "var(--text-secondary)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--surface-sunken)" }}
                    contentStyle={{
                      background: "var(--glass-surface)",
                      backdropFilter: "blur(14px) saturate(1.4)",
                      border: "1px solid var(--border-hairline)",
                      borderRadius: 8,
                      fontSize: 12,
                      boxShadow: "var(--shadow-md)",
                    }}
                    formatter={(v) => [`${v} / 100`, "health"]}
                  />
                  <Bar dataKey="score" radius={[0, 5, 5, 0]} barSize={16}>
                    <LabelList
                      dataKey="score"
                      position="right"
                      style={{ fontSize: 11, fill: "var(--text-muted)" }}
                    />
                    {healths.map((d) => (
                      <Cell key={d.name} fill={healthTone(d.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No datasets to score yet"
              body="Upload data and its health appears here."
            />
          )}
        </Panel>
      </div>
    </div>
  );
}