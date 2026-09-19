/** Teaching copy only: RF results remain owned by the simulation engine. */
export const rescueStory = [
  { short: "Phones go down", title: "A message that cannot wait.", body: "A coastal hospital needs supplies. Phone service is down, and terrain can obstruct its direct radio link to the relief base." },
  { short: "Find another route", title: "Give the message a stepping stone.", body: "A hilltop relay is a possible way around the obstruction. Both radio links must work; this illustration alone cannot prove they do." },
  { short: "Test the connection", title: "Put the idea to the test.", body: "Enter the hospital mission to test the network. Inspect the modeled paths, change your setup, and discover which stations can communicate." },
] as const;
export const radioStory = [
  { title: "You send a message", short: "Send", body: "The transmitter turns your voice or data into a changing radio signal. Its antenna sends that energy into the world." },
  { title: "A wave carries it", short: "Travel", body: "The signal spreads out as it travels. Terrain, antenna position and frequency affect how much reaches the other end." },
  { title: "Someone listens", short: "Receive", body: "The receiver tries to recover your message from the signal and background noise. Enough signal for the selected mode means a usable modeled link." },
] as const;
export const radioKnobs = [
  { symbol: "↗", title: "Power", analogy: "How much energy you send", detail: "More power can help a weak link. It does not remove a mountain or create an unavailable propagation path.", color: "amber" },
  { symbol: "≋", title: "Frequency", analogy: "How the wave travels", detail: "Different bands behave differently. HF may return from the ionosphere; VHF links are often shaped by terrain and antenna height.", color: "violet" },
  { symbol: "↑", title: "Antenna height", analogy: "A better view of the other radio", detail: "Raising an antenna can help clear terrain. Try one change, send again, then compare the model's results.", color: "teal" },
  { symbol: "◉", title: "Signal and noise", analogy: "Hearing a voice in a busy room", detail: "The receiver needs to distinguish the message from noise. Link margin describes how far above or below the chosen mode's requirement you are.", color: "blue" },
] as const;
export const metricHelp = { received: "Signal arriving at the radio", noise: "Background the radio must hear through", snr: "Signal compared with the noise", margin: "Headroom above the mode's requirement" } as const;
