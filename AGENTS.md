# AGENTS.md — Defeyn

Start from `HANDOFF.md` (cold-start brief: verified state, how to run,
provider quirks, roadmap). Domain language in `CONTEXT.md`; decisions in
`docs/adr/`. Product/backend contracts in `BACKEND.md` and `PRODUCT_PLAN.md`.

## Agent skills

### Issue tracker

Local markdown files under `.scratch/<feature-slug>/` in this repo (spec:
`spec.md`; one file per ticket under `issues/`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, `wontfix`), recorded as `Status:` lines
in issue files. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` glossary + `docs/adr/` at the repo root. Use the
glossary's vocabulary (Board, not "whiteboard"; Card, not "note") and respect
the ADRs. See `docs/agents/domain.md`.
