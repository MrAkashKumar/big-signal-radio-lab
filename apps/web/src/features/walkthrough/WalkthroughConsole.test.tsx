import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { walkthroughLanguages, walkthroughStops } from "../../../../../content/explanations/walkthrough";
import { WalkthroughConsole } from "./WalkthroughConsole";

const noop = () => {};
function render(step = 0, voiceReady = false) {
  return renderToStaticMarkup(<WalkthroughConsole step={step} language="auto" voiceReady={voiceReady} onStep={noop} onLanguage={noop} onNarrate={noop} onClose={noop} />);
}

describe("project walkthrough console", () => {
  it("shows all stops, language choices and consent before voice", () => {
    const html = render();
    expect(walkthroughStops).toHaveLength(5);
    for (const language of walkthroughLanguages) expect(html).toContain(`value="${language.id}"`);
    expect(html).toContain("Open voice guide");
    expect(html).toContain("microphone consent");
    expect(html).toContain("not a live result");
    expect(html).toContain("Pause animation");
    expect(html).toContain('aria-current="step"');
  });
  it("offers narration for an enabled voice guide and finishes on the final stop", () => {
    const html = render(4, true);
    expect(html).toContain("Explain this stop aloud");
    expect(html).toContain("Show the evidence");
    expect(html).toContain("Finish tour");
  });
  it("handles invalid step values without crashing", () => {
    expect(render(NaN)).toContain("Make the invisible visible");
    expect(render(-2)).toContain("Make the invisible visible");
    expect(render(100)).toContain("Show the evidence");
  });
});
