import raw from "../../../content/countries.geojson?raw";
type Geometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };
type Feature = {
  properties: {
    ADM0_A3: string;
    NAME_EN: string;
    NAME: string;
    CONTINENT: string;
    LABEL_X: number;
    LABEL_Y: number;
    LABELRANK: number;
  };
  geometry: Geometry;
};
export type Country = {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  rank: number;
  polygons: number[][][][];
};
export const countries: Country[] = (
  JSON.parse(raw) as { features: Feature[] }
).features
  .map(({ properties: p, geometry: g }) => ({
    id: p.ADM0_A3,
    name: p.NAME_EN || p.NAME,
    region: p.CONTINENT,
    lat: p.LABEL_Y,
    lon: p.LABEL_X,
    rank: p.LABELRANK,
    polygons: g.type === "Polygon" ? [g.coordinates] : g.coordinates,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
// Small states missing from the coarse map still have searchable location markers.
if (!countries.some((c) => c.id === "SGP"))
  countries.push({
    id: "SGP",
    name: "Singapore",
    region: "Asia",
    lat: 1.35,
    lon: 103.82,
    rank: 6,
    polygons: [],
  });
countries.sort((a, b) => a.name.localeCompare(b.name));
function inside(lon: number, lat: number, ring: number[][]) {
  let result = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [x, y] = ring[i];
    const [xj, yj] = ring[j];
    if (y > lat !== yj > lat && lon < ((xj - x) * (lat - y)) / (yj - y) + x)
      result = !result;
  }
  return result;
}
export function countryAt(lon: number, lat: number) {
  return countries.find((c) =>
    c.polygons.some(
      (p) =>
        inside(lon, lat, p[0]) &&
        !p.slice(1).some((hole) => inside(lon, lat, hole)),
    ),
  );
}
export function searchCountries(query: string) {
  const q = query.trim().toLowerCase();
  return countries.filter(
    (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase() === q,
  );
}
