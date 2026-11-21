# ICS VOX glitch of the crew headsets (design of 2026-11-21, sources, unbuilt)

Request of Andrew: the crew headsets have VOX (voice-operated PTT). A badly set level, with a door open, engines on and collective up, opens the PTT on noise for a second or two, sometimes a few times. Only on the ICS, only when VOX is on.

## Mission side (module `26-vox-glitch.json`, no option, no preset)
- `vox glitch start` (called by `objective1`) runs one thread loop.
- Gate: ICS powered (battery master or GPCP switch), an engine with N1 above 20, rotor above 40 percent, collective above 20 and a crew member aboard (copilot `PERSIST_PILOT1` = 0, `SDK_CABIN_PAX_1..3` = 1). `vox pick crew` picks a random member aboard (who: 1 copilot, 2 PAX1, 3 PAX2, 4 PAX3).
- Once per flight a roll: 20 percent of flights have the glitch, N = 1 to 5 bursts, a random gap of 15-60 s between them (the gate is checked again before each burst).
- A burst: `L:HMC_VOX_DUR` = random 500-2000 ms and `L:HMC_VOX_SEQ` + 1. The Companion plays ICS hiss and wind noise (the usual ICS noise, no voice) for that time. Companion side NOT in this repository: needs a numbered issue (draft `C:\re41\outputs\flight-constraints\Issue_VOX_GLITCH_draft.md`).
- After the third burst (more than two): a random crew member asks everybody to check the VOX (`VOX.ASK.CPL|P1|P2|P3`). After the last burst: a random operator (another pick) says he fixed it (`VOX.FIX.*`) and does his comm check with the same variables as `COMM CHECK` (`CPL{VCP}5`, `{VCP}25`, `PAX2{VCP}1`, `PAX3{VCP}2`).
- Voices: 8 keys, packs EN 59 +1, DE +1, FR +1 (radio `ics`).

## Open
- Without the Companion change the bursts are silent; the crew lines still play after the third burst.
- The 20 percent, the 1-5 bursts and the gaps are Andrew's numbers (gap and 3rd-burst trigger are mine). Runtime test pending.
