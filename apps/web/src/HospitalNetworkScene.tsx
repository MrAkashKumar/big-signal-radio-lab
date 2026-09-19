import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  greatCircleDistanceM,
  interpolateGreatCircle,
} from "../../../packages/propagation/src";
import type {
  RegionalHospitalNode,
  RegionalHospitalLink,
} from "../../../content/explanations/hospital-network";
import landData from "../../../content/land.geojson?raw";
import { Scene } from "./Scene";
import { HospitalTerrainScene } from "./HospitalTerrainScene";
import "./hospital-network-scene.css";

type Props = ComponentProps<typeof Scene> & {
  nodes: readonly RegionalHospitalNode[];
  routes: readonly RegionalHospitalLink[];
  selectedRouteId: string;
  voiceReady?: boolean;
  demo?: boolean;
  onSelectRoute: (id: string) => void;
};
type V3 = [number, number, number];
type XY = [number, number];
type Nav = { kind: "home" | "left" | "right" | "in" | "out"; serial: number };
type Land = {
  features: {
    geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: number[][][] | number[][][][];
    };
  }[];
};
const polygons = (JSON.parse(landData) as Land).features.flatMap(
  ({ geometry }) =>
    geometry.type === "Polygon"
      ? [geometry.coordinates as number[][][]]
      : (geometry.coordinates as number[][][][]),
);
const bounds = { west: 94.5, east: 99.6, south: 0.55, north: 6.1 };
const project = (lon: number, lat: number): V3 => [
  (lon - 97.05) * 1.48,
  0.12,
  -(lat - 3.325) * 1.48,
];
const position = (node: RegionalHospitalNode) => ({
  latitudeDeg: node.latitudeDeg,
  longitudeDeg: node.longitudeDeg,
  altitudeM: 0,
});
function clipRing(ring: number[][]): XY[] {
  let output = ring.map((p) => [p[0], p[1]] as XY);
  for (const [axis, limit, sign] of [
    [0, bounds.west, 1],
    [0, bounds.east, -1],
    [1, bounds.south, 1],
    [1, bounds.north, -1],
  ]) {
    const input = output;
    output = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[i],
        b = input[(i + 1) % input.length];
      const aIn = (a[axis] - limit) * sign >= 0,
        bIn = (b[axis] - limit) * sign >= 0;
      if (aIn) output.push(a);
      if (aIn !== bIn) {
        const t = (limit - a[axis]) / (b[axis] - a[axis]);
        output.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
  }
  return output;
}
const regionalRings = polygons
  .map((polygon) => clipRing(polygon[0]))
  .filter((ring) => ring.length > 2);
function Box({ at, size, color }: { at: V3; size: V3; color: string }) {
  return (
    <mesh position={at} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}
function Line({
  points,
  color,
  dashed = false,
  opacity = 1,
}: {
  points: V3[];
  color: string;
  dashed?: boolean;
  opacity?: number;
}) {
  const object = useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const material = dashed
      ? new THREE.LineDashedMaterial({
          color,
          dashSize: 0.12,
          gapSize: 0.09,
          transparent: true,
          opacity,
        })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }, [points, color, dashed, opacity]);
  useEffect(
    () => () => {
      object.geometry.dispose();
      object.material.dispose();
    },
    [object],
  );
  return <primitive object={object} />;
}
function Coast() {
  const shapes = useMemo(
    () =>
      regionalRings.map((ring) => {
        const shape = new THREE.Shape();
        ring.forEach(([lon, lat], i) => {
          const [x, , z] = project(lon, lat);
          if (i === 0) shape.moveTo(x, -z);
          else shape.lineTo(x, -z);
        });
        shape.closePath();
        return shape;
      }),
    [],
  );
  return (
    <>
      <Box at={[0, -0.16, 0]} size={[8, 0.27, 8.6]} color="#142c26" />
      <Box at={[0, -0.01, 0]} size={[8, 0.035, 8.6]} color="#24483d" />
      {shapes.map((shape, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.015, 0]}
          receiveShadow
        >
          <extrudeGeometry
            args={[shape, { depth: 0.065, bevelEnabled: false }]}
          />
          <meshStandardMaterial color="#628367" roughness={1} flatShading />
        </mesh>
      ))}
      {[1, 2, 3, 4, 5, 6].map((lat) => (
        <Line
          key={lat}
          points={[
            project(bounds.west, lat).map((v, i) =>
              i === 1 ? 0.005 : v,
            ) as V3,
            project(bounds.east, lat).map((v, i) =>
              i === 1 ? 0.005 : v,
            ) as V3,
          ]}
          color="#659281"
          opacity={0.25}
        />
      ))}
    </>
  );
}
function Station({
  node,
  active,
}: {
  node: RegionalHospitalNode;
  active: boolean;
}) {
  const at = project(node.longitudeDeg, node.latitudeDeg);
  return (
    <group position={at}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry
          args={[active ? 0.19 : 0.12, active ? 0.23 : 0.145, 24]}
        />
        <meshBasicMaterial color={active ? "#dfedb2" : "#afc2a3"} />
      </mesh>
      {node.kind === "field-hospital" ? (
        <>
          <Box at={[0, 0.1, 0]} size={[0.24, 0.15, 0.19]} color="#cad1b2" />
          <mesh position={[0, 0.21, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.18, 0.13, 4]} />
            <meshStandardMaterial color="#dce0bd" flatShading />
          </mesh>
        </>
      ) : (
        <>
          <Box at={[0, 0.09, 0]} size={[0.25, 0.17, 0.19]} color="#e2e6d3" />
          <Box at={[0, 0.19, 0]} size={[0.28, 0.045, 0.22]} color="#899b7d" />
          {node.kind === "hospital" && (
            <Box
              at={[0, 0.105, 0.105]}
              size={[0.09, 0.045, 0.01]}
              color="#4c735d"
            />
          )}
        </>
      )}
      {node.callSign && (
        <>
          <mesh position={[0.11, 0.25, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.38, 5]} />
            <meshBasicMaterial color="#dce5bd" />
          </mesh>
          <mesh position={[0.11, 0.45, 0]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshBasicMaterial color="#dce5bd" />
          </mesh>
        </>
      )}
    </group>
  );
}
function movingRoute(
  from: RegionalHospitalNode,
  to: RegionalHospitalNode,
): V3[] {
  const a = project(from.longitudeDeg, from.latitudeDeg),
    b = project(to.longitudeDeg, to.latitudeDeg);
  return Array.from({ length: 41 }, (_, i) => {
    const t = i / 40;
    return [a[0] + (b[0] - a[0]) * t, 0.31, a[2] + (b[2] - a[2]) * t] as V3;
  });
}
function Traffic({ points }: { points: V3[] }) {
  const ref = useRef<THREE.Mesh>(null);
  const { invalidate } = useThree();
  useFrame(({ clock }) => {
    const index = (clock.elapsedTime * 12) % (points.length - 1);
    ref.current?.position
      .copy(new THREE.Vector3(...points[Math.floor(index)]))
      .lerp(new THREE.Vector3(...points[Math.floor(index) + 1]), index % 1);
    invalidate();
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.055, 10, 10]} />
      <meshBasicMaterial color="#eff6cc" />
    </mesh>
  );
}
function MapControls({ navigation }: { navigation: Nav }) {
  const { camera, gl, invalidate } = useThree();
  const ref = useRef<OrbitControls | null>(null);
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    ref.current = controls;
    controls.target.set(0, 0, 0);
    controls.minDistance = 4;
    controls.maxDistance = 19;
    controls.maxPolarAngle = Math.PI * 0.36;
    controls.minPolarAngle = 0.05;
    const refresh = () => invalidate();
    controls.addEventListener("change", refresh);
    controls.update();
    return () => {
      controls.removeEventListener("change", refresh);
      controls.dispose();
    };
  }, [camera, gl, invalidate]);
  useEffect(() => {
    const orbit = ref.current;
    if (!orbit) return;
    if (navigation.kind === "home") {
      camera.position.set(0, 9.6, 6.2);
      orbit.target.set(0, 0, 0);
    } else {
      const offset = camera.position.clone().sub(orbit.target);
      if (navigation.kind === "left" || navigation.kind === "right")
        offset.applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          navigation.kind === "left" ? -0.25 : 0.25,
        );
      else
        offset.setLength(
          THREE.MathUtils.clamp(
            offset.length() * (navigation.kind === "in" ? 0.85 : 1.18),
            4,
            19,
          ),
        );
      camera.position.copy(orbit.target).add(offset);
    }
    orbit.update();
    invalidate();
  }, [navigation, camera, invalidate]);
  return null;
}
type LabelElements = Map<
  string,
  { label: HTMLButtonElement | null; line: SVGLineElement | null }
>;
function LabelLayout({
  nodes,
  elements,
}: {
  nodes: readonly RegionalHospitalNode[];
  elements: React.RefObject<LabelElements>;
}) {
  const { camera, size } = useThree();
  useFrame(() => {
    const labels = nodes.map((node) => {
      const p = new THREE.Vector3(
        ...project(node.longitudeDeg, node.latitudeDeg),
      );
      p.y = 0.3;
      p.project(camera);
      return {
        node,
        x: ((p.x + 1) * size.width) / 2,
        y: ((1 - p.y) * size.height) / 2,
      };
    });
    const width = size.width < 600 ? 106 : 152;
    for (const side of [-1, 1]) {
      const group = labels
        .filter((p) => (p.node.longitudeDeg < 96.6 ? -1 : 1) === side)
        .sort((a, b) => a.y - b.y);
      let previous = 10;
      group.forEach((p, index) => {
        const y = Math.max(
          previous,
          Math.min(p.y - 8, size.height - 22 * (group.length - index)),
        );
        const x = side < 0 ? 9 : size.width - width - 9;
        previous = y + 23;
        const item = elements.current.get(p.node.id);
        if (!item) return;
        if (item.label) {
          item.label.style.transform = `translate(${x}px, ${y}px)`;
          item.label.style.width = `${width}px`;
        }
        if (item.line) {
          item.line.setAttribute("x1", String(p.x));
          item.line.setAttribute("y1", String(p.y));
          item.line.setAttribute("x2", String(side < 0 ? x + width : x));
          item.line.setAttribute("y2", String(y + 8));
        }
      });
    }
  });
  return null;
}
function GlobeCoasts({ rings }: { rings: V3[][] }) {
  const object = useMemo(() => {
    const vertices: number[] = [];
    for (const ring of rings)
      for (let i = 1; i < ring.length; i++)
        vertices.push(...ring[i - 1], ...ring[i]);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3),
    );
    return new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({
        color: "#748b67",
        transparent: true,
        opacity: 0.7,
      }),
    );
  }, [rings]);
  useEffect(
    () => () => {
      object.geometry.dispose();
      object.material.dispose();
    },
    [object],
  );
  return <primitive object={object} />;
}
function GlobeInset({
  from,
  to,
  simple,
}: {
  from: RegionalHospitalNode;
  to: RegionalHospitalNode;
  simple: boolean;
}) {
  const center = interpolateGreatCircle(position(from), position(to), 0.5);
  const geo = (lat: number, lon: number, radius = 1): V3 => {
    const a = (lat * Math.PI) / 180,
      b = ((lon - center.longitudeDeg) * Math.PI) / 180;
    return [
      radius * Math.cos(a) * Math.sin(b),
      radius * Math.sin(a),
      radius * Math.cos(a) * Math.cos(b),
    ];
  };
  const coast = useMemo(
    () =>
      polygons
        .flatMap((p) => p.slice(0, 1))
        .map((ring) =>
          ring.filter((_, i) => i % 4 === 0).map((p) => geo(p[1], p[0], 1.006)),
        )
        .filter((ring) => ring.length > 2),
    [center.longitudeDeg],
  );
  const arc = useMemo(
    () =>
      Array.from({ length: 51 }, (_, i) => {
        const p = interpolateGreatCircle(position(from), position(to), i / 50);
        return geo(p.latitudeDeg, p.longitudeDeg, 1.015);
      }),
    [from, to],
  );
  const axis = new THREE.Vector3(1, 0, 0);
  const projected = (point: V3) =>
    new THREE.Vector3(...point).applyAxisAngle(
      axis,
      (center.latitudeDeg * Math.PI) / 180,
    );
  const svgPath = (ring: V3[]) => {
    let pen = false;
    return ring
      .map((point) => {
        const p = projected(point);
        if (p.z < 0) {
          pen = false;
          return "";
        }
        const command = pen ? "L" : "M";
        pen = true;
        return `${command}${100 + p.x * 80},${90 - p.y * 80}`;
      })
      .join(" ");
  };
  const fallback = (
    <svg
      viewBox="0 0 200 180"
      className="hospital-network-globe-svg"
      role="img"
      aria-label="Globe centered on the selected endpoints with their geographic surface route"
    >
      <circle cx="100" cy="90" r="80" fill="#243d32" stroke="#6a865c" />
      <path
        d={coast.map(svgPath).join(" ")}
        stroke="#7f986e"
        strokeWidth="0.5"
        fill="none"
      />
      <path d={svgPath(arc)} stroke="#eef3cf" strokeWidth="2" fill="none" />
    </svg>
  );
  if (simple) return fallback;
  return (
    <MapBoundary fallback={fallback}>
      <Canvas
        fallback={fallback}
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.2, 3.3], fov: 40 }}
      >
        <ambientLight intensity={2} />
        <group rotation={[(center.latitudeDeg * Math.PI) / 180, 0, 0]}>
          <mesh>
            <sphereGeometry args={[1, 40, 24]} />
            <meshStandardMaterial color="#243d32" />
          </mesh>
          <GlobeCoasts rings={coast} />
          <Line points={arc} color="#e1edb6" />
          {[from, to].map((node) => (
            <mesh
              key={node.id}
              position={geo(node.latitudeDeg, node.longitudeDeg, 1.025)}
            >
              <sphereGeometry args={[0.025, 8, 8]} />
              <meshBasicMaterial color="#f2f4d9" />
            </mesh>
          ))}
        </group>
      </Canvas>
    </MapBoundary>
  );
}
function MapFallback({
  nodes,
  routes,
  selectedRouteId,
  onSelectRoute,
}: Pick<Props, "nodes" | "routes" | "selectedRouteId" | "onSelectRoute">) {
  const xy = (node: RegionalHospitalNode): XY => [
    310 + project(node.longitudeDeg, node.latitudeDeg)[0] * 49,
    225 + project(node.longitudeDeg, node.latitudeDeg)[2] * 49,
  ];
  return (
    <svg
      viewBox="0 0 620 470"
      className="hospital-network-fallback"
      role="img"
      aria-label="Geographic map of documented relief hospitals and connections across northern Sumatra. All markers are approximate area locations."
    >
      <rect x="85" y="10" width="450" height="435" fill="#23473c" />
      {regionalRings.map((ring, i) => (
        <polygon
          key={i}
          points={ring
            .map(([lon, lat]) => {
              const [x, , z] = project(lon, lat);
              return `${310 + x * 49},${225 + z * 49}`;
            })
            .join(" ")}
          fill="#628367"
          stroke="#819976"
          strokeWidth="0.5"
        />
      ))}
      {routes.map((route) => {
        const a = nodes.find((n) => n.id === route.from),
          b = nodes.find((n) => n.id === route.to);
        if (!a || !b) return null;
        const [x1, y1] = xy(a),
          [x2, y2] = xy(b);
        return (
          <line
            key={route.id}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={route.id === selectedRouteId ? "#edf2c4" : "#b9c89d"}
            strokeWidth={route.id === selectedRouteId ? 3 : 1.5}
            strokeDasharray={
              route.kind === "patient-transfer" ? "5 4" : undefined
            }
            onClick={() => {
              if (route.id !== "custom") onSelectRoute(route.id);
            }}
          />
        );
      })}
      {nodes.map((node, index) => {
        const [x, y] = xy(node);
        return (
          <g key={node.id}>
            <circle cx={x} cy={y} r="4" fill="#eff1d9" />
            <text x={x + 7} y={y - 6} fill="#eff1d9" fontSize="10">
              {node.id.startsWith("custom-") ? node.shortLabel : index + 1}
            </text>
          </g>
        );
      })}
      <text x="310" y="465" textAnchor="middle" fill="#d0dbbd" fontSize="11">
        Numbers match the map key. Geographic connections, not propagation
        paths.
      </text>
    </svg>
  );
}
class MapBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onFailure?: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure?.();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function HospitalNetworkScene(props: Props) {
  const [mode, setMode] = useState<"map" | "rf" | "local">("map");
  const [globe, setGlobe] = useState(false);
  const [showAll, setShowAll] = useState(!props.demo);
  const [sceneFailed, setSceneFailed] = useState(false);
  const simple = props.graphics === "POTATO" || sceneFailed;
  const [localNodeId, setLocalNodeId] = useState(props.nodes[0]?.id ?? "");
  const [navigation, setNavigation] = useState<Nav>({
    kind: "home",
    serial: 0,
  });
  const elements = useRef<LabelElements>(new Map());
  const route = props.routes.find((r) => r.id === props.selectedRouteId);
  const historicalFrom = props.nodes.find((n) => n.id === route?.from),
    historicalTo = props.nodes.find((n) => n.id === route?.to);
  const custom = props.selectedRouteId === "custom";
  const customNode = (
    id: string,
    endpoint: Props["scenario"]["transmitter"]["position"],
  ): RegionalHospitalNode =>
    props.nodes.find(
      (node) =>
        Math.abs(node.latitudeDeg - endpoint.latitudeDeg) < 0.0001 &&
        Math.abs(node.longitudeDeg - endpoint.longitudeDeg) < 0.0001,
    ) ?? {
      id,
      label: id === "custom-tx" ? "Custom transmitter" : "Custom receiver",
      shortLabel: id === "custom-tx" ? "Custom TX" : "Custom RX",
      kind: "coordination",
      latitudeDeg: endpoint.latitudeDeg,
      longitudeDeg: endpoint.longitudeDeg,
      note: "Experiment coordinates, not a historical station.",
    };
  const from = custom
    ? customNode("custom-tx", props.scenario.transmitter.position)
    : historicalFrom;
  const to = custom
    ? customNode("custom-rx", props.scenario.receiver.position)
    : historicalTo;
  const inRegion = (node: RegionalHospitalNode) =>
    node.longitudeDeg >= bounds.west &&
    node.longitudeDeg <= bounds.east &&
    node.latitudeDeg >= bounds.south &&
    node.latitudeDeg <= bounds.north;
  const displayNodes =
    custom && from && to
      ? [
          ...props.nodes,
          ...[from, to].filter(
            (node) =>
              inRegion(node) &&
              !props.nodes.some((known) => known.id === node.id),
          ),
        ]
      : showAll
        ? props.nodes
        : props.nodes.filter(
            (node) => node.id === from?.id || node.id === to?.id,
          );
  const customOnMap = custom && from && to && inRegion(from) && inRegion(to);
  const displayRoutes: readonly RegionalHospitalLink[] = custom
    ? customOnMap
      ? [
          {
            id: "custom",
            from: from.id,
            to: to.id,
            kind: "radio",
            label: "Custom experiment",
            evidence: "Experiment coordinates, not a historical connection.",
            sourceUrl: "",
          },
        ]
      : []
    : showAll
      ? props.routes
      : props.routes.filter((link) => link.id === props.selectedRouteId);
  const localNode =
    props.nodes.find((node) => node.id === localNodeId) ?? props.nodes[0];
  useEffect(() => {
    const node =
      historicalFrom?.kind !== "coordination"
        ? historicalFrom
        : historicalTo?.kind !== "coordination"
          ? historicalTo
          : historicalFrom;
    if (node) setLocalNodeId(node.id);
  }, [historicalFrom?.id, historicalTo?.id]);
  const selected = new Set([from?.id, to?.id]);
  const fallback = (
    <MapFallback {...props} nodes={displayNodes} routes={displayRoutes} />
  );
  const navigate = (kind: Nav["kind"]) =>
    setNavigation((n) => ({ kind, serial: n.serial + 1 }));
  function element(id: string) {
    let value = elements.current.get(id);
    if (!value) {
      value = { label: null, line: null };
      elements.current.set(id, value);
    }
    return value;
  }
  return (
    <div
      className={`hospital-network-scene ${props.demo ? "hospital-network-demo" : ""} ${mode === "rf" ? "hospital-network-rf" : ""}`}
    >
      {!props.demo && props.voiceReady !== undefined && (
        <div className="hospital-network-result" role="status">
          {props.voiceReady
            ? "Voice link and reply available in this experiment"
            : "Message waiting · no usable two-way voice connection"}
        </div>
      )}
      <div className="hospital-network-toolbar">
        <div role="group" aria-label="Regional map view">
          <button
            type="button"
            aria-pressed={mode === "map"}
            onClick={() => setMode("map")}
          >
            Hospital network
          </button>
          {!props.demo && (
            <button
              type="button"
              aria-pressed={mode === "rf"}
              onClick={() => setMode("rf")}
            >
              RF path
            </button>
          )}
          <button
            type="button"
            aria-pressed={mode === "local"}
            onClick={() => setMode("local")}
          >
            Local terrain
          </button>
        </div>
        {props.demo && mode === "map" && (
          <button
            type="button"
            aria-pressed={showAll}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Our connection" : "All hospitals"}
          </button>
        )}
        {mode === "map" && (
          <button
            type="button"
            aria-pressed={globe}
            onClick={() => setGlobe((v) => !v)}
          >
            See the distance
          </button>
        )}
      </div>
      {mode === "rf" ? (
        <div className="hospital-network-rf-view">
          <Scene
            {...props}
            view={
              props.scenario.environment.model === "hf-skywave"
                ? "globe"
                : "terrain"
            }
          />
        </div>
      ) : mode === "local" && localNode ? (
        <>
          <label className="hospital-network-local-select">
            Explore the surroundings
            <select
              aria-label="Hospital or station surroundings"
              value={localNode.id}
              onChange={(event) => setLocalNodeId(event.target.value)}
            >
              {props.nodes.map((node) => (
                <option key={node.id} value={node.id}>
                  {node.label}
                </option>
              ))}
            </select>
          </label>
          <HospitalTerrainScene node={localNode} graphics={props.graphics} />
        </>
      ) : (
        <>
          {!props.demo && (
            <div className="hospital-network-heading">
              <span>NORTHERN SUMATRA · 2004–2005 RESPONSE</span>
              <p>
                {custom
                  ? "Your custom geographic experiment"
                  : "Many hospitals. One urgent need to connect."}
              </p>
              <small>
                {custom && from && to
                  ? `TX ${from.latitudeDeg.toFixed(3)}°, ${from.longitudeDeg.toFixed(3)}° · RX ${to.latitudeDeg.toFixed(3)}°, ${to.longitudeDeg.toFixed(3)}°. No historical connection implied. Globe shows endpoints beyond this regional map.`
                  : "Approximate area locations. Coastline map, not surveyed hospital sites."}
              </small>
            </div>
          )}
          <div
            className="hospital-network-map"
            tabIndex={simple ? -1 : 0}
            role="group"
            aria-label={
              simple
                ? "Regional hospital geographic plan. Station numbers match the map key below."
                : "Regional hospital map. Drag to rotate, scroll to zoom. Arrow keys rotate, plus and minus zoom, Home resets."
            }
            onKeyDown={(event) => {
              if (simple) return;
              const key: Partial<Record<string, Nav["kind"]>> = {
                ArrowLeft: "left",
                ArrowRight: "right",
                "+": "in",
                "=": "in",
                "-": "out",
                Home: "home",
              };
              if (key[event.key]) {
                event.preventDefault();
                navigate(key[event.key]!);
              }
            }}
          >
            {simple ? (
              fallback
            ) : (
              <MapBoundary
                fallback={fallback}
                onFailure={() => setSceneFailed(true)}
              >
                <Canvas
                  frameloop="demand"
                  dpr={[1, 1.5]}
                  camera={{ position: [0, 9.6, 6.2], fov: 44 }}
                  fallback={fallback}
                >
                  <ambientLight intensity={1.5} />
                  <directionalLight position={[5, 10, 4]} intensity={1.5} />
                  <Coast />
                  <MapControls navigation={navigation} />
                  <LabelLayout nodes={displayNodes} elements={elements} />
                  {displayNodes.map((node) => (
                    <Station
                      key={node.id}
                      node={node}
                      active={selected.has(node.id)}
                    />
                  ))}
                  {!custom &&
                    displayRoutes.map((link) => {
                      const a = props.nodes.find((n) => n.id === link.from),
                        b = props.nodes.find((n) => n.id === link.to);
                      if (!a || !b) return null;
                      const points = movingRoute(a, b);
                      return (
                        <group key={link.id}>
                          <Line
                            points={points}
                            color={
                              link.id === props.selectedRouteId
                                ? "#e1edb6"
                                : "#b2c39b"
                            }
                            dashed={link.kind === "patient-transfer"}
                            opacity={
                              link.id === props.selectedRouteId ? 1 : 0.45
                            }
                          />
                          {props.running &&
                            props.voiceReady &&
                            link.id === props.selectedRouteId &&
                            link.kind === "radio" && (
                              <Traffic points={points} />
                            )}
                        </group>
                      );
                    })}
                  {customOnMap && (
                    <Line
                      points={movingRoute(from, to)}
                      color="#e1edb6"
                      dashed
                    />
                  )}
                </Canvas>
              </MapBoundary>
            )}
            {!simple && (
              <div className="hospital-network-labels">
                <svg aria-hidden="true">
                  {displayNodes.map((node) => (
                    <line
                      key={node.id}
                      ref={(ref) => {
                        element(node.id).line = ref;
                      }}
                      className={selected.has(node.id) ? "selected" : ""}
                    />
                  ))}
                </svg>
                {displayNodes.map((node, index) => (
                  <button
                    type="button"
                    key={node.id}
                    ref={(ref) => {
                      element(node.id).label = ref;
                    }}
                    className={selected.has(node.id) ? "selected" : ""}
                    disabled={
                      !props.nodes.some((known) => known.id === node.id)
                    }
                    onClick={() => {
                      setLocalNodeId(node.id);
                      setMode("local");
                    }}
                    aria-label={`Explore ${node.label}`}
                  >
                    <b>{node.id.startsWith("custom-") ? "·" : index + 1}</b>
                    {node.shortLabel}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!simple && (
            <div className="hospital-network-map-controls">
              <button
                type="button"
                onClick={() => navigate("left")}
                aria-label="Rotate regional map left"
              >
                ↶
              </button>
              <button
                type="button"
                onClick={() => navigate("right")}
                aria-label="Rotate regional map right"
              >
                ↷
              </button>
              <button
                type="button"
                onClick={() => navigate("in")}
                aria-label="Zoom regional map in"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => navigate("out")}
                aria-label="Zoom regional map out"
              >
                −
              </button>
              <button type="button" onClick={() => navigate("home")}>
                Reset map
              </button>
            </div>
          )}
          {(globe || custom) && from && to && (
            <aside className="hospital-network-globe">
              {!custom && (
                <button
                  type="button"
                  onClick={() => setGlobe(false)}
                  aria-label="Close distance globe"
                >
                  ×
                </button>
              )}
              <MapBoundary fallback={<span>Geographic distance</span>}>
                <GlobeInset
                  from={from}
                  to={to}
                  simple={props.graphics === "POTATO"}
                />
              </MapBoundary>
              <strong>
                {Math.round(
                  greatCircleDistanceM(position(from), position(to)) / 1000,
                )}{" "}
                km apart
              </strong>
              <small>Surface distance · not an RF path</small>
            </aside>
          )}
          {simple && (
            <div className="hospital-network-plan-key">
              {displayNodes.map((node, index) => (
                <span key={node.id}>
                  {index + 1}. {node.shortLabel}
                </span>
              ))}
            </div>
          )}
          <div className="hospital-network-legend">
            {custom ? (
              <span>
                <i />
                Custom experiment connection
              </span>
            ) : (
              <>
                <span>
                  <i />
                  Documented radio connection
                </span>
                {displayRoutes.some(
                  (route) => route.kind === "patient-transfer",
                ) && (
                  <span>
                    <i className="transfer" />
                    Patient transfer
                  </span>
                )}
              </>
            )}
            <small>
              {props.demo ? (
                "Approximate locations · select a hospital to explore."
              ) : (
                <>
                  {props.running && props.voiceReady
                    ? "Moving dot = your simulated transmission. "
                    : ""}
                  {custom
                    ? "Custom endpoints have no historical association. Use RF path for calculated propagation."
                    : "Connections show documented activity, not continuous coverage. Use RF path for calculated propagation."}
                </>
              )}
            </small>
          </div>
        </>
      )}
    </div>
  );
}
