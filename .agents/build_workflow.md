# Build Workflow

This workflow is mandatory for every build. The lead coordinator owns the
sequence, checks each task before implementation, and protects parallel agents
from overlapping edits.

## 1. Intake

- Capture the build goal, success criteria, constraints, and requested output.
- Inspect the current workspace before assigning work.
- Identify any existing user or agent changes and treat them as protected.
- Choose the strongest practical verification for the build.

## 2. Task Split

- Split work into independent ownership areas with minimal file overlap.
- Assign each task to a named agent with a clear mission and changed-path limit.
- State dependencies, handoff points, and files the agent must not touch.
- If the build is too small for broad splitting, assign at least an implementer,
  a reviewer/verifier, and an edge-case checker where useful.

## 3. Pre-Implementation Task Check

- Review each agent task before work begins.
- Confirm the task is scoped, testable, and does not conflict with another task.
- Confirm the agent knows its owned files and expected final response.
- Adjust assignments before implementation if ownership overlaps or risk is high.

## 4. Parallel Execution

- Agents work at the same time only on their assigned ownership areas.
- Agents must not revert, overwrite, format, or rename files outside ownership.
- Agents should report blockers quickly instead of expanding scope.
- The coordinator tracks progress and resolves cross-agent questions.

## 5. Review

- Review each completed agent output before integration.
- Check changed paths, behavior, consistency with the assignment, and test impact.
- Reject or revise work that exceeds ownership, misses the task, or creates
  conflicts.
- Preserve unrelated user and agent changes.

## 6. Integration

- Merge accepted outputs in dependency order.
- Reconcile overlaps explicitly and keep the smallest coherent final change.
- Update any shared docs, commands, or handoff notes required by the build.
- Confirm the integrated state still matches the original success criteria.

## 7. Verification

- Run the strongest available checks: tests, build, lint, typecheck, browser
  smoke test, or manual inspection.
- Test Pilot Nova may run verification in parallel while implementation agents
  finish independent work.
- Record what passed, what failed, and what could not be verified.

## 8. Closeout

- Summarize completed work and changed paths.
- Report verification results and remaining risks.
- Name any follow-up tasks that should become separate builds.
- Do not close the build until review, integration, and verification are done or
  a blocker is clearly reported.
