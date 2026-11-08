# Translation of the on-screen texts (design, 2026-10-31)

Status: design and runtime test only. Nothing of the mission is translated yet; the migration waits for the result of `standalone-tests/ui-translation-test.json` (see `docs/testing/RUNTIME_VALIDATION.md`, "UI translation test").

## Scope

The user asked for a table with the translated texts of everything on the screen except what cannot take a dynamic text (the titles of buttons and of modal options). Measured on the sources of 0.997 169.94 (macros only, distinct texts with letters, placeholders and identifiers left out):

| Kind | Distinct texts |
|---|---|
| `text` widgets of the tablet and briefing | 2325 |
| `set_message` | 440 |
| `link` widgets | 126 |
| `title` widgets (not buttons) | 145 |
| modal titles and texts | 18 |
| **to translate** | **about 3050** |
| button titles and modal options (stay English) | 414 |
| dispatch descriptions (`description1-4`, 72 incidents) | 320 |

Also outside the macros and not counted above: texts inside `data`. Since 2026-11-08 the ones the screen shows are fields of kind `data` (507 texts, 5131 places): the dispatch descriptions `description1-4`, `general_description` and `objective` of the incidents, the `diagnosis`, `medical_symptoms` and `medical_action_N` of the health profiles (`health*`), and the `CARLSmessages`. Names, ids (they are lookup keys), macro names, vehicle models and the other records stay out. The English of the descriptions equals the voice pack text `DSC.<ID_CARD>.<variant>`, so the DE and FR screen texts of the descriptions are taken from the packs; the pathology names (`id` of the health profiles) and `statusMessages` are still a second pass.

## Speech stays in the audio language

The language of the screen and the language of the voice are two separate settings. The spoken lines already come from the voice pack chosen in the Companion (`<say:KEY>` and `<text:KEY>English`, see `VOICE_APP_MODE.md`): a pilot with the screen in Italian and the pack in English hears English. The dispatch descriptions are the case to protect: the screen shows the description in the screen language, `voice read dispatch` keeps sending the key `DSC.<ID_CARD>.<variant>` to the Companion, which speaks the text of its pack. So the screen table must never feed the voice, and the voice must never read a text from the screen table.

## Chosen approach: the Companion patches the mission (decision 2026-10-31)

The in-mission mechanism below was measured and rejected as too costly (a local and a command per text and language, no links, buttons or templates formatted from a table). The adopted approach is tracked in issue 65 of KeKKERUUU/RandomEverywhereInstaller: the mission keeps English literals; the mission repository generates stable keys and a manifest per release (`tools/ui-texts.js`, same model as `tools/voice-texts.js`); the Companion keeps a separate per-language text file and patches the installed mission with it, leaving a pristine copy, and publishes the voice and text languages to the mission through LVARs. Spoken lines stay in the audio language. The section below is kept only as the record of what the simulator accepts.

## Mechanism measured in the simulator (runtime test of 2026-10-31, see RUNTIME_VALIDATION.md; not adopted)

What the simulator accepts: a widget `text` or a `set_message` text taken from a local, plain; a title through `{0}` with `params`; a string read from a data array with `index` only; the array chosen by if/eq on literal names. What it rejects: a `struct` expression or a `path` in a widget, a widget `text` local with `params`, a `link` text from a local, an array name built at run time, a template formatted from a local text. Button titles stay literal.

1. One data array of strings per language (`ui_en`, `ui_it`, `ui_de`, `ui_fr`), same index in every language, `ui_en` is the text of today.
2. A global `UI_LANGUAGE` (en default) in Settings > Miscellaneous, saved in the profiles like every option, and a local `uil` read at start.
3. A text with no placeholder: a macro `ui load <lang>`, chosen by if/eq on `uil`, sets one local per text from the literal array of that language; the widget shows the local plainly.
4. A text with placeholders: the branch of each language sets the local with `{"text":"<literal text of that language>","params":[..]}`; the widget shows the local plainly. The translation is therefore a literal in the branch, generated from the table.
5. `link` widgets, and anything that cannot take a local, are shown in duplicate, one per language, each with `show_condition` on `uil`, or stay English.
6. `set_message` and modals take the local (modals already proven on 2026-10-30).
7. A generator (like `tools/voice-texts.js`) extracts the texts, assigns the index, writes the arrays, the branches and the widgets; a gate fails on a visible English literal that is not in the table, on a language array of a different length, and on a placeholder count that differs between languages.

Open cost: every translated text becomes one local and one command per language. Roughly 3000 texts, so the dynamic reload must be one macro run when the language changes, not at every tablet refresh.

## Keys and manifest (tools/ui-texts.js, 2026-10-31)

`node tools/ui-texts.js sync` reads `everywhere_all.json` and writes two files: `tools/ui-text-keys.json` (the registry: `[key, kind, English]`, keys `UI.0001`..., never renamed or reused; a changed English text takes a new key, the old one stays unused) and `ui-texts.json` in the repository root (the manifest the Companion reads next to `everywhere_all.json`: `version 1`, `mission`, and per text `key`, `kind`, `en`, `max`, `paths`, where `paths` are JSON pointers into the artifact of the same build). `node tools/ui-texts.js` (check) is part of `check-workspace.js`: it fails on a screen text without a key, on a path that no longer holds the English text, on non-ASCII English and on a manifest that is not current. After every build run `sync`, commit both files and publish `ui-texts.json` as an asset of the release, because the paths belong to that build.

What is a field: the `text`, `description`, `label`, `link`, `linkText` and `title` of the rows of a `set_dispatch` or `briefing` (and of the root `briefing`), the titles of the buttons of a `buttonbar` (kind `button`), the `text` of a `set_message` (kind `set_message`), the `title`, the `text` and the option texts of a `set_modal` / `wait_modal` (kind `modal`: the modal font has no accented glyphs, the app folds the translation to ASCII), and `set_objective_title`. A string needs at least two letters outside the placeholders. Not fields: `speak` and the voice packs, the data records (the dispatch descriptions `DSC.<ID_CARD>.<variant>` and the medical lines of the accidents are a second pass), names, conditions, comparison values and any text built into a local at run time. `max` is the longest translation the app accepts: 1.35 times the English plus 4 for buttons, links and titles, 1.5 times plus 10 for the others. At the first run: 2995 texts in 4767 places (1837 text, 468 set_message, 381 button, 185 link, 69 title, 55 modal).

File format agreed with the app side (issue 65): the manifest above and a language file `{ "language": "IT", "name": "Italiano", "texts": { "UI.0001": "..." } }` with the keys of the manifest. The files are UTF-8 without BOM (accents verified in tablet, briefing and `set_message`; the BOM case is not needed and not tested).

## Not in this document

The translations themselves (about 3000 texts per language, plus the data texts) are produced from the manifest, not from the sources. The proper names (places, hospitals, patients) are not translated: see the question of the names read with a foreign accent in `VOICE_APP_MODE.md`.

## Release rule (user, 2026-11-08)

Every mission release with a changed or new screen text (rows, buttons, links, messages, modals, titles, data texts) must update uitexts/DE.json, FR.json, IT.json of the Companion repository, and any other language file, after node tools/ui-texts.js sync. A release with keys missing in a language file is incomplete and blocks delivery unless the user defers it. Spoken texts follow the voice-pack rule.

## Languages, voice packs and Basepack published in the index (issues 56 and 95, 2026-11-08)

The screen language files live in this repository as `uitexts/DE.json`, `FR.json`, `IT.json` (any other language: `uitexts/<CODE>.json`, the `language` field equal to the code). `node tools/ui-texts.js sync` writes three more members of `updates` in `ui-texts.json` from the files: `languages` (file, size, sha256, keys), `voicepacks` (file, size, sha256, version, basever of `voicepacks/<CODE>.xml`) and `basepack` (git tree hash of `basepack/` and its files with size and blob hash, without `layout.json` and `hpgmission/`). The hash is that of the text without BOM and with LF line ends. The check of `ui-texts.js` fails on a missing key, a text over `max`, a character above U+00FF, changed `{n}` placeholders, or an index that no longer describes the files (stale hash). After changing a language file, a voice pack or `basepack/`, run `sync` and commit `ui-texts.json` in the same commit. The Companion reads all of this from `main`, so a push publishes it.
