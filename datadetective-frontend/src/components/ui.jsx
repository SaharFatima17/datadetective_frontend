import { AlertTriangle, Check, Loader2, RefreshCw } from "lucide-react";

/* ------------------------------------------------------------------ *
 * Shared primitives.
 *
 * Radius is deliberately not uniform: panels get 14px, controls 8px, and
 * inline chips 6px. Same-radius-everywhere is what makes a interface read
 * as a template rather than a hierarchy.
 * ------------------------------------------------------------------ */

export function Panel({ children, className = "", as: Tag = "section", ...rest }) {
  return (
    <Tag
      className={`rounded-[14px] border bg-[var(--surface-raised)] shadow-[var(--shadow-card)] ${className}`}
      style={{ borderColor: "var(--border-hairline)" }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function PanelHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
      <div>
        <h2 className="text-[15px] font-semibold leading-tight">{title}</h2>
        {description && (
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

const buttonStyles = {
  primary:
    "bg-[var(--accent)] text-white hover:brightness-110 disabled:opacity-40",
  secondary:
    "border bg-[var(--surface-raised)] hover:bg-[var(--surface-sunken)] disabled:opacity-40",
  ghost: "hover:bg-[var(--surface-sunken)] disabled:opacity-40",
  danger:
    "border border-[var(--color-alert-soft)] text-[var(--color-alert-soft)] hover:bg-[var(--color-alert-soft)]/10",
};

export function Button({
  children,
  variant = "secondary",
  size = "md",
  busy = false,
  className = "",
  ...rest
}) {
  const sizes = {
    sm: "h-8 px-3 text-[13px]",
    md: "h-9 px-4 text-sm",
    lg: "h-11 px-5 text-[15px]",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-[background-color,filter,transform] duration-150 active:scale-[0.98]
        disabled:cursor-not-allowed ${sizes[size]} ${buttonStyles[variant]} ${className}`}
      disabled={busy || rest.disabled}
      {...rest}
    >
      {busy && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

/* Badge tones map one-to-one onto meanings defined in styles.css. */
const badgeTones = {
  verified: "bg-[var(--accent-quiet)] text-[var(--accent)]",
  driver: "bg-[var(--accent-quiet)] text-[var(--accent)]",
  association: "bg-amber-soft/15 text-[var(--color-amber-deep)] dark:text-[var(--color-amber-soft)]",
  measurement: "bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
  alert: "bg-[var(--color-alert-soft)]/12 text-[var(--color-alert-deep)] dark:text-[var(--color-alert-soft)]",
  neutral: "bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
};

export function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px]
        font-medium ${badgeTones[tone] || badgeTones.neutral} ${className}`}
      style={
        tone === "association"
          ? { background: "color-mix(in srgb, var(--color-amber-soft) 16%, transparent)" }
          : undefined
      }
    >
      {children}
    </span>
  );
}

export function Stat({ label, value, hint, tone }) {
  return (
    <div>
      <div
        className="font-mono text-[30px] font-semibold leading-none tracking-tight"
        style={tone ? { color: tone } : undefined}
      >
        {value}
      </div>
      <div className="mt-2 text-[13px] font-medium">{label}</div>
      {hint && <div className="mt-0.5 text-[12px] text-[var(--text-muted)]">{hint}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={`shimmer rounded-md ${className}`} />;
}

export function LoadingPanel({ label = "Loading" }) {
  return (
    <Panel className="p-5">
      <div className="flex items-center gap-2 text-[13px] text-[var(--text-muted)]">
        <Loader2 size={14} className="animate-spin" />
        {label}
      </div>
      <div className="mt-4 space-y-2.5">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </Panel>
  );
}

/* An empty screen is an invitation to act, so it always carries the action. */
export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && (
        <div
          className="mb-4 grid h-12 w-12 place-items-center rounded-xl border"
          style={{ background: "var(--surface-inset)" }}
        >
          <Icon size={20} className="text-[var(--text-muted)]" />
        </div>
      )}
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {body && (
        <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-[var(--text-muted)]">
          {body}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* Errors say what happened and what to do. They do not apologise. */
export function ErrorState({ error, onRetry }) {
  const message =
    typeof error === "string" ? error : error?.message || "Something failed.";
  return (
    <div
      className="flex items-start gap-3 rounded-[14px] border p-4"
      style={{
        borderColor: "color-mix(in srgb, var(--color-alert-soft) 40%, transparent)",
        background: "color-mix(in srgb, var(--color-alert-soft) 7%, transparent)",
      }}
    >
      <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--color-alert-soft)]" />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] leading-relaxed">{message}</p>
        {onRetry && (
          <Button size="sm" variant="ghost" className="mt-2 -ml-2" onClick={onRetry}>
            <RefreshCw size={13} />
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium">{label}</span>
      {hint && <span className="ml-2 text-[12px] text-[var(--text-muted)]">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export function Input({ className = "", ...rest }) {
  return (
    <input
      className={`h-9 w-full rounded-lg border bg-[var(--surface-inset)] px-3 text-sm
        outline-none transition-colors placeholder:text-[var(--text-muted)]
        focus:border-[var(--accent)] ${className}`}
      {...rest}
    />
  );
}

export function Textarea({ className = "", ...rest }) {
  return (
    <textarea
      className={`w-full rounded-lg border bg-[var(--surface-inset)] px-3 py-2 text-sm
        outline-none transition-colors placeholder:text-[var(--text-muted)]
        focus:border-[var(--accent)] ${className}`}
      {...rest}
    />
  );
}

export function Code({ children, className = "" }) {
  return (
    <pre
      className={`overflow-auto rounded-lg border p-3 font-mono text-[12px]
        leading-relaxed ${className}`}
      style={{ background: "var(--surface-inset)" }}
    >
      {children}
    </pre>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-5 w-9 shrink-0 rounded-full border transition-colors"
      style={{ background: checked ? "var(--accent)" : "var(--surface-sunken)" }}
    >
      <span
        className="absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-[left] duration-200"
        style={{ left: checked ? 18 : 2 }}
      />
    </button>
  );
}

export function CheckRow({ checked, onChange, children }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left
        transition-colors hover:bg-[var(--surface-sunken)]"
    >
      <span
        className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors"
        style={{
          background: checked ? "var(--accent)" : "transparent",
          borderColor: checked ? "var(--accent)" : "var(--border-strong)",
        }}
      >
        {checked && <Check size={11} className="text-white" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}
