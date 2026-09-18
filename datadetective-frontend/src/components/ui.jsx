import { useCallback, useRef } from "react";
import { AlertTriangle, Check, Loader2, RefreshCw, Trash2 } from "lucide-react";

/* ------------------------------------------------------------------ *
 * Shared primitives.
 *
 * Solid colours, thin borders, restrained shadows — no gradients or glow
 * on the controls themselves; only the ambient page background carries any
 * of that, and only barely. Radius is deliberately not uniform: panels get
 * --radius-card, controls 8px, inline chips are fully rounded.
 * ------------------------------------------------------------------ */

/**
 * Pointer-driven tilt + spotlight, shared by any card that opts in.
 *
 * Everything is written straight to CSS custom properties via the DOM node,
 * not React state — a tilt effect that re-renders on every mousemove is the
 * "excessive JavaScript" this is explicitly trying to avoid. rAF coalesces
 * updates to one per frame. Reduced-motion and coarse-pointer (touch) users
 * never get a listener attached in the first place.
 */
function useTiltSpotlight({ tilt = false, spotlight = false } = {}) {
  const ref = useRef(null);
  const frame = useRef(null);

  const enabled =
    (tilt || spotlight) &&
    typeof window !== "undefined" &&
    window.matchMedia?.("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const onMove = useCallback(
    (e) => {
      if (!enabled || !ref.current) return;
      const node = ref.current;
      const rect = node.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        if (spotlight) {
          node.style.setProperty("--spot-x", `${x}px`);
          node.style.setProperty("--spot-y", `${y}px`);
        }
        if (tilt) {
          const px = x / rect.width - 0.5;
          const py = y / rect.height - 0.5;
          node.style.setProperty("--tilt-y", `${px * 4}deg`);
          node.style.setProperty("--tilt-x", `${-py * 4}deg`);
        }
      });
    },
    [enabled, tilt, spotlight],
  );

  const onLeave = useCallback(() => {
    if (!enabled || !ref.current) return;
    if (tilt) {
      ref.current.style.setProperty("--tilt-x", "0deg");
      ref.current.style.setProperty("--tilt-y", "0deg");
    }
  }, [enabled, tilt]);

  return enabled ? { ref, onPointerMove: onMove, onPointerLeave: onLeave } : { ref };
}

/**
 * elevate: 0 keeps the original flat panel-hover behaviour (still the right
 * choice for dense report content and tables). 1–3 opts into the layered
 * depth system — 3 is reserved for the handful of cards that should read as
 * the most important thing on the screen (hero, headline answer).
 * tilt/spotlight only ever apply together with elevate ≥ 2, on desktop,
 * and never when the user has asked for reduced motion.
 */
export function Panel({
  children,
  className = "",
  hover = true,
  elevate = 0,
  tilt = false,
  spotlight = false,
  as: Tag = "section",
  ...rest
}) {
  const { ref, onPointerMove, onPointerLeave } = useTiltSpotlight({ tilt, spotlight });
  const depthClass = elevate ? `elevate-${elevate}` : hover ? "panel-hover" : "";

  return (
    <Tag
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`relative rounded-[var(--radius-card)] border bg-[var(--surface-raised)]
        ${elevate ? "" : "shadow-[var(--shadow-card)]"} ${depthClass}
        ${tilt && onPointerMove ? "tilt-card" : ""} ${spotlight ? "spotlight-host overflow-hidden" : ""}
        ${className}`}
      style={{ borderColor: "var(--border-hairline)" }}
      {...rest}
    >
      {spotlight && <span className="spotlight" aria-hidden="true" />}
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

/* Buttons behave like physical keys: they sit slightly proud of the page,
   lift a touch further on hover, and settle back down on press. The primary
   and ai variants add a faint gradient and a matching glow so the "lift"
   reads as light catching a raised surface, not just a colour change. */
const buttonStyles = {
  primary:
    "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_100%,white_6%),var(--accent))] " +
    "text-[var(--on-accent)] shadow-[0_1px_1px_rgba(0,0,0,0.08),0_6px_16px_-6px_color-mix(in_srgb,var(--accent)_55%,transparent)] " +
    "hover:shadow-[0_1px_1px_rgba(0,0,0,0.1),0_10px_22px_-6px_color-mix(in_srgb,var(--accent)_65%,transparent)] " +
    "hover:brightness-[1.04] disabled:opacity-40 disabled:shadow-none",
  secondary:
    "border bg-[var(--surface-raised)] shadow-[var(--shadow-sm)] hover:bg-[var(--surface-sunken)] hover:border-[var(--border-strong)] disabled:opacity-40 disabled:shadow-none",
  ghost: "hover:bg-[var(--surface-sunken)] disabled:opacity-40",
  danger:
    "border border-[var(--color-alert-soft)] text-[var(--color-alert-soft)] hover:bg-[var(--color-alert-soft)]/10",
  ai: "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--brand)_100%,white_8%),var(--brand))] text-white " +
    "shadow-[0_1px_1px_rgba(0,0,0,0.08),0_6px_16px_-6px_color-mix(in_srgb,var(--brand)_55%,transparent)] " +
    "hover:shadow-[0_1px_1px_rgba(0,0,0,0.1),0_10px_22px_-6px_color-mix(in_srgb,var(--brand)_65%,transparent)] " +
    "hover:brightness-[1.04] disabled:opacity-40 disabled:shadow-none",
};

const liftable = new Set(["primary", "secondary", "ai"]);

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
      className={`group inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-[background-color,filter,transform,box-shadow] duration-150
        ${liftable.has(variant) ? "hover:-translate-y-px active:translate-y-px" : ""}
        active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none
        disabled:cursor-not-allowed ${sizes[size]} ${buttonStyles[variant]} ${className}`}
      disabled={busy || rest.disabled}
      {...rest}
    >
      {busy && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

/* Badge tones map one-to-one onto meanings defined in styles.css:
   verified → success green, driver → key-insight cyan, association/
   measurement/alert as before, plus "ai" for AI-related accents. Tints are
   deliberately subtle, never a solid bright fill. */
const badgeTones = {
  verified: "bg-[var(--success-quiet)] text-[var(--color-success)]",
  driver: "bg-[var(--accent-quiet)] text-[var(--accent)]",
  association: "text-[var(--color-amber-deep)] dark:text-[var(--color-amber-soft)]",
  measurement: "bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
  alert: "text-[var(--color-alert-deep)] dark:text-[var(--color-alert-soft)]",
  neutral: "bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
  ai: "bg-[var(--brand-quiet)] text-[var(--brand)]",
};

const badgeDot = {
  verified: "var(--color-success)",
  driver: "var(--accent)",
  association: "var(--color-amber-soft)",
  measurement: "var(--text-muted)",
  alert: "var(--color-alert-soft)",
  neutral: "var(--text-muted)",
  ai: "var(--brand)",
};

export function Badge({ tone = "neutral", children, className = "" }) {
  const overrideStyle =
    tone === "association"
      ? { background: "color-mix(in srgb, var(--color-amber-soft) 14%, transparent)" }
      : tone === "alert"
        ? { background: "color-mix(in srgb, var(--color-alert-soft) 12%, transparent)" }
        : undefined;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px]
        font-medium shadow-[0_1px_2px_rgba(0,0,0,0.04)]
        ${badgeTones[tone] || badgeTones.neutral} ${className}`}
      style={{ borderColor: "color-mix(in srgb, currentColor 22%, transparent)", ...overrideStyle }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{
          background: badgeDot[tone] || badgeDot.neutral,
          boxShadow: `0 0 0 2.5px color-mix(in srgb, ${badgeDot[tone] || badgeDot.neutral} 20%, transparent)`,
        }}
      />
      {children}
    </span>
  );
}

export function Stat({ label, value, hint, tone, icon: Icon }) {
  return (
    <div>
      {Icon && (
        <div
          className="mb-3 grid h-9 w-9 place-items-center rounded-lg"
          style={{
            background: tone
              ? `color-mix(in srgb, ${tone} 14%, transparent)`
              : "var(--accent-quiet)",
          }}
        >
          <Icon size={16} style={{ color: tone || "var(--accent)" }} />
        </div>
      )}
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
    <Panel hover={false} className="p-5">
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
          className="mb-4 grid h-12 w-12 place-items-center rounded-xl"
          style={{ background: "var(--accent-quiet)" }}
        >
          <Icon size={20} className="text-[var(--accent)]" />
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
      className="flex items-start gap-3 rounded-[var(--radius-card)] border p-4"
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
        outline-none transition-[border-color,box-shadow] placeholder:text-[var(--text-muted)]
        hover:border-[var(--border-strong)]
        focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_16%,transparent)] ${className}`}
      {...rest}
    />
  );
}

export function Textarea({ className = "", ...rest }) {
  return (
    <textarea
      className={`w-full rounded-lg border bg-[var(--surface-inset)] px-3 py-2 text-sm
        outline-none transition-[border-color,box-shadow] placeholder:text-[var(--text-muted)]
        hover:border-[var(--border-strong)]
        focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_16%,transparent)] ${className}`}
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

/* Small icon-only destructive action — a table/list row's delete control.
   Stays neutral until hovered, then turns to the alert hue, so a row of
   these never reads as a wall of red. */
export function DeleteButton({ onClick, busy = false, title = "Delete", className = "", ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || rest.disabled}
      title={title}
      aria-label={title}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border
        border-transparent text-[var(--text-muted)] transition-colors duration-150
        hover:border-[var(--color-alert-soft)] hover:bg-[var(--color-alert-soft)]/10
        hover:text-[var(--color-alert-soft)] disabled:cursor-not-allowed disabled:opacity-40
        ${className}`}
      {...rest}
    >
      {busy ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
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
        {checked && <Check size={11} className="text-[var(--on-accent)]" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}