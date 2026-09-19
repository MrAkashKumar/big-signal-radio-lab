import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { PropagationPath, Scenario } from "../../../packages/contracts";
import type { Graphics } from "./missions";
import { terrainProjection } from "./terrainProjection";
import landData from "../../../content/land.geojson?raw";
import lakeData from "../../../content/lakes.geojson?raw";
import riverData from "../../../content/rivers.geojson?raw";
import {
  countries,
  countryAt,
  searchCountries,
  type Country,
} from "./countries";
import { CountryLabels } from "./CountryLabels";
import { SchematicScene } from "./SchematicScene";
import "./country-map.css";
type Navigation = {
  kind: "focus" | "in" | "out" | "left" | "right" | "home";
  serial: number;
  lat?: number;
  lon?: number;
};

function geo(lat: number, lon: number, altitude = 0) {
  const a = (lat * Math.PI) / 180;
  const b = (lon * Math.PI) / 180;
  const r = 2.3 * (1 + altitude / 6371000);
  return new THREE.Vector3(
    r * Math.cos(a) * Math.cos(b),
    r * Math.sin(a),
    -r * Math.cos(a) * Math.sin(b),
  );
}
function Controls({
  navigation,
  home,
}: {
  navigation: Navigation;
  home: THREE.Vector3;
}) {
  const { camera, gl, invalidate } = useThree();
  const orbit = useRef<OrbitControls | null>(null);
  const flight = useRef<THREE.Vector3 | null>(null);
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    orbit.current = controls;
    controls.enablePan = false;
    controls.minDistance = 3.5;
    controls.maxDistance = 18;
    controls.addEventListener("change", () => invalidate());
    controls.addEventListener("start", () => {
      flight.current = null;
    });
    return () => controls.dispose();
  }, [camera, gl, invalidate]);
  useEffect(() => {
    if (!navigation.serial) return;
    const target = camera.position.clone();
    if (navigation.kind === "focus")
      target
        .copy(geo(navigation.lat!, navigation.lon!))
        .normalize()
        .multiplyScalar(5);
    if (navigation.kind === "home") target.copy(home);
    if (navigation.kind === "in")
      target.setLength(Math.max(3.5, target.length() * 0.8));
    if (navigation.kind === "out")
      target.setLength(Math.min(18, target.length() * 1.25));
    if (navigation.kind === "left" || navigation.kind === "right")
      target.applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        navigation.kind === "left" ? -0.35 : 0.35,
      );
    flight.current = target;
    invalidate();
  }, [navigation]);
  useFrame((_, delta) => {
    if (!flight.current) return;
    const alpha = 1 - Math.exp(-Math.min(delta, 0.05) * 7);
    const length = THREE.MathUtils.lerp(
      camera.position.length(),
      flight.current.length(),
      alpha,
    );
    const direction = camera.position.clone().normalize();
    const rotation = new THREE.Quaternion().setFromUnitVectors(
      direction,
      flight.current.clone().normalize(),
    );
    direction.applyQuaternion(new THREE.Quaternion().slerp(rotation, alpha));
    camera.position.copy(direction.multiplyScalar(length));
    orbit.current?.update();
    if (camera.position.distanceTo(flight.current) < 0.005) {
      camera.position.copy(flight.current);
      flight.current = null;
    }
    invalidate();
  });
  return null;
}
function Polyline({
  points,
  color = "#cbfb65",
}: {
  points: THREE.Vector3[];
  color?: string;
}) {
  const object = useMemo(
    () =>
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.75,
        }),
      ),
    [points, color],
  );
  useEffect(
    () => () => {
      object.geometry.dispose();
      (object.material as THREE.Material).dispose();
    },
    [object],
  );
  return <primitive object={object} />;
}
function Pulse({
  points,
  running,
}: {
  points: THREE.Vector3[];
  running: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const progress = useRef(0);
  useEffect(() => {
    progress.current = 0;
  }, [running]);
  useFrame((_, delta) => {
    if (!ref.current || !running || points.length < 2) return;
    progress.current = Math.min(progress.current + delta / 1.8, 0.999);
    const t = progress.current * (points.length - 1);
    const index = Math.floor(t);
    ref.current.position.copy(points[index]).lerp(points[index + 1], t - index);
  });
  return (
    <mesh ref={ref} visible={running}>
      <sphereGeometry args={[0.075, 12, 12]} />
      <meshBasicMaterial color="#e4ffad" />
    </mesh>
  );
}
type MapGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };
function mapPolygons(raw: string): number[][][][] {
  return (JSON.parse(raw) as { features: { geometry: MapGeometry }[] }).features.flatMap(({ geometry }) =>
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates,
  );
}
const landPolygons = mapPolygons(landData);
const lakePolygons = mapPolygons(lakeData);
const rivers = (JSON.parse(riverData) as { features: { geometry: { type: string; coordinates: number[][] | number[][][] } }[] }).features.flatMap(({ geometry }) =>
  geometry.type === "LineString" ? [geometry.coordinates as number[][]] : geometry.coordinates as number[][][],
);
function Globe({
  graphics,
  selected,
  onSelect,
}: {
  graphics: Graphics;
  selected: string | null;
  onSelect: (c: Country) => void;
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 4096;
    canvas.height = 2048;
    const ctx = canvas.getContext("2d")!;
    const ocean = "#153947";
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const project = ([lon, lat]: number[]) => [
      ((lon + 180) / 360) * canvas.width,
      ((90 - lat) / 180) * canvas.height,
    ];
    const trace = (polygon: number[][][]) => {
      ctx.beginPath();
      for (const ring of polygon) {
        ring.forEach((p, i) => {
          const [x, y] = project(p);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
      }
    };
    for (const polygon of landPolygons) {
      trace(polygon);
      ctx.fillStyle = "#577b68";
      ctx.fill("evenodd");
      ctx.strokeStyle = "#90b59a";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    for (const country of countries) {
      for (const polygon of country.polygons) {
        trace(polygon);
        if (country.id === selected) {
          ctx.fillStyle = "#9aad5d";
          ctx.fill("evenodd");
        }
        ctx.strokeStyle = country.id === selected ? "#e4ff99" : "#789982";
        ctx.lineWidth = country.id === selected ? 2.5 : 0.7;
        ctx.stroke();
      }
    }
    for (const polygon of lakePolygons) {
      trace(polygon);
      ctx.fillStyle = ocean;
      ctx.fill("evenodd");
      ctx.strokeStyle = "#89aca0";
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    ctx.strokeStyle = "#376774";
    ctx.lineWidth = 0.8;
    ctx.lineJoin = "round";
    for (const river of rivers) {
      ctx.beginPath();
      river.forEach((point, i) => {
        const [x, y] = project(point);
        if (!i) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    return map;
  }, [selected]);
  useEffect(() => () => texture.dispose(), [texture]);
  const grid = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    for (let lat = -60; lat <= 60; lat += 30)
      lines.push(Array.from({ length: 73 }, (_, i) => geo(lat, i * 5, 10000)));
    for (let lon = 0; lon < 360; lon += 30)
      lines.push(
        Array.from({ length: 37 }, (_, i) => geo(-90 + i * 5, lon, 10000)),
      );
    return lines;
  }, []);
  return (
    <>
      <mesh
        onClick={(e) => {
          if (e.delta > 5) return;
          const p = e.point.clone().normalize();
          const country = countryAt(
            (Math.atan2(-p.z, p.x) * 180) / Math.PI,
            (Math.asin(p.y) * 180) / Math.PI,
          );
          if (country) onSelect(country);
        }}
      >
        <sphereGeometry
          args={[
            2.3,
            graphics === "POTATO" ? 24 : 64,
            graphics === "POTATO" ? 16 : 48,
          ]}
        />
        <meshStandardMaterial
          map={texture}
          color="#e0eade"
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>
      {grid.map((p, i) => (
        <Polyline key={i} points={p} color="#27605a" />
      ))}
      <mesh>
        <sphereGeometry args={[2.49, 32, 24]} />
        <meshBasicMaterial
          color="#b5f871"
          transparent
          opacity={0.045}
          wireframe={graphics === "BIG"}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[2.39, 48, 32]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexShader={
            "varying vec3 vNormal; varying vec3 vPosition; void main(){vNormal=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vPosition=p.xyz;gl_Position=projectionMatrix*p;}"
          }
          fragmentShader={
            "varying vec3 vNormal; varying vec3 vPosition; void main(){float rim=pow(1.-max(dot(normalize(vNormal),normalize(-vPosition)),0.),3.);gl_FragColor=vec4(.25,.75,1.,rim*.55);}"
          }
        />
      </mesh>
    </>
  );
}
function Stars({ graphics }: { graphics: Graphics }) {
  const geometry = useMemo(() => {
    const points = Array.from(
      { length: graphics === "POTATO" ? 100 : 500 },
      (_, i) => {
        const y = 1 - 2 * ((i * 0.6180339) % 1);
        const a = i * 2.39996;
        const r = Math.sqrt(1 - y * y);
        return new THREE.Vector3(
          Math.cos(a) * r * 35,
          y * 35,
          Math.sin(a) * r * 35,
        );
      },
    );
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [graphics]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <points geometry={geometry}>
      <pointsMaterial
        color="#a5c8cd"
        size={0.045}
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}
function Beam({ points }: { points: THREE.Vector3[] }) {
  const geometry = useMemo(() => {
    const curve = new THREE.CurvePath<THREE.Vector3>();
    for (let i = 1; i < points.length; i++)
      curve.add(new THREE.LineCurve3(points[i - 1], points[i]));
    return new THREE.TubeGeometry(curve, 64, 0.012, 6, false);
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial color="#dbff8d" />
    </mesh>
  );
}
function Terrain({ graphics, projection }: { graphics: Graphics; projection: ReturnType<typeof terrainProjection> }) {
  const terrain = useMemo(() => {
    const mesh = new THREE.PlaneGeometry(
      11,
      6,
      graphics === "POTATO" ? 32 : 64,
      graphics === "POTATO" ? 18 : 40,
    );
    const p = mesh.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const ridge = projection.ground(x);
      const detail = 0.12 * Math.sin(x * 3 + y * 2) * Math.sin(y * 3);
      p.setZ(i, Math.max(0.04, ridge + detail));
    }
    mesh.computeVertexNormals();
    return mesh;
  }, [graphics, projection]);
  useEffect(() => () => terrain.dispose(), [terrain]);
  return (
    <>
      <mesh
        geometry={terrain}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
      >
        <meshStandardMaterial color="#426b59" roughness={0.95} flatShading />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.17, 0]}>
        <boxGeometry args={[11, 6, 0.2]} />
        <meshStandardMaterial color="#1a3431" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <planeGeometry args={[12, 7, 12, 7]} />
        <meshStandardMaterial color="#183e34" wireframe />
      </mesh>
      {projection.stations.map(({ x, ground, tip }) => (
        <group key={x} position={[x, ground, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
            <ringGeometry args={[0.25, 0.28, 40]} />
            <meshBasicMaterial
              color={x < 0 ? "#d3ff78" : "#70ddff"}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[0.4, 0.16, 0.3]} />
            <meshStandardMaterial color="#d7dccc" />
          </mesh>
          <mesh position={[0, (tip - ground) / 2, 0]}>
            <cylinderGeometry args={[0.035, 0.035, tip - ground, 8]} />
            <meshBasicMaterial color="#dbfb8a" />
          </mesh>
          <mesh position={[0, tip - ground, 0]}>
            <sphereGeometry args={[0.09, 12, 12]} />
            <meshBasicMaterial color="#dbfb8a" />
          </mesh>
        </group>
      ))}
    </>
  );
}
class Boundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function Scene({
  band,
  view,
  graphics,
  scenario,
  paths,
  running,
  fresnel,
}: {
  band: string;
  fresnel?: { fraction: number; radiusM: number }[];
  view: "globe" | "terrain";
  graphics: Graphics;
  scenario: Scenario;
  paths: PropagationPath[];
  running: boolean;
}) {
  const globe = view === "globe";
  const [selected, setSelected] = useState<Country | null>(null);
  const [query, setQuery] = useState("");
  const [showLabels, setShowLabels] = useState(true);
  const [navigation, setNavigation] = useState<Navigation>({
    kind: "home",
    serial: 0,
  });
  const home = useMemo(
    () =>
      new THREE.Vector3(
        ...((globe ? (band === "HF" ? [-4, 3, -6] : [7, 3, 2]) : [7, 5, 9]) as [
          number,
          number,
          number,
        ]),
      ),
    [globe, band],
  );
  function navigate(kind: Navigation["kind"], lat?: number, lon?: number) {
    setNavigation((n) => ({ kind, lat, lon, serial: n.serial + 1 }));
  }
  function selectCountry(country: Country) {
    setSelected(country);
    setQuery("");
    navigate("focus", country.lat, country.lon);
  }
  const matches = query.trim() ? searchCountries(query).slice(0, 7) : [];
  useEffect(() => {
    setSelected(null);
    setQuery("");
    setNavigation({ kind: "home", serial: 0 });
  }, [band, view]);
  const projection = useMemo(() => terrainProjection(scenario), [scenario]);
  const converted = useMemo(
    () =>
      paths
        .map((path) =>
          path.points.flatMap((p) =>
            globe
              ? p.lat !== undefined && p.lon !== undefined
                ? [geo(p.lat, p.lon, p.altitudeM)]
                : []
              : (() => {
                  const position = projection.point(p);
                  return position ? [new THREE.Vector3(...position)] : [];
                })(),
          ),
        )
        .filter((p) => p.length >= 2),
    [paths, globe, projection],
  );
  const tx = scenario.transmitter.position;
  const rx = scenario.receiver.position;
  return (
    <div
      className="scene"
      role="region"
      aria-label={`${band} ${view}. ${globe ? "Schematic Earth with geographic transmitter and receiver markers." : "Illustrative ridge between transmitter on the left and receiver on the right."} Paths come from the educational propagation engine. Terrain spacing and heights are exaggerated for visibility.`}
    >
      {graphics === "POTATO" ? <SchematicScene scenario={scenario} paths={paths} running={running} view={view} fresnel={fresnel}/> : <Boundary fallback={<SchematicScene scenario={scenario} paths={paths} running={running} view={view} fresnel={fresnel}/>} >
        <Canvas
          key={`${band}-${view}`}
          camera={{
            position: globe
              ? band === "HF"
                ? [-4, 3, -6]
                : [7, 3, 2]
              : [7, 5, 9],
            fov: 43,
          }}
          dpr={graphics === "BIG" ? [1, 1.5] : 1}
          frameloop={running ? "always" : "demand"}
          fallback={<SchematicScene scenario={scenario} paths={paths} running={running} view={view} fresnel={fresnel}/>}
        >
          <ambientLight intensity={1.8} />
          <directionalLight
            position={[-3, 5, 5]}
            intensity={3}
            color="#dfffd7"
          />
          <Controls navigation={navigation} home={home} />
          <Stars graphics={graphics} />
          {globe ? (
            <>
              <Globe
                graphics={graphics}
                selected={selected?.id ?? null}
                onSelect={selectCountry}
              />
              <CountryLabels
                selected={selected?.id ?? null}
                enabled={showLabels}
                onSelect={selectCountry}
              />
              {selected && <mesh position={geo(selected.lat,selected.lon,70000)}><sphereGeometry args={[.025,12,12]} /><meshBasicMaterial color="#e8ff9a" /></mesh>}
              {[tx, rx].map((p, i) => (
                <mesh
                  key={i}
                  position={geo(p.latitudeDeg, p.longitudeDeg, 40000)}
                >
                  <sphereGeometry args={[0.045, 12, 12]} />
                  <meshBasicMaterial color={i ? "#f8b56c" : "#d3ff78"} />
                </mesh>
              ))}
            </>
          ) : (
            <Terrain graphics={graphics} projection={projection} />
          )}
          {!globe && fresnel && fresnel.length > 0 && <group>
            {fresnel.filter((_, i) => i % 4 === 0).map(({ fraction, radiusM }) => {
              const tx = projection.stations[0];
              const rx = projection.stations[1];
              const x = tx.x + fraction * (rx.x - tx.x);
              const y = tx.tip + fraction * (rx.tip - tx.tip);
              const radius = projection.metresToScene(radiusM);
              const ring = Array.from({ length: 49 }, (_, i) => {
                const angle = i / 48 * Math.PI * 2;
                return new THREE.Vector3(x, y + Math.cos(angle) * radius, Math.sin(angle) * radius);
              });
              return <Polyline key={fraction} points={ring} color="#80caca" />;
            })}
          </group>}
          {converted.map((points, i) => (
            <group key={i}>
              <Polyline points={points} />
              <Beam points={points} />
              <Pulse points={points} running={running} />
            </group>
          ))}
        </Canvas>
      </Boundary>}
      {globe && graphics !== "POTATO" && (
        <div className="country-toolbar">
          <label htmlFor="country-search">EXPLORE THE WORLD</label>
          <div className="country-search-wrap">
            <span>⌕</span>
            <input
              id="country-search"
              placeholder="Search a country…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setQuery("");
                if (e.key === "Enter" && matches[0]) selectCountry(matches[0]);
              }}
            />
          </div>
          {query.trim() && (
            <div
              className="country-options"
              aria-label="Country search results"
            >
              {matches.length ? (
                matches.map((c) => (
                  <button key={c.id} onClick={() => selectCountry(c)}>
                    <b>{c.name}</b>
                    <small>{c.region} ↗</small>
                  </button>
                ))
              ) : (
                <p>No matching country in this map.</p>
              )}
            </div>
          )}
          <button
            className="labels-toggle"
            aria-pressed={showLabels}
            onClick={() => setShowLabels(!showLabels)}
          >
            {showLabels ? "◉" : "○"} Country names
          </button>
        </div>
      )}
      {graphics !== "POTATO" && <div className="map-navigation" aria-label="Map navigation">
        <button
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => navigate("in")}
        >
          ＋
        </button>
        <button
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => navigate("out")}
        >
          −
        </button>
        <button
          aria-label="Rotate west"
          title="Rotate west"
          onClick={() => navigate("left")}
        >
          ←
        </button>
        <button
          aria-label="Rotate east"
          title="Rotate east"
          onClick={() => navigate("right")}
        >
          →
        </button>
        <button
          aria-label="Reset map view"
          title="Reset map view · north up"
          onClick={() => {
            setSelected(null);
            navigate("home");
          }}
        >
          ⌂
        </button>
        {globe && (
          <>
            <button
              title="Go to transmitter"
              onClick={() => navigate("focus", tx.latitudeDeg, tx.longitudeDeg)}
            >
              TX
            </button>
            <button
              title="Go to receiver"
              onClick={() => navigate("focus", rx.latitudeDeg, rx.longitudeDeg)}
            >
              RX
            </button>
          </>
        )}
      </div>}
      {globe && graphics !== "POTATO" && selected && (
        <div className="country-card" aria-live="polite">
          <span className="eyebrow">{selected.region} / SELECTED COUNTRY</span>
          <h3>{selected.name}</h3>
          <p>
            {Math.abs(selected.lat).toFixed(2)}° {selected.lat >= 0 ? "N" : "S"}{" "}
            · {Math.abs(selected.lon).toFixed(2)}°{" "}
            {selected.lon >= 0 ? "E" : "W"}
          </p>
          <small>Map label location · radios unchanged</small>
          <button
            aria-label="Clear selected country"
            onClick={() => setSelected(null)}
          >
            ×
          </button>
        </div>
      )}
      {graphics !== "POTATO" && <div className={`scene-key ${globe ? "country-map-key" : ""}`}>
        <span>● TX / BASE CAMP</span>
        <span>● RX / REMOTE TEAM</span>
        {globe && (
          <span>◌ {band === "HF" ? "IONOSPHERE" : "SCHEMATIC EARTH"}</span>
        )}
      </div>}
    </div>
  );
}
