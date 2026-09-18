import { BookOpen, ExternalLink } from "lucide-react";
import { Panel } from "./ui";

/**
 * A brief assembled from indexed documents.
 *
 * Deliberately not styled as the investigation report. The two make different
 * kinds of claim — one computes a figure and can re-run the calculation behind
 * it, the other points at a passage — and a reader who cannot tell them apart
 * will trust the weaker one as much as the stronger. So this carries its own
 * masthead, its own accent, and states its basis at the top rather than in a
 * footnote.
 */
export default function BriefDocument({ brief }) {
  if (!brief?.available) return null;

  const sources = brief.sources || [];

  return (
    <Panel className="print-sheet p-6 sm:p-9">
      <header className="border-b pb-5">
        <div className="flex items-baseline justify-between gap-4">
          <p className="flex items-center gap-2 font-mono text-[11.5px] uppercase
            tracking-wide text-[var(--text-muted)]">
            <BookOpen size={13} />
            Document brief
          </p>
          <p className="font-mono text-[11.5px] text-[var(--text-muted)]">
            {new Date().toLocaleDateString()}
          </p>
        </div>
        <h2 className="mt-2.5 text-[24px] font-semibold leading-tight tracking-tight">
          {brief.title}
        </h2>
        <p className="mt-2 max-w-[68ch] text-[12.5px] leading-relaxed text-[var(--text-muted)]">
          {brief.basis}
        </p>
      </header>

      {brief.summary && (
        <section className="mt-6">
          <div
            className="rounded-lg border-l-4 py-4 pl-5 pr-4"
            style={{ borderColor: "var(--accent)", background: "var(--accent-quiet)" }}
          >
            <p className="max-w-[64ch] text-[15px] leading-relaxed">{brief.summary}</p>
          </div>
        </section>
      )}

      {(brief.sections || []).map((section, i) => (
        <section key={i} className="mt-7">
          <div className="mb-3 border-b pb-2" style={{ borderColor: "var(--border-hairline)" }}>
            <h3 className="flex items-baseline gap-3 text-[17px] font-semibold
              leading-tight text-[var(--text-primary)]">
              <span
                className="inline-block h-[14px] w-[4px] shrink-0 translate-y-[1px] rounded-full"
                style={{ background: "var(--accent)" }}
              />
              {section.heading}
            </h3>
          </div>
          {String(section.body || "").split("\n\n").map((para, j) => (
            <p key={j} className={`max-w-[68ch] text-[14px] leading-relaxed ${j ? "mt-2" : ""}`}>
              {para}
            </p>
          ))}
          {section.cites?.length > 0 && (
            <p className="mt-2 font-mono text-[11.5px] text-[var(--text-muted)]">
              {section.cites.map((c) => `[${c}]`).join(" ")}
            </p>
          )}
        </section>
      ))}

      {/* Every numbered citation resolves here, with the address where the page
          came from. A citation the reader cannot follow is decoration. */}
      <section className="mt-8 border-t pt-6">
        <div className="mb-3">
          <h3 className="flex items-baseline gap-3 text-[17px] font-semibold
            leading-tight text-[var(--text-primary)]">
            <span
              className="inline-block h-[14px] w-[4px] shrink-0 translate-y-[1px] rounded-full"
              style={{ background: "var(--border-strong)" }}
            />
            Sources
          </h3>
        </div>
        <ol className="space-y-2.5">
          {sources.map((s) => (
            <li key={s.n} className="max-w-[72ch] text-[12.5px] leading-relaxed">
              <span className="font-mono text-[var(--accent)]">[{s.n}]</span>{" "}
              <span className="font-medium">{s.title}</span>
              {s.url && (
                <>
                  {" "}
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--text-muted)]
                      underline underline-offset-2"
                  >
                    {s.url.replace(/^https?:\/\//, "").slice(0, 60)}
                    <ExternalLink size={10} className="no-print" />
                  </a>
                </>
              )}
              <span className="ml-2 font-mono text-[11px] text-[var(--text-muted)]">
                {s.score}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </Panel>
  );
}