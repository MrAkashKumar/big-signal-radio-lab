import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("shared hover styles", () => {
  for (const file of ["style.css", "workshop-theme.css"]) {
    it(`${file} does not override component backgrounds on generic hover`, () => {
      const css = readFileSync(new URL(file, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
      const generic = rules.filter(([, selector]) => /^\s*:where\((?:\.product-app )?button:hover:not\(:disabled\)\)\s*$/.test(selector));
      expect(generic).toHaveLength(1);
      expect(generic[0][2]).not.toMatch(/background(?:-color)?\s*:/);
    });
  }
});
