# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

QuickQueue — a restaurant waitlist manager. The full product specification lives at
[`_docs/specs.md`](_docs/specs.md); read it before implementing any feature.

## Ground rules

- Treat `_docs/specs.md` as the source of truth for scope. Features listed under "Out of
  Scope (v1)" should not be implemented unless the spec is updated first.
- Keep changes scoped to what's asked; don't add features beyond the current spec section
  being implemented.
- No native mobile app — this is a browser-based web app (manager view: tablet/desktop,
  customer view: mobile browser).
