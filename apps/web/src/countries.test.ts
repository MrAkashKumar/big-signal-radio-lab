import { describe, it, expect } from "vitest";
import { countries, countryAt, searchCountries } from "./countries";
describe("country navigation data", () => {
  it("has unique ids and finite navigable label coordinates", () => {
    expect(new Set(countries.map((c) => c.id)).size).toBe(countries.length);
    for (const c of countries) {
      expect(Number.isFinite(c.lat) && Math.abs(c.lat) <= 90).toBe(true);
      expect(Number.isFinite(c.lon) && Math.abs(c.lon) <= 180).toBe(true);
    }
  });
  it("searches names and codes without case sensitivity", () => {
    expect(searchCountries("jApAn")[0].id).toBe("JPN");
    expect(searchCountries("SGP")[0].name).toBe("Singapore");
    expect(searchCountries("nothing-matches")).toEqual([]);
  });
  it("preserves Southeast Asian islands and their selectable geometry", () => {
    expect(searchCountries("SGP")[0].polygons.length).toBeGreaterThan(0);
    expect(countryAt(103.82, 1.35)?.id).toBe("SGP");
    expect(countryAt(101.69, 3.14)?.id).toBe("MYS");
    expect(countryAt(106.85, -6.2)?.id).toBe("IDN");
  });
  it("selects land without assigning an ocean click to a country", () => {
    expect(countryAt(2.35, 48.86)?.name).toBe("France");
    expect(countryAt(139.7, 35.7)?.name).toBe("Japan");
    expect(countryAt(-30, 0)).toBeUndefined();
  });
});
