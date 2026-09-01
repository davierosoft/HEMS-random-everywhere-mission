# HPG mission renderer reference

This note records the HPG contracts used by the mission and the checks that must
be repeated before changing a cockpit page.

## Sources

- [HPG Mission System — command reference](https://davux.com/docs/missionsys/REFERENCE-COMMAND.html)
- [HPG Mission System — query reference](https://davux.com/docs/missionsys/REFERENCE-QUERY.html)
- [HPG Mission System — briefing and dispatch widgets](https://davux.com/docs/missionsys/TOPIC-WIDGETS.html)

## CARLS and dispatch are different renderers

`set_carls_radio` is an imperative refresh of the CARLS tactical-radio display.
Each call replaces the radio's `LSK`, `RSK`, and `Items` layout. A CARLS state
change must therefore finish by calling `set_carls_radio` with the complete layout
for that state; it must not rely on a previous layout remaining on screen.

The HPG command reference explicitly supports an `item` wrapper with
`show_condition` inside `set_carls_radio`. That syntax is valid, but it is a row
visibility feature, not a substitute for refreshing the CARLS layout. The DF
renderer uses complete, mutually-exclusive refresh states so that a digit press,
validation result, timeout, cancel, or confirm cannot leave stale rows or soft
keys behind.

`set_dispatch` is a separate dynamic dispatch/briefing widget API. Its renderer
rules and lifecycle must not be copied into CARLS layouts.

## State scope

- `global` is used for DF state that crosses keypad events, macros, and the
  timeout thread.
- `local` is used only for scratch values consumed by the current renderer task.
- `param` carries the digit belonging to the current keypad event.
- Simulator `L:` variables are not used for editor state; their asynchronous
  update timing can make the first digit or timeout appear one event late.

## Release checks

The DF regression gate must prove the full sequence: open page, press one digit,
render `EDT: 1_#.###` and `ESC` immediately, wait five seconds, cancel an
incomplete entry, and restore the idle layout. Static checks are not a substitute
for the final MSFS/HPG runtime test on the target aircraft build.
