import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { tabStories, type StoryPage } from "../../../../../content/explanations/tab-stories";
import { TabStory } from "./TabStory";

describe("visual tab guides", () => {
  for (const page of Object.keys(tabStories) as StoryPage[]) {
    it(`renders the ${page} story with accessible controls and an illustration disclaimer`, () => {
      const html = renderToStaticMarkup(<TabStory page={page} />);
      expect(html).toContain(tabStories[page].kicker);
      expect(html).toContain("Concept illustration only, not live simulation output.");
      expect(html).toContain('aria-expanded="true"');
      expect(html).toContain("Animate route");
      expect(html).toContain("Use-case steps");
      expect(html).toContain('aria-live="polite"');
      expect(tabStories[page].steps).toHaveLength(3);
    });
  }
});
