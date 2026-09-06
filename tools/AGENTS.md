# Tooling rules

- Tools use Node built-ins only and must run on Windows without Bash assumptions.
- Prefer deterministic, read-only checks. A write command must name its target and refuse ambiguous input.
- Do not invoke Git as a Node child process; managed Codex sandboxes may deny it. Read repository-local metadata or leave Git checks as explicit shell commands.
- Keep validators independent of network, simulator availability, clock time, and generated caches.
- Keep validation commands branch-neutral; enforce write protection only in write commands and the pre-commit hook so CI can validate merged code on `main`.
- When changing a validator, demonstrate one passing baseline and one focused failure mode or explain why a safe synthetic failure is unavailable.
- Tool changes must not weaken the mission release gates in `DEVELOPMENT_RELEASE_CHECKLIST.md`.
- A local mission build must require a one-use, strictly higher release intent. Test the permitted first build, rejected reuse, and higher-number follow-up path whenever that gate changes.
