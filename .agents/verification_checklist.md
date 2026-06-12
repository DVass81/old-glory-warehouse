# Verification Checklist

Use this checklist before closing any build.

## Static Review

- Confirm the build goal and acceptance criteria are met.
- Review changed files for obvious bugs, dead code, unclear names, and missed edge cases.
- Check that public interfaces, config, docs, and validation match the implemented behavior.

## Ownership Conflicts

- Confirm each agent changed only files within its assigned ownership.
- Identify overlapping edits before integration.
- Do not revert or overwrite unrelated work from other agents.
- Resolve conflicts by preserving valid work from both agents where possible.

## Automated Checks

- Run available tests.
- Run available build commands.
- Run available lint, format check, or typecheck commands.
- Record skipped checks when the project has no matching tooling.

## Frontend Smoke

- If the build includes a frontend, open the app in a browser.
- Check the main workflow, navigation, responsive layout, and loading or error states.
- Verify that text does not overlap, controls are usable, and visual assets render.

## Manual Inspection

- When tooling is missing, inspect the relevant files and behavior manually.
- Confirm important edge cases through targeted review or minimal local execution.
- Note any risk that could not be fully verified.

## Final Report

- List changed paths.
- Summarize completed work.
- Report checks run and their results.
- Call out skipped checks, unresolved risks, or follow-up work.
