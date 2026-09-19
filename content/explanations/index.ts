export const explanations: Record<string, { beginner: string; intermediate: string; advanced: string }> = {
  "terrain-obstruction": {
    intermediate: 'The obstruction adds modeled diffraction loss to the link budget. Compare its geometry before spending more transmitter power.',
    beginner: "The ridge blocks part of the signal’s route. Raising an antenna or moving clear of the ridge can help more than adding power.",
    advanced: "The engine applies a single knife-edge diffraction approximation to the configured obstruction, including effective-Earth curvature. The improvement estimates rerun candidate changes against this scenario.",
  },
  "fresnel-obstruction": {
    intermediate: 'A clear centerline can still have insufficient first Fresnel-zone clearance. The nearby edge changes how wave contributions combine.',
    beginner: "The direct line clears the ridge, but the signal needs space around that line too. More clearance can reduce the remaining loss.",
    advanced: "The obstruction intrudes on the first Fresnel zone despite lying below the direct ray. The knife-edge parameter still produces nonzero diffraction loss.",
  },
  "antenna-height": {
    intermediate: 'Raising antenna height changes clearance and the radio horizon. The suggestion estimates both low antennas at 15 m; your own experiment may change only one.',
    beginner: "Height changes the geometry. Raising low antennas can clear the ridge and extend the modeled radio horizon.",
    advanced: "This estimate raises both antennas below 15 m to 15 m and recalculates effective-Earth horizon and knife-edge loss. The height buttons change the transmitter only.",
  },
  "line-of-sight": {
    intermediate: 'The simplified terrestrial model finds a supported direct route. Received power still falls with distance and equipment losses.',
    beginner: "The modeled route is clear. The engine still accounts for distance, antenna gains, cable losses, and receiver noise.",
    advanced: "The link is within the effective-Earth radio horizon and has no modeled knife-edge excess loss. This simplified model excludes multipath, foliage, and weather.",
  },
  "beyond-radio-horizon": {
    intermediate: 'Antenna heights and effective Earth curvature set the modeled direct horizon. No alternate smooth-Earth or scattered route is calculated.',
    beginner: "Earth’s curvature puts the receiver beyond the modeled radio horizon. A positive hypothetical signal budget cannot make this route available.",
    advanced: "The surface distance exceeds the sum of the effective-Earth antenna horizons. Smooth-Earth diffraction and troposcatter are outside this model, so no usable route is returned.",
  },
  "free-space-reference": {
    intermediate: 'Free-space loss isolates wave spreading between antenna tips. Terrain blockage and Earth obstruction are deliberately excluded from this reference.',
    beginner: "This reference assumes empty space between the antennas. It ignores Earth and terrain blockage.",
    advanced: "Free-space spreading uses the antenna-to-antenna chord distance. A chord through Earth is only a calculation reference, not a realizable terrestrial link.",
  },
  "hf-skywave": {
    intermediate: 'The selected HF frequency supports a returning route in the effective-layer model. Its hop count, absorption, and time assumptions appear in MATH.',
    beginner: "The modeled ionosphere returns your HF signal toward Earth. Frequency and time determine whether this route can work.",
    advanced: "A single effective ionospheric shell provides equal-spaced hops. A secant-law MUF, synthetic local daylight, absorption, and ground-reflection losses determine this educational route.",
  },
  "hf-above-muf": {
    intermediate: 'The path-specific modeled MUF is below the operating frequency. Lowering frequency can restore a route; increasing power cannot change this condition.',
    beginner: "This frequency is above the modeled maximum usable frequency. The ray escapes instead of returning to the receiver. Try a lower frequency.",
    advanced: "The operating frequency exceeds the shell model’s MUF. The engine marks propagation unavailable and returns an escaping ray; the displayed link budget is hypothetical.",
  },
  "hf-hop-limit": {
    intermediate: 'The required route exceeds the configured number of allowed hops. A numerical margin is insufficient without a supported path.',
    beginner: "Reaching the receiver would need more skywave hops than this model allows. There is no supported route for this setup.",
    advanced: "The required equal-spaced hop count exceeds the configured maxHops limit. The engine returns no propagation path and forces failed status.",
  },
  "hf-absorption": {
    intermediate: 'Lower HF frequencies can suffer greater modeled absorption. Compare that loss with the upper usable-frequency limit rather than assuming lower is always better.',
    beginner: "The modeled ionosphere absorbs substantial signal energy at this frequency. A somewhat higher frequency may help, provided it stays below the usable limit.",
    advanced: "Configured absorption varies with synthetic local daylight, scales with the inverse square of frequency, and accumulates per hop. This is an educational approximation, not a forecast.",
  },
  "hf-frequency": {
    intermediate: 'This candidate chooses a frequency below the modeled MUF. Its first benefit may be restoring an available path, not merely adding dB.',
    beginner: "Try a frequency below the modeled usable limit. Restoring a returning route matters before adding transmitter power.",
    advanced: "The candidate uses 80% of the modeled MUF, clamped to the supported 1–30 MHz range. Restoring an unavailable route is a constraint repair rather than a finite dB improvement.",
  },
  "more-power": {
    intermediate: 'A tenfold power increase gives 10 dB more received power on the same available route. Compare that benefit with energy use and other constraints.',
    beginner: "Ten times the transmitter power adds 10 dB to an available link. It does not remove an obstruction or create a missing propagation route.",
    advanced: "The engine compares a tenfold transmitter-power increase, capped at its model limit, against the current link margin. It suppresses this suggestion when a missing route or invalid bandwidth must be repaired first.",
  },
  "feedline-loss": {
    intermediate: 'Feedlines attenuate the wanted signal. At the receiver they also attenuate incoming antenna noise and add thermal noise, so margin benefit depends on the noise balance.',
    beginner: "Some signal is lost in the cables. Better feedlines can help, though receiver cable changes also affect the noise reaching the radio.",
    advanced: "The candidate removes both feedline losses and recalculates received power and equivalent receiver-input noise temperature. Its benefit is the resulting link-margin change.",
  },
  "polarization-mismatch": {
    intermediate: 'The link uses a simplified polarization loss. Matched linear polarization avoids the modeled crossed-antenna penalty; real reflections can alter polarization.',
    beginner: "The antenna polarizations do not match. Aligning them can recover signal without increasing power.",
    advanced: "For terrestrial links the engine applies a 30 dB educational cap to crossed linear polarizations and about 3 dB to linear/circular mismatch. HF polarization rotation is not resolved.",
  },
  "bandwidth-too-narrow": {
    intermediate: 'The selected filter is narrower than the mode requires. Noise may look lower, but truncating the wanted signal makes this configuration unsupported.',
    beginner: "The receiver bandwidth is too narrow for this mode. Use the suggested bandwidth so the receiver can admit the signal.",
    advanced: "Bandwidth falls below the mode’s minimum. The engine forces failed status because signal truncation is not modeled numerically; restoring sufficient bandwidth is a constraint repair.",
  },
  "link-failed": {
    intermediate: 'Check path availability, minimum mode bandwidth, and margin. A failure can be a missing route or unsupported filter, not only insufficient power.',
    beginner: "This setup does not meet the model’s requirements. Inspect the suggested changes and try another experiment.",
    advanced: "Failure means the link margin is negative, the route is unavailable, or the bandwidth is below the mode minimum. A positive hypothetical margin alone does not guarantee a usable path.",
  },
  "link-marginal": {
    intermediate: 'The link has nonnegative margin but less than 6 dB headroom above its educational threshold. Real fading can consume that headroom.',
    beginner: "The model predicts a working link with little headroom. Try improving the setup to make it less fragile.",
    advanced: "The route and bandwidth are supported and the modeled link margin is at least 0 dB but below 6 dB. Fading and real receiver implementation losses are not resolved.",
  },
  "link-good": {
    intermediate: 'The supported route has at least 6 dB margin above the mode threshold. Investigate whether you can meet the same requirement with less power or fewer dependencies.',
    beginner: "The signal meets the model’s requirements with some headroom. Try reducing power or changing the setup to find its limits.",
    advanced: "The route and bandwidth are supported and the modeled link margin is at least 6 dB. This educational result is not a field measurement or an operational guarantee.",
  },
  "fantasy-physics": {
    beginner: "FANTASY PHYSICS. This experiment changes the rules of nature. Compare it with the real-physics version before drawing real-world conclusions.",
    intermediate: "One or more model assumptions can be changed in this universe. Inspect the active switches and compare identical scenarios under real physics.",
    advanced: "Fantasy overrides can remove free-space spreading, flatten terrestrial effective-Earth geometry, remove the HF ionosphere, or rescale wave speed. Read warnings for model-specific effects. These are counterfactual calculations, not realizable systems.",
  },
  "fantasy-no-ionosphere": {
    beginner: "You removed the ionosphere. This HF skywave route has nothing to return it toward Earth.",
    intermediate: "With the ionosphere removed, the HF skywave model has no supported route. More transmitter power cannot restore the deleted propagation mechanism.",
    advanced: "The fantasy override marks the HF skywave path unavailable. Direct terrestrial HF and ground wave are not substituted for the removed layer.",
  },
};
