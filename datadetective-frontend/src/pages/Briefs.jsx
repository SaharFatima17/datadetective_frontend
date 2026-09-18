import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Printer } from "lucide-react";
import { api } from "../api";
import BriefDocument from "../components/BriefDocument";
import {
  Badge,
  Button,
  DeleteButton,
  EmptyState,
  ErrorState,
  Panel,
  PanelHeader,
  Skeleton,
} from "../components/ui";

/**
 * Saved briefs, kept apart from Reports.
 *
 * A report belongs to an investigation: its figures were computed and can be
 * recomputed on demand. A brief answers a question put to the knowledge base:
 * its statements trace to a passage and cannot be recomputed. Listing them on
 * one page would invite a reader to treat the two as the same kind of claim,
 * which is the distinction this system exists to hold.
 */
export default function Briefs() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [rows, setRows] = useState(null);
  const [brief, setBrief] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    setError(null);
    try {
      const result = await api.briefs();
      setRows(result.briefs);
    } catch (err) {
      setError(err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!id) {
      setBrief(null);
      return;
    }
    setBrief(null);
    setError(null);
    api.brief(id).then(setBrief).catch(setError);
  }, [id]);

  /* ----------------------------- one brief ---------------------------- */
  if (id) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 lg:px-7">
        <button
          onClick={() => navigate("/briefs")}
          className="no-print mb-4 inline-flex items-center gap-1.5 text-[13px]
            text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={14} />
          All briefs
        </button>

        {error && <ErrorState error={error} />}

        {brief ? (
          <>
            <BriefDocument brief={brief} />
            <div className="no-print mt-3 flex items-center gap-2">
              <Button onClick={() => window.print()}>
                <Printer size={14} />
                Print or save as PDF
              </Button>
              {!brief.composed && (
                <span className="text-[12px] text-[var(--text-muted)]">
                  Written without a language model — this is the retrieved
                  material, grouped by source.
                </span>
              )}
            </div>
          </>
        ) : (
          !error && (
            <Panel className="p-5">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-5/6" />
            </Panel>
          )
        )}
      </div>
    );
  }

  /* ------------------------------- list ------------------------------- */
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-7">
      {error && <ErrorState error={error} onRetry={load} />}

      <Panel className="rise">
        <PanelHeader
          title="Briefs"
          description="Answers assembled from indexed pages and documents, kept as written"
        />

        {rows === null ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : rows.length ? (
          <ul className="divide-y">
            {rows.map((b) => (
              <li key={b.id} className="group flex items-start gap-3 px-5 py-4">
                <BookOpen size={16} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
                <button
                  onClick={() => navigate(`/briefs/${b.id}`)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-[14.5px] font-medium">{b.title}</p>
                  {b.summary && (
                    <p className="mt-1 max-w-[70ch] text-[13px] leading-relaxed text-[var(--text-muted)]">
                      {b.summary}
                      {b.summary.length >= 280 && "…"}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{b.sections} sections</Badge>
                    <Badge tone="neutral">{b.sources} sources</Badge>
                    {!b.composed && <Badge tone="association">passages only</Badge>}
                    <span className="font-mono text-[11.5px] text-[var(--text-muted)]">
                      {new Date(b.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </button>
                <DeleteButton
                  title={`Delete ${b.title}`}
                  onClick={async () => {
                    try {
                      await api.deleteBrief(b.id);
                      await load();
                    } catch (err) {
                      setError(err);
                    }
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={BookOpen}
            title="No briefs yet"
            body="Ask the knowledge base a question and choose Brief. What it writes is kept here, exactly as it was written."
            action={
              <Button variant="primary" onClick={() => navigate("/knowledge")}>
                Go to the knowledge base
              </Button>
            }
          />
        )}
      </Panel>
    </div>
  );
}