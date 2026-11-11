114 - Crew tips: language follows the mission interface language (AUTO / SAME AS UI / SAME AS VOICE / ENGLISH), nothing is spoken when no voice exists

Repository: KeKKERUUU/RandomEverywhereInstaller

Supersedes the approach of issue 109 for the tips (the `[lang:XX]` tag stays a supported feature for pack authors). Related: 101 (missing keys), 103 (EN base pack with translations), 74 and 95 (packs read from the mission repository).

## Why

The crew tips talk about the menus of the tablet by name ("Quick links", "Save or reload a mission", "Crew chatter"...). The names are the ones of the interface language, so a tip is only useful when it is read in the interface language, with a voice of that language. Today a German pack carries 48 tips in English tagged `[lang:EN]` that are read by the German voice of the actor (report of kingle, 2026-11-08 and 2026-11-10, issue 109), and the French pack quotes English menu names in French sentences.

Assumption: whoever uses a text pack uses it in the language of the voices, so there are two languages to look at: the interface language of the mission and the audio language (text pack + voices).

## What the mission does (mission repository, already in the sources)

- It announces its interface language with `L:HMC_UI_LANG` (number): 0 unknown (old mission or custom file, treat as EN), 1 EN, 2 DE, 3 FR, 4 IT, 5 ES, 6 NL, 7 PL. The value comes from a translatable field `ui language` of the manifest `ui-texts.json` (kind `lang`, English `EN`; the screen language files give `DE`, `FR`, `IT`), so the patcher that translates the screen texts also sets the language, like any other text. The mission writes the LVAR with the other `L:HMC_*` values of the voice context (macro `voice context publish`).
- The mission keeps sending the same keys `<say:TIP.<topic>.<n>>`; it does not choose the language.
- The packs carry the tips fully translated, with the exact names of the menus, buttons and options of the translated interface (checked by a test of the mission repository).

## What the app must do

1. Read `L:HMC_UI_LANG` (0 = EN) and keep the audio language (text pack + voices) as today.
2. Resolve the language of a tip, setting "Crew tips language", persistent, default AUTO:
   - AUTO: the interface language if a pack of that language is installed and a voice of that language is installed; else the audio language; else nothing.
   - SAME AS UI: only the interface language (pack and voice must exist, else nothing).
   - SAME AS VOICE: only the audio language, without matching the menus.
   - ENGLISH: the English base pack with an English voice, else nothing.
3. The text of the tip is read from the pack of the resolved language (the EN base pack is always installed, see 103). One line per language in each pack, no duplicate lines: the app takes `TIP.*` from the pack of the language it resolved.
4. Rule for everything the app speaks: if no voice exists for the language, nothing is spoken.
5. The tag `[lang:XX]` on a segment stays an explicit override: it is spoken by a voice of that language, else nothing.
6. Log, one line per tip, with everything that explains the choice: key, interface language (and its source: LVAR value), audio language, mode of the setting, language chosen, pack name and version, actor, voice id, or the reason for not speaking (no pack, no voice, key missing, unknown language).

## Done when

- A German interface with the German pack and a German voice speaks German tips; the English tips of today are gone.
- An English interface with a German audio language speaks English tips with an English voice, or nothing if no English voice is installed; the log says which.
- A language without a pack (Italian) with the English or German audio follows the audio language.
- The four values of the setting work and persist; AUTO is the default.
- The log lines above exist and name the reason of every choice.
