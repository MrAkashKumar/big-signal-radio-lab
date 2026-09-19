export const tabStories = {
  lab: { color: "blue", kicker: "FIELD EXPEDITION", title: "Can base camp hear the team?", description: "Two people. A ridge between them. Explore what changes a radio connection.", places: ["BASE CAMP", "RIDGE", "FIELD TEAM"], steps: [
    { title: "Meet the challenge", text: "Imagine a field team behind a ridge. This picture introduces the problem; the lab below uses your current experiment, not this illustrated terrain." },
    { title: "Change one thing", text: "Try power, frequency, or antenna height in the radio controls. Make a prediction before you press SEND IT." },
    { title: "Explain the result", text: "Read WHY, then compare designs. A higher antenna may help with clearance; extra power cannot create an unavailable path." },
  ] },
  disaster: { color: "coral", kicker: "COMMUNITY RESILIENCE", title: "Keep a community connected.", description: "A shelter, a relay, and a relief hub. One working link is only the beginning.", places: ["SHELTER", "RELAY", "RELIEF HUB"], steps: [
    { title: "See the people", text: "Shelters and relief teams need to exchange information when everyday infrastructure is unavailable. Choose an exercise below." },
    { title: "Design the network", text: "Place and configure stations. Check both directions of each link, then explore whether a relay improves connectivity." },
    { title: "Check resilience", text: "Inspect coverage, redundancy, and battery endurance. A connected network still needs enough energy and a plan for failures." },
  ] },
  tsunami: { color: "amber", kicker: "HOSPITAL COMMUNICATIONS", title: "A voice when phones fall silent.", description: "Explore a tsunami-inspired hospital scenario through the people who need to communicate.", places: ["HOSPITAL", "RADIO NETWORK", "RELIEF TEAM"], steps: [
    { title: "Understand the need", text: "A hospital needs to contact people beyond damaged infrastructure. The exercise below explores this communication challenge; it is not an operational response plan." },
    { title: "Follow the message", text: "Explore the hospital network below. Identify the sending station, destination, and the modeled routes between them." },
    { title: "Show the evidence", text: "Use the mission's results to explain which links work and why. The illustrated line above is a story cue, not measured coverage." },
  ] },
  unreasonable: { color: "violet", kicker: "EXTREME DESIGN STUDIO", title: "Bigger equipment. Better connection?", description: "Test an ambitious remote outpost—and discover what brute force cannot fix.", places: ["OUTPOST", "THE PHYSICS", "REMOTE STATION"], steps: [
    { title: "Ask a bold question", text: "What if an outpost had a much taller antenna or far more power? Start with ordinary physics and make a prediction." },
    { title: "Push one limit", text: "Use the extreme controls below and inspect the engine's response. Bigger is not automatically better for every communication problem." },
    { title: "Label the universe", text: "Fantasy settings deliberately change model assumptions. Keep fantasy results separate from ordinary-universe experiments when presenting them." },
  ] },
  saved: { color: "blue", kicker: "YOUR FIELD NOTEBOOK", title: "Turn experiments into evidence.", description: "Keep the setup, revisit the result, and tell the story of what you learned.", places: ["TRY", "SAVE", "REVISIT"], steps: [
    { title: "Keep a design", text: "Save an experiment from the lab. Give it a name that describes the question you were testing." },
    { title: "Compare your ideas", text: "Reopen a saved design to explore it again. Use the lab's A/B comparison to explain what one change did." },
    { title: "Share the setup", text: "Export a portable experiment file. Another learner can open it without needing your account. Local data is not cloud-synced." },
  ] },
  teacher: { color: "teal", kicker: "THE CLASSROOM WORKSHOP", title: "Give students a problem worth solving.", description: "A remote team needs contact. Your class designs, tests, and explains the connection.", places: ["QUESTION", "EXPERIMENT", "EXPLANATION"], steps: [
    { title: "Set the mission", text: "Choose a lesson or current setup. Write the objective and define the equipment and constraints your students should explore." },
    { title: "Let students try", text: "Export the classroom challenge and let students predict, configure, and run it. Encourage one change at a time." },
    { title: "Discuss the why", text: "Compare explanations, not just successful links. Numerical checks support assessment; written planning constraints need classroom discussion." },
  ] },
  physics: { color: "violet", kicker: "BEHIND THE PICTURE", title: "A beautiful path needs honest physics.", description: "Trace a visible result back to its inputs, calculations, and limits.", places: ["INPUTS", "MODEL", "EVIDENCE"], steps: [
    { title: "Start with inputs", text: "Frequency, equipment, environment, and geometry define an experiment. Illustrative scenery is not surveyed terrain." },
    { title: "Inspect the model", text: "The simulation engine calculates the result. React displays it; the animation does not determine whether a link works." },
    { title: "Name the limits", text: "Read the assumptions and confidence notes below. Simplified educational models are not field measurements or real-world coverage guarantees." },
  ] },
} as const;
export type StoryPage = keyof typeof tabStories;
