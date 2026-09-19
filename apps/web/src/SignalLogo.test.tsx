import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SignalLogo } from "./SignalLogo";

describe("radio brand mark", () => {
  it("keeps decorative artwork out of the home button's accessible name", () => {
    const html = renderToStaticMarkup(<SignalLogo />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    expect(html).toContain("signal-logo-wave-one");
    expect(html).toContain("signal-logo-wave-two");
  });
});
