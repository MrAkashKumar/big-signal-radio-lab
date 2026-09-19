/** Application navigation only; no simulation or lesson-progress logic. */
export const mainPages = ["learn", "lab", "disaster", "tsunami", "unreasonable"] as const;
export const toolPages = ["saved", "teacher", "physics"] as const;
export type Page = typeof mainPages[number] | typeof toolPages[number];
export const pageLabels: Record<Page, string> = {
  learn: "Learn",
  lab: "Radio lab",
  disaster: "Disaster lab",
  tsunami: "When phones fail",
  unreasonable: "Unreasonable engineering",
  saved: "My experiments",
  teacher: "Teacher tools",
  physics: "About the physics",
};
