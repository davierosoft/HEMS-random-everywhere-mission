# HPG dynamic-object state contract

This is the repository reference for every dynamic-object `VAR 1` and `VAR 2` visual state documented by HPG's *H145 Mission System Documentation*, pages 13-15. It is a development rule, not a suggestion: do not infer a title, an animation number, or an undocumented state from an object's appearance.

## General object variables

The HPG mission system maps `VAR 1` and `VAR 2` to object-specific simulation variables. `COUPLED`, `MODE`, `WP INDEX`, `VELOCITY X`, `VELOCITY Y`, and `VELOCITY Z` are control variables, not visual-state aliases. A state not listed below needs evidence from the current HPG object package or its documentation before use.

## H145 Crew

Create every crew, pilot, and stretcher actor with `title: "$TITLE Crew"` and the livery-compatible crew fallback. The visual role is selected by `VAR 1`; there is no `$TITLE Pilot` object title.

| VAR 1 | Visual state |
| --- | --- |
| -1 | Hidden |
| 0 | HEMS standing |
| 1 | HEMS standing with backpack |
| 2 | HEMS walking |
| 3 | HEMS walking with backpack |
| 4 | HEMS crouching on ground |
| 5 | HEMS crouching on ground with backpack |
| 6 | HEMS crouching on ground with backpack on ground |
| 7 | HEMS waiting |
| 8 | Stretcher, no patient |
| 9 | Stretcher, patient |
| 10 | Stretcher walking, no patient |
| 11 | Stretcher walking, patient |
| 12 | Stretcher standing, no patient |
| 13 | Stretcher standing, patient |
| 14 | Pilot standing |
| 15 | Pilot waving |
| 16 | Pilot walking |

`VAR 2` applies to pilot states (HPG documents VAR 1 values 14-17): `0` black pilot with headset, `1` black pilot with helmet, `2` white pilot with headset, `3` white pilot with helmet.

## H145 Injured Human

| VAR 1 | Visual state |
| --- | --- |
| -1 | Hidden |
| 0 | Injured human in pain |
| 1 | Injured human packed into hoistable stretcher |

## H145 Waving Civilian

| VAR 1 | Visual state |
| --- | --- |
| -1 | Hidden |
| 0 | Civilian waving |

Set `L:WAVING_CIVILIAN_STOP` to `1` to stop the waving animation.

## H145 Flare

| VAR 1 | Visual state |
| --- | --- |
| -1 | Hidden |
| 0 | Smoke automatic: on at high-visibility setting, off at realism setting |
| 1 | Smoke on in both settings |

## Required implementation checks

1. Translate an operational instruction to the table before editing. For example, "crew walking with backpack" is H145 Crew `VAR 1: 3`.
2. Preserve an actor's object title while changing visual role. In three-crew destination handling, the copilot remains `$TITLE Crew`, uses `VAR 1: 14` standing and `VAR 1: 16` walking, and may use the documented pilot `VAR 2` skin value.
3. Add or update a structural regression check whenever a mission path relies on a visual state. The check must reject invented titles and verify the required `VAR 1` transition.
4. Do not use an object state absent from this reference until the current HPG documentation or installed object package proves it.
