# Max Parallel Agent Build Protocol Acceptance Criteria

Use these criteria to confirm the agent protocol is implemented and usable for each build.

## Roster Presence
- The lead coordinator identifies the active agent roster before build work begins.
- The roster includes Copper Comet, Volt Mason, Pixel Forge, Circuit Scribe, Test Pilot Nova, and Merge Captain unless the build explicitly documents a smaller task-specific subset.
- Each active agent has a named responsibility that matches its specialty.
- Each active agent has explicit file or subsystem ownership.

## Task Split
- The build goal is split into concrete tasks before implementation starts.
- Tasks are assigned to agents in a way that minimizes file conflicts and duplicated work.
- Each task includes expected outputs or completion criteria.
- Shared files, if any, are called out before work begins.

## Pre-Implementation Checks
- Each agent states its intended approach before making changes.
- The lead coordinator reviews each proposed task direction before implementation proceeds.
- The lead coordinator identifies overlap, missing coverage, or risky assumptions before changes are accepted.
- Agents are instructed not to revert or overwrite work outside their ownership.

## Parallel Execution
- Independent tasks are performed concurrently when the work can be safely separated.
- Agents avoid editing files owned by another active agent unless the coordinator explicitly reassigns ownership.
- Any unavoidable dependency between agents is documented before the dependent work begins.
- The lead coordinator tracks which agent owns each section of the build.

## Integration Review
- Completed agent work is reviewed before it is treated as integrated.
- The lead coordinator checks for conflicts, duplicated behavior, inconsistent naming, and mismatched assumptions.
- Cross-agent interfaces, shared configuration, and user-facing flows are reviewed as a single integrated system.
- Merge Captain supports the final integration review and records any unresolved risks.

## Verification
- Test Pilot Nova identifies the strongest available verification for the build.
- Verification includes tests, build commands, lint or type checks, browser smoke testing, or manual inspection as appropriate for the project.
- Verification results are reviewed after agent work is integrated.
- Any skipped or unavailable verification is explicitly reported with the reason.

## Reporting
- The final build report lists the active agents and their completed sections.
- The report summarizes implementation results, verification outcomes, and remaining risks.
- Failed checks, partial work, or blocked items are clearly separated from completed work.
- Changed paths are reported so the user can quickly inspect the result.
