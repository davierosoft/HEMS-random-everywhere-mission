101 - Voice pack key missing in the translated pack: skip minor messages, read major ones with an English voice

Repository: KeKKERUUU/RandomEverywhereInstaller (posted)

## Problem

A tester (kingle, Discord 2026-11-08 and 2026-11-09, Companion 1.2.64) with the German pack at version 24 heard whole spoken sequences in English read by a German voice, pronounced the German way and not understandable. In the Companion log the tips `TIP.KIT.1` to `TIP.KIT.3` are logged as "option 2 of 6 (DE v24)" but the text is the English one: the keys did not exist in DE 24 (they arrived in DE 28), so the app falls back to the English base text and speaks it with the German Piper voice (thorsten, karlsson).

The app already fetches the newest packs; the old pack is the tester's. The defect is the fallback: an English text must never be spoken by a non-English voice.

## Request for the app

When a key is missing in the selected translated pack, decide by message class:

1. Minor information (tips, chatter, optional comments): not spoken at all.
2. Major information (dispatch, medical, safety, anything the pilot needs to act on): spoken, but with an English voice (the English voice of the same actor), never with the voice of the selected language.

Needs: a class for every key (for example by key prefix: `TIP.*`, chatter and crew talk are minor; `DSC.*`, `AMB.*`, `HCL.*` hoist, warnings and failures are major; the mission can supply an explicit class in the pack header if a prefix is not enough). The Companion log must say when a key was skipped or read in English because it is missing, with the pack and its version. The pack update page should warn when the installed pack is older than the base pack it translates (`basever`).
