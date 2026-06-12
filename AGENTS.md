# Max Parallel Agent Build Protocol

This project uses a max-parallel subagent workflow for every build. The lead
coordinator splits work into independent tasks, assigns named agents, checks
each task before implementation, reviews completed outputs, and verifies the
integrated build before closeout.

## Default Roster

- Copper Comet: project structure, scaffolding, dependency map, build commands.
- Volt Mason: core application logic and data flow.
- Pixel Forge: UI, layout, interaction polish, responsive behavior.
- Circuit Scribe: types, schemas, validation, docs, configuration.
- Test Pilot Nova: tests, smoke checks, failure reproduction, acceptance checks.
- Merge Captain: final review support, conflict detection, integration checklist.

## Required Build Rhythm

1. Define the build goal and success criteria.
2. Split the work into disjoint ownership areas.
3. Assign named agents with clear responsibilities and handoff requirements.
4. Check each assigned task before implementation begins.
5. Run independent work in parallel wherever possible.
6. Review each completed output before integration.
7. Reconcile overlaps, run the strongest available verification, and report
   what passed, failed, or remains unverified.

## Protocol Files

- `.agents/roster.md`: agent missions, ownership, and handoff rules.
- `.agents/build_workflow.md`: full build lifecycle.
- `.agents/task_template.md`: reusable subagent assignment template.
- `.agents/integration_checklist.md`: Merge Captain's final integration review.
- `.agents/verification_checklist.md`: closeout checks for every build.
- `.agents/acceptance_criteria.md`: criteria for this protocol itself.

If a build is too small to split safely, use at least one implementer, one
reviewer/verifier, and one edge-case checker where useful.
