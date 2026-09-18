import { useState } from "react";
import { api, setToken } from "../api";
import { Button, ErrorState, Field, Input } from "../components/ui";

export default function Login({ onSignedIn }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const registering = mode === "register";

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (registering) {
        await api.register({
          email,
          password,
          full_name: fullName || null,
        });
      }
      const session = await api.login(email, password);
      setToken(session.access_token);
      onSignedIn(session.user);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* The left panel states what the product actually claims, rather than
          decorating the sign-in with a gradient. It is always the dark ink
          surface regardless of the active theme, so its colours are fixed
          rather than pulled from the flippable tokens. */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex"
        style={{ background: "#0b1020" }}
      >
        <div className="flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="14" cy="14" r="7" fill="none" stroke="#22d3ee" strokeWidth="2.5" />
            <path d="M19 19 L26 26" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="14" cy="14" r="2" fill="#22d3ee" />
          </svg>
          <span className="text-[15px] font-semibold">
            <span className="text-white">Data</span>
            <span className="text-[#22d3ee]">Detective</span>
          </span>
        </div>

        <div className="max-w-md">
          <p className="text-[27px] font-semibold leading-[1.25] tracking-tight text-white">
            Every number here can be traced back to the calculation that produced it.
          </p>
          <dl className="mt-9 space-y-5 text-[13.5px] leading-relaxed">
            {[
              ["Calculation", "The model plans and explains. Every figure comes from pandas, SQL or a statistical test."],
              ["Lineage", "Cleaning writes a new version. The file you uploaded is never altered."],
              ["Honesty", "When the data can't answer the question, it asks you instead of guessing."],
            ].map(([term, detail]) => (
              <div key={term} className="border-l-2 pl-4" style={{ borderColor: "#0e7490" }}>
                <dt className="font-medium text-[#22d3ee]">{term}</dt>
                <dd className="mt-0.5 text-[#94a3b8]">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="font-mono text-[11.5px] text-[#64748b]">
          Internship project · Zylo Technologies
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm rise">
          <h1 className="text-[22px] font-semibold tracking-tight">
            {registering ? "Create your account" : "Sign in"}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-[var(--text-muted)]">
            {registering
              ? "The first account created becomes the administrator."
              : "Your datasets and investigations are private to your account."}
          </p>

          <div className="mt-7 space-y-4">
            {registering && (
              <Field label="Full name" hint="optional">
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </Field>
            )}
            <Field label="Email">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </Field>
            <Field label="Password" hint={registering ? "at least 8 characters" : undefined}>
              <Input
                type="password"
                required
                minLength={registering ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={registering ? "new-password" : "current-password"}
              />
            </Field>
          </div>

          {error && (
            <div className="mt-4">
              <ErrorState error={error} />
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" busy={busy} className="mt-6 w-full">
            {registering ? "Create account" : "Sign in"}
          </Button>

          <p className="mt-5 text-center text-[13px] text-[var(--text-muted)]">
            {registering ? "Already have an account?" : "No account yet?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(registering ? "login" : "register");
                setError(null);
              }}
              className="font-medium text-[var(--accent)] underline underline-offset-2"
            >
              {registering ? "Sign in" : "Create one"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}