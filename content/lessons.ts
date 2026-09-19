import type { Scenario } from "../packages/contracts";
import type { Lesson, Question } from "../packages/missions/product";
import { loadExampleScenario } from "../packages/simulation/examples/scenarios";

const q = (
  question: string,
  choices: Question["choices"],
  correctIndex: number,
  explanation: string,
): Question => ({ question, choices, correctIndex, explanation });
type AuthoredLesson = Omit<Lesson, "number" | "prerequisites">;
const beginner: AuthoredLesson[] = [
  {
    id: "what-is-radio",
    title: "What even is radio?",
    tier: "beginner",
    minutes: 4,
    objective:
      "Identify the transmitter, receiver, and antennas in a link that works without a connecting wire.",
    scenarioBrief:
      "The school supply desk must tell the shelter that blankets are ready. Their Internet is down, but both radio stations have power.",
    concepts: [
      "transmitter",
      "receiver",
      "antenna",
      "frequency",
      "electromagnetic waves",
    ],
    prediction: q(
      "Can these stations exchange a radio message without Internet?",
      [
        "Yes, if their radios and radio path support the link.",
        "No, every radio message needs an Internet server.",
        "Only if there is a wire between the antennas.",
      ],
      0,
      "A direct radio link carries information through electromagnetic waves. The endpoints still need compatible equipment and a usable path.",
    ),
    experiment: [
      "Find the transmitter, marked TX, and receiver, marked RX.",
      "Press SEND IT. Follow the path and read the result.",
      "Reduce power once and send again. Notice that the message route remains the same.",
    ],
    observation:
      "A successful result means this simplified link has a usable path and enough signal relative to the mode requirement.",
    explanation:
      "The transmitter puts information onto an electrical radio-frequency signal. Its antenna couples that signal into electromagnetic waves. A receiving antenna picks up a small part of the arriving wave, and the receiver recovers information. Frequency describes how often the wave oscillates each second. No Internet cable is part of this direct route.",
    misconception:
      "A radio needs no connecting wire between stations. It still needs an antenna, power, a receiver that listens on the right frequency, and a useful propagation path.",
    transfer: q(
      "A storm cuts a town’s fiber connection. What can a direct radio link still do?",
      [
        "Restore every website automatically.",
        "Carry an agreed message between compatible local stations.",
        "Operate forever without batteries.",
      ],
      1,
      "Radio can provide an independent route for an essential message. It does not automatically replace every service the Internet provided.",
    ),
    controls: ["power"],
    scenarioId: "clear",
    simulationStatus: "modeled",
  },
  {
    id: "bigger-signal",
    title: "Bigger signal",
    tier: "beginner",
    minutes: 4,
    objective:
      "Compare transmitter power and explain why extra watts can help without fixing every cause of failure.",
    scenarioBrief:
      "Two field stations have a clear path. Your transmitter has four settings, including one that would make its battery nervous.",
    concepts: ["transmitter power", "watts", "received power"],
    prediction: q(
      "What changes when you raise transmitter power on an otherwise identical link?",
      [
        "The hill becomes shorter.",
        "More signal power reaches the receiver.",
        "Radio waves travel faster.",
      ],
      1,
      "More transmitter power increases received power when all path and equipment conditions remain fixed.",
    ),
    experiment: [
      "Send at 0.1 W, then 1 W. Compare received power.",
      "Repeat at 10 W and 100 W while leaving every other setting unchanged.",
      "Choose the lowest power that still gives a comfortable result.",
    ],
    observation:
      "Each tenfold increase adds the same step to received power on the logarithmic scale. The path geometry does not change.",
    explanation:
      "Power is the rate at which energy is sent. A stronger transmission can lift a signal above noise, but it cannot move an obstacle or create a returning skywave path. B I G S I G N A L appreciates your enthusiasm. Your battery would like a word.",
    misconception:
      "Ten times more power does not mean ten times more range. Wave spreading, terrain, receiver limits, and the communication mode all matter.",
    transfer: q(
      "You already have a strong link but need longer battery endurance. Which experiment is sensible?",
      [
        "Increase to maximum power.",
        "Reduce power and verify the link still works.",
        "Change the clock to make electricity last longer.",
      ],
      1,
      "Test the lowest power that meets the communication requirement with useful margin. A successful first message is only one design constraint.",
    ),
    controls: ["power"],
    scenarioId: "clear",
    simulationStatus: "modeled",
  },
  {
    id: "distance-is-rude",
    title: "Distance is rude",
    tier: "beginner",
    minutes: 4,
    objective:
      "Explain why the same transmitter is harder to receive at greater distance in free space.",
    scenarioBrief:
      "Your remote team keeps walking away. Apparently this is part of the experiment.",
    concepts: ["distance", "free-space path loss", "wave spreading"],
    prediction: q(
      "What happens to received power when you double the distance in free space?",
      ["It gets stronger.", "It stays exactly the same.", "It gets weaker."],
      2,
      "The wave spreads across a larger area, so the receiving antenna captures less power.",
    ),
    experiment: [
      "Send with the receiver nearby and note received power.",
      "Set RX longitude to 0.080 degrees, doubling the starting 0.040-degree separation. Keep other controls fixed.",
      "Set RX longitude to 0.160 degrees to double it again. Compare the size of each change.",
    ],
    observation:
      "Doubling distance reduces received power by about 6 dB in this free-space experiment. No terrain or horizon is included here.",
    explanation:
      "Imagine the same light spreading over a larger wall. Each small patch receives less. Radio power spreads too. An antenna far away collects only a tiny part of the expanding wave. Later you can inspect the free-space path-loss equation; the useful first idea is spreading.",
    misconception:
      "The wave does not run out at a sharp universal distance. Usability depends on received signal, noise, mode, and propagation conditions.",
    transfer: q(
      "A similar station is twice as far away over an unobstructed ideal path. What should you expect?",
      [
        "Less received power even though the transmitter is unchanged.",
        "The same received power because the battery is unchanged.",
        "Exactly twice the received power.",
      ],
      0,
      "Distance changes how much of the transmitted wave the receiving antenna captures.",
    ),
    controls: ["distance", "power"],
    scenarioId: "clear",
    simulationStatus: "modeled",
  },
  {
    id: "antenna-sticks",
    title: "Antennas are not magic sticks",
    tier: "beginner",
    minutes: 6,
    objective:
      "Compare antenna gain and polarization, and describe the tradeoff between directionality and coverage.",
    scenarioBrief:
      "Choose equipment for a supply desk that always talks to one shelter, then consider a roaming field team.",
    concepts: [
      "antenna",
      "gain",
      "directionality",
      "polarization",
      "radiation pattern",
    ],
    prediction: q(
      "How can a directional antenna help without increasing transmitter power?",
      [
        "It creates energy from nothing.",
        "It concentrates radiation toward useful directions.",
        "It changes every receiver into a transmitter.",
      ],
      1,
      "Gain describes radiation concentrated in a direction relative to a reference antenna. It is not free energy.",
    ),
    experiment: [
      "Compare Rubber duck, Dipole, and Yagi TX antenna presets with the same transmitter power.",
      "Read received power. Open the antenna workbench and compare its Vertical, Dipole, and Yagi pattern illustrations. Vertical is the broad-coverage comparison for the handheld preset.",
      "Compare matching and crossed polarization. Keep the selected antennas fixed for this comparison.",
    ],
    observation:
      "The link budget uses the configured gain toward the other station and a simplified polarization mismatch. The pattern drawing explains directionality but is not a solved radiation pattern.",
    explanation:
      "A flashlight concentrates light in a beam; a directional antenna concentrates radio energy. A narrow useful direction can help a fixed link but makes aiming more important. Polarization describes the orientation of the electric field. Matching the two antennas helps them couple energy.",
    misconception:
      "A high-gain antenna does not improve reception equally in every direction. Antenna type alone also does not guarantee a particular gain.",
    transfer: q(
      "A station must hear teams scattered all around it. What matters besides the largest gain number?",
      [
        "Whether its radiation pattern covers those directions.",
        "Whether its paint is brighter.",
        "Whether its cable is longer.",
      ],
      0,
      "Choose a pattern that serves the actual locations. A narrow beam may miss a roaming station.",
    ),
    controls: ["antenna", "polarization", "power"],
    scenarioId: "clear",
    simulationStatus: "modeled",
    modelNote:
      "Preset gains and pattern illustrations are educational. The base link engine does not solve antenna geometry, element currents, or aim-dependent gain.",
  },
  {
    id: "hill-exists",
    title: "The hill continues to exist",
    tier: "beginner",
    minutes: 5,
    objective:
      "Compare raising an antenna with increasing power on a terrain-obstructed VHF link.",
    scenarioBrief:
      "A field team is behind a ridge. Shouting at the landscape has not helped.",
    concepts: ["line of sight", "terrain", "antenna height", "diffraction"],
    prediction: q(
      "Which change might help more on a ridge-blocked path?",
      [
        "More power always wins.",
        "Raising an antenna can improve the geometry.",
        "Renaming the hill.",
      ],
      1,
      "Height can reduce obstruction loss. The best change depends on the path, so compare the two experiments.",
    ),
    experiment: [
      "Send the starting 5 W, 2 m setup.",
      "Try 50 W at the same height. Note the improvement.",
      "Restore 5 W and raise the transmitter antenna to 15 m. Compare against the starting result.",
    ],
    observation:
      "In this chosen ridge example, the height change improves the link more than ten times the power.",
    explanation:
      "VHF often benefits from a clear route between antennas. A ridge can obstruct that route and cause diffraction loss. Height changes which part of the ridge the wave must pass. Extra power increases the signal, but the hill continues to exist.",
    misconception:
      "Height does not always beat power. This experiment demonstrates a particular obstructed geometry, not a universal ranking.",
    transfer: q(
      "A nearby team is hidden by a ridge and power is limited. What should you investigate?",
      [
        "A better antenna position or a relay with paths to both sides.",
        "Only the largest transmitter available.",
        "Whether waves can be persuaded to ignore terrain.",
      ],
      0,
      "Changing geometry can restore clearance or create a route through a relay. Verify each proposed path.",
    ),
    controls: ["power", "height", "antenna"],
    scenarioId: "ridge",
    simulationStatus: "modeled",
  },
  {
    id: "noise-too",
    title: "You made the noise louder too",
    tier: "beginner",
    minutes: 6,
    objective:
      "Distinguish signal level from signal-to-noise ratio and explain what a narrower receiver filter changes.",
    scenarioBrief:
      "A weak signal sits in noise. Turning up a loudspeaker makes a very confident hiss.",
    concepts: ["signal", "noise", "SNR", "receiver gain", "bandwidth"],
    prediction: q(
      "An ideal amplifier raises the signal and existing noise equally. What happens to their ratio?",
      [
        "It improves automatically.",
        "It stays the same.",
        "The noise disappears.",
      ],
      1,
      "Equal amplification preserves the signal-to-noise ratio. A real amplifier can also add noise.",
    ),
    experiment: [
      "Send and compare the signal level with the noise floor.",
      "Open the receiver bench. Increase gain and compare the signal and noise together.",
      "Reduce receive bandwidth while keeping a supported mode and inspect the new SNR.",
      "Read required SNR as well as SNR. Notice that the threshold changes to the same bandwidth reference.",
    ],
    observation:
      "Narrower bandwidth collects less modeled noise and raises the displayed SNR. The mode threshold is normalized too, so bandwidth alone does not create free link margin. Filters below a mode’s minimum bandwidth cannot carry that mode.",
    explanation:
      "A receiver listens through a frequency window. A narrower window admits less noise, provided it still passes the wanted signal. Turning up a volume or gain control is a different operation. It raises what is already there. The receiver bench models a simple gain stage separately from the base link. Use it to compare gain, noise, and overload without confusing louder output with a better incoming signal.",
    misconception:
      "A bigger SNR number does not prove an improvement when the measurement bandwidth changed. Compare it with a threshold expressed in the same bandwidth.",
    transfer: q(
      "A narrow filter cuts off part of a voice signal. Has lower displayed noise guaranteed better communication?",
      [
        "Yes, lower noise always wins.",
        "No, the receiver must still pass the information-bearing signal.",
        "Yes, missing speech is reconstructed automatically.",
      ],
      1,
      "Noise reduction is useful only with a filter suited to the communication mode. The signal has bandwidth too.",
    ),
    controls: ["bandwidth", "mode", "noise"],
    scenarioId: "ridge",
    simulationStatus: "modeled",
    modelNote:
      "Noise bandwidth and mode thresholds are simulated. The separate receiver bench models gain and headroom; a complete multistage receiver is not solved.",
  },
  {
    id: "wrong-microwave",
    title: "Wrong microwave",
    tier: "beginner",
    minutes: 5,
    objective:
      "Recognize microwave radio and explain why directional links need clearance around the direct ray.",
    scenarioBrief:
      "That is a microwave oven. Wrong microwave. This experiment uses a 2.4 GHz radio link between buildings.",
    concepts: ["microwave", "beamwidth", "Fresnel zone", "obstruction"],
    prediction: q(
      "If the straight line between antennas just misses a roof, is that all the clearance you need?",
      [
        "Always.",
        "Only if the roof is painted white.",
        "No, nearby objects can enter the Fresnel zone.",
      ],
      2,
      "The useful wave region has width. An obstruction near the direct ray can cause diffraction loss even when a pencil-thin line looks clear.",
    ),
    experiment: [
      "Send the 2.4 GHz dish-antenna setup.",
      "Inspect the Fresnel-zone drawing around the direct ray.",
      "Raise the obstruction or lower the antennas and send again. Watch clearance and loss together.",
    ],
    observation:
      "The single-obstacle terrain model estimates diffraction as the obstruction approaches or crosses the path. The drawn Fresnel volume is a geometric aid.",
    explanation:
      "Microwave is a radio-frequency range, not a lunch setting. Short wavelengths make narrow beams practical with suitably sized antennas. A Fresnel zone marks a region where path differences matter to interference. Keeping useful clearance helps the link; good pointing and appropriate equipment matter too.",
    misconception:
      "A visible line between two rooftops is not the whole radio path. Also, this model does not include rain fading or real dish pointing errors.",
    transfer: q(
      "A tree grows near the middle of a rooftop microwave path. What should be rechecked?",
      [
        "Only transmitter paint.",
        "Fresnel clearance and the actual link margin.",
        "The Internet password.",
      ],
      1,
      "The tree may obstruct part of the wave region even before it crosses the centerline.",
    ),
    controls: ["height", "terrain", "antenna"],
    scenarioId: "microwave",
    simulationStatus: "modeled",
  },
  {
    id: "sky-bounce",
    title: "Bounce it off the sky",
    tier: "beginner",
    minutes: 6,
    objective:
      "Describe how HF skywave can connect distant stations and why frequency and time matter.",
    scenarioBrief:
      "Regional infrastructure is down. A station outside the affected area needs a short situation report.",
    concepts: ["HF", "ionosphere", "skywave", "day and night", "skip distance"],
    prediction: q(
      "Can some radio waves reach beyond the direct horizon without a tower every few kilometres?",
      [
        "Yes, HF can return through the ionosphere under suitable conditions.",
        "No, all radio travels only along the ground.",
        "Yes, every frequency always returns from the sky.",
      ],
      0,
      "The ionosphere can refract suitable HF signals back toward Earth, allowing communication beyond the direct horizon.",
    ),
    experiment: [
      "Send the HF example and trace the returned path across the globe.",
      "Compare 7 MHz and 14 MHz.",
      "Set Simulation time / UTC to September 13, 2026 at 23:20 instead of the starting 11:20. Send again and read path availability and margin.",
    ],
    observation:
      "The simplified ionosphere changes with modeled local day and night. A frequency that supports a returning path at one time may not at another.",
    explanation:
      "Sunlight ionizes part of the upper atmosphere. Its electron-density structure can bend suitable HF waves back toward Earth. The curved process is drawn as a simple hop here. Some distances and frequencies have no returning path, leaving a skip region. HF is useful when local infrastructure fails, but the sky becomes one of the system’s dependencies.",
    misconception:
      "The ionosphere is not a solid mirror, and a working HF link is not a guarantee for every place or time.",
    transfer: q(
      "Why should a regional emergency exercise try more than one HF frequency and time?",
      [
        "Because propagation conditions can change.",
        "Because watts stop being watts at night.",
        "Because HF always requires the Internet.",
      ],
      0,
      "A resilient plan has alternatives for changing ionospheric conditions and verifies them in practice.",
    ),
    controls: ["frequency", "time", "mode", "power"],
    scenarioId: "hf",
    simulationStatus: "modeled",
  },
  {
    id: "sky-declined",
    title: "The sky has stopped cooperating",
    tier: "beginner",
    minutes: 5,
    objective:
      "Distinguish a weak returning signal from a frequency that has no modeled returning skywave path.",
    scenarioBrief:
      "You raise the HF frequency. The ionosphere has declined your request.",
    concepts: ["MUF", "critical frequency", "path availability"],
    prediction: q(
      "Above the modeled maximum usable frequency, will much more power restore the same skywave path?",
      [
        "Yes, power forces the wave to return.",
        "No, power does not set the ionosphere’s refracting conditions.",
        "Only if you press SEND IT twice.",
      ],
      1,
      "MUF is a property of the path and ionosphere at the selected time. Increasing power does not restore that missing returning route.",
    ),
    experiment: [
      "Send the working 14 MHz daytime example.",
      "Increase to 30 MHz and inspect whether a skywave path returns.",
      "Try more power, then return to a lower frequency. Compare which change restores the path.",
    ],
    observation:
      "A hypothetical link-budget number can remain positive when propagationAvailable is false. Read the path status before trusting the margin.",
    explanation:
      "For this distance and ionosphere, there is a highest frequency supported by the simplified returning-path model. Above it, the wave does not return along that path. Real MUF varies over time and space. This deterministic lesson uses a simplified layer so you can isolate frequency from power.",
    misconception:
      "A positive calculated margin does not establish a link when the assumed propagation route does not exist.",
    transfer: q(
      "The display says no returning path but shows a positive hypothetical margin. Is the HF link usable?",
      [
        "Yes, the biggest number wins.",
        "No, it needs both an available path and a usable budget.",
        "Yes, confidence labels are decorative.",
      ],
      1,
      "A budget answers how strong a signal would be along its assumptions. Path availability tells you whether that modeled route exists.",
    ),
    controls: ["frequency", "power", "time"],
    scenarioId: "hf",
    simulationStatus: "modeled",
  },
  {
    id: "mode-matters",
    title: "Mode matters",
    tier: "beginner",
    minutes: 5,
    objective:
      "Choose a communication mode for the information needed and distinguish signal existence from message usability.",
    scenarioBrief:
      "A field station needs to send “team safe, water needed.” A live video stream can wait.",
    concepts: ["FM", "SSB", "CW", "FT8", "required SNR", "information rate"],
    prediction: q(
      "Must a signal that fails for voice also fail for every digital or coded mode?",
      [
        "Yes, all modes have the same requirements.",
        "No, modes trade information rate and decoding methods against required signal quality.",
        "No, digital modes need no signal at all.",
      ],
      1,
      "Different modes can carry different amounts and kinds of information at different usable signal levels.",
    ),
    experiment: [
      "Send the weak-signal setup with FM voice.",
      "Compare SSB, CW, and FT8 with each mode’s appropriate bandwidth.",
      "Inspect required SNR and link margin. Choose a mode that actually supports the message you need.",
    ],
    observation:
      "Each mode has an educational threshold. A mode can have usable margin when another fails, but their payloads and timing are not interchangeable.",
    explanation:
      "Voice, Morse, and structured weak-signal digital messages use signals differently. FT8 demonstrates that a small structured message can be decoded under conditions unsuitable for ordinary voice. It is not a general-purpose emergency chat or live-video format. Thresholds depend on equipment, interference, timing, operator skill, and decoding criteria.",
    misconception:
      "Digital is not a magic mode that works with zero signal. A green link indicator also does not prove that a mode can carry your intended information.",
    transfer: q(
      "A narrow HF link supports short coded messages. Does that establish support for high-definition live video?",
      [
        "Yes, all data is the same.",
        "No, video has a much larger information-rate requirement.",
        "Yes, if the antenna is renamed.",
      ],
      1,
      "Match the system to the message. Link usability and application capacity are separate requirements.",
    ),
    controls: ["mode", "bandwidth", "power"],
    scenarioId: "ridge",
    simulationStatus: "modeled",
  },
];
const intermediate: AuthoredLesson[] = [
  {
    id: "db-intuition",
    title: "Decibels without the panic",
    tier: "intermediate",
    minutes: 5,
    objective:
      "Use dB to compare power ratios and distinguish dB, dBm, and dBi.",
    scenarioBrief:
      "Your antenna gains 3 dB, a cable loses 3 dB, and the transmitter claims 30 dBm. These numbers describe different things.",
    concepts: ["dB", "dBm", "dBi", "power ratio"],
    prediction: q(
      "Approximately what power change does +3 dB represent?",
      [
        "Twice the power.",
        "Three extra watts at every starting power.",
        "One thousand times the power.",
      ],
      0,
      "A 3.01 dB increase is twice the power. The dB value is a ratio, so its watt difference depends on the starting power.",
    ),
    experiment: [
      "Compare 1 W with 2 W and note the received-power difference.",
      "Compare 1 W with 10 W.",
      "Add 3 dB of feedline loss and inspect how it offsets about a doubling of transmitter power.",
    ],
    observation:
      "Power ratios become additions in dB. A 10 dB improvement at one point can be canceled by a 10 dB loss elsewhere.",
    explanation:
      "dB is a logarithmic ratio. dBm is power relative to 1 milliwatt, so 0 dBm is 1 mW and 30 dBm is 1 W. dBi describes antenna gain relative to an isotropic radiator in a specified direction. Gains and losses add in a link budget, but the labels still matter.",
    misconception:
      "3 dB is not 3 dBm. One is a ratio; the other is an absolute power level.",
    transfer: q(
      "You add 10 dB of transmitter power and also add 4 dB of cable loss. What is the net received-power change?",
      ["+14 dB.", "+6 dB.", "−6 dB."],
      1,
      "Add the gain and subtract the loss. The net improvement is 6 dB if the rest of the link stays fixed.",
    ),
    controls: ["power", "feedline"],
    scenarioId: "clear",
    simulationStatus: "modeled",
  },
  {
    id: "link-budget",
    title: "Follow every decibel",
    tier: "intermediate",
    minutes: 7,
    objective:
      "Trace transmitter power through both feedlines, antennas, propagation loss, noise, and mode threshold.",
    scenarioBrief:
      "A colleague says “the signal is weak.” You need to find where the power went.",
    concepts: [
      "link budget",
      "received power",
      "noise floor",
      "SNR",
      "link margin",
    ],
    prediction: q(
      "Which expression describes link margin?",
      [
        "Received power plus every loss.",
        "SNR minus the mode’s required SNR.",
        "Transmitter watts divided by antenna height.",
      ],
      1,
      "Link margin compares available SNR with the selected mode’s threshold using the same bandwidth reference.",
    ),
    experiment: [
      "Send and open MATH. Follow TX power, TX feedline, TX antenna, path loss, RX antenna, and RX feedline.",
      "Change RX cable loss from 1 to 3 dB and send again.",
      "Check that received power, SNR, and margin each fall by 2 dB in the supported linear budget.",
    ],
    observation:
      "The received-power chain and the noise chain are separate until SNR combines them. The margin then subtracts the mode threshold.",
    explanation:
      "Received power equals TX power minus TX feedline loss plus TX directional antenna gain minus propagation losses plus RX antenna gain minus RX feedline loss. SNR compares received signal with noise. Margin subtracts the required SNR. Read the assumptions and path availability alongside the arithmetic.",
    misconception:
      "The largest loss in the budget is not automatically the easiest place to improve. Free-space spreading can dominate while a small avoidable cable loss is the practical fix.",
    transfer: q(
      "SNR is 18 dB and the required SNR is 12 dB. What does the 6 dB margin mean?",
      [
        "Six watts are unused.",
        "There is 6 dB of headroom above the chosen educational threshold.",
        "The system has measured 100% uptime.",
      ],
      1,
      "Margin is modeled headroom. It is not an uptime measurement or a guarantee under fading.",
    ),
    controls: ["power", "antenna", "feedline", "noise", "mode"],
    scenarioId: "clear",
    simulationStatus: "modeled",
  },
  {
    id: "feedline",
    title: "Sad spaghetti coax",
    tier: "intermediate",
    minutes: 5,
    objective:
      "Explain how feedline attenuation reduces useful signal and why cable selection depends on frequency and length.",
    scenarioBrief:
      "The antenna is excellent. Its long lossy cable would like some credit for the disappointing result.",
    concepts: [
      "feedline",
      "attenuation",
      "cable length",
      "frequency dependence",
    ],
    prediction: q(
      "What does an additional 3 dB loss in the transmit cable do?",
      [
        "About halves the power delivered to the antenna.",
        "Doubles antenna gain.",
        "Moves the antenna closer to the receiver.",
      ],
      0,
      "A passive 3 dB attenuation leaves about half the power. It becomes heat rather than useful power at the antenna.",
    ),
    experiment: [
      "Send with 1 dB of transmit feedline loss.",
      "Try 3 dB and then 6 dB while keeping the radio path unchanged.",
      "Open the antenna workbench. Compare Cable length of 20 and 40 m with the same loss-per-length setting.",
      "Compare Frequency of 145 and 290 MHz, then use Apply cable to lab transmitter to test the analytical cable estimate in the link.",
    ],
    observation:
      "Each additional dB of entered feedline loss costs one dB of received signal in this budget. Cable length itself does not automatically derive loss in the base scenario model.",
    explanation:
      "Real cable attenuation depends on construction, frequency, length, connectors, and condition. Higher frequency and greater length generally increase attenuation for a given cable. Manufacturers publish loss per length at specified frequencies. The base engine takes an explicit loss value, so this experiment compares supplied losses rather than inventing a cable material model.",
    misconception:
      "Changing a cable length field alone does not prove a loss change unless a defined cable model calculates it. Always inspect the loss used in the budget.",
    transfer: q(
      "You move an antenna higher using a much longer cable. What tradeoff must you check?",
      [
        "Improved geometry versus additional feedline loss.",
        "Whether height changes the speed of light.",
        "Whether cable color increases watts.",
      ],
      0,
      "Height can improve clearance while a longer feedline loses more power. Compare the full system.",
    ),
    controls: ["feedline", "frequency", "height"],
    scenarioId: "clear",
    simulationStatus: "modeled",
    modelNote:
      "Feedline loss is an explicit input. A manufacturer-specific cable attenuation model is not included.",
  },
  {
    id: "polarization",
    title: "Same wave, wrong orientation",
    tier: "intermediate",
    minutes: 5,
    objective:
      "Compare matched and crossed polarization while recognizing that real reflections complicate ideal mismatch.",
    scenarioBrief:
      "Two identical handhelds have a clear path. One operator rotates their antenna sideways.",
    concepts: ["polarization", "mismatch", "multipath"],
    prediction: q(
      "What generally happens when ideal linear antennas change from aligned to perpendicular polarization?",
      ["Coupling improves.", "Coupling drops sharply.", "Frequency doubles."],
      1,
      "A receiving antenna responds to the electric-field component along its polarization. Ideal orthogonal linear polarizations have zero coupling.",
    ),
    experiment: [
      "Send with vertical polarization at both stations.",
      "Change one station to horizontal and compare the mismatch entry in MATH.",
      "Restore matching polarization, then inspect a circular-to-linear example if available.",
    ],
    observation:
      "The model uses finite educational mismatch losses, including a finite cap for crossed linear antennas. It cannot claim perfect isolation in real surroundings.",
    explanation:
      "For ideal linear polarization, power coupling follows the square of the cosine of the angular mismatch. Real antennas, scattering, and reflections often provide additional components, so a ninety-degree mismatch rarely gives perfect infinite isolation in the field. Circular and linear coupling has its own ideal loss and handedness constraints.",
    misconception:
      "Turning an antenna sideways is not a reliable universal way to block a signal. The environment can change polarization.",
    transfer: q(
      "A crossed-polarized link still receives a signal between buildings. Is that impossible?",
      [
        "Yes, the meter must be broken.",
        "No, reflections and nonideal antennas can change the arriving polarization.",
        "Only if there is no noise.",
      ],
      1,
      "The ideal polarization model is a reference. Real environments can mix polarization components.",
    ),
    controls: ["polarization", "antenna"],
    scenarioId: "clear",
    simulationStatus: "modeled",
  },
  {
    id: "diffraction",
    title: "Radio around the edge",
    tier: "intermediate",
    minutes: 6,
    objective:
      "Relate obstacle geometry to a single knife-edge diffraction estimate.",
    scenarioBrief:
      "The direct ray crosses a ridge, but a weaker signal can still arrive.",
    concepts: [
      "diffraction",
      "knife-edge",
      "obstruction",
      "model approximation",
    ],
    prediction: q(
      "Does blocking the direct ray always make received radio power exactly zero?",
      [
        "Yes, for every obstacle and frequency.",
        "No, diffraction and other mechanisms can still contribute.",
        "No, because obstacles create power.",
      ],
      1,
      "Wave diffraction can carry energy into a geometrical shadow. It usually adds loss and depends on geometry and wavelength.",
    ),
    experiment: [
      "Send the ridge example and inspect the diffraction calculation.",
      "Raise the transmitter antenna in steps and watch modeled obstruction loss.",
      "Restore TX height to 2 m. Set Ridge altitude to 2, 9, and 20 m in turn. Send each setup and compare the loss.",
    ],
    observation:
      "The knife-edge estimate changes with obstacle height, position, and wavelength. The terrain drawing exaggerates heights to make the geometry visible.",
    explanation:
      "Diffraction describes wave behavior near an edge. The single knife-edge model replaces complex terrain with one idealized obstruction and estimates its extra attenuation. It is useful for controlled comparisons. A rounded mountain, several ridges, buildings, foliage, and reflected paths can produce different results.",
    misconception:
      "A knife-edge calculation is not a full terrain survey or a city coverage prediction.",
    transfer: q(
      "A real path crosses three rounded ridges. Can this one-edge result be treated as a surveyed prediction?",
      [
        "Yes, all terrain has the same loss.",
        "No, the model omits the additional terrain geometry.",
        "Yes, if the display has enough decimal places.",
      ],
      1,
      "Model detail must match the question. More digits do not restore omitted physical mechanisms.",
    ),
    controls: ["terrain", "height", "frequency"],
    scenarioId: "ridge",
    simulationStatus: "modeled",
  },
  {
    id: "fresnel",
    title: "The path has a waistline",
    tier: "intermediate",
    minutes: 6,
    objective:
      "Use the first Fresnel zone to reason about clearance and compare its size at different frequencies.",
    scenarioBrief:
      "A roof almost touches the line between two antennas. Your ruler says clear. The wave disagrees.",
    concepts: ["Fresnel zone", "wavelength", "clearance", "diffraction"],
    prediction: q(
      "For fixed endpoints, what happens to first Fresnel-zone radius as frequency increases?",
      [
        "It becomes smaller.",
        "It becomes larger.",
        "It is independent of wavelength.",
      ],
      0,
      "First-zone radius is proportional to the square root of wavelength for fixed distances.",
    ),
    experiment: [
      "Inspect the Fresnel volume around the microwave path.",
      "Compare Frequency of 145 and 2400 MHz with the same geometry and entered gains. This isolates the frequency effect; it does not claim the same physical dish has equal gain at both frequencies.",
      "At 2400 MHz, raise Ridge altitude from 5 to 14 and then 20 m. Send each setup and compare calculated diffraction loss.",
    ],
    observation:
      "The zone is widest toward the middle of a simple path. A smaller Fresnel zone at higher frequency does not by itself guarantee a better link budget.",
    explanation:
      "The first Fresnel zone contains paths whose extra distance relative to the direct ray is up to half a wavelength. Obstructions alter how contributions combine at the receiver. Keeping roughly 60% of the first zone clear is a common planning guideline under suitable conditions, not a hard law covering every real path.",
    misconception:
      "Fresnel clearance and line of sight are related but different. Also, the 60% guideline is not a binary switch that makes every link work.",
    transfer: q(
      "The higher-frequency version has a smaller Fresnel zone. What else must be checked before choosing it?",
      [
        "Only the antenna name.",
        "The full budget, equipment, pointing, and propagation assumptions.",
        "Nothing; smaller always means better.",
      ],
      1,
      "Frequency affects multiple parts of a real system. A geometry improvement may come with other losses or constraints.",
    ),
    controls: ["frequency", "height", "terrain"],
    scenarioId: "microwave",
    simulationStatus: "modeled",
  },
  {
    id: "receiver-noise",
    title: "Bandwidth buys noise",
    tier: "intermediate",
    minutes: 6,
    objective:
      "Inspect kTB, noise figure, and consistent bandwidth references when comparing receiver SNR.",
    scenarioBrief:
      "You narrow a filter and the SNR number gets larger. Before celebrating, inspect the threshold beside it.",
    concepts: ["kTB", "bandwidth", "noise figure", "reference bandwidth"],
    prediction: q(
      "With flat noise density, what does doubling receiver bandwidth do to total noise power?",
      [
        "It halves it.",
        "It increases it by about 3 dB.",
        "It leaves it unchanged.",
      ],
      1,
      "Thermal noise power is proportional to bandwidth, so doubling bandwidth adds about 3.01 dB.",
    ),
    experiment: [
      "Use CW with a 500 Hz receiver bandwidth and send.",
      "Double bandwidth to 1000 Hz and compare noise and SNR.",
      "Inspect required SNR at both bandwidths. Then change Noise figure from 5 to 2 dB and compare that separate effect.",
    ],
    observation:
      "Bandwidth changes measured noise and SNR together with the normalized threshold. Improving noise figure reduces modeled receiver-added noise and can improve margin.",
    explanation:
      "Thermal noise follows kTB, where k is Boltzmann’s constant, T is temperature, and B is bandwidth. Near room temperature its density is about −174 dBm/Hz. Receiver noise figure describes degradation beyond an ideal reference receiver. This engine combines antenna noise temperature, receive-cable attenuation and thermal noise, and receiver-added noise. It does not solve an arbitrary cascade of receiver stages.",
    misconception:
      "Comparing SNR values from different bandwidths without normalizing the reference is misleading.",
    transfer: q(
      "Two reports use different noise bandwidths. What must you do before comparing their SNR thresholds?",
      [
        "Use the larger number.",
        "Convert them to a common bandwidth reference.",
        "Ignore bandwidth because dB is unitless.",
      ],
      1,
      "The underlying noise power depends on measurement bandwidth even though SNR itself is a ratio.",
    ),
    controls: ["bandwidth", "noise", "mode"],
    scenarioId: "clear",
    simulationStatus: "modeled",
  },
  {
    id: "system-design",
    title: "Build a link that earns its battery",
    tier: "intermediate",
    minutes: 8,
    objective:
      "Meet a link requirement under power and height constraints, then explain the design tradeoff.",
    scenarioBrief:
      "A field science team needs at least 10 dB modeled margin. You have no more than 5 W and a 15 m portable mast.",
    concepts: [
      "requirements",
      "link margin",
      "constraints",
      "tradeoffs",
      "resilience",
    ],
    prediction: q(
      "Can there be more than one valid engineering solution?",
      [
        "No, every problem has one best power setting.",
        "Yes, equipment, geometry, mode, and requirements create different tradeoffs.",
        "Only if the physics changes between learners.",
      ],
      1,
      "Several designs may satisfy the constraints. Explain which resources each uses and what weaknesses remain.",
    ),
    experiment: [
      "Send the ridge setup and identify its limiting factors.",
      "Meet at least 10 dB margin without exceeding 5 W or 15 m antenna height. Try antenna and mode changes too.",
      "Change one assumption, such as extra noise or lower available height, and retest your design.",
    ],
    observation:
      "A design passes only when its route exists, its modeled margin meets the requirement, and its equipment stays within the challenge constraints.",
    explanation:
      "Engineering starts with what information must move, between whom, and for how long. Link margin is one requirement. Battery life, setup access, allowed operation, and failure recovery matter too. A shelter’s short status report may need a different design from continuous voice. Record your assumptions so another team can reproduce the experiment.",
    misconception:
      "Maximum margin is not always the best design. Extra height, energy use, cost, and narrow coverage can make a loud link unsuitable.",
    transfer: q(
      "Your link meets the margin target but its only relay loses power after an hour. Is an overnight plan complete?",
      [
        "Yes, the link was green once.",
        "No, endurance at every required station is part of the requirement.",
        "Yes, relay energy is unrelated to communication.",
      ],
      1,
      "A complete system must continue operating for the required duration. Check dependencies along the entire route.",
    ),
    controls: ["power", "height", "antenna", "frequency", "mode", "noise"],
    scenarioId: "ridge",
    simulationStatus: "modeled",
  },
];
const advanced: AuthoredLesson[] = [
  {
    id: "impedance",
    title: "Resistance meets reactance",
    tier: "advanced",
    minutes: 7,
    objective:
      "Distinguish resistance and reactance in a complex antenna impedance.",
    scenarioBrief:
      "A feedpoint is described as 50 + j30 ohms. The imaginary part is not imaginary engineering.",
    concepts: ["impedance", "resistance", "reactance", "complex impedance"],
    prediction: q(
      "What does the +j30 part of 50 + j30 ohms describe?",
      [
        "Thirty extra watts of radiated power.",
        "Inductive reactance and a phase relationship.",
        "A negative resistance.",
      ],
      1,
      "Positive reactance is inductive under the usual convention. It represents reactive energy storage and phase, not a direct watt loss.",
    ),
    experiment: [
      "Send the baseline link and inspect the explicit antenna gain used in its budget.",
      "In Lab’s impedance bench, compare 50 + j0 ohms with 50 + j30 ohms using a 50-ohm reference.",
      "Compare the reflection coefficient, then restore reactance to zero. Keep the distinction between the bench and the link scenario clear.",
    ],
    observation:
      "The impedance bench derives reflection from supplied resistance, reactance, and reference impedance. The normal link scenario does not contain a feedpoint-impedance field.",
    explanation:
      "Complex impedance Z = R + jX relates sinusoidal voltage and current. Resistance can represent radiation or dissipation. Reactance describes energy exchanged with electric and magnetic fields. The bench assumes a passive load and a real positive reference impedance. It does not infer impedance from wire geometry.",
    misconception:
      "The real part of antenna impedance is not all heat loss. Radiation resistance represents power carried away as radiation.",
    transfer: q(
      "Two antennas each have 50 ohms resistance. One also has +j40 ohms reactance. Are they the same load to a 50-ohm line?",
      [
        "Yes, only the real part matters.",
        "No, reactance changes the reflection coefficient.",
        "Yes, unless their paint differs.",
      ],
      1,
      "A load match depends on the full complex impedance, not just resistance.",
    ),
    controls: ["antenna"],
    scenarioId: "clear",
    simulationStatus: "conceptual",
    modelNote:
      "Use the analytical impedance bench in Lab. Feedpoint impedance is not coupled automatically to the base link calculation.",
  },
  {
    id: "resonance",
    title: "Resonance is not a gold star",
    tier: "advanced",
    minutes: 6,
    objective:
      "Explain resonance and distinguish it from a match to a particular feedline.",
    scenarioBrief:
      "An antenna is resonant at 25 ohms. The cable expects 50 ohms. Both facts can be true.",
    concepts: ["resonance", "reactance", "antenna dimensions", "matching"],
    prediction: q(
      "Does zero reactance guarantee a perfect 50-ohm match?",
      [
        "Yes, resonance and matching are identical.",
        "No, the resistance must also match the reference.",
        "Only at night.",
      ],
      1,
      "Resonance means the reactive part is zero at the relevant frequency. The remaining resistance can still differ from the line impedance.",
    ),
    experiment: [
      "Set frequency to 145 MHz, then 290 MHz. Compare the quarter-wave and half-wave dimension estimates in the antenna workbench.",
      "In the impedance bench set Line reference to 50 ohms and Load reactance to zero. Compare Load resistance of 25 and 50 ohms.",
      "Open Custom wire editor and press Size to this frequency. Read and edit its point coordinates as dimensions. Treat the geometry as a drawing, not an electromagnetic solution.",
    ],
    observation:
      "Wavelength-based dimensions are starting estimates. Supplied impedance can be analyzed, but a resonance frequency is not solved from arbitrary wire geometry.",
    explanation:
      "At resonance, inductive and capacitive contributions cancel at the feedpoint in the relevant model. That does not select a particular resistance. Practical antenna dimensions depend on wire thickness, end effects, surroundings, feed arrangements, and construction. A rough length formula is useful for learning scale; it cannot guarantee a finished antenna’s impedance.",
    misconception:
      "An antenna tuner can present a match to a transmitter without making the antenna itself resonant or efficient.",
    transfer: q(
      "A resonant antenna measures 25 + j0 ohms on a 50-ohm system. What can still be improved?",
      [
        "Its impedance match.",
        "Its already-zero reactance must become enormous.",
        "Nothing; resonance guarantees every property.",
      ],
      0,
      "The resistive mismatch remains even though the reactance is zero.",
    ),
    controls: ["frequency", "antenna"],
    scenarioId: "clear",
    simulationStatus: "conceptual",
    modelNote:
      "Dimension and impedance benches are analytical. No resonance solve from custom geometry is claimed.",
  },
  {
    id: "swr-return-loss",
    title: "Three views of the same reflection",
    tier: "advanced",
    minutes: 7,
    objective:
      "Relate reflection coefficient, SWR, return loss, and mismatch loss without treating them as interchangeable numbers.",
    scenarioBrief:
      "One instrument reports 2:1 SWR. Another reports return loss. Neither has measured antenna efficiency.",
    concepts: ["SWR", "return loss", "mismatch loss", "reflection coefficient"],
    prediction: q(
      "For a better impedance match, which direction does return loss move?",
      [
        "Higher return loss, meaning less reflected power.",
        "Lower return loss, meaning no reflection.",
        "Return loss is unrelated to reflection.",
      ],
      0,
      "Return loss is minus twenty times log10 of reflection magnitude. A smaller reflection gives a larger positive return-loss value.",
    ),
    experiment: [
      "In Lab, compare a 50-ohm load with a 100-ohm load on a 50-ohm reference.",
      "Read SWR, reflected-power fraction, return loss, and mismatch loss.",
      "Set Load resistance to 0 and Load reactance to 50 ohms. Radiation resistance becomes zero. Inspect the infinite SWR and mismatch-loss labels for this totally reflecting load.",
    ],
    observation:
      "All these quantities derive from the same supplied impedance and reference. Perfect match and total reflection have special limiting values.",
    explanation:
      "Reflection coefficient describes the returning wave relative to the incident wave. SWR uses its magnitude to describe standing-wave contrast. Return loss describes reflected power on a logarithmic scale. Mismatch loss describes the fraction of incident power accepted by the load under this bench’s assumptions. Transmitter protection and multiple reflections in a lossy line need a fuller model.",
    misconception:
      "A 2:1 SWR does not mean half the transmitter power is lost. Also, an excellent SWR says nothing by itself about where accepted power goes.",
    transfer: q(
      "A dummy load has excellent SWR but radiates very little. Is that a contradiction?",
      [
        "Yes, low SWR guarantees a strong radiated signal.",
        "No, a good match can dissipate accepted power as heat.",
        "Only if the feedline is short.",
      ],
      1,
      "Matching and radiation efficiency answer different questions.",
    ),
    controls: ["antenna"],
    scenarioId: "clear",
    simulationStatus: "conceptual",
    modelNote:
      "Reflection relationships are calculated in the impedance bench; the base link does not simulate transmission-line standing waves.",
  },
  {
    id: "radiation-efficiency",
    title: "Where the accepted power goes",
    tier: "advanced",
    minutes: 6,
    objective:
      "Separate radiation resistance from dissipative resistance and explain efficiency.",
    scenarioBrief:
      "Two antennas accept the same power. One warms its surroundings much more than it talks to the world.",
    concepts: ["radiation resistance", "loss resistance", "efficiency", "gain"],
    prediction: q(
      "If radiation resistance stays fixed while loss resistance increases, what happens to efficiency?",
      ["It rises.", "It falls.", "It becomes independent of resistance."],
      1,
      "More of the accepted power is dissipated. In the simple series model efficiency is radiation resistance divided by total resistance.",
    ),
    experiment: [
      "In the impedance bench, set total resistance to 50 ohms and radiation resistance to 45 ohms.",
      "Reduce radiation resistance to 10 ohms while keeping total resistance at 50 ohms.",
      "Compare efficiency and reflection. Explain why the match can remain the same while radiation efficiency changes.",
    ],
    observation:
      "The same input resistance can hide very different radiation and loss components. The bench makes the split explicit.",
    explanation:
      "Radiation resistance is a way to represent radiated power using the same power relationships as resistance. Loss resistance represents energy dissipated in conductors, loading elements, ground, or other losses. Efficiency affects gain but is distinct from directivity. The simulator’s entered antenna gain is a chosen model input, not a measured property of a custom drawing.",
    misconception:
      "A low-SWR, physically small antenna is not automatically an efficient antenna. A loss mechanism can make matching look easier.",
    transfer: q(
      "A new matching network improves SWR but adds heat loss. What should be checked?",
      [
        "Only the SWR.",
        "The total delivered and radiated power, including network loss.",
        "Only the radio display brightness.",
      ],
      1,
      "A better input match can be offset by added dissipation. Evaluate the complete power path.",
    ),
    controls: ["antenna", "feedline"],
    scenarioId: "clear",
    simulationStatus: "conceptual",
    modelNote:
      "Radiation efficiency uses supplied resistance components in Lab. Arbitrary wire efficiency is not solved.",
  },
  {
    id: "smith-chart",
    title: "A map for complex loads",
    tier: "advanced",
    minutes: 7,
    objective:
      "Interpret the center and axes of a Smith chart as a map of normalized impedance and reflection.",
    scenarioBrief:
      "Your impedance is a point on a chart. Moving that point needs a physical change, not decorative dragging.",
    concepts: [
      "Smith chart",
      "normalized impedance",
      "reflection coefficient",
      "matching networks",
    ],
    prediction: q(
      "What does the center of an impedance Smith chart represent?",
      [
        "A match to the selected reference impedance.",
        "An open circuit.",
        "Infinite reactance.",
      ],
      0,
      "The center has zero reflection. Its normalized impedance is 1 + j0, so its ohm value depends on the chosen reference.",
    ),
    experiment: [
      "In the impedance bench, compare 25, 50, and 100 ohms with zero reactance on a 50-ohm reference.",
      "Inspect the real and imaginary reflection components.",
      "Add positive and negative reactance and reason about opposite sides of the horizontal axis. This is a conceptual chart-reading exercise, not an interactive matching-network synthesis.",
    ],
    observation:
      "Impedance normalized to the line reference maps to reflection coefficient through a fractional transformation. Changing the reference changes the normalized point.",
    explanation:
      "A Smith chart overlays constant resistance and reactance curves on the reflection-coefficient plane. The center is matched; the horizontal axis contains purely resistive loads. On the usual impedance chart, inductive reactance lies above and capacitive reactance below. Real matching networks move the operating point along paths determined by their components and transmission lines.",
    misconception:
      "The chart center does not always mean 50 ohms. It means the selected reference impedance.",
    transfer: q(
      "On a chart normalized to 75 ohms, what load is at the center?",
      ["50 + j0 ohms.", "75 + j0 ohms.", "0 + j75 ohms."],
      1,
      "Normalization defines the center. A matched normalized impedance of 1 corresponds to 75 ohms here.",
    ),
    controls: ["antenna"],
    scenarioId: "clear",
    simulationStatus: "conceptual",
    modelNote:
      "Smith-chart interpretation is conceptual. The impedance bench computes reflection components but does not synthesize a matching network.",
  },
  {
    id: "height-ground",
    title: "The ground joins the antenna",
    tier: "advanced",
    minutes: 7,
    objective:
      "Distinguish modeled geometric height effects from unmodeled ground-dependent antenna patterns.",
    scenarioBrief:
      "Raising a wire can change both its clearance and its radiation pattern. This engine only knows some of that story.",
    concepts: [
      "antenna height",
      "ground effects",
      "takeoff angle",
      "conductivity",
      "radiation pattern",
    ],
    prediction: q(
      "Does a higher antenna always improve every departure angle?",
      [
        "Yes, every angle gains equally.",
        "No, ground interaction can reshape lobes and nulls.",
        "Ground has no electromagnetic effect.",
      ],
      1,
      "Direct and reflected fields combine with phase differences. Height and ground properties can change the angular pattern.",
    ),
    experiment: [
      "Use the ridge lesson setup and compare 2 m with 15 m antenna height.",
      "Inspect the modeled clearance change and leave antenna gain fixed.",
      "In the antenna workbench, inspect the Dipole pattern. Identify the missing ground conductivity and current-distribution inputs a full solve would need; there are no controls for them here.",
    ],
    observation:
      "The scenario engine applies height to path geometry and the radio horizon. It does not solve a height-dependent radiation pattern or ground conductivity.",
    explanation:
      "An antenna and its surroundings form an electromagnetic system. Reflections from ground can reinforce or cancel fields at particular angles. Ground losses also affect efficiency. A simple terrain link can teach clearance while missing these effects. Keep the boundary visible when interpreting a large predicted improvement.",
    misconception:
      "A prettier 3D pattern does not establish a more accurate antenna model. Check what equations and inputs actually produced it.",
    transfer: q(
      "A height change improves modeled terrain clearance. Does that prove the real antenna’s gain toward the receiver stayed constant?",
      [
        "Yes, the drawing says so.",
        "No, the model held gain fixed while real ground interaction may change it.",
        "Yes, gain is independent of surroundings.",
      ],
      1,
      "A controlled model comparison isolates one effect. Real changes can alter more than one part of the system.",
    ),
    controls: ["height", "antenna", "terrain"],
    scenarioId: "ridge",
    simulationStatus: "modeled",
    modelNote:
      "Terrain clearance and horizon are modeled. Ground conductivity, image currents, and height-dependent radiation lobes are conceptual.",
  },
  {
    id: "sensitivity",
    title: "How quiet can a receiver hear?",
    tier: "advanced",
    minutes: 7,
    objective:
      "Relate noise figure and sensitivity to bandwidth, modulation, and a stated performance criterion.",
    scenarioBrief:
      "Two receiver data sheets quote sensitivity in different modes and bandwidths. The smaller number needs context.",
    concepts: [
      "noise figure",
      "receiver sensitivity",
      "noise temperature",
      "cascade noise",
      "required SNR",
    ],
    prediction: q(
      "Can receiver sensitivity be compared fairly without its mode and measurement criterion?",
      [
        "Yes, dBm numbers are always directly comparable.",
        "No, bandwidth and the decoding or intelligibility criterion matter.",
        "Only if both radios have the same color.",
      ],
      1,
      "Sensitivity is a specified minimum input under stated conditions. Those conditions define what counts as usable.",
    ),
    experiment: [
      "Send at a fixed mode and bandwidth, then vary receiver noise figure.",
      "Inspect the noise and threshold calculations and estimate where margin reaches zero.",
      "Compare a second mode only after reading its reference bandwidth and threshold assumptions.",
    ],
    observation:
      "The base noise model supports controlled sensitivity comparisons using antenna noise temperature, a passive receive cable, and receiver-added noise. It is not a full receiver noise-temperature cascade.",
    explanation:
      "A receiver’s sensitivity is tied to noise density, bandwidth, added noise, and the chosen performance threshold. Friis’s cascade relation explains why early low-noise gain can matter in a chain. An amplifier cannot remove noise already mixed with the signal, and sufficiently high antenna noise can reduce the benefit of a lower receiver noise figure.",
    misconception:
      "A low noise figure does not guarantee good performance beside a strong interfering transmitter. Sensitivity and strong-signal handling are different properties.",
    transfer: q(
      "Which missing detail makes a claim of “−120 dBm sensitivity” incomplete?",
      [
        "The supported mode, bandwidth, and test criterion.",
        "The model name font.",
        "The date on the box alone.",
      ],
      0,
      "A threshold needs conditions. A narrow coded mode and wide voice mode can have very different requirements.",
    ),
    controls: ["noise", "bandwidth", "mode", "power"],
    scenarioId: "clear",
    simulationStatus: "modeled",
    modelNote:
      "Single receiver noise figure and educational thresholds are modeled. Detailed cascaded stages and measured sensitivity curves are conceptual.",
  },
  {
    id: "receiver-overload",
    title: "Too much signal is a problem too",
    tier: "advanced",
    minutes: 8,
    objective:
      "Distinguish sensitivity, dynamic range, AGC, ADC clipping, front-end overload, and intermodulation.",
    scenarioBrief:
      "A weak wanted station shares your receiver with a huge nearby signal. More gain may make things worse.",
    concepts: [
      "dynamic range",
      "AGC",
      "ADC clipping",
      "front-end overload",
      "intermodulation",
      "receiver gain",
    ],
    prediction: q(
      "Can a strong out-of-channel signal damage reception of a weak wanted signal?",
      [
        "No, different frequencies never interact in equipment.",
        "Yes, receiver overload and nonlinear behavior can affect it.",
        "Only when both signals use the same antenna color.",
      ],
      1,
      "A receiver has finite linear range. Large signals can cause compression, clipping, or intermodulation even when they are not the wanted channel.",
    ),
    experiment: [
      "Open Lab’s receiver bench and observe equal gain applied to the existing signal and noise.",
      "Increase gain until the modeled output reaches the clip threshold.",
      "Add a blocker and inspect headroom. Explain which effects the simple total-power threshold can flag and which require a nonlinear circuit model.",
    ],
    observation:
      "The bench flags output headroom and clipping from supplied levels. It does not synthesize intermodulation products, AGC timing, or ADC sample waveforms.",
    explanation:
      "Dynamic range spans usable weak signals to large signals the receiver can handle under a stated criterion. AGC adjusts gain but cannot repair distortion that already occurred ahead of it. ADC clipping truncates samples beyond converter range. Nonlinear stages can generate intermodulation products such as 2f1−f2. Filtering, gain placement, and linearity all matter.",
    misconception:
      "Turning down the speaker volume cannot repair front-end overload. Audio loudness is downstream of the damaged signal.",
    transfer: q(
      "An early receiver stage overloads before the AGC-controlled stage. Can later gain reduction reconstruct the lost information?",
      [
        "Yes, any gain reduction fixes all distortion.",
        "No, it cannot undo distortion already introduced.",
        "Only if the display SNR is positive.",
      ],
      1,
      "Prevent overload where it occurs. Downstream scaling cannot recover information already lost to nonlinear distortion.",
    ),
    controls: ["noise", "power"],
    scenarioId: "clear",
    simulationStatus: "conceptual",
    modelNote:
      "Receiver gain/noise/headroom bench is analytical. AGC dynamics, intermodulation spectra, and ADC waveforms are conceptual.",
  },
  {
    id: "multihop-nvis",
    title: "One sky, several routes",
    tier: "advanced",
    minutes: 8,
    objective:
      "Compare multi-hop HF with near-vertical incidence skywave and explain why hop count is model-dependent.",
    scenarioBrief:
      "A nearby region and a distant continent may need very different elevation angles and frequency choices.",
    concepts: [
      "multi-hop HF",
      "NVIS",
      "critical frequency",
      "ground reflection",
      "takeoff angle",
    ],
    prediction: q(
      "Does an HF frequency suitable for a long oblique path automatically support a short near-vertical path?",
      [
        "Yes, HF has one universal MUF.",
        "No, usable frequency depends on incidence geometry.",
        "Only if both stations use voice.",
      ],
      1,
      "Near-vertical and oblique paths have different frequency support for the same ionospheric conditions.",
    ),
    experiment: [
      "Send the multi-hop lesson scenario and inspect hop count, path points, and ground-reflection assumptions.",
      "Change frequency and compare the available route.",
      "Select 100 km separation and 3 MHz, then compare with 7 MHz. Reason about the steep return path. Real NVIS coverage remains conceptual because the antenna elevation pattern and actual ionosphere are not solved.",
    ],
    observation:
      "The HF engine selects a simplified hop geometry within its maximum-hop limit. Intermediate ground reflections add the configured loss.",
    explanation:
      "Multi-hop propagation returns to Earth and travels through the ionosphere again. Each hop encounters absorption and other losses. NVIS uses high-elevation HF propagation to serve a regional area under suitable ionospheric conditions. It requires a frequency the layer can return at that angle and an antenna system that radiates useful energy there.",
    misconception:
      "NVIS does not mean any low antenna makes any HF frequency cover all nearby stations.",
    transfer: q(
      "Why might a lower frequency help a steep regional skywave path when a higher frequency works over a longer oblique path?",
      [
        "The incidence geometry changes the supported returning frequency.",
        "Lower frequencies always have no absorption.",
        "The transmitter clock runs slower.",
      ],
      0,
      "Geometry and ionospheric conditions determine whether a returning path exists. Absorption must still be checked at lower frequencies.",
    ),
    controls: ["frequency", "distance", "time", "mode"],
    scenarioId: "hf",
    simulationStatus: "modeled",
    modelNote:
      "Multi-hop geometry is simplified. NVIS antenna patterns and geographic coverage are conceptual, not a coverage prediction.",
  },
  {
    id: "other-propagation",
    title: "The routes outside this model",
    tier: "advanced",
    minutes: 6,
    objective:
      "Recognize ground wave and sporadic-E and identify why they need different model inputs.",
    scenarioBrief:
      "A station appears where the ordinary model predicted no route. Nature was not asked to use our dropdown.",
    concepts: [
      "ground wave",
      "sporadic-E",
      "surface conductivity",
      "model coverage",
    ],
    prediction: q(
      "If the chosen propagation model says no path, does that prove every possible physical mechanism is absent?",
      [
        "Yes, a simulator contains all of nature.",
        "No, the model may omit a relevant mechanism.",
        "Only if it has a globe.",
      ],
      1,
      "A model answers a question within its included mechanisms and assumptions. An omitted route can require a different model.",
    ),
    experiment: [
      "Send an HF or terrain example and read its named environment model.",
      "List the inputs a ground-wave model would need, including surface electrical properties.",
      "List why sporadic-E would need information about a changing ionized layer. No slider here manufactures those missing observations.",
    ],
    observation:
      "The current selectable propagation models are free space, simple terrain, and simplified HF skywave. Ground-wave and sporadic-E prediction are not included.",
    explanation:
      "Ground wave includes propagation influenced by the Earth’s surface and can be important at lower frequencies, with strong dependence on electrical ground properties. Sporadic-E involves localized ionization in the E region that can support unusual paths at times. It is variable and cannot be represented credibly by a constant bonus to link margin.",
    misconception:
      "An unexpected reception is not proof that free-space loss has stopped applying. Another propagation mechanism or model assumption may be involved.",
    transfer: q(
      "What should you do before using this app to predict a ground-wave service area?",
      [
        "Turn every gain up until the map looks right.",
        "Use a suitable validated ground-wave model and required ground inputs.",
        "Rename HF to ground wave.",
      ],
      1,
      "Model choice and input quality must match the intended mechanism.",
    ),
    controls: ["frequency"],
    scenarioId: "hf",
    simulationStatus: "conceptual",
    modelNote:
      "Ground-wave attenuation and sporadic-E are taught conceptually and are not simulated.",
  },
  {
    id: "multipath-fading",
    title: "Two arrivals, one surprise",
    tier: "advanced",
    minutes: 7,
    objective:
      "Explain constructive and destructive multipath and distinguish a static margin from fading reliability.",
    scenarioBrief:
      "A radio moves a short distance in a building and its signal changes sharply. The transmitter did not move.",
    concepts: ["multipath", "fading", "phase", "diversity", "fade margin"],
    prediction: q(
      "Can adding a reflected path make the received signal weaker?",
      [
        "No, more paths always add power constructively.",
        "Yes, arriving fields can partly cancel depending on phase.",
        "Only if the reflection travels backward in time.",
      ],
      1,
      "Electromagnetic fields add with phase. A reflected component can reinforce or cancel the direct component.",
    ),
    experiment: [
      "Send a clear-path scenario and note its deterministic margin.",
      "Consider a reflected path arriving half a wavelength out of phase with an equal direct component.",
      "Record why moving a fraction of a wavelength could change the result. The current scenario does not generate a time-varying multipath waveform.",
    ],
    observation:
      "The base result is a static budget. Repeating SEND IT with identical inputs produces the same result rather than a stochastic fading sample.",
    explanation:
      "Multiple arrivals have different amplitudes, delays, and phases. Their combination can vary with movement and the environment, creating fading. Diversity uses sufficiently different paths, locations, frequencies, or polarizations to reduce shared fades. A margin can help absorb variation, but measured reliability needs a channel model or observations.",
    misconception:
      "A 10 dB modeled margin is not a measured outage probability. Fading statistics have not been inferred from a static number.",
    transfer: q(
      "Why might two appropriately separated receive antennas improve reliability?",
      [
        "Their fades may be less correlated.",
        "They repeal free-space spreading.",
        "They guarantee twice the voltage in every environment.",
      ],
      0,
      "Diversity can help when the channels do not fail together. The amount of improvement depends on their correlation and combining method.",
    ),
    controls: ["distance", "frequency"],
    scenarioId: "clear",
    simulationStatus: "conceptual",
    modelNote:
      "No multipath ray tracer, stochastic fading process, or diversity receiver is simulated.",
  },
  {
    id: "doppler",
    title: "The frequency has places to be",
    tier: "advanced",
    minutes: 6,
    objective:
      "Relate Doppler shift to relative radial motion and explain why narrow modes need frequency tracking.",
    scenarioBrief:
      "A moving platform approaches the receiver. Its transmitted frequency is stable; the received frequency is shifted.",
    concepts: [
      "Doppler",
      "radial velocity",
      "frequency tracking",
      "narrowband modes",
    ],
    prediction: q(
      "For an approaching source in the ordinary nonrelativistic case, what happens to received frequency?",
      [
        "It shifts upward.",
        "It shifts downward.",
        "It always remains identical.",
      ],
      0,
      "Approaching radial motion increases received frequency. Receding motion decreases it.",
    ),
    experiment: [
      "Compare a broad voice mode with a narrow CW or digital mode in the base link.",
      "Imagine the same frequency offset applied to each receiver passband and identify which is more sensitive to being off-center.",
      "Use the relation shift ≈ carrier frequency × radial speed / speed of light as a conceptual estimate. No moving-platform Doppler is added to the engine result.",
    ],
    observation:
      "The simulator frequency is a static input. It does not track moving endpoints or apply Doppler to a received waveform.",
    explanation:
      "Relative motion along the line of sight changes the rate at which wave cycles arrive. Faster radial motion and higher carrier frequency produce larger shifts in the small-velocity approximation. Tangential motion needs the actual time-varying geometry to determine radial speed. A signal can have sufficient power while drifting outside a narrow filter or decoder tolerance.",
    misconception:
      "Total vehicle speed is not automatically the radial speed relative to the receiving station.",
    transfer: q(
      "Two platforms have the same speed, but one moves almost sideways across your line of sight. Must they have the same Doppler shift?",
      [
        "Yes, total speed alone sets it.",
        "No, their radial velocity components can differ.",
        "Only if they have equal batteries.",
      ],
      1,
      "Doppler depends on the line-of-sight component of relative motion.",
    ),
    controls: ["frequency", "bandwidth", "mode"],
    scenarioId: "clear",
    simulationStatus: "conceptual",
    modelNote:
      "Doppler and moving-platform tracking are conceptual. Static frequency changes are not a Doppler simulation.",
  },
  {
    id: "satellite",
    title: "A very expensive repeater in space",
    tier: "advanced",
    minutes: 8,
    objective:
      "Describe uplink, downlink, visibility, pointing, and orbital motion as separate satellite-link constraints.",
    scenarioBrief:
      "The regional fiber is broken. A satellite route avoids it, but the terminal still needs power and a view of the satellite.",
    concepts: [
      "satellite link",
      "uplink",
      "downlink",
      "slant range",
      "visibility",
      "Doppler",
    ],
    prediction: q(
      "Does a usable uplink alone prove a complete satellite communication route?",
      [
        "Yes, the satellite handles all remaining physics.",
        "No, the downlink and destination route must also work.",
        "Only when the ground antenna is tall.",
      ],
      1,
      "A satellite route has at least an uplink and downlink, plus equipment and service dependencies. Every required part must work.",
    ),
    experiment: [
      "Send a free-space baseline and inspect how range, antenna gain, and frequency enter its budget.",
      "Draw separate ground-to-satellite and satellite-to-ground links and identify their independent budgets.",
      "List visibility, pointing, motion, terminal power, and service-access constraints. Do not treat the terrestrial endpoints as an orbital model.",
    ],
    observation:
      "Free-space principles transfer to a satellite budget, but this lesson does not propagate an orbit or simulate a satellite transponder.",
    explanation:
      "A satellite can carry communications beyond damaged local infrastructure. Ground equipment needs a suitable antenna, power, access to the intended service, and usable geometry. Low-orbit satellites move rapidly through the sky, changing range and Doppler. A geostationary satellite has different geometry and delay. The space segment introduces dependencies of its own.",
    misconception:
      "“Satellite” does not mean a completely infrastructure-free system or a signal that passes through every obstruction.",
    transfer: q(
      "A satellite terminal has plenty of battery but sits under an obstructing roof. What must be checked?",
      [
        "A suitable view of the satellite and the terminal’s installation requirements.",
        "Only the remaining battery percentage.",
        "Whether the roof can read packets.",
      ],
      0,
      "Power is necessary but not sufficient. A usable propagation path is still required.",
    ),
    controls: ["frequency", "power", "antenna", "distance"],
    scenarioId: "clear",
    simulationStatus: "conceptual",
    modelNote:
      "Satellite orbits, transponders, service coverage, and end-to-end latency are not simulated.",
  },
  {
    id: "model-validity",
    title: "Know where the model stops",
    tier: "advanced",
    minutes: 8,
    objective:
      "Separate deterministic calculations, uncertain inputs, omitted mechanisms, and real-world validation.",
    scenarioBrief:
      "The simulator predicts a comfortable margin. You are asked whether a school can rely on this exact setup during a flood.",
    concepts: [
      "uncertainty",
      "model validity",
      "assumptions",
      "sensitivity analysis",
      "verification",
    ],
    prediction: q(
      "Does a repeatable simulation with many decimal places establish real-world reliability?",
      [
        "Yes, precision proves accuracy.",
        "No, input uncertainty and omitted mechanisms still matter.",
        "Only if it runs in 3D.",
      ],
      1,
      "A calculation can be precise and repeatable while its assumptions differ from the real situation.",
    ),
    experiment: [
      "Send a scenario and read every confidence reason and relevant warning.",
      "Change External noise excess from 47 to 57 dB and send. Restore 47 dB, then change Ridge altitude from 9 to 15 m and compare the separate effect.",
      "Write down which observations and supervised field tests would be needed before using the design in a real plan.",
    ],
    observation:
      "Some outcomes are sensitive to uncertain inputs or abrupt availability boundaries. The confidence label summarizes model assumptions, not a calibrated probability of delivery.",
    explanation:
      "Verification asks whether equations and code behave as intended. Validation asks whether the model fits the physical situation well enough for the decision. Test alternative plausible inputs, expose assumptions, and compare with measurements. Disaster planning also includes people, message procedures, power logistics, permissions, and backup routes that a link budget cannot certify.",
    misconception:
      "A simulator is not a substitute for measured coverage or an approved operational communications plan.",
    transfer: q(
      "A design succeeds only at one optimistic noise level. What is the best next step?",
      [
        "Hide the noisy result.",
        "Test plausible noise variation and improve margin or alternatives.",
        "Add more decimal places to the report.",
      ],
      1,
      "A useful design should be examined under credible adverse conditions. Record the assumptions and the remaining weaknesses.",
    ),
    controls: ["noise", "terrain", "height", "power", "frequency"],
    scenarioId: "ridge",
    simulationStatus: "modeled",
    modelNote:
      "Sensitivity comparisons use the deterministic engine. Reliability probabilities, real coverage surveys, and operational certification are not produced.",
  },
];

export const lessons: Lesson[] = [beginner, intermediate, advanced].flatMap(
  (course) =>
    course.map((lesson, index) => ({
      ...lesson,
      number: index + 1,
      prerequisites: index === 0 ? [] : [course[index - 1]!.id],
    })),
);
const exampleByScenario = {
  clear: "vhf-clear",
  ridge: "vhf-ridge",
  hf: "hf-day",
  microwave: "microwave-clear",
} as const;
export function getLessonScenario(id: string): Scenario {
  const lesson = lessons.find((value) => value.id === id);
  if (!lesson) throw new RangeError(`Unknown lesson: ${id}`);
  const scenario = loadExampleScenario(
    id === "multihop-nvis"
      ? "hf-multihop"
      : exampleByScenario[lesson.scenarioId],
  );
  scenario.id = lesson.id;
  scenario.title = lesson.title;
  scenario.difficulty = lesson.tier;
  if (
    [
      "distance-is-rude",
      "db-intuition",
      "link-budget",
      "feedline",
      "receiver-noise",
      "satellite",
    ].includes(id)
  )
    scenario.environment = { model: "free-space", temperatureK: 290 };
  if (id === "receiver-noise") {
    scenario.modeId = "cw";
    scenario.receiver.bandwidthHz = 500;
  }
  if (id === "noise-too") {
    scenario.modeId = "cw";
    scenario.receiver.bandwidthHz = 1000;
  }
  return scenario;
}
