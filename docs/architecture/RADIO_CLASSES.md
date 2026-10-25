# Radio classes of the spoken lines

Contract between the mission (and the voice packs) and the Mission Companion. User matrix of 2026-10-25; every row holds in both directions (the answer has the same class as the call).

| Speaker and listener | Class | Effect | Pack `radio` | Mission tag |
| --- | --- | --- | --- | --- |
| inside - outside, no radio (not powered, CARLS not connected, or by voice) | Voice | none, no beep; heard by distance zone | `off` | none |
| inside - inside, no power | Voice | none, no beep | `off` | none |
| outside - outside | Voice | none, no beep; zones as they are | `off` or `auto` | none |
| crew inside - crew outside, polycon (battery or GPCP on, CARLS connected) | Crew radio | crew radio beep, hiss, squelch (options of the Crew radio) | `on` | `<radio>` |
| crew - dispatcher, hospital, heli rescue base (and their answers), ground unit by radio | External radio | external radio beep (default Double beep), hiss, squelch (options of the External radio) | `ext`, `ext-near` | `<radio:ext>` |
| inside - inside, battery or GPCP on | Intercom | click, no tail | `ics` | `<ics>` |

Rules for the pack and the mission:

- A line between the crew and a station is `ext`, whoever speaks it: the dispatcher (actor 8), the crew call to the dispatcher or the hospital (actor 2 and the others), the pilot and the heli rescue base (actor 1 and 12), the hospital and the ground units (actor 9). A station line is never `on`: `on` is the crew polycon only (heli rescuer on the ground and the crew: HRS.*, actor 12).
- A text spoken by the mission with a key (`<text:KEY>`, the dispatch descriptions DSC.*) carries its class in the mission tag, because the pack does not decide for texts the mission spells: `<actor8><radio:ext><text:DSC.{0}.{1}>`. Those pack messages have no `radio` attribute.
- The app must not hard-code the beep of a class: each radio class has its own options (type, level, tail, quality, hiss), `ext` does not force the double beep (the double beep is the default of the External radio).
- Without a radio link the crew talks by voice (class Voice). Without a zone for the crew outside the app cannot tell near from far: see the open point in the Companion issue 35.

History: until the release 0.997 169.75 the crew calls to the dispatcher and the dispatcher lines of the objective were `on` (the crew radio beep), the other dispatcher lines `auto` (double beep): one conversation had two kinds of beep. 169.76 marked them `ext` (EN 27) while the app forced the double beep and ignored the options of the user; 169.79 and the pack EN 29 make the classes explicit and move the heli rescue base calls of the pilot and HOS.A to `ext`.

## Crew zone (decided 2026-10-25)

The mission publishes L:HMC_ZONE_CREW (0 none, 1 up to 5 m, 2 up to 30 m, 3 up to 100 m, 4 beyond; nearest of hoist_crew, pax1, pax2, pax3, measured from the user aircraft). Outside-outside and inside-outside without radio link are spoken by voice by this distance, like L:HMC_ZONE_TECH. L:CREW_PROFILE (1 to 5) selects the crew of voices: global CREW_PROFILE, overridden by L:LIVERY_CREWPROFILE when the livery is active.
