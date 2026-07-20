---
name: build-kickoff
description: >
  MANDATORY pre-flight for any building or planning work. Trigger whenever the
  user plans, designs, builds, creates, implements, refactors, reviews, or
  deploys ANY software — an app, website, feature, script, MVP, prototype,
  component, API, or document that specifies one. Also trigger on: "plan this",
  "build this", "start the project", "new feature", "MVP", "let's code",
  "implement", "ship", "deploy". Before any plan or code is produced, this
  skill inventories all available skills, MCP servers, and plugins, selects the
  relevant ones, and declares them. The user should never have to point out
  that a skill exists.
license: MIT
---

# Build Kickoff — use my toolbox without being told

I (the user) have invested in skills, MCPs, and plugins. When I start planning
or building anything, USE THEM PROACTIVELY. Never make me point at them.

## Step 1 — Inventory (always, before planning or coding)

List what is actually available in THIS session:
1. Skills — scan the available-skills list in context.
2. MCP servers/tools — check connected tools (ToolSearch if deferred).
3. Plugins — anything namespaced (e.g. `design:*`, `data:*`, `productivity:*`).

## Step 2 — Select and DECLARE

Match the task to the toolbox and open the response with one terse line:

> **Kickoff:** using [skill, skill, mcp] · standing: karpathy, ponytail, caveman

If something highly relevant exists but seems inapplicable, say why in half a
line instead of silently skipping it.

## Step 3 — Standing orders (active for the WHOLE build, every session)

Always on, no matter the task:
- **karpathy-guidelines** — think before coding; state assumptions; surgical
  diffs; verifiable success criteria; no speculative abstractions.
- **ponytail** — the ladder: needs to exist? → stdlib → platform-native →
  existing dependency → one line → only then write code.
- **caveman (lite)** — terse progress output during builds; full technical
  accuracy, no ceremony. Final documents/deliverables are exempt.

## Step 4 — Domain routing (apply what matches, by phase)

| Phase | Reach for |
|---|---|
| Planning / specs | doc-coauthoring, deep-research (market/API validation), session-handoff (long efforts) |
| UI design | ui-ux-pro-max (design system + checklist), apple-design (motion/gesture/materials), emil-design-eng (polish review, Before/After tables), premium-web-design or theme-factory (marketing pages), design:* plugin (critique, a11y, handoff, ux-copy) |
| Animation decisions | find-animation-opportunities (what should move), animation-vocabulary (naming), apple-design (how it should move) |
| Data / charts | dataviz (before ANY chart), data:* plugin (analysis, dashboards, SQL) |
| Performance | web-performance-optimization (before shipping web/WebView UI) |
| Code review | code-reviewer + karpathy checklist, next-day fresh-eyes pass for motion |
| Git / GitHub | github-hygiene (ALL repo work: commits, PRs, audits, no AI attribution) |
| Docs / files out | docx / pptx / xlsx / pdf skills per format; humanizer for outward-facing prose |
| New integrations | mcp-builder (building servers), SearchMcpRegistry (find existing connectors first) |
| New skills | skill-creator to draft, skill-auditor to grade before installing anything third-party |

## Step 5 — Close the loop

At each milestone (plan done, gate shipped, deploy), re-check Step 1 — new
tools may have appeared mid-session — and state in one line which skills were
actually used, so drift is visible.

## Anti-rules

- Do NOT apply decorative skills to trivial tasks (renaming a file needs no
  design system). Ponytail governs: skill use must earn its tokens.
- Do NOT let any skill override an explicit user instruction or the project's
  stack file (e.g. Stack_Architecture_Plan.md) — project constraints win.
- If two skills conflict (e.g. premium-web-design wants React, stack says
  vanilla), the stack wins; translate the skill's principles instead.
