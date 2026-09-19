export const walkthroughLanguages = [
  { id: "auto", label: "Auto · match my speech" },
  { id: "en", label: "English" },
  { id: "ta", label: "தமிழ் · Tamil" },
  { id: "hi", label: "हिन्दी · Hindi" },
  { id: "ms", label: "Bahasa Melayu · Malay" },
  { id: "zh", label: "中文 · Mandarin" },
  { id: "bn", label: "বাংলা · Bengali" },
] as const;

export const walkthroughStops = [
  { id: "overview", title: "Make the invisible visible", page: "learn", description: "Two people need to talk. A hill stands between them. Explore what helps their radio message get through.", prompt: "Introduce BIG SIGNAL to a first-time audience in two sentences using two people separated by a hill. Explain that this is an educational simulator, not emergency communication planning. Invite the audience to try a radio experiment." },
  { id: "lab", title: "Change one thing. See why.", page: "lab", description: "Try a different antenna height or power setting, then SEND IT. Read the actual result—not just the moving wave.", prompt: "Walk through the current Radio lab setup in plain language. Inspect actual results, explain one limiting factor, and offer one supported, reversible example experiment. Never assume that more power or height guarantees success." },
  { id: "disaster", title: "Help a hospital reach its team", page: "disaster", description: "When phones fail, a radio network can offer another route. Explore a classroom rescue scenario and test its connections.", prompt: "Explain Disaster lab through a hospital needing to contact a relief team. Inspect the current network before describing connectivity. Offer a supported example; do not claim an operational emergency solution or invent a successful relay route." },
  { id: "unreasonable", title: "Ask a bigger “what if?”", page: "unreasonable", description: "Explore extreme designs and clearly labelled fantasy settings. Discover which physical limits still matter.", prompt: "Explain Unreasonable engineering simply. Distinguish extreme settings with real formulas from fantasy changes to physics. Describe one example the visible controls support without inventing numerical results." },
  { id: "physics", title: "Show the evidence", page: "physics", description: "Every result has a reason. Explore the model assumptions, then return to the lab to inspect WHY and MATH.", prompt: "Finish the walkthrough by explaining the calculation boundary: the simulator computes RF results, the AI explains and operates supported controls. Explain educational approximations and how to inspect WHY and MATH in the lab. Invite an audience question." },
] as const;
