import { useEffect, useState } from "react";
import { Activity, ShieldCheck, Users } from "lucide-react";
import { api } from "../api";
import {
  Badge,
  ErrorState,
  Panel,
  PanelHeader,
  Skeleton,
  Stat,
} from "../components/ui";

/**
 * Administration: who is using the system, and whether it is working.
 *
 * The admin role used to skip the owner check everywhere, so running the
 * system meant reading everyone's data. Almost none of that is needed to
 * administer anything. This page carries what is: how many people, how much
 * they have loaded, whether their investigations finish, when they were last
 * active. Counts and states — no dataset contents, no findings, no questions.
 *
 * An administrator who genuinely needs to see a user's data has to be given it
 * by that user, which is how it should be.
 */
export default function Admin() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    setError(null);
    try {
      setData(await api.adminOverview());
    } catch (err) {
      setError(err);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-7">
        <ErrorState error={error} onRetry={load} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-7">
        <Panel className="p-5">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="mt-3 h-4 w-2/3" />
        </Panel>
      </div>
    );
  }

  const { people, totals, health } = data;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8 lg:px-7">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="People" value={totals.users} icon={Users}
              hint={`${totals.admins} administrator${totals.admins === 1 ? "" : "s"}`} />
        <Stat label="Active this week" value={totals.active_this_week}
              icon={Activity} hint="ran an investigation" />
        <Stat label="Investigations" value={totals.investigations}
              hint={`${totals.reports} reports`} />
        <Stat
          label="Tool failures"
          value={`${Math.round(health.failure_rate * 100)}%`}
          tone={health.failure_rate > 0.05 ? "alert" : "verified"}
          hint={`${health.failed_tool_runs_this_week} of ${health.tool_runs_this_week} this week`}
        />
      </div>

      <Panel className="rise">
        <PanelHeader
          title="Accounts"
          description="What each account has loaded and whether its investigations finish"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[var(--text-muted)]">
                <th className="px-5 py-2 font-medium">Account</th>
                <th className="px-3 py-2 text-right font-medium">Datasets</th>
                <th className="px-3 py-2 text-right font-medium">Documents</th>
                <th className="px-3 py-2 text-right font-medium">Investigations</th>
                <th className="px-3 py-2 text-right font-medium">Finished</th>
                <th className="px-3 py-2 text-right font-medium">Waiting</th>
                <th className="px-3 py-2 text-right font-medium">Failed</th>
                <th className="px-5 py-2 text-right font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-5 py-2.5">
                    <span className="mr-2">{p.email}</span>
                    {p.role === "admin" && (
                      <Badge tone="verified">admin</Badge>
                    )}
                    {!p.is_active && <Badge tone="neutral">disabled</Badge>}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">{p.datasets}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{p.documents}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{p.investigations}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{p.complete}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{p.awaiting_user}</td>
                  <td className="px-3 py-2.5 text-right font-mono"
                      style={p.failed ? { color: "var(--color-alert-soft)" } : undefined}>
                    {p.failed}
                  </td>
                  <td className="px-5 py-2.5 text-right font-mono text-[12px] text-[var(--text-muted)]">
                    {p.last_investigation
                      ? new Date(p.last_investigation).toLocaleDateString()
                      : "never"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="p-5">
        <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[var(--accent)]" />
          {data.scope_note}
        </p>
      </Panel>
    </div>
  );
}