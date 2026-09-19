# What the current simulator models

The backend implements the required educational model in the hackathon plan. It is not a comprehensive radio-planning model. A green result means that the configured simplified model passes its threshold, not that a real link is guaranteed.

## Implemented

| Factor | Current treatment |
| --- | --- |
| Distance and frequency | Free-space spreading along the modeled ray length |
| Earth curvature | Spherical globe and effective-Earth radio horizon |
| One terrain obstruction | Knife-edge diffraction and first Fresnel-zone clearance |
| Antennas | Supplied scalar gain, height, and simplified polarization mismatch |
| Feedlines | Supplied loss, receive-noise attenuation, and cable thermal emission |
| Receiver noise | Antenna temperature, configured external noise, and receiver noise figure |
| Communication modes | Approximate FM, SSB, CW, and FT8 thresholds with explicit bandwidth references |
| Ionospheric propagation | One effective spherical shell, secant-law MUF, equal-spaced hops, ground reflection loss |
| Time and HF absorption | Synthetic midpoint-local day/night interpolation and inverse-square frequency absorption |

The HF presets make the distinction visible. `hf-day` returns a ray to RX, `hf-above-muf` lets it escape, `hf-night` changes the usable frequency range, and `hf-absorption` fails despite an available path.

## Important omissions

| Missing factor | Consequence |
| --- | --- |
| Building footprints and heights | No automatic detection of a blocked building path |
| Wall and window materials | No indoor/outdoor penetration estimate |
| Urban multipath and reflections | No street-canyon routing, phase interference, or fading |
| Multiple terrain obstacles and terrain datasets | A single ridge cannot represent a full route |
| Foliage, rain, and atmospheric gas attenuation | Microwave and vegetated routes may be optimistic |
| Antenna pattern, orientation, impedance, and resonance | A dish pointed away still receives its configured scalar gain |
| Separate D, E, F1, and F2 regions | No layer competition, sporadic E, or detailed ray refraction |
| Solar cycle, season, geomagnetic activity, and solar flares | No real-world HF forecast or blackout prediction |
| Spatially varying ionosphere and ground conductivity | No location-specific ionospheric profile or ground-wave solver |
| Interfering transmitters and decoder behavior | An SNR threshold does not simulate contention, modulation, or decoding |

A configured knife edge can approximate diffraction over a rooftop, but that does not model transmission through the building. Do not silently substitute wall loss for diffraction or sum both without defining which path the receiver uses.

## Next model increments

1. Represent buildings explicitly, with a declared path classification such as obstructed outdoor or building entry. Add height/position geometry and test clear, grazing, blocked, indoor, and outdoor cases.
2. Select a documented building-entry model within its valid frequency range. Expose uncertainty and material/building-class assumptions. Do not invent a universal concrete-wall loss.
3. Add multiple-obstacle terrain treatment and directional antenna patterns.
4. Expand HF inputs to actual layer/environment data or a validated HF prediction method. Preserve the current deterministic shell model as an explicitly labeled teaching mode.

These are pending extensions. No building or space-weather input has been added to the shared contract in this change. Coordinate those additions with Computer B and the integration agent.

## Reference starting points

[ITU-R P.2109-2](https://www.itu.int/dms_pubrec/itu-r/rec/p/R-REC-P.2109-2-202308-I%21%21PDF-E.pdf) addresses building entry loss. [ITU-R P.1411](https://www.itu.int/dms_pubrec/itu-r/rec/p/R-REC-P.1411-10-201908-S%21%21PDF-E.pdf) describes short-range outdoor propagation, including urban environments. These are distinct problems.

The [Australian SWS HF introduction](https://sws.bom.gov.au/Educational/5/2/2) describes ionospheric layers, daily and solar-cycle variation, absorption, and sporadic E. Those effects exceed the current single-shell approximation.
