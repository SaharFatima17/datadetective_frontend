import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, GitBranch, ShieldAlert } from "lucide-react";
import { api } from "../api";
import {
  Badge,
  Button,
  CheckRow,
  EmptyState,
  ErrorState,
  Panel,
  PanelHeader,
  Skeleton,
  Stat,
  Toggle,
} from "../components/ui";

const SEVERITY_TONE = {
  high: "var(--color-alert-soft)",
  medium: "var(--color-amber-soft)",
  low: "var(--border-strong)",
};

const TABS = ["Health", "Columns", "Clean", "Preview", "Versions"];

export default function DatasetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Health");

  const [dataset, setDataset] = useState(null);
  const [health, setHealth] = useState(null);
  const [columns, setColumns] = useState(null);
  const [plan, setPlan] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  const [approved, setApproved] = useState([]);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(null);

  async function load() {
    setError(null);
    try {
      const [d, h, c] = await Promise.all([
        api.dataset(id),
        api.health(id),
        api.columns(id),
      ]);
      setDataset(d);
      setHealth(h);
      setColumns(c);
    } catch (err) {
      setError(err);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  useEffect(() => {
    if (tab === "Clean" && !plan) api.cleaningPlan(id).then(setPlan).catch(setError);
    if (tab === "Preview" && !preview) api.preview(id).then(setPreview).catch(setError);
  }, [tab]);

  async function applyCleaning() {
    setApplying(true);
    try {
      const result = await api.applyCleaning(id, approved);
      setApplied(result);
      setPlan(null);
      setApproved([]);
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setApplying(false);
    }
  }

  async function toggleSensitive(column, value) {
    try {
      await api.setSensitive(id, column, value);
      setColumns(await api.columns(id));
    } catch (err) {
      setError(err);
    }
  }

  if (error && !dataset) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 lg:px-7">
        <ErrorState error={error} onRetry={load} />
      </div>
    );
  }

  const score = health?.health_score;
  const scoreTone =
    score == null
      ? undefined
      : score >= 80
        ? "var(--accent)"
        : score >= 50
          ? "var(--color-amber-soft)"
          : "var(--color-alert-soft)";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-7">
      <button
        onClick={() => navigate("/sources")}
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--text-muted)]
          transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft size={14} />
        All sources
      </button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight">
            {dataset?.name || <Skeleton className="h-6 w-48" />}
          </h2>
          {dataset && (
            <p className="mt-1 font-mono text-[12px] text-[var(--text-muted)]">
              {dataset.versions.length} version{dataset.versions.length === 1 ? "" : "s"} ·{" "}
              {dataset.id.slice(0, 8)}
            </p>
          )}
        </div>
        <Button variant="primary" onClick={() => navigate("/")}>
          Ask a question about this data
        </Button>
      </div>

      <div className="mt-5 flex gap-1 border-b">
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

      <div className="mt-5">
        {/* ------------------------- Health ------------------------- */}
        {tab === "Health" &&
          (health ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <Panel className="p-5">
                  <Stat label="Health score" value={score} tone={scoreTone} hint="100 is clean" />
                </Panel>
                <Panel className="p-5">
                  <Stat label="Rows" value={health.row_count.toLocaleString()} />
                </Panel>
                <Panel className="p-5">
                  <Stat label="Columns" value={health.column_count} />
                </Panel>
                <Panel className="p-5">
                  <Stat
                    label="Issues found"
                    value={
                      health.issue_counts.high +
                      health.issue_counts.medium +
                      health.issue_counts.low
                    }
                    hint={`${health.issue_counts.high} high · ${health.issue_counts.medium} medium`}
                  />
                </Panel>
              </div>

              <Panel>
                <PanelHeader
                  title="Quality issues"
                  description="Ordered by how much each one would distort an answer"
                />
                {health.issues.length ? (
                  <ul className="divide-y">
                    {health.issues.map((issue, i) => (
                      <li key={i} className="flex items-start gap-3 px-5 py-3.5">
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ background: SEVERITY_TONE[issue.severity] }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] font-medium">
                            {issue.issue.replace(/_/g, " ")}
                          </p>
                          <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                            {issue.detail}
                          </p>
                        </div>
                        <span className="font-mono text-[12px] text-[var(--text-muted)]">
                          {issue.affected_rows} rows
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon={ShieldAlert}
                    title="No quality issues detected"
                    body="Every check passed. You can go straight to asking a question."
                  />
                )}
              </Panel>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Panel key={i} className="p-5">
                  <Skeleton className="h-8 w-14" />
                  <Skeleton className="mt-3 h-3 w-20" />
                </Panel>
              ))}
            </div>
          ))}

        {/* ------------------------- Columns ------------------------ */}
        {tab === "Columns" &&
          (columns ? (
            <Panel>
              <PanelHeader
                title="Columns"
                description="Mark a column sensitive to keep its values out of any prompt sent to the model."
              />
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b text-left text-[12px] text-[var(--text-muted)]">
                      <th className="px-5 py-2.5 font-medium">Column</th>
                      <th className="px-3 py-2.5 font-medium">Type</th>
                      <th className="px-3 py-2.5 font-medium">Meaning</th>
                      <th className="px-3 py-2.5 font-medium">Sensitive</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.columns.map((c) => (
                      <tr key={c.name} className="border-b last:border-0">
                        <td className="px-5 py-2.5 font-medium">{c.name}</td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)]">
                          {c.inferred_type}
                        </td>
                        <td className="px-3 py-2.5 text-[var(--text-muted)]">
                          {c.semantic_label || "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <Toggle
                              checked={c.sensitive}
                              onChange={(v) => toggleSensitive(c.name, v)}
                              label={`Mark ${c.name} sensitive`}
                            />
                            {c.sensitive ? (
                              <EyeOff size={14} className="text-[var(--accent)]" />
                            ) : (
                              <Eye size={14} className="text-[var(--text-muted)]" />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : (
            <Panel className="p-5">
              <Skeleton className="h-32 w-full" />
            </Panel>
          ))}

        {/* -------------------------- Clean ------------------------- */}
        {tab === "Clean" && (
          <div className="space-y-4">
            {applied && (
              <Panel className="p-5">
                <h3 className="text-[15px] font-semibold">
                  Version {applied.version_number} created
                </h3>
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                  The previous version is untouched and still available.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-lg p-3" style={{ background: "var(--surface-inset)" }}>
                    <div className="text-[12px] text-[var(--text-muted)]">Before</div>
                    <div className="font-mono text-[15px]">
                      {applied.before.rows} rows · health {applied.before.health_score ?? "—"}
                    </div>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: "var(--accent-quiet)" }}>
                    <div className="text-[12px] text-[var(--accent)]">After</div>
                    <div className="font-mono text-[15px]">
                      {applied.after.rows} rows · health {applied.after.health_score}
                    </div>
                  </div>
                </div>
              </Panel>
            )}

            {plan === null ? (
              <Panel className="p-5">
                <Skeleton className="h-24 w-full" />
              </Panel>
            ) : plan.operations.length ? (
              <Panel>
                <PanelHeader
                  title="Proposed cleaning"
                  description={`${plan.safe_count} safe operations run automatically. ${plan.requires_approval_count} change or remove real values and need your approval.`}
                  action={
                    <Button variant="primary" busy={applying} onClick={applyCleaning}>
                      Create cleaned version
                    </Button>
                  }
                />
                <ul className="divide-y px-2 py-1">
                  {plan.operations.map((op) => (
                    <li key={op.op_id} className="py-1">
                      {op.safe ? (
                        <div className="flex items-start gap-3 px-2 py-2">
                          <Badge tone="verified" className="mt-0.5">
                            auto
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13.5px] font-medium">
                              {op.operation.replace(/_/g, " ")}
                              {op.column && (
                                <span className="ml-2 font-mono text-[12px] text-[var(--text-muted)]">
                                  {op.column}
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 text-[12.5px] text-[var(--text-muted)]">
                              {op.reason}
                            </p>
                          </div>
                          <span className="font-mono text-[12px] text-[var(--text-muted)]">
                            {op.estimated_affected_rows}
                          </span>
                        </div>
                      ) : (
                        <CheckRow
                          checked={approved.includes(op.op_id)}
                          onChange={(on) =>
                            setApproved((prev) =>
                              on ? [...prev, op.op_id] : prev.filter((x) => x !== op.op_id),
                            )
                          }
                        >
                          <span className="flex items-start gap-3">
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13.5px] font-medium">
                                {op.operation.replace(/_/g, " ")}
                                {op.column && (
                                  <span className="ml-2 font-mono text-[12px] text-[var(--text-muted)]">
                                    {op.column}
                                  </span>
                                )}
                              </span>
                              <span className="mt-0.5 block text-[12.5px] text-[var(--text-muted)]">
                                {op.reason}
                              </span>
                            </span>
                            <span className="font-mono text-[12px] text-[var(--text-muted)]">
                              {op.estimated_affected_rows}
                            </span>
                          </span>
                        </CheckRow>
                      )}
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : (
              <Panel>
                <EmptyState
                  icon={ShieldAlert}
                  title="Nothing to clean"
                  body="This version has no operations worth applying."
                />
              </Panel>
            )}
          </div>
        )}

        {/* ------------------------- Preview ------------------------ */}
        {tab === "Preview" &&
          (preview ? (
            <Panel className="overflow-hidden">
              <PanelHeader
                title="Rows"
                description={`First ${preview.rows.length} of ${preview.total_rows.toLocaleString()}`}
              />
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px]">
                  <thead>
                    <tr className="border-b text-left text-[11.5px] text-[var(--text-muted)]">
                      {preview.columns.map((c) => (
                        <th key={c} className="whitespace-nowrap px-4 py-2.5 font-medium">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {preview.rows.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {preview.columns.map((c) => (
                          <td key={c} className="whitespace-nowrap px-4 py-2">
                            {row[c] === null ? (
                              <span className="text-[var(--text-muted)]">null</span>
                            ) : (
                              String(row[c])
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ) : (
            <Panel className="p-5">
              <Skeleton className="h-40 w-full" />
            </Panel>
          ))}

        {/* ------------------------ Versions ------------------------ */}
        {tab === "Versions" && dataset && (
          <Panel>
            <PanelHeader
              title="Lineage"
              description="Each version records what produced it. Nothing is overwritten."
            />
            <ol className="px-5 py-4">
              {dataset.versions.map((v) => (
                <li key={v.id} className="thread pb-4 pl-6">
                  <span
                    className="absolute left-0 top-1 grid h-3.5 w-3.5 place-items-center
                      rounded-full border-2"
                    style={{
                      borderColor:
                        v.id === dataset.current_version_id
                          ? "var(--accent)"
                          : "var(--border-strong)",
                      background: "var(--surface-raised)",
                    }}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-medium">Version {v.number}</span>
                    <Badge tone={v.type === "raw" ? "neutral" : "verified"}>{v.type}</Badge>
                    {v.id === dataset.current_version_id && (
                      <span className="text-[12px] text-[var(--accent)]">current</span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-[12px] text-[var(--text-muted)]">
                    {v.rows?.toLocaleString()} rows · {v.columns} columns
                  </p>
                  {v.cleaning_operations?.operations && (
                    <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[var(--text-muted)]">
                      <GitBranch size={12} />
                      {v.cleaning_operations.operations.filter((o) => o.executed).length}{" "}
                      operations applied
                    </p>
                  )}
                  {v.cleaning_operations?.operation === "merge_supplementary" && (
                    <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">
                      Joined on {v.cleaning_operations.join_on}, adding{" "}
                      {v.cleaning_operations.added_columns?.join(", ")}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </Panel>
        )}
      </div>
    </div>
  );
}
