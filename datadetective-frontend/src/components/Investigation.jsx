import { useState } from "react";
import {
  Beaker,
  ChevronDown,
  CircleSlash,
  FlaskConical,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { api } from "../api";
import { Badge, Button, Code, EmptyState, Panel, PanelHeader } from "../components/ui";

const AGENT_LABEL = {
  profiler: "Profiler",
  analysis: "Analysis",
  forecasting: "Forecasting",
  api: "Direct call",
  mcp: "External client",
  evidence_merge: "Evidence merge",
};

const HYPOTHESIS_TONE = {
  supported: "verified",
  rejected: "measurement",
  unresolved: "association",
  blocked_missing_evidence: "association",
  testable: "neutral",
  proposed: "neutral",
};

export function Timeline({ timeline, loading }) {
  const [openRun, setOpenRun] = useState(null);

  if (loading) {
    return (
      <Panel className="p-5">
        <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
          <Loader2 size={14} className="animate-spin" />
          Rebuilding the trail
        </div>
      </Panel>
    );
  }

  const hypotheses = timeline?.hypotheses || [];
  const runs = timeline?.tool_runs || [];

  if (!hypotheses.length && !runs.length) {
    return (
      <Panel>
        <EmptyState
          icon={FlaskConical}
          title="No trail yet"
          body="Once an investigation runs, every hypothesis and every tool call appears here in order."
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Hypotheses"
          description={`${hypotheses.filter((h) => h.status === "supported").length} supported of ${hypotheses.length} generated`}
        />
        <ul className="divide-y">
          {hypotheses.map((h) => (
            <li key={h.id} className="px-5 py-3.5">
              <div className="flex items-start gap-3">
                <Sparkles size={15} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] leading-relaxed">{h.statement}</p>
                  {h.reasoning && (
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                      {h.reasoning}
                    </p>
                  )}
                </div>
                <Badge tone={HYPOTHESIS_TONE[h.status] || "neutral"}>
                  {h.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        <PanelHeader
          title="Agent actions"
          description={`${runs.length} tool calls, in the order they ran`}
        />
        <ol className="px-5 py-4">
          {runs.map((run) => {
            const open = openRun === run.id;
            return (
              <li key={run.id} className="thread pb-3 pl-6">
                <span
                  className="absolute left-0 top-1 grid h-3.5 w-3.5 place-items-center rounded-full border-2"
                  style={{
                    borderColor:
                      run.status === "success" ? "var(--accent)" : "var(--color-alert-soft)",
                    background: "var(--surface-raised)",
                  }}
                />
                <button
                  onClick={() => setOpenRun(open ? null : run.id)}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span className="font-mono text-[12.5px]">{run.tool}</span>
                  <span className="text-[12px] text-[var(--text-muted)]">
                    {AGENT_LABEL[run.agent] || run.agent}
                  </span>
                  <span className="ml-auto font-mono text-[11.5px] text-[var(--text-muted)]">
                    {run.duration_ms}ms
                  </span>
                  <ChevronDown
                    size={14}
                    className={`shrink-0 text-[var(--text-muted)] transition-transform duration-200
                      ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <Code className="mt-2">
                    {JSON.stringify(run.parameters, null, 2)}
                  </Code>
                )}
              </li>
            );
          })}
        </ol>
      </Panel>
    </div>
  );
}

export function EvidencePanel({ evidence, loading }) {
  const [expanded, setExpanded] = useState(null);
  const [verifying, setVerifying] = useState(null);
  const [checks, setChecks] = useState({});

  async function reverify(runId, findingId) {
    setVerifying(findingId);
    try {
      const result = await api.verifyRun(runId);
      setChecks((prev) => ({ ...prev, [findingId]: result }));
    } catch (err) {
      setChecks((prev) => ({ ...prev, [findingId]: { verified: false, reason: err.message } }));
    } finally {
      setVerifying(null);
    }
  }

  if (loading) {
    return (
      <Panel className="p-5">
        <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
          <Loader2 size={14} className="animate-spin" />
          Loading the evidence chain
        </div>
      </Panel>
    );
  }

  const findings = evidence?.findings || [];
  if (!findings.length) {
    return (
      <Panel>
        <EmptyState
          icon={CircleSlash}
          title="No findings met the bar"
          body="Nothing was established firmly enough to record. That is a result, not a failure — the unresolved hypotheses explain what was missing."
        />
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader
        title="Evidence"
        description="Each claim, and the exact calculation that produced it"
      />
      <ul className="divide-y">
        {findings.map((f) => {
          const open = expanded === f.finding_id;
          const check = checks[f.finding_id];
          return (
            <li key={f.finding_id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[14px] font-medium leading-relaxed">{f.statement}</p>
                <Badge tone={f.verification_status === "verified" ? "verified" : "association"}>
                  {f.verification_status === "verified" ? (
                    <>
                      <ShieldCheck size={11} />
                      verified
                    </>
                  ) : (
                    f.verification_status.replace(/_/g, " ")
                  )}
                </Badge>
              </div>

              <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                {f.evidence_summary}
              </p>

              {f.caveats && (
                <p
                  className="mt-2 border-l-2 pl-3 text-[12px] leading-relaxed
                    text-[var(--text-muted)]"
                  style={{ borderColor: "var(--border-strong)" }}
                >
                  {f.caveats}
                </p>
              )}

              {f.calculation && (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setExpanded(open ? null : f.finding_id)}
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-mono
                        text-[12px] transition-colors hover:bg-[var(--surface-sunken)]"
                      style={{ background: "var(--surface-inset)" }}
                    >
                      <Beaker size={12} />
                      {f.calculation.tool}
                      <ChevronDown
                        size={12}
                        className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      busy={verifying === f.finding_id}
                      onClick={() => reverify(f.calculation_run_id || f.tool_run_id, f.finding_id)}
                      disabled={!(f.calculation_run_id || f.tool_run_id)}
                    >
                      Re-run this calculation
                    </Button>
                    {check && (
                      <span
                        className="text-[12px]"
                        style={{
                          color: check.verified ? "var(--accent)" : "var(--color-alert-soft)",
                        }}
                      >
                        {check.verified
                          ? "Recomputed and matched"
                          : `Did not match: ${check.reason || "checksum differs"}`}
                      </span>
                    )}
                  </div>

                  {open && (
                    <div className="mt-2 space-y-2">
                      <Code>{JSON.stringify(f.calculation.parameters, null, 2)}</Code>
                      <div className="font-mono text-[11px] text-[var(--text-muted)]">
                        checksum {f.calculation.checksum?.slice(0, 24)}…
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}