import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TutorMarkdown } from "./TutorMarkdown";

function render(markdown: string) {
  return renderToStaticMarkup(<TutorMarkdown>{markdown}</TutorMarkdown>);
}

describe("TutorMarkdown", () => {
  it("renders headings, emphasis, and ordered and unordered teaching steps", () => {
    const html = render(
      "## Radio basics\n\nA **clear message** matters.\n\n1. Listen first\n2. Speak clearly\n\n- Identify your station\n- Keep it brief",
    );
    expect(html).toContain("<h2>Radio basics</h2>");
    expect(html).toContain("<strong>clear message</strong>");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>Listen first</li>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>Keep it brief</li>");
  });

  it("renders fenced examples as escaped code", () => {
    const html = render('```text\nPower < 10 W && antenna > 2 m\n```');
    expect(html).toContain("<pre>");
    expect(html).toContain("<code");
    expect(html).toContain("Power &lt; 10 W &amp;&amp; antenna &gt; 2 m");
  });

  it("renders GFM tables as a semantic table", () => {
    const html = render(
      "| Setting | Result |\n| --- | --- |\n| More height | Better clearance |",
    );
    expect(html).toContain("<table>");
    expect(html).toContain("<th>Setting</th>");
    expect(html).toContain("<td>Better clearance</td>");
  });

  it("does not turn raw HTML or scripts into active markup", () => {
    const html = render(
      '<script>alert("unsafe")</script>\n\n<img src="https://example.com/track" onerror="alert(1)">\n\nSafe **explanation**',
    );
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toMatch(/<img\b/i);
    expect(html).not.toContain("onerror=");
    expect(html).toContain("<strong>explanation</strong>");
  });

  it("blocks executable links while preserving ordinary links", () => {
    const html = render(
      "[Unsafe](javascript:alert%281%29) and [Reference](https://example.com/radio)",
    );
    expect(html).not.toMatch(/href=["']javascript:/i);
    expect(html).toContain('href="https://example.com/radio"');
    expect(html).toContain("Reference</a>");
  });

  it("shows image alt text without creating remote image requests", () => {
    const html = render("![A dipole diagram](https://example.com/tracker.png)");
    expect(html).toContain("A dipole diagram");
    expect(html).not.toMatch(/<img\b/i);
    expect(html).not.toContain("https://example.com/tracker.png");
    expect(html).not.toContain('rel="preload"');
  });
});
