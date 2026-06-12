# Integration Checklist

Use this checklist after parallel agents finish and before the build is closed.

## Changed-Path Review

- Collect each agent handoff and list every changed path.
- Confirm each changed path matches the agent's assigned ownership.
- Inspect shared or high-impact files before accepting them into the final build.
- Preserve unrelated user or agent changes.

## Ownership Conflicts

- Compare claimed ownership against actual changed paths.
- Flag duplicate edits, competing implementations, renamed files, or broad formatting.
- Do not silently resolve conflicts outside an agent's ownership.
- Send targeted follow-up work back to the owning agent when correction is needed.

## Cross-Agent Contracts

- Check that UI, core logic, validation, config, docs, and tests agree on names and behavior.
- Confirm public interfaces, schemas, commands, environment values, and data flow match.
- Verify handoff assumptions from one agent were honored by dependent agents.
- Record any contract drift as an unresolved risk or required fix.

## Consistency Pass

- Review naming, file organization, copy, error handling, and user-facing behavior as one system.
- Remove duplicated notes only when ownership is clear and no valid work is lost.
- Confirm protocol docs, build commands, and final behavior describe the same workflow.
- Keep the integrated change focused on the original build goal.

## Verification Readiness

- Confirm Test Pilot Nova's verification plan covers the integrated build, not only isolated tasks.
- Identify the strongest available checks: tests, build, lint, typecheck, browser smoke, or manual review.
- Ensure required setup, commands, fixtures, and expected outcomes are documented.
- Do not close the build with skipped checks unless the reason is reported.

## Final Report Requirements

- List active agents and their completed sections.
- List changed paths.
- Summarize accepted work and integration decisions.
- Report checks run, pass or fail results, skipped checks, and verification limits.
- Separate completed work from blockers, follow-ups, and unresolved risks.

## Unresolved Risk Handling

- Classify each risk as blocking, follow-up, or accepted limitation.
- Include the owner, affected path or behavior, and recommended next action.
- Do not mark a build complete when a blocking conflict, failed required check, or missing contract remains.
- If risk is accepted, explain why the build can still close.
