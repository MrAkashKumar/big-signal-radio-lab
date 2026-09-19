import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { RegionalHospitalNode } from "../../../content/explanations/hospital-network";
import type { Graphics } from "./missions";
import meulaboh from "../../../content/hospital-terrain-meulaboh.json";
import adamMalik from "../../../content/hospital-terrain-adam-malik.json";
import melati from "../../../content/hospital-terrain-melati.json";
import "./hospital-terrain-scene.css";

type Feature = {
  id: number;
  kind: string;
  name: string;
  detail: string;
  closed: boolean;
  points: number[][];
};
type TerrainSite = {
  id: string;
  label: string;
  latitudeDeg: number;
  longitudeDeg: number;
  extentM: number;
  sourceUrl: string;
  snapshotAt: string;
  features: Feature[];
};
type Command = {
  action: "in" | "out" | "left" | "right" | "up" | "down" | "home" | "focus";
  serial: number;
  point?: number[];
};
const sites: TerrainSite[] = [meulaboh, adamMalik, melati];
const colors = {
  building: "#83958c",
  hospital: "#dacb8f",
  road: "#bdc3ad",
  water: "#518f9b",
  green: "#466d55",
};

function clipSegment(
  a: number[],
  b: number[],
  extent: number,
): [number[], number[]] | null {
  let near = 0,
    far = 1;
  const dx = b[0] - a[0],
    dz = b[1] - a[1];
  for (const [p, q] of [
    [-dx, a[0] + extent],
    [dx, extent - a[0]],
    [-dz, a[1] + extent],
    [dz, extent - a[1]],
  ]) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) near = Math.max(near, t);
    else far = Math.min(far, t);
    if (near > far) return null;
  }
  return [
    [a[0] + near * dx, a[1] + near * dz],
    [a[0] + far * dx, a[1] + far * dz],
  ];
}
function clipPolygon(polygon: number[][], extent: number) {
  let points = polygon;
  for (const [axis, boundary, direction] of [
    [0, -extent, 1],
    [0, extent, -1],
    [1, -extent, 1],
    [1, extent, -1],
  ]) {
    const output: number[][] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i],
        b = points[(i + 1) % points.length];
      const aInside = (a[axis] - boundary) * direction >= 0,
        bInside = (b[axis] - boundary) * direction >= 0;
      if (aInside) output.push(a);
      if (aInside !== bInside) {
        const t = (boundary - a[axis]) / (b[axis] - a[axis]);
        output.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
      }
    }
    points = output;
  }
  return points;
}
function inside(point: number[], polygon: number[][]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      result = !result;
  }
  return result;
}
function featureColor(feature: Feature, site: TerrainSite) {
  if (feature.kind !== "building")
    return colors[feature.kind as keyof typeof colors] ?? colors.green;
  return feature.detail === "hospital" ||
    site.features.some(
      (p) => p.kind === "hospital" && inside(feature.points[0], p.points),
    )
    ? colors.hospital
    : colors.building;
}
function roadWidth(feature: Feature) {
  return feature.kind === "water"
    ? feature.detail === "river"
      ? 18
      : 4
    : /primary|secondary|trunk/.test(feature.detail)
      ? 9
      : /footway|path|steps/.test(feature.detail)
        ? 2
        : 5;
}
function centerOf(feature: Feature) {
  return feature.points.reduce(
    (sum, p) => [
      sum[0] + p[0] / feature.points.length,
      sum[1] + p[1] / feature.points.length,
    ],
    [0, 0],
  );
}
function MapGeometry({ site }: { site: TerrainSite }) {
  const geometry = useMemo(() => {
    const batches = new Map<string, THREE.BufferGeometry[]>();
    for (const feature of site.features) {
      const color = featureColor(feature, site);
      let geometries: THREE.BufferGeometry[] = [];
      if (
        feature.closed &&
        feature.kind !== "road" &&
        feature.points.length > 3
      ) {
        const polygon = clipPolygon(feature.points, site.extentM);
        if (polygon.length < 3) continue;
        const shape = new THREE.Shape(
          polygon.map((p) => new THREE.Vector2(p[0], -p[1])),
        );
        const g =
          feature.kind === "building"
            ? new THREE.ExtrudeGeometry(shape, {
                depth: color === colors.hospital ? 11 : 6,
                bevelEnabled: false,
                steps: 1,
              })
            : new THREE.ShapeGeometry(shape);
        g.rotateX(-Math.PI / 2);
        g.translate(
          0,
          feature.kind === "water"
            ? 0.5
            : feature.kind === "hospital"
              ? 0.3
              : 0.15,
          0,
        );
        geometries.push(g);
      } else {
        for (let i = 1; i < feature.points.length; i++) {
          const segment = clipSegment(
            feature.points[i - 1],
            feature.points[i],
            site.extentM,
          );
          if (!segment) continue;
          const [a, b] = segment,
            length = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (length < 0.01) continue;
          const g = new THREE.PlaneGeometry(roadWidth(feature), length);
          g.rotateX(-Math.PI / 2);
          g.rotateY(Math.atan2(b[0] - a[0], b[1] - a[1]));
          g.translate(
            (a[0] + b[0]) / 2,
            feature.kind === "water" ? 0.6 : 0.9,
            (a[1] + b[1]) / 2,
          );
          geometries.push(g);
        }
      }
      if (!batches.has(color)) batches.set(color, []);
      batches.get(color)!.push(...geometries);
    }
    return [...batches].flatMap(([color, parts]) => {
      const normalized = parts.map((p) => {
        const q = p.index ? p.toNonIndexed() : p.clone();
        p.dispose();
        return q;
      });
      const merged = mergeGeometries(normalized);
      normalized.forEach((part) => part.dispose());
      return merged ? [{ color, geometry: merged }] : [];
    });
  }, [site]);
  useEffect(
    () => () => geometry.forEach((item) => item.geometry.dispose()),
    [geometry],
  );
  return (
    <>
      <ambientLight intensity={1.7} />
      <directionalLight position={[100, 500, 200]} intensity={2.1} />
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[site.extentM * 2, site.extentM * 2]} />
        <meshStandardMaterial color="#294a3b" />
      </mesh>
      {geometry.map((item) => (
        <mesh key={item.color} geometry={item.geometry}>
          <meshStandardMaterial
            color={item.color}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      <mesh position={[0, 20, 0]}>
        <cylinderGeometry args={[3, 3, 40, 12]} />
        <meshBasicMaterial color="#f1e7aa" />
      </mesh>
      <mesh position={[0, 46, 0]}>
        <sphereGeometry args={[9, 12, 12]} />
        <meshBasicMaterial color="#f1e7aa" />
      </mesh>
      <mesh position={[0, 1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[20, 23, 40]} />
        <meshBasicMaterial color="#fff3ba" side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}
function TerrainCamera({ command }: { command: Command }) {
  const { camera, gl, invalidate } = useThree();
  const orbit = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.minDistance = 25;
    controls.maxDistance = 2000;
    controls.maxPolarAngle = Math.PI * 0.47;
    controls.target.set(0, 0, 0);
    controls.screenSpacePanning = false;
    const update = () => invalidate();
    controls.addEventListener("change", update);
    controls.update();
    orbit.current = controls;
    return () => {
      controls.removeEventListener("change", update);
      controls.dispose();
    };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    const controls = orbit.current;
    if (!controls) return;
    const offset = camera.position.clone().sub(controls.target);
    if (command.action === "home") {
      camera.position.set(260, 620, 640);
      controls.target.set(0, 0, 0);
    } else if (command.action === "focus") {
      const [x, z] = command.point ?? [0, 0];
      controls.target.set(x, 0, z);
      camera.position.set(x + 55, 140, z + 155);
    } else if (command.action === "in" || command.action === "out") {
      offset.setLength(
        THREE.MathUtils.clamp(
          offset.length() * (command.action === "in" ? 0.65 : 1 / 0.65),
          25,
          2000,
        ),
      );
      camera.position.copy(controls.target).add(offset);
    } else {
      const distance = offset.length() * 0.15;
      const shift = new THREE.Vector3(
        command.action === "left"
          ? -distance
          : command.action === "right"
            ? distance
            : 0,
        0,
        command.action === "up"
          ? -distance
          : command.action === "down"
            ? distance
            : 0,
      );
      controls.target.add(shift);
      camera.position.add(shift);
    }
    controls.update();
    invalidate();
  }, [command, camera, invalidate]);
  return null;
}
function FlatMap({ site, command }: { site: TerrainSite; command: Command }) {
  const [view, setView] = useState({ x: 0, y: 0, span: 1300 });
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    clientX: number;
    clientY: number;
    x: number;
    y: number;
  } | null>(null);
  useEffect(() => {
    setView((v) => {
      if (command.action === "home") return { x: 0, y: 0, span: 1300 };
      if (command.action === "focus")
        return {
          x: command.point?.[0] ?? 0,
          y: command.point?.[1] ?? 0,
          span: 240,
        };
      if (command.action === "in" || command.action === "out")
        return {
          ...v,
          span: THREE.MathUtils.clamp(
            v.span * (command.action === "in" ? 0.65 : 1 / 0.65),
            50,
            2000,
          ),
        };
      return {
        ...v,
        x:
          v.x +
          (command.action === "left"
            ? -v.span * 0.2
            : command.action === "right"
              ? v.span * 0.2
              : 0),
        y:
          v.y +
          (command.action === "up"
            ? -v.span * 0.2
            : command.action === "down"
              ? v.span * 0.2
              : 0),
      };
    });
  }, [command]);
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      setView((v) => ({
        ...v,
        span: THREE.MathUtils.clamp(
          v.span * (event.deltaY > 0 ? 1.15 : 1 / 1.15),
          50,
          2000,
        ),
      }));
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);
  return (
    <svg
      ref={svg}
      className="hospital-terrain-flat"
      viewBox={`${view.x - view.span / 2} ${view.y - view.span / 2} ${view.span} ${view.span}`}
      role="img"
      aria-label={`Modern OpenStreetMap neighborhood around ${site.label}. Gold pin marks hospital. Drag to pan and scroll to zoom.`}
      onPointerDown={(event) => {
        drag.current = {
          clientX: event.clientX,
          clientY: event.clientY,
          x: view.x,
          y: view.y,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        const size = Math.min(
          event.currentTarget.clientWidth,
          event.currentTarget.clientHeight,
        );
        setView((v) => ({
          ...v,
          x:
            drag.current!.x -
            ((event.clientX - drag.current!.clientX) * v.span) / size,
          y:
            drag.current!.y -
            ((event.clientY - drag.current!.clientY) * v.span) / size,
        }));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <defs>
        <clipPath id={`terrain-clip-${site.id}`}>
          <rect
            x={-site.extentM}
            y={-site.extentM}
            width={site.extentM * 2}
            height={site.extentM * 2}
          />
        </clipPath>
      </defs>
      <rect
        x={-site.extentM}
        y={-site.extentM}
        width={site.extentM * 2}
        height={site.extentM * 2}
        fill="#294a3b"
      />
      <g clipPath={`url(#terrain-clip-${site.id})`}>
        {site.features
          .filter((f) => f.kind !== "building")
          .concat(site.features.filter((f) => f.kind === "building"))
          .map((feature) => {
            const points = feature.points.map((p) => p.join(",")).join(" ");
            return feature.closed && feature.kind !== "road" ? (
              <polygon
                key={feature.id}
                points={points}
                fill={featureColor(feature, site)}
                stroke="#243b31"
                strokeWidth={feature.kind === "building" ? 0.6 : 0}
              />
            ) : (
              <polyline
                key={feature.id}
                points={points}
                fill="none"
                stroke={featureColor(feature, site)}
                strokeWidth={roadWidth(feature)}
              />
            );
          })}
        {site.features
          .filter((f) => f.name && (f.kind === "road" || f.kind === "water"))
          .slice(0, 9)
          .map((feature) => {
            const p = centerOf(feature);
            return (
              <text
                key={`label-${feature.id}`}
                x={p[0]}
                y={p[1]}
                fontSize={Math.max(5, view.span / 70)}
                fill="#f0f3da"
                paintOrder="stroke"
                stroke="#20382d"
                strokeWidth={Math.max(1, view.span / 260)}
              >
                {feature.name}
              </text>
            );
          })}
        <circle
          r={Math.max(5, view.span / 75)}
          fill="#f1e7aa"
          stroke="#273e32"
          strokeWidth={2}
        />
        <text
          x={Math.max(9, view.span / 40)}
          y={-Math.max(9, view.span / 40)}
          fill="#fff5be"
          paintOrder="stroke"
          stroke="#1a3027"
          strokeWidth={2}
          fontSize={Math.max(6, view.span / 48)}
        >
          Hospital
        </text>
      </g>
    </svg>
  );
}
class TerrainBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function LocalTerrain({
  site,
  graphics,
}: {
  site: TerrainSite;
  graphics: Graphics;
}) {
  const [command, setCommand] = useState<Command>({
    action: "home",
    serial: 0,
  });
  const [flat, setFlat] = useState(false);
  const useFlat = flat || graphics === "POTATO";
  const roads = [
    ...new Map(
      [...site.features]
        .sort((a, b) => Number(b.kind === "water") - Number(a.kind === "water"))
        .filter(
          (f) =>
            (f.kind === "water" || f.kind === "road") &&
            f.name &&
            centerOf(f).every((v) => Math.abs(v) < site.extentM),
        )
        .map((f) => [f.name, f]),
    ).values(),
  ].slice(0, 5);
  function move(action: Command["action"], point?: number[]) {
    setCommand((c) => ({ action, point, serial: c.serial + 1 }));
  }
  return (
    <div className="hospital-terrain-local">
      <div className="hospital-terrain-heading">
        <div>
          <span>MODERN MAP REFERENCE</span>
          <strong>{site.label}</strong>
        </div>
        <button
          type="button"
          disabled={graphics === "POTATO"}
          aria-pressed={useFlat}
          onClick={() => setFlat((v) => !v)}
        >
          {useFlat ? "Flat map" : "3D buildings"} · switch view
        </button>
      </div>
      <div
        className="hospital-terrain-viewport"
        tabIndex={0}
        role="group"
        aria-label="Local map. Arrow keys pan, plus and minus zoom, Home resets."
        onKeyDown={(event) => {
          const action = (
            {
              ArrowLeft: "left",
              ArrowRight: "right",
              ArrowUp: "up",
              ArrowDown: "down",
              "+": "in",
              "=": "in",
              "-": "out",
              Home: "home",
            } as Record<string, Command["action"]>
          )[event.key];
          if (action) {
            event.preventDefault();
            move(action);
          }
        }}
      >
        {useFlat ? (
          <FlatMap site={site} command={command} />
        ) : (
          <TerrainBoundary fallback={<FlatMap site={site} command={command} />}>
            <Canvas
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
              frameloop="demand"
              dpr={[1, 1.5]}
              camera={{
                position: [260, 620, 640],
                fov: 47,
                near: 1,
                far: 10000,
              }}
              fallback={<FlatMap site={site} command={command} />}
            >
              <MapGeometry site={site} />
              <TerrainCamera command={command} />
            </Canvas>
          </TerrainBoundary>
        )}
        <span className="hospital-terrain-north">
          {useFlat ? "↑ NORTH" : "ORBIT VIEW"}
          <small>{useFlat ? "Flat map north-up" : "Drag to rotate"}</small>
        </span>
        <div className="hospital-terrain-zoom">
          <button
            type="button"
            aria-label="Zoom into local map"
            onClick={() => move("in")}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out of local map"
            onClick={() => move("out")}
          >
            −
          </button>
          <button type="button" onClick={() => move("home")}>
            Reset
          </button>
        </div>
      </div>
      <div className="hospital-terrain-places">
        <button type="button" onClick={() => move("focus", [0, 0])}>
          ◎ Inspect hospital closely
        </button>
        {roads.map((road) => (
          <button
            type="button"
            key={road.id}
            onClick={() => move("focus", centerOf(road))}
          >
            {road.name}
          </button>
        ))}
      </div>
      <div className="hospital-terrain-legend">
        <span>
          <i style={{ background: colors.hospital }} /> Hospital area
        </span>
        <span>
          <i style={{ background: colors.building }} /> Mapped buildings
        </span>
        <span>
          <i style={{ background: colors.road }} /> Roads
        </span>
        <span>
          <i style={{ background: colors.water }} /> Mapped water
        </span>
      </div>
      <p className="hospital-terrain-disclosure">
        {site.features
          .filter((f) => f.kind === "building")
          .length.toLocaleString()}{" "}
        building footprints in this extract.{" "}
        {site.features.every((f) => f.kind !== "building")
          ? "Building footprints are not mapped here; explore the roads and streams, or choose another hospital for buildings. "
          : ""}
        Drag to {useFlat ? "pan" : "orbit; right-drag to pan"}. Scroll or use +
        to inspect individual structures. This 1.3 km map uses modern mapped
        footprints, roads and waterways where available. Missing map features
        are not evidence of empty land. Flat ground; road widths and 6–11 m
        building heights are illustrative. No 2005 building layout, flood depth
        or measured elevation is implied.
      </p>
      <p className="hospital-terrain-credit">
        <a
          href="https://www.openstreetmap.org/copyright"
          target="_blank"
          rel="noreferrer"
        >
          © OpenStreetMap contributors · ODbL
        </a>
        <span>Snapshot {site.snapshotAt.slice(0, 10)}</span>
        <a href={site.sourceUrl} target="_blank" rel="noreferrer">
          Modern hospital map source ↗
        </a>
      </p>
    </div>
  );
}
export function HospitalTerrainScene({
  node,
  graphics,
}: {
  node: RegionalHospitalNode;
  graphics: Graphics;
}) {
  const [alternative, setAlternative] = useState("");
  useEffect(() => setAlternative(""), [node.id]);
  const direct = sites.find((site) => site.id === node.id);
  const site = direct ?? sites.find((item) => item.id === alternative);
  return (
    <div className="hospital-terrain-scene">
      {!direct && (
        <div className="hospital-terrain-unavailable">
          <strong>
            A precise neighborhood map is not established for {node.shortLabel}.
          </strong>
          <p>
            Its historical pin identifies a town or reported station. We do not
            place a temporary hospital into today's buildings. Explore a
            supported modern hospital reference instead.
          </p>
          <div>
            {sites.map((item) => (
              <button
                type="button"
                key={item.id}
                aria-pressed={alternative === item.id}
                onClick={() => setAlternative(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {site && (
        <LocalTerrain
          key={`${node.id}-${site.id}`}
          site={site}
          graphics={graphics}
        />
      )}
    </div>
  );
}
