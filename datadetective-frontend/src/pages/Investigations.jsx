import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { api } from "../api";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Panel,
  PanelHeader,
  Skeleton,
} from "../components/ui";

const STATUS_TONE = {
  complete: "verified",
  awaiting_user: "association",
  running: "neutral",
  planning: "neutral",
  abandoned: "measurement",
  failed: "alert",
};

const FILTERS = ["All", "Complete", "Awaiting you"];

export default function Investigations() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("All");

  async function load() {
    setError(null);
    try {
      const result = await api.investigations();
      setRows(result.investigations);
    } catch (err) {
      setError(err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const visible = (rows || []).filter((r) =>
    filter === "All"
      ? true
      : filter === "Complete"
        ? r.status === "complete"
        : r.status === "awaiting_user",
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-7">
      {error && <ErrorState error={error} onRetry={load} />}

      <Panel className="rise">
        <PanelHeader
          title="Investigations"
          description="Each one keeps its hypotheses, evidence and report"
          action={
            <div className="flex gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-md px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
                    filter === f
                      ? "bg-[var(--accent-quiet)] text-[var(--accent)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--surface-sunken)]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        />

        {rows === null ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : visible.length ? (
          <ul className="divide-y">
            {visible.map((inv) => (
              <li key={inv.id}>
                <button
                  onClick={() => navigate(`/investigations/${inv.id}`)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left
                    transition-colors hover:bg-[var(--surface-sunken)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{inv.question}</p>
                    <p className="mt-1 font-mono text-[11.5px] text-[var(--text-muted)]">
                      {inv.target_metric || "no metric identified"} · round {inv.round} ·{" "}
                      {new Date(inv.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[inv.status] || "neutral"}>
                    {inv.status.replace(/_/g, " ")}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Search}
            title={filter === "All" ? "No investigations yet" : `Nothing is ${filter.toLowerCase()}`}
            body={
              filter === "All"
                ? "Ask a question from the dashboard and it will appear here."
                : "Try a different filter."
            }
            action={
              filter === "All" ? (
                <Button variant="primary" onClick={() => navigate("/")}>
                  Ask a question
                </Button>
              ) : null
            }
          />
        )}
      </Panel>
    </div>
  );
}
