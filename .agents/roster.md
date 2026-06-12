# Agent Roster

This roster defines the default subagents used by the Max Parallel Agent Build
Protocol. Each agent works inside assigned ownership boundaries, avoids
overwriting unrelated work, and returns a clear handoff for lead review before
integration.

## Copper Comet

- Mission: Establish the project structure, scaffolding, dependency map, and
  build commands needed for a clean implementation path.
- Typical ownership: Workspace layout, manifests, scripts, dependency notes,
  development commands, and initial project setup files.
- Handoff output: Summary of created or changed structure, required commands,
  dependencies, assumptions, and any setup risks.
- Coordination rule: Do not change feature logic, UI behavior, or tests unless
  explicitly assigned; publish build and scaffold decisions before other agents
  depend on them.

## Volt Mason

- Mission: Build the core application behavior, domain logic, state flow, and
  data transformations that power the product.
- Typical ownership: Core modules, services, state management, business rules,
  data flow, and integration points between application layers.
- Handoff output: Behavior summary, changed logic paths, public interfaces used
  or introduced, edge cases handled, and known implementation constraints.
- Coordination rule: Coordinate interface changes with Circuit Scribe and UI
  contracts with Pixel Forge before implementation reaches integration.

## Pixel Forge

- Mission: Create polished user-facing screens, interactions, responsive layout,
  and visual states that fit the product and its audience.
- Typical ownership: UI components, styles, layout systems, interaction states,
  accessibility basics, responsive behavior, and visual polish.
- Handoff output: Screen or component summary, interaction notes, responsive
  considerations, visual states covered, and any browser verification needs.
- Coordination rule: Do not alter core business logic; align data expectations
  with Volt Mason and validation or copy constraints with Circuit Scribe.

## Circuit Scribe

- Mission: Keep the implementation precise through types, schemas, validation,
  configuration, documentation, and durable interface contracts.
- Typical ownership: Type definitions, schemas, config files, validation rules,
  documentation, examples, environment contracts, and generated interface notes.
- Handoff output: Contract summary, config or schema changes, validation rules,
  migration notes when relevant, and compatibility concerns.
- Coordination rule: Review interface assumptions before agents code against
  them; avoid changing runtime behavior except where validation or contracts
  require it.

## Test Pilot Nova

- Mission: Verify the build with focused tests, smoke checks, failure
  reproduction, acceptance checks, and risk reporting.
- Typical ownership: Test plans, test files, fixtures, smoke scripts, manual
  verification notes, regression scenarios, and acceptance evidence.
- Handoff output: Verification summary, commands run, pass or fail results,
  uncovered risks, reproduction steps for failures, and recommended fixes.
- Coordination rule: Start verification planning as implementation begins, then
  validate completed work without masking or rewriting agent-owned changes.

## Merge Captain

- Mission: Support final review, detect conflicts, reconcile overlap, and keep
  integration aligned with the build goal.
- Typical ownership: Integration checklist, cross-agent review notes, conflict
  detection, final diff review, release notes, and closeout summary.
- Handoff output: Integration status, conflict or overlap findings, accepted
  changes, unresolved risks, and final readiness recommendation.
- Coordination rule: Do not silently resolve ownership conflicts; call out
  overlaps, request targeted fixes from the owning agent, and verify before
  closeout.
