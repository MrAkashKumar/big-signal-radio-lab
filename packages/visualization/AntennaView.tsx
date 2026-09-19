import { Component, useEffect, useMemo, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import type { WirePoint, WireSegment } from "./wireGeometry";
export type { WirePoint, WireSegment } from "./wireGeometry";
export interface PatternPoint {
  x: number;
  y: number;
  z: number;
}

class ViewBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <p className="dl-muted">
        3D is unavailable here. All geometry coordinates and calculations remain
        available below.
      </p>
    ) : (
      this.props.children
    );
  }
}
function Controls() {
  const { camera, gl, invalidate } = useThree();
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.minDistance = 2;
    controls.maxDistance = 30;
    controls.addEventListener("change", () => invalidate());
    controls.update();
    return () => controls.dispose();
  }, [camera, gl, invalidate]);
  return null;
}
function Wire({
  a,
  b,
  selected,
}: {
  a: THREE.Vector3;
  b: THREE.Vector3;
  selected: boolean;
}) {
  const midpoint = a.clone().add(b).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
  return (
    <mesh position={midpoint} quaternion={quaternion}>
      <cylinderGeometry
        args={[
          selected ? 0.042 : 0.025,
          selected ? 0.042 : 0.025,
          a.distanceTo(b),
          8,
        ]}
      />
      <meshStandardMaterial
        color={selected ? "#ffbc72" : "#d1f888"}
        emissive={selected ? "#805019" : "#355120"}
      />
    </mesh>
  );
}
export function AntennaView({
  points,
  segments,
  feedpoint,
  heightM,
  orientationDeg,
}: {
  points: WirePoint[];
  segments: WireSegment[];
  feedpoint: string;
  heightM: number;
  orientationDeg: number;
}) {
  const scale = useMemo(
    () =>
      4 /
      Math.max(
        1,
        ...points.flatMap((p) => [
          Math.abs(p.x),
          Math.abs(p.y + heightM),
          Math.abs(p.z),
        ]),
      ),
    [points, heightM],
  );
  const position = (p: WirePoint) =>
    new THREE.Vector3(p.x * scale, (p.y + heightM) * scale, p.z * scale);
  return (
    <ViewBoundary>
      <Canvas
        fallback={
          <div className="dl-empty">
            3D is unavailable here. Geometry coordinates and numeric results
            remain available below.
          </div>
        }
        frameloop="demand"
        camera={{ position: [7, 5, 7], fov: 45 }}
        aria-label="Interactive 3D wire antenna geometry. Drag to orbit, scroll to zoom."
      >
        <color attach="background" args={["#101913"]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[4, 8, 4]} intensity={2} />
        <gridHelper args={[12, 24, "#486044", "#233125"]} />
        <group rotation={[0, (orientationDeg * Math.PI) / 180, 0]}>
          {segments.map((s) => {
            const a = points.find((p) => p.id === s.from);
            const b = points.find((p) => p.id === s.to);
            return a && b ? (
              <Wire
                key={s.id}
                a={position(a)}
                b={position(b)}
                selected={s.id === feedpoint}
              />
            ) : null;
          })}
          {points.map((p) => (
            <mesh key={p.id} position={position(p)}>
              <sphereGeometry args={[0.065, 12, 12]} />
              <meshStandardMaterial color="#e9efe3" />
            </mesh>
          ))}
        </group>
        <Controls />
      </Canvas>
    </ViewBoundary>
  );
}
export function RadiationView({ points }: { points: PatternPoint[] }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        points.flatMap((p) => [p.x * 2.5, p.y * 2.5, p.z * 2.5]),
        3,
      ),
    );
    return g;
  }, [points]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <ViewBoundary>
      <Canvas
        fallback={
          <div className="dl-empty">
            3D is unavailable here. Geometry coordinates and numeric results
            remain available below.
          </div>
        }
        frameloop="demand"
        camera={{ position: [5, 3.5, 5], fov: 45 }}
        aria-label="Normalized analytical antenna radiation pattern. Drag to orbit."
      >
        <color attach="background" args={["#101913"]} />
        <ambientLight intensity={1.5} />
        <gridHelper args={[8, 16, "#486044", "#233125"]} />
        <axesHelper args={[3]} />
        <points geometry={geometry}>
          <pointsMaterial
            color="#d1f888"
            size={0.045}
            transparent
            opacity={0.8}
          />
        </points>
        <mesh>
          <cylinderGeometry args={[0.035, 0.035, 2, 8]} />
          <meshBasicMaterial color="#ffbc72" />
        </mesh>
        <Controls />
      </Canvas>
    </ViewBoundary>
  );
}
