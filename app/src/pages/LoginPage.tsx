import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { realAuthEnabled, signIn } from "@/services/auth";
import PageNav from "@/components/PageNav";

/**
 * Sign-in. Mock mode (no backend): any name/email works. Real mode
 * (VITE_API_BASE_URL set): password required; unknown emails sign up
 * automatically against the local server.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/app";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const valid = email.includes("@") && (!realAuthEnabled || password.length >= 6);

  return (
    <div className="flex min-h-screen flex-col">
      <PageNav crumb="/ LOGIN" />

      <main className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="w-full max-w-[420px] rounded-[4px] border-[1.5px] border-ink-strong bg-nav-bg p-7 shadow-[4px_4px_0_rgba(38,38,36,0.9)]">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-ink-mute">
            Member access
          </p>
          <h1 className="mt-2 font-heading text-[26px] font-medium leading-[1.15] tracking-[-0.02em] text-ink-strong">
            Welcome to Defeyn
          </h1>
          <p className="mt-2 text-[14px] leading-[1.55] text-ink-soft">
            {realAuthEnabled
              ? "Sign in to draft your first course. Accounts live on your local server."
              : "Sign in to draft your first course. Everything you build lives in your workspace, one session at a time."}
          </p>

          <form
            className="mt-6 flex flex-col gap-3.5"
            onSubmit={async (e) => {
              e.preventDefault();
              setTouched(true);
              setError("");
              if (!valid || busy) return;
              setBusy(true);
              try {
                await signIn(name, email, password || undefined);
                navigate(from, { replace: true });
              } catch (err) {
                setError((err as Error).message || "Sign-in failed");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-ink-mute">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                className="h-10 rounded-[7px] border border-border-soft bg-card-surface px-3 text-[15px] text-ink-body outline-none transition-colors placeholder:text-faint focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-ink-mute">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ada@example.com"
                type="email"
                className="h-10 rounded-[7px] border border-border-soft bg-card-surface px-3 text-[15px] text-ink-body outline-none transition-colors placeholder:text-faint focus:border-accent"
              />
              {touched && !email.includes("@") && (
                <span className="text-[12.5px] text-[#b05252]">Enter a valid email to continue.</span>
              )}
            </label>
            {realAuthEnabled && (
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-ink-mute">Password</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  type="password"
                  className="h-10 rounded-[7px] border border-border-soft bg-card-surface px-3 text-[15px] text-ink-body outline-none transition-colors placeholder:text-faint focus:border-accent"
                />
                {touched && password.length > 0 && password.length < 6 && (
                  <span className="text-[12.5px] text-[#b05252]">Use at least 6 characters.</span>
                )}
              </label>
            )}
            {error && <p className="text-[12.5px] leading-[1.5] text-[#b05252]">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="mt-1 flex h-11 items-center justify-center gap-2 rounded-[7px] bg-cta-bg text-[15px] font-bold text-cta-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {busy && <LoaderCircle size={15} className="animate-spin" />}
              Start learning
            </button>
          </form>

          <p className="mt-4 font-mono text-[11px] leading-[1.5] text-ink-mute">
            {realAuthEnabled
              ? "NEW EMAIL? AN ACCOUNT IS CREATED AUTOMATICALLY AGAINST YOUR LOCAL SERVER."
              : "PHASE 1 MOCK AUTH — NO PASSWORD REQUIRED. REAL ACCOUNTS ARRIVE WITH THE BACKEND (BACKEND.MD)."}
          </p>
        </div>
      </main>

      <footer className="flex justify-center pb-8">
        <Link
          to="/"
          className="flex items-center gap-1.5 font-mono text-[12.5px] text-ink-mute transition-colors hover:text-accent"
        >
          <ArrowLeft size={13} /> BACK TO DEFYN.APP
        </Link>
      </footer>
    </div>
  );
}
