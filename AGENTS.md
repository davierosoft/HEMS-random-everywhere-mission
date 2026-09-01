# HEMS repository working contract

These rules are mandatory for every coding agent and every model working in this repository.

## Before editing

1. Read `DEVELOPMENT_RELEASE_CHECKLIST.md` completely. Read the current-release section at the top of `HANDOFF_CHATGPT_SOL.md` and `CHANGELOG.en.md`.
2. Inspect `git status --short`. Preserve all user changes and unrelated work.
3. Identify the exact files and macro names required by the request. Treat that list as the allowed semantic scope for the turn.
4. Inspect the existing macro and every directly affected caller before changing shared state or navigation.

## Surgical-edit rule

- Use `apply_patch` for direct, minimal edits.
- Never serialize, pretty-print, minify, or reformat the complete JSON file or a large unaffected block.
- Never use a generated search-and-replace helper when a direct patch is possible.
- Do not leave temporary patch, audit, or migration scripts in the repository.
- Do not add improvements, refactors, renamed state, or UI changes outside the user's explicit request.
- Preserve the established mixed compact/manual JSON style of the surrounding code.

## Immediate scope check

After each code patch, inspect the diff before doing more work.

- Compare the parsed JSON with `HEAD` and list changed root keys and changed macro names.
- Only the predeclared macro allowlist may differ. Unexpected root-key or macro changes are blocking.
- Required mission root keys are `title`, `id`, `author`, `start_info`, `macros`, `aircraft`, `applicable`, `api_version`, `data`, `threads`, `locations`, `objects`, `userActions`, `objectives`, `briefing`, and `icons`.
- `Debug_Table` and the other table mappings remain under root `data`; they must never be absorbed into `macros`.
- If the diff exceeds the requested semantic scope, stop and remove only the agent's own change. Never discard user work.

## HPG renderer and command safety

- Visual rows (`image`, `title`, `link`, `text`, `buttonbar`, `describe_icon`, `slider`, `input`) must be inside `set_dispatch`, never executable at macro command level.
- JSON parsing is not proof of a valid HPG script. Command spelling, condition comparators, renderer structure, macro references, icons, persistence, and page navigation must pass `tools/validate-mission.js`.
- Follow every detailed HPG, CARLS DF, preset, medical, ambulance, crew-LifeScore, debug, and release rule in `DEVELOPMENT_RELEASE_CHECKLIST.md`; do not duplicate or weaken those contracts here.

## Credit-efficient verification

1. During implementation, run only the smallest relevant targeted check.
2. After code is stable, run `node tools/validate-mission.js` once as the complete static gate.
3. Run `node tools/test-crew-emergency.js` only when crew, hoist, LifeScore, transport, object, route, or mission-failure logic changed.
4. Parse every shipped JSON and run `git diff --check` once before commit.
5. If a final check reveals a defect, correct it, inspect the semantic diff immediately, and rerun only the failed/relevant check plus one final complete gate. Do not restart broad audits from zero.

## Documentation and delivery

- Change code first. Update `CHANGELOG.en.md`, `HANDOFF_CHATGPT_SOL.md`, and checklist contracts only after the implementation and semantic scope are stable.
- Change `CHANGELOG_USER.en.md` only when the user explicitly requests the public changelog.
- Never describe static validation as proof of MSFS/HPG runtime behavior. State the exact simulator test still required.
- Keep user updates short: start/scope, a genuine blocker or unexpected finding, and the final verified result.
- Before commit, inspect the staged file list and staged diff. Never include temporary files.
- Direct push to `main` may still be blocked by the client security layer; do not bypass that block or claim a push succeeded when it did not.
