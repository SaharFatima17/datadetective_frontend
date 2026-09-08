import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Database, Globe, HardDrive, Table2, Upload } from "lucide-react";
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

const TABS = [
  { id: "file", label: "File", icon: Upload },
  { id: "database", label: "Database", icon: Database },
  { id: "url", label: "Web page", icon: Globe },
];

const bytes = (n) => {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
};

export default function Sources() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("file");
  const [datasets, setDatasets] = useState(null);
  const [sources, setSources] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [connection, setConnection] = useState("");
  const [query, setQuery] = useState("SELECT * FROM ");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  async function load() {
    setError(null);
    try {
      const [d, s] = await Promise.all([api.datasets(), api.sources()]);
      setDatasets(d.datasets);
      setSources(s.sources);
    } catch (err) {
      setError(err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function run(work, describe) {
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      const result = await work();
      setNotice(describe(result));
      await load();
      return result;
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:px-7">
      <Panel className="rise">
        <PanelHeader
          title="Add data"
          description="The original is stored untouched, with a checksum, before anything reads it."
        />

        <div className="flex gap-1 border-b px-4 pt-3">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setTab(id);
                setActionError(null);
                setNotice(null);
              }}
              className={`flex items-center gap-2 rounded-t-lg px-3.5 py-2 text-[13.5px]
                font-medium transition-colors ${
                  tab === id
                    ? "border-b-2 border-[var(--accent)] text-[var(--accent)]"
                    : "border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {tab === "file" && (
            <Dropzone
              busy={busy}
              onFile={(file) =>
                run(
                  () => api.upload(file),
                  (r) =>
                    r.kind === "dataset"
                      ? `${r.name} is ready — health score ${r.profile.health_score}.`
                      : `${r.name} indexed as context in ${r.chunks} chunks.`,
                )
              }
            />
          )}

          {tab === "database" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-4">
                <Field
                  label="Connection string"
                  hint="used once, never stored"
                >
                  <Input
                    value={connection}
                    onChange={(e) => setConnection(e.target.value)}
                    placeholder="postgresql+psycopg2://user:password@host:5432/database"
                  />
                </Field>
                <Field label="Name for this dataset">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Q3 orders"
                  />
                </Field>
              </div>
              <div className="space-y-4">
                <Field label="Query" hint="SELECT only">
                  <Textarea
                    rows={5}
                    className="font-mono text-[12.5px]"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </Field>
                <Button
                  variant="primary"
                  busy={busy}
                  disabled={!connection || !name}
                  onClick={() =>
                    run(
                      () =>
                        api.ingestSql({
                          connection_url: connection,
                          query,
                          name,
                        }),
                      (r) => `Imported — health score ${r.profile.health_score}.`,
                    )
                  }
                >
                  Import query results
                </Button>
              </div>
            </div>
          )}

          {tab === "url" && (
            <div className="max-w-xl space-y-4">
              <Field
                label="Page address"
                hint="a snapshot is kept, so the finding stays traceable if the page changes"
              >
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/quarterly-summary"
                />
              </Field>
              <Button
                variant="primary"
                busy={busy}
                disabled={!url}
                onClick={() =>
                  run(
                    () => api.ingestUrl({ url, index_for_rag: true }),
                    (r) => `Retrieved and indexed in ${r.chunks} chunks.`,
                  )
                }
              >
                Retrieve page
              </Button>
            </div>
          )}

          {notice && (
            <p
              className="mt-4 rounded-lg px-3 py-2 text-[13px]"
              style={{ background: "var(--accent-quiet)", color: "var(--accent)" }}
            >
              {notice}
            </p>
          )}
          {actionError && (
            <div className="mt-4">
              <ErrorState error={actionError} />
            </div>
          )}
        </div>
      </Panel>

      {error && (
        <div className="mt-4">
          <ErrorState error={error} onRetry={load} />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Panel>
          <PanelHeader title="Datasets" description="Tables you can investigate" />
          {datasets === null ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : datasets.length ? (
            <ul className="divide-y">
              {datasets.map((d) => (
                <li key={d.id}>
                  <button
                    onClick={() => navigate(`/sources/${d.id}`)}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left
                      transition-colors hover:bg-[var(--surface-sunken)]"
                  >
                    <Table2 size={16} className="shrink-0 text-[var(--text-muted)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium">{d.name}</p>
                      <p className="mt-0.5 font-mono text-[11.5px] text-[var(--text-muted)]">
                        {d.versions} version{d.versions === 1 ? "" : "s"} · {d.id.slice(0, 8)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={Table2}
              title="No datasets yet"
              body="Upload a spreadsheet or import a query above to get started."
            />
          )}
        </Panel>

        <Panel>
          <PanelHeader title="Sources" description="Everything registered, with provenance" />
          {sources === null ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : sources.length ? (
            <ul className="divide-y">
              {sources.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <HardDrive size={15} className="shrink-0 text-[var(--text-muted)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px]">{s.name}</p>
                    <p className="font-mono text-[11.5px] text-[var(--text-muted)]">
                      {s.format || s.type} · {bytes(s.size_bytes)}
                    </p>
                  </div>
                  <Badge tone={s.status === "extracted" ? "verified" : "neutral"}>
                    {s.status}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={HardDrive} title="Nothing registered yet" />
          )}
        </Panel>
      </div>
    </div>
  );
}
