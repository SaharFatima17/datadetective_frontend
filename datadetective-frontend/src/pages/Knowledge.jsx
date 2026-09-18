import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BookOpen, Check, FileText, Printer, Search as SearchIcon, Trash2, X } from "lucide-react";
import { api } from "../api";
import BriefDocument from "../components/BriefDocument";
import Dropzone from "../components/Dropzone";
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Panel,
  PanelHeader,
  Skeleton,
  Textarea,
} from "../components/ui";

const TYPES = [
  { id: "business_doc", label: "Business document" },
  { id: "kpi_definition", label: "KPI definition" },
  { id: "data_dictionary", label: "Data dictionary" },
];

const TYPE_LABEL = {
  business_doc: "document",
  kpi_definition: "KPI definition",
  data_dictionary: "data dictionary",
  past_report: "past report",
  web_page: "web page",
};

/**
 * One indexed document, with a way to take it back out.
 *
 * A page fetched by mistake otherwise stays in the agents' retrieval set for
 * every future investigation. Confirming inline rather than in a modal keeps
 * the question next to the item it refers to — the list can hold several
 * similarly named reports.
 */
function DocumentRow({ doc, onDelete, typeLabel }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (confirming) {
    return (
      <li
        className="px-5 py-3"
        style={{ background: "color-mix(in srgb, var(--color-alert-soft) 8%, transparent)" }}
      >
        <p className="text-[13px]">Remove this from what the agents can retrieve?</p>
        <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">
          The stored snapshot stays under Sources — only the indexed text is removed.
        </p>
        <div className="mt-2 flex gap-1.5">
          <button
            onClick={async () => {
              setBusy(true);
              await onDelete();
            }}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px]
              font-medium text-white disabled:opacity-50"
            style={{ background: "var(--color-alert-soft)" }}
          >
            <Check size={12} />
            Remove
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[12px]
              font-medium transition-colors hover:bg-[var(--surface-sunken)]"
          >
            <X size={12} />
            Keep
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-3 px-5 py-3">
      <BookOpen size={15} className="shrink-0 text-[var(--text-muted)]" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{doc.title}</p>
        <p className="font-mono text-[11.5px] text-[var(--text-muted)]">
          {doc.chunks} chunks
        </p>
      </div>
      <Badge tone={doc.type === "past_report" ? "verified" : "neutral"}>
        {typeLabel}
      </Badge>
      <button
        onClick={() => setConfirming(true)}
        aria-label={`Remove ${doc.title}`}
        title="Remove from retrieval"
        className="rounded-md p-1.5 text-[var(--text-muted)] opacity-0 transition-opacity
          hover:text-[var(--color-alert-soft)] focus-visible:opacity-100
          group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}

/* A half-written definition must survive leaving the page.
 *
 * This page offers a link to Sources for uploading a file, and taking it
 * unmounts the form. Losing typed work because the interface suggested going
 * somewhere else is the interface's fault, not the person's. The draft is kept
 * per-tab and cleared the moment it is saved. */
const DRAFT_KEY = "dd-kb-draft";

function loadDraft() {
  try {
    return JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function Knowledge() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState(null);

  const draft = loadDraft();
  const [title, setTitle] = useState(draft.title || "");
  const [text, setText] = useState(draft.text || "");
  const [type, setType] = useState(draft.type || "business_doc");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [brief, setBrief] = useState(null);
  const [briefing, setBriefing] = useState(false);
  const [searching, setSearching] = useState(false);

  async function load() {
    setError(null);
    try {
      const result = await api.documents();
      setDocuments(result.documents);
    } catch (err) {
      setError(err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (title || text) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ title, text, type }));
    } else {
      sessionStorage.removeItem(DRAFT_KEY);
    }
  }, [title, text, type]);

  async function save() {
    setSaving(true);
    try {
      await api.indexDocument({ title, text, document_type: type });
      setTitle("");
      setText("");
      sessionStorage.removeItem(DRAFT_KEY);
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    try {
      await api.deleteDocument(id);
      await load();
      // A result list that still shows the removed document is worse than a
      // cleared one: it suggests the removal did not take.
      setResults(null);
    } catch (err) {
      setError(err);
    }
  }

  async function search(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setAnswer(null);
    setBrief(null);
    try {
      // Ask rather than search: someone typing a question wants an answer, and
      // the passages behind it are the evidence for that answer rather than the
      // answer itself.
      const result = await api.askDocuments(query.trim());
      setAnswer(result);
      setResults(result.sources || []);
    } catch (err) {
      setError(err);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-7">
      {/* While a brief is open the rest of this page is workspace, not
          document — hidden from print so the sheet is the brief alone. */}
      {brief && (
        <style>{`@media print { .kb-chrome { display: none !important; } }`}</style>
      )}
      {error && (
        <div className="mb-4">
          <ErrorState error={error} onRetry={load} />
        </div>
      )}

      <Panel className="rise p-5">
        <div className="kb-chrome">
        <h2 className="text-[15px] font-semibold">Ask the knowledge base</h2>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Answers come from the indexed pages and documents, with the passages they
          rest on. No spreadsheet needed — this is for questions the data cannot
          answer.
        </p>
        <form onSubmit={search} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2
                text-[var(--text-muted)]"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What does this company do?"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="primary" busy={searching} disabled={!query.trim()}>
            Ask
          </Button>
          {/* A brief is the longer form of the same question: several sections
              instead of a paragraph, and a source list a reader can follow. */}
          <Button
            type="button"
            busy={briefing}
            disabled={!query.trim()}
            title="Compose a cited brief from the indexed documents"
            onClick={async () => {
              setBriefing(true);
              setAnswer(null);
              try {
                const result = await api.composeBrief(query.trim());
                setBrief(result.available ? result : null);
                if (!result.available) setAnswer({ answered: false, answer: result.reason });
              } catch (err) {
                setError(err);
              } finally {
                setBriefing(false);
              }
            }}
          >
            <FileText size={14} />
            Brief
          </Button>
        </form>

        {answer && (
          <div
            className="mt-4 rounded-lg border p-4"
            style={{ background: "var(--accent-quiet)", borderColor: "var(--accent)" }}
          >
            {answer.answer.split("\n\n").map((para, i) => (
              <p key={i} className={`text-[13.5px] leading-relaxed ${i ? "mt-2" : ""}`}>
                {para}
              </p>
            ))}
            {answer.answered && (
              <p className="mt-2.5 text-[12px] leading-relaxed text-[var(--text-muted)]">
                {answer.note}
              </p>
            )}
          </div>
        )}

        </div>

        {brief && (
          <div className="mt-4">
            <BriefDocument brief={brief} />
            <div className="no-print mt-3 flex flex-wrap items-center gap-2">
              <Button onClick={() => window.print()}>
                <Printer size={14} />
                Print or save as PDF
              </Button>
              {brief.id && (
                <Button variant="ghost" onClick={() => navigate(`/briefs/${brief.id}`)}>
                  Open in Briefs
                </Button>
              )}
              <Button variant="ghost" onClick={() => setBrief(null)}>
                Close
              </Button>
              {!brief.composed && (
                <span className="text-[12px] text-[var(--text-muted)]">
                  No language model configured — this is the retrieved material,
                  grouped by source.
                </span>
              )}
            </div>
          </div>
        )}

        {results !== null && results.length > 0 && !brief && (
          <p className="mt-4 text-[12px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
            Passages this rests on
          </p>
        )}

        {results !== null && !brief && (
          <div className="mt-2 space-y-2">
            {results.length ? (
              results.map((r) => (
                <div
                  key={r.n}
                  className="rounded-lg border p-3"
                  style={{ background: "var(--surface-inset)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] text-[var(--accent)]">
                      [{r.n}]
                    </span>
                    <span className="truncate text-[13px] font-medium">{r.title}</span>
                    <Badge tone="neutral">{TYPE_LABEL[r.type] || r.type}</Badge>
                    <span className="ml-auto font-mono text-[11.5px] text-[var(--text-muted)]">
                      {r.score}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    {r.excerpt}
                  </p>
                </div>
              ))
            ) : (
              null
            )}
          </div>
        )}
      </Panel>

      <div className="kb-chrome mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel>
          <PanelHeader
            title="Add context"
            description="Drop a document, or write a definition that only exists in someone's head"
          />
          <div className="space-y-4 p-5">
            {/* Documents can also be added from Sources, which handles every
                kind of input. Keeping it here too is deliberate: someone adding
                business context is already on this page, and sending them to
                another one to finish the job — losing what they had typed —
                was worse than having two ways in. */}
            <Dropzone
              compact
              accept="documents"
              busy={uploading}
              onFile={async (file) => {
                setUploading(true);
                setError(null);
                try {
                  await api.upload(file);
                  await load();
                } catch (err) {
                  setError(err);
                } finally {
                  setUploading(false);
                }
              }}
            />

            <div className="border-t pt-4">
              <Field label="Title">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="How we define net sales"
                />
              </Field>
              <div className="mt-3">
                <Field label="Kind">
                  <div className="flex flex-wrap gap-1.5">
                    {TYPES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setType(t.id)}
                        className={`rounded-md px-2.5 py-1 text-[12.5px] font-medium
                          transition-colors ${
                            type === t.id
                              ? "bg-[var(--accent-quiet)] text-[var(--accent)]"
                              : "text-[var(--text-muted)] hover:bg-[var(--surface-sunken)]"
                          }`}
                        style={type === t.id ? undefined : { background: "var(--surface-inset)" }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
              <div className="mt-3">
                <Field label="Text">
                  <Textarea
                    rows={5}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Net sales means gross revenue minus returns and discounts."
                  />
                </Field>
              </div>
              <Button
                variant="primary"
                className="mt-3"
                busy={saving}
                disabled={!title.trim() || !text.trim()}
                onClick={save}
              >
                Add to knowledge base
              </Button>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Indexed"
            description={documents ? `${documents.length} items` : undefined}
          />
          {documents === null ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : documents.length ? (
            <ul className="divide-y">
              {documents.map((d) => (
                <DocumentRow
                  key={d.id}
                  doc={d}
                  typeLabel={TYPE_LABEL[d.type] || d.type}
                  onDelete={() => remove(d.id)}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Nothing indexed yet"
              body="Add a KPI definition or a business document, and the agents will consult it during the next investigation."
            />
          )}
        </Panel>
      </div>
    </div>
  );
}