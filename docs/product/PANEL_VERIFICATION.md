# Panel verification

Verified in the running application at `http://127.0.0.1:5176` with the Codex browser on 2026-09-13. These are observed UI results, not field measurements. No screenshot files were saved.

## Disaster Lab

- The hill scenario initially reached 0% of stations. Its direct link had no supported path, with the numeric margin explicitly marked hypothetical. Adding a central relay and pressing SEND IT reached 100%; the two relay hops each displayed 59.3 dB margin. The report identified two bridge links and low redundancy.
- Selecting the video requirement returned coverage to 0%. The relay hops retained their positive RF margins but displayed WRONG FORMAT, separating RF reach from message capability.
- The power-outage scenario reached 100%, while displaying approximately 30 minutes of endurance and 77.8 W average consumption per node. The energy warning remained visible despite successful RF coverage.
- The emergency-network scenario initially reached 3 of 4 stations. Adding a central relay reached 5 of 5, including the previously isolated medical station. One bridge remained in the resulting network.
- The 3D network rendered visibly. Selecting relay placement and clicking the ground added a station at the selected location and generated candidate links. The accessible 2D map was also available.
- Opening a link from the network launched the detailed single-link lab.

## Advanced workbench

- The dummy-load impedance preset displayed SWR 1.00:1 with 2% radiation efficiency, demonstrating why a good match does not imply a useful radiator.
- The reactive preset displayed the calculated complex reflection coefficient, approximately 0.376 + j0.665, alongside its position on the reflection plane.
- With ideal additional receiver gain set to 100 dB, input and output SNR remained 78.3 dB. Output signal reached 50.3 dBm; overload headroom was −60.3 dB. The UI labeled the linear result hypothetical under overload.
- The analytical antenna radiation shape rendered in 3D. Its teaching approximation and separation from custom-wire solving were visible.
- Adding point P4 and connecting P1 to P4 created W3. Reloading and reopening the wire editor retained both the point and segment.

## Wire file checks

The subsequent import addition was checked with `bun run test packages/visualization/wireGeometry.test.ts`: 21 tests passed. `bun run typecheck` also passed. The tests cover a portable-file round trip, isolated returned data, schema version and model markers, coordinate and dimension bounds, unique IDs and connections, endpoint references, feedpoint validity, invalid numeric values, unsupported fields, and the file-size limit.

The editor imports and exports `.bigsignal-wire.json`. Reference frequency is stored with the drawing; import does not change the radio link.

A follow-up native Chrome check on the development origin exported the starter drawing through the browser save dialog. The downloaded file was 597 bytes. The coordinating agent then checked that same file in the production browser at `http://localhost:4181`: after adding P4, importing the export reported 3 points and 2 wires and removed P4; Undo import restored P4. Selecting an experiment file in the wire picker produced an unsupported-field error and retained P4. Thus the successful import, recovery, and invalid-file preservation paths were exercised in the running app.

## Notebook and teacher recovery

Follow-up checks used a dedicated native Chrome tab at `http://127.0.0.1:5176/?qa=panels-final`.

- Saving a test experiment named “Panel QA notebook” created a notebook card at 145 MHz using FM voice. Remove produced an empty notebook and an Undo removal control. Undo restored the same named card and configuration summary.
- Renaming a teacher draft to “Panel QA persistent teacher draft,” navigating to Lab, and returning to Teacher Tools retained the title. A full browser reload followed by reopening Teacher Tools also retained the title and displayed the draft-saved notice.

Only test entries created in that browser workflow were changed. The restored notebook entry and teacher draft were retained afterward.

## Evidence boundaries

The browser accessibility tree included fallback canvas text even when screenshots showed functioning WebGL. That text was not evidence of a rendering failure. Both the network and radiation views were visually inspected successfully.

No browser console errors were returned during the panel pass, and the inspected desktop document width matched its 1280-pixel viewport. Responsive and offline checks are recorded separately in [product verification](VERIFICATION.md). No frame-rate benchmark or custom-wire electromagnetic solve is claimed.
