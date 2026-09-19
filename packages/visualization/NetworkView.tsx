import { Component, useEffect, useMemo, type ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export interface NetworkViewNode {
  id: string;
  label: string;
  x: number;
  z: number;
  groundHeight: number;
  antennaHeight: number;
}
export interface NetworkViewLink {
  id: string;
  from: string;
  to: string;
  color: string;
  obstruction?: { fraction: number; height: number };
}
class NetworkBoundary extends Component<
  { children: ReactNode; onFallback: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="dl-empty">
        3D is unavailable on this device.
        <br />
        The same network and all station controls are available on the map.
        <br />
        <button onClick={this.props.onFallback}>Use planning map</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Controls() {
  const { camera, gl, invalidate } = useThree();
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.target.set(0, 0.6, 0);
    controls.minDistance = 4;
    controls.maxDistance = 24;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.addEventListener("change", () => invalidate());
    controls.update();
    return () => controls.dispose();
  }, [camera, gl, invalidate]);
  return null;
}
function Label({
  text,
  position,
}: {
  text: string;
  position: [number, number, number];
}) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 80;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#142017";
    ctx.fillRect(0, 0, 512, 80);
    ctx.font = "42px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#e1eed6";
    ctx.fillText(text.slice(0, 28), 256, 49);
    return new THREE.CanvasTexture(canvas);
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[2.8, 0.55, 1]}>
      <spriteMaterial map={texture} depthTest={false} />
    </sprite>
  );
}
function Ray({
  from,
  to,
  color,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
}) {
  const geometry = useMemo(
    () =>
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...from),
        new THREE.Vector3(...to),
      ]),
    [from[0], from[1], from[2], to[0], to[1], to[2]],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const line = useMemo(
    () => new THREE.Line(geometry, new THREE.LineBasicMaterial({ color })),
    [geometry, color],
  );
  useEffect(() => () => line.material.dispose(), [line]);
  return <primitive object={line} />;
}
export function NetworkView({
  nodes,
  links,
  selectedId,
  placing,
  onSelect,
  onPlace,
  onFallback,
}: {
  nodes: NetworkViewNode[];
  links: NetworkViewLink[];
  selectedId: string;
  placing: boolean;
  onSelect: (id: string) => void;
  onPlace: (x: number, z: number) => void;
  onFallback: () => void;
}) {
  const maxHeight = Math.max(
    20,
    ...nodes.map((n) => n.groundHeight + n.antennaHeight),
    ...links.flatMap((l) => (l.obstruction ? [l.obstruction.height] : [])),
  );
  const elevation = (metres: number) => (Math.max(0, metres) / maxHeight) * 2.3;
  const tip = (n: NetworkViewNode): [number, number, number] => [
    n.x,
    0.15 + elevation(n.groundHeight + n.antennaHeight),
    n.z,
  ];
  return (
    <NetworkBoundary onFallback={onFallback}>
      <Canvas
        frameloop="demand"
        camera={{ position: [6, 6, 8], fov: 43 }}
        fallback={
          <div className="dl-empty">
            3D is unavailable.{" "}
            <button onClick={onFallback}>Use planning map</button>
          </div>
        }
        aria-label="3D radio network. Antenna and ground heights are exaggerated. Drag to orbit, scroll to zoom. Use the station selector for accessible editing."
      >
        <color attach="background" args={["#101b15"]} />
        <ambientLight intensity={1.6} />
        <directionalLight position={[3, 10, 2]} intensity={2} />
        <gridHelper args={[12, 24, "#597149", "#2b402e"]} />
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -0.02, 0]}
          onClick={(event) => {
            if (placing) {
              event.stopPropagation();
              onPlace(event.point.x, event.point.z);
            }
          }}
        >
          <planeGeometry args={[12, 12]} />
          <meshBasicMaterial
            color="#15241a"
            transparent
            opacity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
        {links.map((link) => {
          const from = nodes.find((n) => n.id === link.from)!,
            to = nodes.find((n) => n.id === link.to)!;
          return (
            <group key={link.id}>
              <Ray from={tip(from)} to={tip(to)} color={link.color} />
              {link.obstruction && (
                <mesh
                  position={[
                    from.x + (to.x - from.x) * link.obstruction.fraction,
                    elevation(link.obstruction.height) / 2,
                    from.z + (to.z - from.z) * link.obstruction.fraction,
                  ]}
                >
                  <coneGeometry
                    args={[0.65, elevation(link.obstruction.height), 5]}
                  />
                  <meshStandardMaterial color="#65734b" flatShading />
                </mesh>
              )}
            </group>
          );
        })}
        {nodes.map((node) => {
          const height =
            0.15 + elevation(node.groundHeight + node.antennaHeight);
          const active = node.id === selectedId;
          return (
            <group
              key={node.id}
              position={[node.x, 0, node.z]}
              onClick={(event) => {
                if (!placing) {
                  event.stopPropagation();
                  onSelect(node.id);
                }
              }}
            >
              <mesh position={[0, height / 2, 0]}>
                <cylinderGeometry args={[0.025, 0.05, height, 8]} />
                <meshStandardMaterial color={active ? "#d1f888" : "#9fae8b"} />
              </mesh>
              <mesh position={[0, height, 0]}>
                <sphereGeometry args={[active ? 0.16 : 0.12, 16, 16]} />
                <meshStandardMaterial
                  color={active ? "#d1f888" : "#d3dfc4"}
                  emissive={active ? "#536f24" : "#1b2b14"}
                />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <ringGeometry args={[0.22, 0.27, 24]} />
                <meshBasicMaterial
                  color={active ? "#d1f888" : "#708960"}
                  side={THREE.DoubleSide}
                />
              </mesh>
              <Label text={node.label} position={[0, height + 0.45, 0]} />
            </group>
          );
        })}
        <Controls />
      </Canvas>
    </NetworkBoundary>
  );
}
