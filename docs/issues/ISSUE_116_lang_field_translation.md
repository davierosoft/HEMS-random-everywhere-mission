116 - Mission screen language: translate the new field of kind lang with the pack code (DE, FR, IT)

Repository: KeKKERUUU/RandomEverywhereInstaller (posted)

Since mission 0.997 170.25 (ui-texts.json) there is one field of kind `lang` (key UI.3633, English value `EN`, two places: `/macros/objective1/49/value` and `/macros/voice context publish/1/then/1/value`). It is the language code of the interface of the mission.

## What the app must do

1. When the app patches a mission in a language, it must write the code of that language pack (`DE`, `FR`, `IT`) in the field, never a word. The translation files uitexts/DE.json, FR.json and IT.json already hold the codes. Other packs: the 2-letter code of the pack (ES, NL, PL are known by the mission, the others fall back to EN).
2. The mission then publishes it as L:HMC_UI_LANG (1 EN, 2 DE, 3 FR, 4 IT, 5 ES, 6 NL, 7 PL) while the audio is inhibited, and in the German mission it selects the German RescueTrack status table (RESCUETRACK_ID 1). French and the other languages keep their setting (the French tablet is the interface of the helicopter as sold).
3. Read L:HMC_UI_LANG in the Companion for the language of the crew tips (issue 114).
4. The field has no max length problem (max 13) and must not be shown as a normal text to the user in the translation editor.

Contract: docs/architecture/UI_TRANSLATION.md (Kind lang) and docs/architecture/VOICE_APP_MODE.md in the mission repository.
