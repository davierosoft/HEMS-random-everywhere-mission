106 - Updates: mission version "0.997 170.08" shown as "170.8"; compare the build parts as integers

Repository: KeKKERUUU/RandomEverywhereInstaller (posted)

## Report

billy5bellys (Discord screenshot, 2026-11-04): the Updates window shows the mission release `0.997 170.08` as `0.997 170.8`. The build part is read as a decimal number and the zero is lost.

## Why it matters

Release numbers are "major.minor" with two digits in the second part (170.01 ... 170.09, 170.10 ...). Compared as a decimal number, 170.10 (= 170.1) is lower than 170.08 (= 170.8), so the Companion would treat the next release as older and never offer it.

## Request for the app

- Read the parts of a release as integers (`0.997 170.08` -> 0, 997, 170, 8; `170.10` -> 170, 10) and compare them part by part.
- Show the release exactly as published (`0.997 170.08`), never reformatted from a number.
- Add tests: 170.08 < 170.09 < 170.10 < 171.00, and a trial suffix when the build has one.
- Second point of the same screenshot: "The program update could not be checked" appears next to "Program v1.2.51 Not checked". The program update check needs its own message when the connection is the cause (offline, rate limit, host unreachable), distinct from the mission check.

## Done when

The Updates window shows the published release text and offers 170.10 after 170.08.
