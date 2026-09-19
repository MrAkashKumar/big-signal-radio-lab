import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { simulateScenario, validateScenario, type Scenario, type SimulationResult } from '@bigsignal/simulation';
import { scenarioIds, loadExampleScenario } from '@bigsignal/simulation/examples';
import type { CalculationNode } from '@bigsignal/contracts';
import { hzToMhz, mhzToHz } from '../../units/src';
import './style.css';

const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => element<HTMLInputElement>(id);
const preset = element<HTMLSelectElement>('preset');
const editor = element<HTMLTextAreaElement>('scenario');
let scenario: Scenario = loadExampleScenario('hf-day');
for (const id of scenarioIds) {
  const option = document.createElement('option');
  option.value = id;
  option.textContent = loadExampleScenario(id).title;
  preset.append(option);
}
preset.value = scenario.id;
const stage = element('globe');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 1e-7, 100);
camera.up.set(0, 0, 1);
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
stage.append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 0.000001;
controls.maxDistance = 8;
const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), new THREE.MeshBasicMaterial({ color: 0x143758 }));
scene.add(earth);
const grid = new THREE.Mesh(new THREE.SphereGeometry(1.0005, 128, 96), new THREE.MeshBasicMaterial({ color: 0x408599, wireframe: true, transparent: true, opacity: 0.22 }));
scene.add(grid);
const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshBasicMaterial({ color: 0xb581ef, transparent: true, opacity: 0.12, depthWrite: false }));
scene.add(shell);
const paths = new THREE.Group();
scene.add(paths);
const markers = [0x7cf7df, 0xffb8ce].map(color => {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ color, depthTest: false }));
  scene.add(sprite);
  return sprite;
});
const earthRadiusM = 6371000;
function geographic(lat: number, lon: number, altitudeM: number) {
  const phi = THREE.MathUtils.degToRad(lat), theta = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(Math.cos(phi) * Math.cos(theta), Math.cos(phi) * Math.sin(theta), Math.sin(phi)).multiplyScalar(1 + altitudeM / earthRadiusM);
}
function wholeGlobe() { controls.target.set(0, 0, 0); camera.position.set(3.2, 1.8, 1.5); controls.update(); }
function viewLink() {
  const bounds = new THREE.Box3();
  markers.forEach(marker => bounds.expandByPoint(marker.position));
  paths.children.forEach(path => bounds.expandByObject(path));
  const center = bounds.getCenter(new THREE.Vector3());
  const distance = Math.max(bounds.getSize(new THREE.Vector3()).length() * 1.8, 0.00002);
  controls.target.copy(center);
  camera.position.copy(center).add(center.clone().normalize().multiplyScalar(distance));
  controls.update();
}
function draw(result: SimulationResult) {
  for (const path of [...paths.children]) {
    paths.remove(path);
    const line = path as THREE.Line;
    line.geometry.dispose();
    (line.material as THREE.Material).dispose();
  }
  shell.visible = scenario.environment.model === 'hf-skywave';
  if (scenario.environment.model === 'hf-skywave') shell.scale.setScalar(1 + scenario.environment.effectiveHeightM / earthRadiusM);
  [scenario.transmitter, scenario.receiver].forEach((station, i) => markers[i].position.copy(geographic(station.position.latitudeDeg, station.position.longitudeDeg, station.position.altitudeM + station.antenna.heightM)));
  for (const path of result.propagationPaths) {
    const points = path.points.map(point => point.lat !== undefined && point.lon !== undefined
      ? geographic(point.lat, point.lon, point.altitudeM ?? 0)
      : new THREE.Vector3((point.localX ?? 0) / earthRadiusM, (point.localY ?? 0) / earthRadiusM, (point.localZ ?? 0) / earthRadiusM));
    paths.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0xffd276 })));
  }
  element('path-description').textContent = `${result.propagationPaths.length} engine path(s): ${result.propagationPaths.map(path => `${path.type} (${path.points.length} vertices)`).join(', ') || 'none'}. Straight segments connect the returned vertices; heights use true Earth scale.`;
}
function paragraph(parent: HTMLElement, text: string) { const p = document.createElement('p'); p.textContent = text; parent.append(p); }
function calculation(node: CalculationNode): HTMLElement {
  const detail = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = `${node.label}: ${node.value.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${node.unit}`;
  detail.append(summary);
  if (node.equation) paragraph(detail, node.equation);
  node.assumptions?.forEach(assumption => paragraph(detail, assumption));
  node.children?.forEach(child => detail.append(calculation(child)));
  return detail;
}
function renderResults(result: SimulationResult) {
  const output = element('results'); output.replaceChildren();
  if (!result.propagationAvailable) {
    const notice = document.createElement('div'); notice.className = 'notice';
    notice.textContent = 'NO SUPPORTED RETURN PATH. Numeric power, SNR and margin are hypothetical, not a reception prediction.'; output.append(notice);
  }
  for (const [label, value] of [['Status', result.success.toUpperCase()], ['RX power', `${result.receivedPowerDbm.toFixed(2)} dBm`], ['Noise', `${result.noiseFloorDbm.toFixed(2)} dBm`], ['SNR', `${result.snrDb.toFixed(2)} dB`], ['Required SNR', `${result.requiredSnrDb.toFixed(2)} dB`], ['Margin', `${result.linkMarginDb.toFixed(2)} dB`]]) {
    const metric = document.createElement('div'); metric.className = 'metric'; metric.textContent = label;
    const strong = document.createElement('strong'); strong.textContent = value; metric.append(strong); output.append(metric);
  }
  const warnings = element('warnings'); warnings.replaceChildren();
  paragraph(warnings, `Confidence: ${result.confidence.level}. ${result.confidence.reasons.join(' ')}`);
  result.warnings.forEach(warning => paragraph(warnings, warning));
  const factors = element('factors'); factors.replaceChildren();
  result.limitingFactors.forEach(factor => paragraph(factors, `${factor.label} · possible improvement ${factor.possibleImprovementDb.toFixed(2)} dB · confidence ${factor.confidence}. ${factor.explanationKey}`));
  if (!result.limitingFactors.length) paragraph(factors, 'No ranked improvement is available under the current model.');
  element('math').replaceChildren(...result.calculations.map(calculation));
  element('raw').textContent = JSON.stringify(result, null, 2);
}
function syncControls() {
  element('title').textContent = scenario.title;
  input('frequency').value = String(hzToMhz(scenario.frequencyHz));
  input('power').value = String(scenario.transmitter.powerDbm);
  input('height').value = String(scenario.transmitter.antenna.heightM);
  input('time').value = scenario.time.utcIso;
  editor.value = JSON.stringify(scenario, null, 2);
}
function run(candidate: unknown) {
  try {
    const parsed = validateScenario(candidate);
    const result = simulateScenario(parsed);
    scenario = parsed;
    syncControls(); renderResults(result); draw(result);
    element('error').textContent = '';
  } catch (error) { element('error').textContent = `Input rejected. ${error instanceof Error ? error.message : String(error)}. Results still show the last valid run.`; }
}
element<HTMLFormElement>('controls').addEventListener('submit', event => {
  event.preventDefault();
  try {
    const candidate = structuredClone(scenario);
    candidate.frequencyHz = mhzToHz(input('frequency').valueAsNumber);
    candidate.transmitter.powerDbm = input('power').valueAsNumber;
    candidate.transmitter.antenna.heightM = input('height').valueAsNumber;
    candidate.time.utcIso = input('time').value;
    run(candidate);
  } catch (error) { element('error').textContent = `${String(error)}. Results still show the last valid run.`; }
});
element('apply').onclick = () => { try { run(JSON.parse(editor.value)); } catch (error) { element('error').textContent = `Invalid JSON. ${String(error)}. Results still show the last valid run.`; } };
const reset = () => { run(loadExampleScenario(preset.value)); wholeGlobe(); };
preset.onchange = reset;
element('reset').onclick = reset;
element('world').onclick = wholeGlobe;
element('link').onclick = viewLink;
new ResizeObserver(() => { renderer.setSize(stage.clientWidth, stage.clientHeight); camera.aspect = stage.clientWidth / stage.clientHeight; camera.updateProjectionMatrix(); }).observe(stage);
function frame() {
  controls.update();
  markers.forEach((marker, i) => {
    marker.scale.setScalar(Math.max(camera.position.distanceTo(marker.position) * 0.01, 0.0000001));
    const screen = marker.position.clone().project(camera);
    const label = element(i === 0 ? 'tx' : 'rx');
    label.style.display = screen.z < 1 && screen.z > -1 ? 'block' : 'none';
    label.style.left = `${(screen.x + 1) * stage.clientWidth / 2 + 8}px`;
    label.style.top = `${(-screen.y + 1) * stage.clientHeight / 2}px`;
  });
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
run(scenario); wholeGlobe(); frame();
