# RescueTrack messages: who says what

Contract of the messages in the RescueTrack list (`Dispatcher_Messages`, shown in the Messages Inbox of the avionics). Runtime behavior is PENDING in the simulator; `tools/test-end-of-mission-flow.js` and `tools/test-crew-emergency.js` prove senders and texts only.

A message belongs to whoever knows the fact. The dispatcher (`GRPNAME`, for instance NORWAAM CT) knows only what it decides, what its callers tell it, and what a crew or a unit has reported to it first. It never asks the crew a question of the simulator.

| Sender | How | What |
| --- | --- | --- |
| Helicopter crew | `-OUT-` (`post dispatcher message` with `from` crew, or `post crew safety message`) | State of the crew (critical, deceased), abort of the mission and diversion, confirmed hospital, patient handed over to the ED, patient deceased on board, deceased on scene and the request for the police, handover of the crew casualties, the status report sent from the CARLS or tablet keypad (`send dispatch phase`: `Status sent: <phase name>`) |
| Fire service | call sign `firename` (`from` fire) | Scene safe, not safe (fire or smoke), fire out |
| Police | call sign `poliname` (`from` police) | Arrival, scene secured |
| Ambulance | call sign `ambuname` (`from` ambulance) | Arrival, updates on the patients, patient released |
| Dispatcher | `GRPNAME` (no `from`) | The dispatch, new dispatch, injured updates from the callers, the answer to a crew report (another unit tasked to the patient left on scene, police tasked, accident report required after a death), CARLS status messages (original behavior) |

Rules:

- `post dispatcher message` chooses the sender from the optional param `from` (crew, fire, police, ambulance; anything else is the dispatcher). The time follows the clock chosen in the dispatch control page.
- A question of the simulator to the pilot (the CREW EMERGENCY Divert or Continue choice) is only on screen (`set_message` and the modal), never a RescueTrack message. The dispatch page is hidden before the modal.
- A death or a critical member is reported by the crew first; the dispatcher answers afterwards: `crew emergency divert` posts the crew report (abort, patient on scene needs another unit or diverting with the patient aboard) and then, with a patient left on scene, the dispatcher answer (`Copy. Mission cancelled. <unit> tasked to the scene.`); after a death `crew member event announce` posts `Copy. Accident report required.`; a death on scene: the crew says `Requesting police.` and the dispatcher answers `Copy. Police tasked...` once the police is requested (`Police1`).
- The return to base of the crew emergency reports the handover once per mission (`CREW_RTB_STARTED`).
- A message that is the mission log of a unit stays with the unit (ambulance, fire service and police on scene or en route, with their ETA).
