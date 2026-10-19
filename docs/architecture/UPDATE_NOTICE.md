# Mission version, build number and the "new version" notice

User request of 2026-10-19. Static checks: `tools/test-update-notice.js`. Runtime (HPG/MSFS) PENDING.

## Numbering

- The title of the mission carries the release (`HEMS RANDOM AND EVERYWHERE MISSIONS 0.997 169.65`), written by `tools/release-workflow.js`.
- `RELEASE_IDENTITY` (macro `version check`, `0.997 169.65`) stays the one literal that the workflow writes and that the diagnostics, the debug page and the
  title check read. `DEV_VERSION` is now derived from it (second word, `169.65`): there is no second number to keep in step. `DEV_TYPE` is `(ALPHA)` until the
  mission is stable (it was `(BETA)` with `DEV_VERSION` 1.2).
- `BUILD_MAJOR`, `BUILD_MINOR` and `BUILD_N` (major * 1000 + minor) are set by `version check`: 169.9 comes before 169.64, as in the Companion.

## The notice in the briefing (root/03-briefing.json)

The old rows compared the words of the server with the local ones and showed the notice for every difference. Now it is shown only for a NEWER build:

1. **Server** (CICERS): the macro `CICERS PING` calls `latest version parse` on the version that the server answers after the id
   (`0.997 (BETA)`, `0.997 169.70 (ALPHA)`, the old `0.997 1.2 (BETA)`; the order of the words does not matter: a word with one dot is the build, any other
   word is the type). `UPD_SERVER` is 1 when the mission version is higher, or the same and the build is higher; a `(DEV)` type never counts and an answer
   without a build number never counts. Two rows (links by `MGsounds_installed`), as before.
2. **Mission Companion**: the program reads the newest published release (GitHub) at the start, at every update check and every 30 minutes, and publishes
   `L:HMC_MISSION_LATEST_MAJOR` / `L:HMC_MISSION_LATEST_MINOR` (169 / 65). Two rows (higher major; same major and higher minor) tell the user to press Update
   now in the Updates tab. They are not shown together with the server rows (`UPD_SERVER` not 1). Without the program the variables are 0 and the rows stay hidden.

Renderer conditions are AND only, hence two rows for each source instead of an OR.
## Where the notice is shown, and the message of the actors without a voice

- The notice of a new version (four rows, AND only) is on the briefing, the dispatch home page (`homepage`) and the technical page (`techpage`); the page rows also need the 15 s timer of the page, as before. "No errors detected!" is not shown while an actor has no voice.
- User request of 2026-10-19: the Mission Companion tells the mission, by `L:HMC_ACTORS_MISSING` and `L:HMC_ACTORS_DEFAULTED`, how many main actors (crew, dispatcher, ground ops, heli rescuer) have no voice (the voices are stopped) or got a default one. Two message rows (red, amber) are in the message area of the briefing, the home page, the technical page, SETTINGS/AUDIO OPTIONS (open section) and the checklist page. The other pages show nothing. Test: tools/test-update-notice.js.
