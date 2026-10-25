# Request for the Mission Companion app: PTT feedback sounds, squelch, sidetone, acknowledgement tones

Date: 2026-10-24. Sender: mission side (release 0.997 169.76). To be pasted into the Companion chat. Nothing here changes the mission: the mission already publishes everything needed.

## What the mission already does (no work on the mission side)

- Every message between the crew and a radio station (dispatcher, hospital, heli rescue base, ground units) is marked `radio="ext"` (EN 29, DE 16, FR 18) and the crew polycon `on`; the classes and the options each one needs are in `RADIO_CLASSES.md`. Messages marked `ics` keep the intercom click without beep.
- After an accepted spoken command the copilot reads it back with the pack message `CMD.101` to `CMD.114` (six options each, actor 2, `radio="auto"`).
- The mailbox of the speech bridge: `L:HMC_SPEECH_ACK_SEQ` follows the request sequence, `L:HMC_SPEECH_ACK_RESULT` is 1 (button clicked) or 2 (not available now).
- Power rule for every radio sound: battery master on or the GPCP switch on, and the CARLS connected (see the radio rules already implemented in the engine).

## Requests

1. **PTT press feedback.** When the user presses the speech push-to-talk key (or the joystick button), play a short sound locally in the radio path: a click or a beep. Only when the radio can work (power rule above). Release of the key plays the squelch tail (point 2).
2. **Squelch tail.** On release (and when the speech command ends), play a short noise burst of 80 to 150 ms, as the tail of a radio transmission. Option on/off.
3. **Sidetone.** The user hears their own voice in the headset while the PTT is held, with an adjustable volume (0 to 100 percent, default 30, default OFF). Input device level is read from the capture device already used by the speech recognition; output goes to the same device as the radio voices. Muted for the sound of the dispatcher and of the crew lines (no feedback loop with the sim audio).
4. **Tone selection.** No LVAR is needed because everything is played by the app. A fixed, customizable selection is enough: a folder `Audio\ptt\` with the files `click.wav`, `beep1.wav`, `beep2.wav`, `squelch.wav`, `ack.wav`, `nack.wav` that the user can replace, and a dropdown in the Options for the press sound (None, Click, Beep 1, Beep 2, the file of the user), one for the release sound (None, Squelch, Beep) and the volume of both.
5. **Acknowledgement tones for the commands.** When `L:HMC_SPEECH_ACK_RESULT` becomes 1 for the current request, play `ack.wav` (a short rising tone); when it becomes 2 play `nack.wav` (a short falling tone) and, if the setting is on, say "Not available now" with the voice of the actor 2. The readback line `CMD.<code>` comes from the mission after the click (result 1 only), so the tone and the line complement each other: tone immediately, words 0.8 s later.
6. **Options (all in the profile presets, as the other persistent options).** PTT sounds on/off; press sound; release sound; squelch on/off; sidetone on/off and volume; acknowledgement tones on/off; acknowledgement tone for refused commands on/off. Defaults: press click, squelch on, sidetone off, tones on.

## Why

The user speaks commands to the helicopter and had no feedback that the system heard them. The tone confirms the press, the squelch confirms the end of the transmission, the tone and the readback confirm that the button was pressed, the sidetone lets the user hear what the microphone picks up.

## Checks

- With the sim closed or the battery off: no sound at all.
- Press and hold the PTT for 2 s: press sound, optional sidetone, squelch at the release, no double sound with the double beep of a message.
- Refused command (for example hoist up with the cable not out): `nack.wav`, no readback.
- Accepted command: `ack.wav`, then the line of the copilot.
