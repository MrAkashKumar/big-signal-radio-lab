import { useMemo, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { countries, type Country } from "./countries";
function position(c: Country) {
  const a = (c.lat * Math.PI) / 180,
    b = (c.lon * Math.PI) / 180;
  return new THREE.Vector3(
    2.33 * Math.cos(a) * Math.cos(b),
    2.33 * Math.sin(a),
    -2.33 * Math.cos(a) * Math.sin(b),
  );
}
export function CountryLabels({
  selected,
  onSelect,
  enabled,
}: {
  selected: string | null;
  onSelect: (c: Country) => void;
  enabled: boolean;
}) {
  const sprites = useRef<(THREE.Sprite | null)[]>([]);
  const entries = useMemo(
    () =>
      countries.map((c) => {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 80;
        const ctx = canvas.getContext("2d")!;
        ctx.font = "500 30px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeStyle = "#061518";
        ctx.lineWidth = 7;
        ctx.lineJoin = "round";
        ctx.strokeText(c.name, 256, 40);
        ctx.fillStyle = "#f1f8e8";
        ctx.fillText(c.name, 256, 40);
        const map = new THREE.CanvasTexture(canvas);
        map.colorSpace = THREE.SRGBColorSpace;
        return { country: c, map, point: position(c) };
      }),
    [],
  );
  useEffect(() => () => entries.forEach((e) => e.map.dispose()), [entries]);
  useFrame(({ camera, size }) => {
    const placed: { x: number; y: number; w: number }[] = [];
    const distance = camera.position.length();
    const order = entries
      .map((e, i) => ({ ...e, i }))
      .sort(
        (a, b) =>
          Number(b.country.id === selected) -
            Number(a.country.id === selected) ||
          a.country.rank - b.country.rank,
      );
    for (const { country: c, point, i } of order) {
      const sprite = sprites.current[i];
      if (!sprite) continue;
      const front = point.dot(camera.position.clone().sub(point)) > 0;
      const p = point.clone().project(camera);
      const x = ((p.x + 1) * size.width) / 2,
        y = ((1 - p.y) * size.height) / 2;
      const w = Math.max(48, c.name.length * 6.4);
      const highlight = c.id === selected;
      const allowed =
        enabled &&
        front &&
        p.z < 1 &&
        Math.abs(p.x) < 0.93 &&
        Math.abs(p.y) < 0.88 &&
        (highlight || distance < 5.5 || c.rank <= 3);
      sprite.visible =
        allowed &&
        (highlight ||
          !placed.some(
            (a) =>
              Math.abs(a.x - x) < (a.w + w) / 2 + 9 && Math.abs(a.y - y) < 26,
          ));
      if (sprite.visible) placed.push({ x, y, w });
      const scale = distance * 0.18;
      sprite.scale.set(scale, (scale * 80) / 512, 1);
      sprite.material.color.set(highlight ? "#d7ff88" : "#ffffff");
    }
  });
  return (
    <>
      {entries.map(({ country, map, point }, i) => (
        <sprite
          key={country.id}
          ref={(el) => {
            sprites.current[i] = el;
          }}
          position={point}
          onClick={(e) => {
            if (!e.object.visible || e.delta > 5) return;
            e.stopPropagation();
            onSelect(country);
          }}
        >
          <spriteMaterial
            map={map}
            transparent
            depthTest={false}
            depthWrite={false}
          />
        </sprite>
      ))}
    </>
  );
}
