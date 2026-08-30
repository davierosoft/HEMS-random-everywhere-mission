# Mission release safety checklist

This is a blocking checklist. Read it before changing `everywhere_all.json`, run the automated gate after every change, then complete the relevant in-simulator checks before publishing. Do not describe an audit as complete if a required runtime test has not been run.

## 1. HPG condition syntax — highest-risk rule

- Every executable `if`, `wait_for`, and `while` has exactly one sibling comparison operator: `eq`, `ne`, `gt`, `gte`, `lt`, or `lte`.
- A direct executable operand is a `var`, `local`, `global`, `param`, or a root logical expression. It is never a direct `require` object.
- Every `and` or `or` **nested inside another logical condition** has its own comparison operator, normally `eq: 1`. Example: `{ "or": [ ... ], "eq": 1 }`.
- Exception: a logical expression used as the *value* of a `require` is already compared by that outer `require`; do not add a second operator inside it. The ambulance/police/fire arrival checks use this valid form.
- Do not build boolean groups manually without running `node tools/validate-mission.js` afterwards.

## 2. State and persistence

- Any value displayed after a mission reload must have an explicit fallback. Local variables are not persistence.
- A persistent user choice must use a named `global` and have a first-run default in `global.json`.
- Normalise values before formatting them. A renderer must not print an optional local directly when `undefined` is possible.
- When an automatic action changes the user-visible state, update the same persistent state used by its manual counterpart.

## 3. CARLS / renderer rules

- `set_carls_radio` always receives exactly three **string** labels for `LSK` and three for `RSK`; never pass a dynamic expression as a soft-key label.
- Each renderer state must be mutually exclusive and complete. Test idle, edit, invalid edit, valid edit, fixed-modulation bands, UHF AM, and UHF FM.
- A blank SK is also a state: its event handler must be harmless.
- Text that has a known display limit is measured before release. Never rely on wrapping for units, status labels, or checklist answer fields.

## 4. Validation and user input

- Validate incrementally where the UI asks for digit-by-digit entry. Reject an illegal digit without advancing the cursor.
- Re-check all boundaries, gaps, and grids after changing validation: lower bound, upper bound, first valid value after each gap, last valid value before each gap, and prohibited spacing values.
- Keep the previous accepted state intact on cancel, timeout, or invalid input.

## 5. Scope and regressions

- Inspect the existing working macro/page before replacing it. Preserve unrelated controls, handlers, and feature gates.
- Check every call site when changing shared state, object names, doors, crew counts, route ETA, or patient transport variables.
- Do not change files outside the requested scope. Preserve existing user changes.
- `CHANGELOG_USER.en.md` changes only on an explicit request. Always update `CHANGELOG.en.md` and `HANDOFF_CHATGPT_SOL.md` for a release.

## 6. Required release gate

1. Parse `everywhere_all.json` and `global.json`.
2. Run `node tools/validate-mission.js`.
3. Run `git diff --check` and inspect the staged file list.
4. Record static checks separately from runtime checks; static checks cannot prove HPG/MSFS behavior.
5. Execute the feature-specific in-simulator test matrix, including a reload when persistent state is involved.
6. Update mission build number, technical changelog, and handoff. Commit and push only after the above is complete.

## Known regressions this checklist prevents

- Missing HPG operators in `if`/logical groups, including the CARLS DF failures of releases 85, 88, 89, and 90.
- Undefined renderer labels caused by LVAR/local lifetime mismatch.
- Soft-key labels rendered from unsupported dynamic objects.
- DF frequency-grid errors, invalid band acceptance, and incorrect forced AM/FM behavior.
- Checklist wrapping caused by non-monospace or overlong rows.
- Medical-page visibility, 5G/Wi-Fi exclusivity, preset persistence, ambulance-watchdog, and door/crew sequencing regressions.
