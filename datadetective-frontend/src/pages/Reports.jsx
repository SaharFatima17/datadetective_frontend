import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, FileText } from "lucide-react";
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

export default function Reports() {
  const navigate = useNavigate();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    setError(null);
    try {
      const list = await api.investigations();
      const complete = list.investigations.filter((i) => i.status === "complete");
      const reports = await Promise.all(
        complete.map(async (inv) => {
          try {
            const report = await api.report(inv.id);
            return { inv, report };
          } catch {
            return null;
          }
        }),
      );
      setRows(reports.filter(Boolean));
    } catch (err) {
      setError(err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-7">
      {error && <ErrorState error={error} onRetry={load} />}

      <Panel className="rise">
        <PanelHeader
          title="Reports"
          description="Every completed investigation keeps a versioned report"
        />

        {rows === null ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : rows.length ? (
          <ul className="divide-y">
            {rows.map(({ inv, report }) => (
              <li key={inv.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14.5px] font-medium">{report.question}</h3>
                    <p className="mt-1.5 max-w-[70ch] text-[13px] leading-relaxed text-[var(--text-muted)]">
                      {report.executive_summary}
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      <Badge tone="verified">
                        {report.findings?.length || 0} findings
                      </Badge>
                      {report.recommendations?.length > 0 && (
                        <Badge tone="neutral">
                          {report.recommendations.length} recommendations
                        </Badge>
                      )}
                      {report.forecasts?.length > 0 && (
                        <Badge
                          tone={
                            report.forecasts[0].reliability === "ok"
                              ? "verified"
                              : "association"
                          }
                        >
                          forecast {report.forecasts[0].reliability?.replace(/_/g, " ")}
                        </Badge>
                      )}
                      <span className="font-mono text-[11.5px] text-[var(--text-muted)]">
                        v{report.version}
                      </span>
                    </div>

                    {/* What the knowledge base contributed to this report.
                        The findings say what the data showed; these say what
                        the agents read while deciding what to look for. Without
                        it, a reader cannot tell whether a document they added
                        made any difference. */}
                    {(() => {
                      const consulted = [
                        ...(report.retrieval?.definitions_used || []),
                        ...(report.retrieval?.context_documents || []),
                      ];
                      if (!consulted.length) return null;
                      return (
                        <div
                          className="mt-3 rounded-lg border px-3 py-2.5"
                          style={{ background: "var(--surface-inset)" }}
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen size={13} className="text-[var(--text-muted)]" />
                            <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                              From the knowledge base
                            </span>
                          </div>
                          <ul className="mt-1.5 space-y-0.5">
                            {consulted.map((d, i) => (
                              <li
                                key={i}
                                className="truncate text-[12.5px] text-[var(--text-muted)]"
                              >
                                {d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}
                  </div>
                  <Button size="sm" onClick={() => navigate(`/investigations/${inv.id}`)}>
                    Open
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={FileText}
            title="No reports yet"
            body="A report is written when an investigation completes."
            action={
              <Button variant="primary" onClick={() => navigate("/")}>
                Ask a question
              </Button>
            }
          />
        )}
      </Panel>
    </div>
  );
}


