# Voice packs

The text voice packs of the Mission Companion: `EN.xml` (the base pack, every key of the mission), `DE.xml`, `FR.xml`. This repository is the canonical place from 2026-11-03: the next releases of the Companion look for the updated packs here (`voicepacks/` on `main`).

- The base pack must hold every text the mission speaks: `node tools/voice-texts.js check` fails when a key is missing; `node tools/sync-pack-texts.js` writes the texts of the mission (`tools/voice-texts.json`) into `voicepacks/EN.xml` between the markers MISSION TEXTS BEGIN / END and raises the version of the pack. The translated packs copy the block and are translated by their owners.
- Until the Companion reads the packs from this repository and everyone has updated, both repositories carry the packs: after changing a pack here, apply the same change to `voicepacks/` of `davierosoft/HPG-Mission-Companion` (run `node tools/sync-pack-texts.js --pack ../HPG-Mission-Companion/voicepacks/EN.xml` for the base pack, copy the translated files).
- Origin of the copy: `davierosoft/HPG-Mission-Companion`, commit `61055f8` (2026-10-28), packs EN 36, DE 24, FR 25.
- The tests that read the packs (`tools/test-*.js`) use this folder, so the continuous integration checks them too.

## Version contract (rule of 2026-11-22)

- One pack version identifies exactly one content. The version is owned by `voicepacks/pack-ledger.json`; never edit `version=""` by hand.
- After changing a pack, run `node tools/pack-versions.js apply` (ledger +1, hash updated); `node tools/pack-versions.js` (also in `check-workspace.js`) fails on changed content with the old version, or on a version that differs from the ledger.
- Order: commit and push the mission first; only then update the Companion with `tools\Sync-VoicePacks.ps1 -Apply` (Companion repo). The Companion must never hold a pack newer than, or different from, the mission `origin/main`; its pre-push gate (`-Mode Exact`) and tests/CI (`-Mode NotAhead`) enforce it.
