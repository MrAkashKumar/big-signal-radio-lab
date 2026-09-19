import type { LessonScenarioId } from "../packages/missions/product";

export interface DisasterScenario {
  id: string;
  title: string;
  subtitle: string;
  whatHappened: string;
  whatFailed: string[];
  participants: string[];
  information: string[];
  constraints: string[];
  whyRadio: string;
  objective: string;
  reflection: string;
  hints: string[];
  scenarioId: LessonScenarioId;
}
export const radioResilienceIntroduction =
  "During a natural disaster, people need to report where help is needed, coordinate supplies, and confirm that a message arrived. A charged phone can still be disconnected if its tower, backhaul connection, or network core fails. Direct radio can move a short message between equipped stations without that chain. Its value is an independent route for essential information. Radios still need electrical power, suitable antennas, a usable propagation path, trained operators, and a shared communication plan.";
export const disasterSafetyNote =
  "These are fictional classroom planning exercises. Physical feasibility does not establish permission to transmit. Allowed equipment, frequencies, power, and operator licensing depend on the jurisdiction and service. Emergency exceptions are specific to local rules and authorized operations; a disaster does not give everyone unrestricted access to a frequency. Arrange real exercises with the responsible authority or a qualified local radio club.";
export const disasters: DisasterScenario[] = [
  {
    id: "internet-gone",
    title: "Internet gone",
    subtitle: "The router is blinking. Nobody is impressed.",
    whatHappened:
      "A severe storm cuts the fiber route serving a school and a nearby evacuation shelter. Both buildings still have electricity.",
    whatFailed: [
      "Fixed Internet backhaul is cut.",
      "Cloud messaging and web dashboards cannot reach their servers.",
      "Local Wi-Fi still appears connected, which hides the wider outage.",
    ],
    participants: ["School supply desk", "Evacuation shelter coordinator"],
    information: [
      "Number of blankets available",
      "Shelter capacity updates",
      "Acknowledgment that a supply request arrived",
    ],
    constraints: [
      "Connect nearby stations without Internet or a cellular service.",
      "Use simple equipment that volunteers can share.",
      "Confirm receipt of each request rather than assuming it was heard.",
    ],
    whyRadio:
      "A direct radio link does not need an Internet provider to carry a message between its endpoints. This gives the school and shelter a route around the broken fiber. The radio does not restore the web; it supports the essential local exchange that the web was carrying.",
    objective:
      "Connect both stations with a usable voice or short-message link and explain which infrastructure it avoids.",
    reflection:
      "If the school Wi-Fi symbol remains full, what other parts of the communication chain could still have failed?",
    hints: [
      "Begin with a short VHF link and matching antennas.",
      "Trace every dependency between the sender and receiver.",
      "A working RF path and a received acknowledgment are different pieces of evidence.",
    ],
    scenarioId: "clear",
  },
  {
    id: "cellular-overload",
    title: "Cell network overloaded",
    subtitle: "Everyone pressed call at once.",
    whatHappened:
      "After an earthquake, thousands of people attempt to call at the same time. Some towers remain powered, but demand and damaged backhaul limit service.",
    whatFailed: [
      "Calls fail or remain queued despite a visible signal indicator.",
      "The network cannot serve every attempted connection.",
      "Some nearby cell sites are unavailable.",
    ],
    participants: [
      "Community coordination point",
      "Shelter team",
      "Supply team",
    ],
    information: [
      "Brief scheduled status reports",
      "Supply requests",
      "An acknowledgment and the identity of the responding station",
    ],
    constraints: [
      "Share one local channel.",
      "Avoid continuous transmissions that prevent others from speaking.",
      "Agree on station names, message priority, and a reporting schedule.",
    ],
    whyRadio:
      "A shared local radio channel can let several teams hear the same announcement at once without each making a cellular call. That removes a dependency on an overloaded access network. The radio channel has its own capacity limit, so concise messages and turn-taking become part of the engineering.",
    objective:
      "Connect all local teams and explain why a stronger signal alone does not solve channel congestion.",
    reflection:
      "How would you prevent three connected teams from transmitting their reports at the same time?",
    hints: [
      "Try a centrally placed coordination station.",
      "Short reports use less airtime than continuous voice.",
      "The RF model does not simulate collisions or dispatch scheduling.",
    ],
    scenarioId: "clear",
  },
  {
    id: "power-outage",
    title: "Power outage",
    subtitle: "The watts have left the building.",
    whatHappened:
      "Flooding damages electrical distribution equipment. Shelter and field stations must operate from charged batteries until power returns.",
    whatFailed: [
      "Mains electricity is unavailable.",
      "Some communications equipment stops when backup batteries run down.",
      "Charging opportunities are limited.",
    ],
    participants: ["Battery-powered shelter station", "Field assessment team"],
    information: [
      "Periodic safety status",
      "Short requests for water and transport",
      "Urgent voice calls when needed",
    ],
    constraints: [
      "Meet the battery endurance target.",
      "Include receive and idle consumption, not only transmit power.",
      "Preserve a usable link while reducing average electrical demand.",
    ],
    whyRadio:
      "Portable radio can work while mains power is down if its energy source and antenna remain available. This helps people report needs without waiting for grid repairs. Endurance is finite; a system that lasts one hour cannot support an overnight operation just because its first message is loud.",
    objective:
      "Meet both the link-margin and operating-time targets using the available battery.",
    reflection:
      "Would halving transmit power double battery life if the radio spends most of its time receiving?",
    hints: [
      "Reduce transmit duty cycle before assuming only watts matter.",
      "A more effective antenna can reduce the power needed for the same path.",
      "Battery estimates omit temperature, aging, discharge limits, and charging losses unless explicitly included.",
    ],
    scenarioId: "clear",
  },
  {
    id: "hill-relay",
    title: "The hill is still there",
    subtitle: "Terrain has declined to cooperate.",
    whatHappened:
      "A landslide isolates a field team in a valley. The coordination point is nearby, but a ridge obstructs their direct radio path.",
    whatFailed: [
      "The direct VHF path is obstructed.",
      "Road access is cut.",
      "The usual hilltop communications site is unavailable.",
    ],
    participants: [
      "Valley field team",
      "Coordination point",
      "Portable relay team",
    ],
    information: [
      "Team status",
      "Road and access observations",
      "Short resource requests",
    ],
    constraints: [
      "Both sides of a relay route must work.",
      "Every relay needs power and an operator or appropriate repeater equipment.",
      "A safe, accessible location matters as well as radio geometry.",
    ],
    whyRadio:
      "A temporary relay can carry information around damaged communications infrastructure. Its location gives each side a better path over the terrain. This is why preparedness includes suitable sites and equipment, not only a bigger transmitter at the bottom of a valley.",
    objective:
      "Build a route between the field team and base through a well-positioned relay and inspect each hop.",
    reflection:
      "If base can reach the relay but the field team cannot, is the complete route usable?",
    hints: [
      "Place the relay where it has clearance toward both endpoints.",
      "Inspect the weakest hop.",
      "A relay creates a new dependency; consider what happens if its battery fails.",
    ],
    scenarioId: "ridge",
  },
  {
    id: "wide-area",
    title: "Wide area failure",
    subtitle: "The local workaround needs a longer reach.",
    whatHappened:
      "A major cyclone interrupts terrestrial communications across a region. A local coordination team needs to send a summary to an assistance center hundreds of kilometres away.",
    whatFailed: [
      "Several local communications networks are down.",
      "Regional backhaul is unavailable.",
      "Nearby VHF stations cannot provide a complete route to the destination.",
    ],
    participants: [
      "Regional coordination station",
      "Distant assistance center",
    ],
    information: [
      "Short verified situation summaries",
      "Resource counts",
      "Scheduled acknowledgments",
    ],
    constraints: [
      "Select an HF frequency appropriate to the modeled time and path.",
      "Plan alternatives when the ionosphere changes.",
      "Match the message format to the available bandwidth.",
    ],
    whyRadio:
      "HF skywave may carry a message over a large area without a chain of local towers or fiber routes. That independence can connect an affected region to an outside assistance center. HF relies on the ionosphere, so frequency plans, alternate times, and tested backups matter. It is not a guaranteed always-on Internet replacement.",
    objective:
      "Find a returning HF path and a usable mode, then test the design at another time of day.",
    reflection:
      "Why is one successful daytime HF test insufficient evidence that an overnight schedule will work?",
    hints: [
      "Compare 7 MHz and 14 MHz at different times.",
      "Above the modeled MUF, more power cannot make the missing returning path appear.",
      "Short text has very different requirements from live video.",
    ],
    scenarioId: "hf",
  },
  {
    id: "emergency-network",
    title: "Emergency network design",
    subtitle: "One heroic link is not a network.",
    whatHappened:
      "A storm leaves a shelter, school supply depot, coordination point, and remote assessment site with uneven connectivity and separate battery supplies.",
    whatFailed: [
      "Cellular and Internet service cannot be relied on.",
      "Some direct paths are blocked.",
      "A single relay failure could split the network.",
    ],
    participants: [
      "Evacuation shelter",
      "Coordination point",
      "School supply depot",
      "Remote assessment team",
    ],
    information: [
      "Shelter capacity",
      "Supply counts",
      "Field status and locations",
      "Confirmed requests and responses",
    ],
    constraints: [
      "Every required site must have a path to coordination.",
      "Keep enough battery endurance at the relays.",
      "Identify a route that survives one link failure.",
      "State which message requirements each route can support.",
    ],
    whyRadio:
      "A community radio network can connect essential services through independently powered stations when shared infrastructure fails. Its usefulness depends on the whole route and the people who operate it. Redundant paths, an agreed message plan, and batteries at the relay sites help a network remain useful after the next failure.",
    objective:
      "Connect all required sites, inspect isolated nodes and the weakest link, then improve redundancy without exhausting the energy budget.",
    reflection:
      "Which station failure would isolate the most people, and what change would reduce that dependence?",
    hints: [
      "First connect the isolated site; then improve a second route.",
      "A network drawing with many lines is useful only if those links are usable.",
      "Reliability labels are educational margin categories, not measured uptime probabilities.",
    ],
    scenarioId: "ridge",
  },
];

export const disasterReferences = [
  {
    title: "ITU: emergency telecommunications",
    url: "https://www.itu.int/en/mediacentre/backgrounders/Pages/emergency-telecommunications.aspx",
    note: "Why resilient communications, trained operators, and complementary terrestrial and satellite systems matter in disasters.",
  },
  {
    title: "NOAA: HF radio communications",
    url: "https://www.spaceweather.gov/impacts/hf-radio-communications",
    note: "How changing ionospheric conditions can modify or interrupt HF paths.",
  },
];
