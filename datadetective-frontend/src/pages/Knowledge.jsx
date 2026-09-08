import { useEffect, useState } from "react";
import { BookOpen, Search as SearchIcon } from "lucide-react";
import { api } from "../api";
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

export default function Knowledge() {
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState("business_doc");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
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

  async function save() {
    setSaving(true);
    try {
      await api.indexDocument({ title, text, document_type: type });
      setTitle("");
      setText("");
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function search(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const result = await api.search(query.trim());
      setResults(result.results);
    } catch (err) {
      setError(err);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-7">
      {error && (
        <div className="mb-4">
          <ErrorState error={error} onRetry={load} />
        </div>
      )}

      <Panel className="rise p-5">
        <h2 className="text-[15px] font-semibold">Search what the agents can retrieve</h2>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Business context and past reports. The agents consult this while planning an
          investigation, not only when writing it up.
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
              placeholder="What does net sales mean here?"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="primary" busy={searching} disabled={!query.trim()}>
            Search
          </Button>
        </form>

        {results !== null && (
          <div className="mt-4 space-y-2">
            {results.length ? (
              results.map((r) => (
                <div
                  key={r.chunk_id}
                  className="rounded-lg border p-3"
                  style={{ background: "var(--surface-inset)" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">{r.document_title}</span>
                    <Badge tone="neutral">{TYPE_LABEL[r.document_type] || r.document_type}</Badge>
                    <span className="ml-auto font-mono text-[11.5px] text-[var(--text-muted)]">
                      {r.score}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
                    {r.content.slice(0, 320)}
                    {r.content.length > 320 && "…"}
                  </p>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-[13px] text-[var(--text-muted)]">
                Nothing matched. Add a document below and search again.
              </p>
            )}
          </div>
        )}
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel>
          <PanelHeader
            title="Add context"
            description="Paste a definition, or drop a PDF or Word file"
          />
          <div className="space-y-4 p-5">
            <Dropzone
              compact
              accept="documents"
              busy={uploading}
              onFile={async (file) => {
                setUploading(true);
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
                <li key={d.id} className="flex items-center gap-3 px-5 py-3">
                  <BookOpen size={15} className="shrink-0 text-[var(--text-muted)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium">{d.title}</p>
                    <p className="font-mono text-[11.5px] text-[var(--text-muted)]">
                      {d.chunks} chunks
                    </p>
                  </div>
                  <Badge tone={d.type === "past_report" ? "verified" : "neutral"}>
                    {TYPE_LABEL[d.type] || d.type}
                  </Badge>
                </li>
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
