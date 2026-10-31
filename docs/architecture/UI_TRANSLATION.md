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

Also outside the macros and not counted above: texts inside `data` (pathology names, symptoms, medical actions, message tables). They are a second pass.

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

## Not in this document

The translations themselves (about 3050 texts per language, plus the data texts) are produced after the test, so that no translation is written for a mechanism that does not work. The proper names (places, hospitals, patients) are not translated: see the question of the names read with a foreign accent in `VOICE_APP_MODE.md`.
