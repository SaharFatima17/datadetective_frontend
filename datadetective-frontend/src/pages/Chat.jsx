import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowUp,
  Check,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  MessageSquare,
  Paperclip,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../api";
import { Badge, Button, EmptyState, ErrorState, Panel, Skeleton } from "../components/ui";

const SUGGESTIONS = [
  "Why did revenue decline?",
  "Which region drove the drop?",
  "Write the report",
];

/* ------------------------------------------------------------------ *
 * Message rendering
 *
 * The thread keeps the structured result, not a paragraph describing it,
 * so a reloaded conversation shows the same finding cards it showed when
 * the answer first arrived.
 * ------------------------------------------------------------------ */

const TYPE_TONE = {
  driver: "driver",
  association: "association",
  measurement: "measurement",
};

function Findings({ payload, onOpen }) {
  const findings = payload?.findings || [];
  if (!findings.length) return null;
  return (
    <div className="mt-3 space-y-2">
      {findings.map((f, i) => (
        <div
          key={f.id || i}
          className="flex items-start gap-2.5 rounded-lg border px-3 py-2"
          style={{ background: "var(--surface-inset)" }}
        >
          <span
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{
              background:
                f.finding_type === "driver"
                  ? "var(--accent)"
                  : f.finding_type === "association"
                    ? "var(--color-amber-soft)"
                    : "var(--border-strong)",
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] leading-relaxed">{f.statement}</p>
          </div>
          <Badge tone={TYPE_TONE[f.finding_type] || "neutral"}>{f.finding_type}</Badge>
        </div>
      ))}

      {payload.recommendations?.length > 0 && (
        <p className="text-[12.5px] text-[var(--text-muted)]">
          {payload.recommendations.length} recommended action
          {payload.recommendations.length === 1 ? "" : "s"} ·{" "}
          {payload.forecasts?.length ? "forecast included" : "no forecast"}
        </p>
      )}

      {payload.investigation_id && (
        <Button size="sm" variant="ghost" className="-ml-2" onClick={onOpen}>
          Open the full investigation
        </Button>
      )}
    </div>
  );
}

/**
 * The next steps offered with a reply.
 *
 * These are what turn a question-answering box into something that guides: at
 * every point the person can see what this system can actually do next, rather
 * than having to guess at phrasings it understands.
 */
function Suggestions({ items, onPick }) {
  if (!items?.length) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((s) => (
        <button
          key={s}
          onClick={() => onPick(s)}
          className="rounded-full border px-3 py-1 text-[12.5px] text-[var(--text-secondary)]
            transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function Message({ message, onOpenInvestigation, onAttach, onPick }) {
  const { role, kind, content, payload } = message;

  if (role === "user") {
    const attached = kind === "dataset";
    return (
      <div className="flex justify-end">
        <div
          className={`max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-[14px]
            leading-relaxed ${attached ? "font-mono text-[12.5px]" : ""}`}
          style={{ background: "var(--accent-quiet)", color: "var(--accent)" }}
        >
          {attached ? (
            <span className="flex items-center gap-2">
              <FileSpreadsheet size={14} />
              {payload?.name || content}
            </span>
          ) : (
            content
          )}
        </div>
      </div>
    );
  }

  // ------------------------------------------------------ assistant --- //
  if (kind === "request") {
    return (
      <div
        className="rounded-[14px] border p-4"
        style={{
          borderColor: "color-mix(in srgb, var(--color-amber-soft) 45%, transparent)",
          background: "color-mix(in srgb, var(--color-amber-soft) 7%, transparent)",
        }}
      >
        <div className="flex items-start gap-2.5">
          <HelpCircle size={16} className="mt-0.5 shrink-0 text-[var(--color-amber-soft)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] leading-relaxed">{content}</p>
            {payload?.reason && (
              <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">{payload.reason}</p>
            )}
            <p className="mt-2.5 text-[12.5px] text-[var(--text-muted)]">
              Reply in a sentence, or{" "}
              <button
                onClick={onAttach}
                className="font-medium text-[var(--accent)] underline underline-offset-2"
              >
                attach the data
              </button>
              .
            </p>
            <Suggestions items={payload?.suggestions} onPick={onPick} />
          </div>
        </div>
      </div>
    );
  }

  if (kind === "error") {
    return <ErrorState error={content} />;
  }

  return (
    <div className="flex gap-3">
      <span
        className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg"
        style={{ background: "var(--accent-quiet)" }}
      >
        <Sparkles size={14} className="text-[var(--accent)]" />
      </span>
      <div className="min-w-0 flex-1">
        {content.split("\n\n").map((para, i) => (
          <p key={i} className={`text-[14px] leading-relaxed ${i ? "mt-2" : ""}`}>
            {para}
          </p>
        ))}

        {kind === "findings" && (
          <Findings payload={payload} onOpen={onOpenInvestigation} />
        )}

        {kind === "report" && (
          <div
            className="mt-3 rounded-lg border px-4 py-3"
            style={{ background: "var(--surface-inset)" }}
          >
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-[var(--accent)]" />
              <span className="text-[13.5px] font-medium">
                Investigation report · v{payload?.version}
              </span>
            </div>
            <p className="mt-1.5 text-[12.5px] text-[var(--text-muted)]">
              {(payload?.findings || []).length} findings ·{" "}
              {(payload?.recommendations || []).length} recommendations
            </p>
            <Button size="sm" className="mt-2.5" onClick={onOpenInvestigation}>
              Open and print
            </Button>
          </div>
        )}

        {kind === "dataset" && payload?.profile && (
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="neutral">{payload.profile.row_count?.toLocaleString()} rows</Badge>
            <Badge tone={payload.profile.health_score >= 80 ? "verified" : "association"}>
              health {payload.profile.health_score}
            </Badge>
          </div>
        )}

        <Suggestions items={payload?.suggestions} onPick={onPick} />
      </div>
    </div>
  );
}

/**
 * A conversation in the sidebar.
 *
 * Deleting is confirmed inline rather than in a modal: the confirmation
 * appears where the thing being deleted is, so there is no chance of
 * confirming the removal of a different row than the one you meant.
 */
function ThreadRow({ thread, active, onOpen, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (confirming) {
    return (
      <div
        className="rounded-lg px-3 py-2"
        style={{ background: "color-mix(in srgb, var(--color-alert-soft) 9%, transparent)" }}
      >
        <p className="text-[12.5px] leading-snug">Delete this conversation?</p>
        <p className="mt-0.5 text-[11.5px] text-[var(--text-muted)]">
          The investigations it created are kept.
        </p>
        <div className="mt-2 flex gap-1.5">
          <button
            onClick={async () => {
              setRemoving(true);
              await onDelete();
            }}
            disabled={removing}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px]
              font-medium text-white disabled:opacity-50"
            style={{ background: "var(--color-alert-soft)" }}
          >
            <Check size={12} />
            Delete
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px]
              font-medium transition-colors hover:bg-[var(--surface-sunken)]"
          >
            <X size={12} />
            Keep
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center rounded-lg transition-colors ${
        active
          ? "bg-[var(--accent-quiet)]"
          : "hover:bg-[var(--surface-sunken)]"
      }`}
    >
      <button
        onClick={onOpen}
        className={`min-w-0 flex-1 px-3 py-2 text-left text-[13px] ${
          active ? "text-[var(--accent)]" : "text-[var(--text-secondary)]"
        }`}
      >
        <span className="block truncate font-medium">{thread.title}</span>
        <span className="block truncate text-[11.5px] text-[var(--text-muted)]">
          {thread.messages} messages
        </span>
      </button>
      <button
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${thread.title}`}
        title="Delete conversation"
        className="mr-1.5 rounded-md p-1.5 text-[var(--text-muted)] opacity-0
          transition-opacity hover:text-[var(--color-alert-soft)]
          focus-visible:opacity-100 group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [threads, setThreads] = useState(null);
  const [thread, setThread] = useState(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);

  const fileRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  async function loadThreads() {
    try {
      const result = await api.conversations();
      setThreads(result.conversations);
      return result.conversations;
    } catch (err) {
      setError(err);
      return [];
    }
  }

  useEffect(() => {
    loadThreads();
  }, []);

  // The thread is reloaded from the server on every visit, so a refresh or a
  // shared link restores the conversation exactly as it was.
  useEffect(() => {
    if (!id) {
      setThread(null);
      return;
    }
    setThread(null);
    api.conversation(id).then(setThread).catch(setError);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [thread?.messages?.length, busy]);

  async function startThread() {
    try {
      const created = await api.newConversation({});
      await loadThreads();
      navigate(`/chat/${created.id}`);
    } catch (err) {
      setError(err);
    }
  }

  async function removeThread(threadId) {
    try {
      await api.archiveConversation(threadId);
      const remaining = await loadThreads();
      // Leaving the person on a thread that no longer exists would show a
      // dead screen, so move them to the next one, or to the empty state.
      if (threadId === id) {
        navigate(remaining.length ? `/chat/${remaining[0].id}` : "/chat");
      }
    } catch (err) {
      setError(err);
    }
  }

  function appendLocal(message) {
    setThread((t) => (t ? { ...t, messages: [...t.messages, message] } : t));
  }

  async function send(preset) {
    const text = (typeof preset === "string" ? preset : draft).trim();
    if (!text || !thread || busy) return;
    if (/^attach a spreadsheet$/i.test(text)) {
      fileRef.current?.click();
      return;
    }
    setDraft("");
    setBusy(true);
    setError(null);

    // Show the person's own message immediately; waiting for the round trip
    // makes the interface feel like it dropped the message.
    appendLocal({ id: `local-${Date.now()}`, role: "user", kind: "text", content: text });

    try {
      const result = await api.sendMessage(thread.id, text);
      setThread((t) => ({
        ...t,
        messages: [...t.messages.filter((m) => !String(m.id).startsWith("local-")),
                   { id: `sent-${Date.now()}`, role: "user", kind: "text", content: text },
                   ...result.messages],
      }));
      loadThreads();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function upload(file) {
    if (!file || !thread) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.chatUpload(thread.id, file);
      const refreshed = await api.conversation(thread.id);
      setThread(refreshed);
      loadThreads();
      return result;
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  /* ------------------------------- render ------------------------------ */
  const messages = thread?.messages || [];

  return (
    <div className="mx-auto flex h-[calc(100vh-56px)] max-w-6xl gap-4 px-4 py-4 lg:px-7">
      {/* ---------------------------- threads --------------------------- */}
      <aside className="hidden w-[228px] shrink-0 flex-col md:flex">
        <Button variant="primary" className="w-full" onClick={startThread}>
          <Plus size={15} />
          New conversation
        </Button>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto">
          {threads === null ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : threads.length ? (
            <ul className="space-y-0.5">
              {threads.map((t) => (
                <li key={t.id}>
                  <ThreadRow
                    thread={t}
                    active={t.id === id}
                    onOpen={() => navigate(`/chat/${t.id}`)}
                    onDelete={() => removeThread(t.id)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-6 text-center text-[12.5px] text-[var(--text-muted)]">
              No conversations yet.
            </p>
          )}
        </div>
      </aside>

      {/* ----------------------------- thread --------------------------- */}
      <Panel
        className="flex min-w-0 flex-1 flex-col overflow-hidden"
        onDragOver={(e) => {
          e.preventDefault();
          if (thread) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files?.[0]);
        }}
      >
        {!id ? (
          <EmptyState
            icon={MessageSquare}
            title="Ask in your own words"
            body="Attach a spreadsheet and describe what you want to know. I'll form hypotheses, test them, ask for anything I'm missing, and write it up when you say so."
            action={
              <Button variant="primary" onClick={startThread}>
                <Plus size={15} />
                Start a conversation
              </Button>
            }
          />
        ) : (
          <>
            {/* header */}
            <div className="flex items-center gap-3 border-b px-5 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[14px] font-semibold">
                  {thread?.title || "Loading"}
                </h2>
                {thread?.dataset && (
                  <p className="truncate font-mono text-[11.5px] text-[var(--text-muted)]">
                    {thread.dataset.name}
                  </p>
                )}
              </div>
              {thread?.investigation_id && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate(`/investigations/${thread.investigation_id}`)}
                >
                  Open investigation
                </Button>
              )}
            </div>

            {/* messages */}
            <div
              className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5"
              style={
                dragging
                  ? { background: "var(--accent-quiet)", outline: "2px dashed var(--accent)" }
                  : undefined
              }
            >
              {thread === null ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                messages.map((m, i) => (
                  <Message
                    key={m.id}
                    message={m}
                    // Only the latest reply offers next steps: chips further up
                    // the thread refer to a moment that has already passed.
                    onPick={
                      i === messages.length - 1 ? (t) => send(t) : undefined
                    }
                    onAttach={() => fileRef.current?.click()}
                    onOpenInvestigation={() =>
                      navigate(
                        `/investigations/${m.payload?.investigation_id || thread.investigation_id}`,
                      )
                    }
                  />
                ))
              )}

              {busy && (
                <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
                  <span className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)]"
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </span>
                  Testing hypotheses against your data
                </div>
              )}

              {error && <ErrorState error={error} />}
              <div ref={bottomRef} />
            </div>

            {/* composer */}
            <div className="border-t px-4 py-3">
              {messages.length <= 1 && !messages.some((m) => m.payload?.suggestions) && (
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setDraft(s)}
                      className="rounded-md px-2.5 py-1 text-[12.5px] text-[var(--text-secondary)]
                        transition-colors hover:bg-[var(--surface-sunken)]"
                      style={{ background: "var(--surface-inset)" }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              <div
                className="flex items-end gap-2 rounded-xl border px-2 py-2"
                style={{ background: "var(--surface-inset)" }}
              >
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  className="rounded-lg p-2 text-[var(--text-muted)] transition-colors
                    hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]
                    disabled:opacity-40"
                  title="Attach a spreadsheet or document"
                  aria-label="Attach a file"
                >
                  <Paperclip size={17} />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  className="sr-only"
                  accept=".csv,.tsv,.xlsx,.xls,.json,.parquet,.pdf,.docx,.pptx,.txt,.md"
                  onChange={(e) => {
                    upload(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />

                <textarea
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  disabled={busy}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Ask about your data, or say 'write the report'"
                  className="max-h-40 flex-1 resize-none bg-transparent py-1.5 text-[14px]
                    outline-none placeholder:text-[var(--text-muted)]"
                />

                <Button
                  variant="primary"
                  size="sm"
                  busy={busy}
                  disabled={!draft.trim()}
                  onClick={send}
                  aria-label="Send"
                >
                  <ArrowUp size={15} />
                </Button>
              </div>
              <p className="mt-1.5 text-[11.5px] text-[var(--text-muted)]">
                Enter to send, Shift + Enter for a new line. You can also drop a file
                anywhere in this panel.
              </p>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}