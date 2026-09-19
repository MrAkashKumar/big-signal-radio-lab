# Hospitals across Aceh and North Sumatra

The level covers December 2004 through January 2005. It maps the hospital radio sites named in the operational accounts, plus their coordination hubs. It is not an exhaustive census of damaged hospitals. A receiving hospital is not necessarily a damaged hospital.

## Evidence model

`hospital-network.ts` separates hospital, emergency-hospital and coordination nodes. It distinguishes reported radio contacts from a patient-transfer connection. Stations without established individual contacts remain visible without invented connecting lines.

The primary network source is [Wyn Purwinto's ORARI contributor account](https://www.qsl.net/ab2qv/ares-tsunami.htm), with a separate [April 2005 ORARI bulletin](https://ftp.unpad.ac.id/orari/orari-diklat/BeON/beon0411.pdf) supporting Cut Meutia's hospital base and communications with Medan. Callsign spellings follow those accounts. The first account inconsistently reuses YB6ZAK elsewhere; the level uses it only for the documented Meulaboh hospital station.

The Melati–Adam Malik line represents reported patient movement. It is not evidence of an uninterrupted direct radio circuit between those hospitals. Medan's Polonia net-control station and the Banda-area airbase/coastal stations are not hospital buildings.

## Radio techniques

Sources establish HF operation, local VHF coordination, repeaters and human message handling. They do not establish exact modulation settings, transmitter wattages or a surveyed repeater chain for every depicted contact. The simulation uses SSB for HF and FM for VHF as disclosed assumptions. The controls do not replay historical measurements.

[JS8Call's official history](https://js8call.com/JS8Call-improved/d6/d14/md_docs_2user__guide_2JS8Call__User__Guide.html) dates initial development releases to July 2018 and public version 1.0 to April 2019. It was unavailable in 2004–2005. FT8 controls are also modern educational comparisons.

## Geography and local detail

The regional coastline uses the existing bundled Natural Earth geometry. Some pins represent towns or broad areas because the source does not establish a 2005 street address. Nias is an island-level marker with an unspecified hospital identity. Modern coordinates locate known permanent hospitals where available; they do not verify unchanged building footprints since 2005.

[Indonesia's Ministry of Health](https://ditmutunakes.kemkes.go.id/index.php/detail-institusi/rsup-h-adam-malik/4d54417a) supplies the modern Adam Malik reference. [OpenStreetMap node 9791489808](https://www.openstreetmap.org/node/9791489808) locates modern Melati. Local terrain snapshots have their own source metadata and attribution. Streets and footprints from those snapshots are modern reference data, not historical reconstruction. Building heights and the flat ground plane are display assumptions, not surveyed elevation data.

The small globe illustrates rounded great-circle distance. The drawn geographic arc is not a road, an evacuation flight record or a simulated RF ray. Radio-path geometry comes only from the RF engine. Local building geometry does not currently enter the engine's terrain model.

## Human significance

[VOA's tsunami family-contact report](https://www.voanews.com/a/a-13-2005-01-05-voa24-66363817/546509.html) describes Sanchita Saha learning through amateur operators that her husband was alive in a Port Blair camp. This is an Indian example from the wider disaster. It supports restored contact, not a documented physical reunion at an Indonesian hospital.

The sample message is fictional. Successful simulation means a voice-capable path and its return path are available under the model. It does not establish delivery of supplies, patient transport or physical reunion. Return checks assume equal transmit power and receiver bandwidth/noise figure at both ends.

## Audience demo

The main experience is one family-contact request from Meulaboh to Medan. Its radio has a fixed dipole and two reported HF channels, 7.055 and 7.060 MHz. Low/high power represents assumed 5 W and 50 W settings, not a recovered equipment specification. The engine evaluates the outgoing voice link and acknowledgement before the interface reports a reply. Both settings can succeed; the demo does not invent failure to force a puzzle.

The message is explicitly illustrative. A reply from the next operator enables onward family tracing; it is not proof that relatives have received the message or reunited. Technical assumptions and source material are under a single optional disclosure. The full learning levels retain broader radio experimentation.

## Verification route

1. Open When Phones Fail on integration. The main flow should contain the map, one message, fixed equipment, two channels, two power settings and one send action.
2. Send the message. Controls should be disabled during the brief transmission, then a reply should appear only for a usable two-way voice result.
3. Change channel or power after a reply. The previous acknowledgement should clear. Restarting or leaving the page must cancel pending transmission timers.
4. Open the distance inset and local hospital surroundings. Close zoom should remain available; modern geography must remain labelled.
5. Expand the optional real-story section and verify historical attribution and links to the original learning levels.
6. Test the focused demo on desktop and a narrow viewport. Run the four channel/power combinations through the engine and the full test suite.
