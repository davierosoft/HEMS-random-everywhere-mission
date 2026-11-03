# Ground return gate: the crew and the heli rescuers never walk to a helicopter that is too far

Report of Steph and Andrew (2026-11-03, avalanche on the Marmolada): after the heli rescuers were left at the landing spot of the accident, the helicopter flew down the valley and landed on a pad; the heli rescuers started walking down the glacier toward it ("they walk to the helicopter wherever it is"). Andrew: it is a defect, they must wait for the choice of the pilot (hover or ground), based on the distance. User rule: neither the heli rescuers nor the crew return to a helicopter that landed too far away, unless the user chooses; the margin is the one already defined as the maximum distance of the crew on the ground.

## Why the existing margin did not work

The margin is the radius of the landing spot of the ground operations (`LANDING_SPOT_GND`, slider 100-500 m, default 150 m, in the local `ldg_spot_area_size`). It was applied only:

- at the start of `ground ops` (the helicopter must be inside the area before the crew deploys);
- in `HOISTING`, where the crew lowered by the hoist is compared with the helicopter ("Helicopter is too far for ground operation... continue with hoist");
- in the skid landing operations, where the heli rescuer waits at the skid point until the helicopter is inside the landing spot (`hrw_miss` POS).

It was not applied to the way back of the ground operations. `3 crew ground ops` and `4 or 5 crew ground ops` ended the visit with "land and set engines to idle or stop" and then waited for the rotor only (`ground ops NR gate`: rotor below `gndopsNR`, never a position). The heli rescuer (`gnd ops heli rescuer down`, `hoist heli rescuer down`) chose between the hoist and the ground boarding with `SIM ON GROUND` alone, and `gnd ops heli rescuer up` walks to points computed from the helicopter (`bearing`/`dist` without object, the door objects), wherever it stands now. Every rotor stop, anywhere, started the walk.

## The gate (`ground return gate`, module 09)

Params: `source` (text of the trace), `hover_ok` (1 when a hovering helicopter ends the wait).

- Inside the landing spot area (`landing_spot` closer than `ldg_spot_area_size`): they go, nothing is shown.
- Outside: nobody walks. The tablet says "Ground crew and heli-rescuers stay here: the helicopter is N m from the landing spot, the limit is M m. Bring the helicopter inside the lime area, or choose WALK TO THE HELICOPTER ANYWAY", and the user action WALK TO THE HELICOPTER ANYWAY exists while somebody waits (the choice of the user, `grg_walk_far`).
- Heli rescuers only (`hover_ok` 1): a hovering helicopter (`SIM ON GROUND` not 1) ends the wait and the existing choice sends them to `hoist heli rescuer up`.
- Skid landing operations (`MISSION_HOIST` 2) and a mission without landing spot pass at once: the skid point has its own wait.
- Several callers can wait at the same time (the crew and a heli rescuer): the state is in params of each caller, `grg_waiters` counts them and the button is destroyed by the last one. `grg_walk_far` is cleared at the start of `ground ops`, `gnd ops heli rescuer down` and `hoist heli rescuer down`.
- Trace (`ground_ops_checkpoint_log`): `ret_gate_enter` (source, distance, limit), `ret_gate_wait` every 10 s, `ret_gate_user_walk`, `ret_gate_passed` (reason).

Call sites: after the message "Ground crew operations are almost complete" and before the NR gate of the return in `3 crew ground ops` and `4 or 5 crew ground ops` (`hover_ok` 0); after the wait of the heli rescuer (`HOLDHOISTED` in `gnd ops heli rescuer down`, `HR_HOISTING_LOCK` in `hoist heli rescuer down`) and before the choice between the hoist and the ground (`hover_ok` 1).

## Not covered

- The crew lowered by the hoist keeps the decision of `HOISTING` (hoist or ground by `hoist_crew` distance); the other drives of `Hoisting back ground` are reached only after it.
- Landings at a hospital or at the base: the walks there start from the helicopter by design.
- The landing spot is not the solution for the pilot (user rule): the margin only decides whether they walk; the pilot may land anywhere and choose.

## Test

`tools/test-ground-return-gate.js` runs the macro in a coroutine interpreter (inside, outside with the helicopter coming closer, the user choice, hover for the heli rescuers only, the crew and the heli rescuer waiting together, skid operations, no landing spot, a choice already made) and checks the four call sites and the clearing of the choice. Runtime PENDING (`docs/testing/RUNTIME_VALIDATION.md`).
