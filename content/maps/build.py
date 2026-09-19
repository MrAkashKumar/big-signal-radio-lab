import json
import math
import pathlib
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCES = {
    'land': 'ne_50m_land',
    'countries': 'ne_50m_admin_0_countries',
    'lakes': 'ne_50m_lakes',
    'rivers': 'ne_50m_rivers_lake_centerlines',
}
PROPERTIES = ('ADM0_A3', 'NAME_EN', 'NAME', 'CONTINENT', 'LABEL_X', 'LABEL_Y', 'LABELRANK')


def simplify(points, tolerance=0.025):
    if len(points) <= 2:
        return points
    a, b = points[0], points[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = dx * dx + dy * dy
    furthest, index = 0, 0
    for i, p in enumerate(points[1:-1], 1):
        t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length)) if length else 0
        distance = math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
        if distance > furthest:
            furthest, index = distance, i
    if furthest > tolerance:
        return simplify(points[:index + 1], tolerance)[:-1] + simplify(points[index:], tolerance)
    return [a, b]


def coordinates(value):
    if not value:
        return []
    if isinstance(value[0][0], (float, int)):
        original = [[round(p[0], 4), round(p[1], 4)] for p in value]
        reduced = simplify(original)
        return original if original[0] == original[-1] and len(reduced) < 4 else reduced
    return [coordinates(v) for v in value]


for name, source in SOURCES.items():
    if len(sys.argv) > 1:
        data = json.loads((pathlib.Path(sys.argv[1]) / (name + '.json')).read_text())
    else:
        url = f'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/{source}.geojson'
        with urllib.request.urlopen(url) as response:
            data = json.load(response)
    features = []
    for feature in data['features']:
        if name == 'rivers' and feature['properties']['scalerank'] > 5:
            continue
        properties = {key: feature['properties'][key] for key in PROPERTIES} if name == 'countries' else {}
        geometry = feature['geometry']
        features.append({'type': 'Feature', 'properties': properties, 'geometry': {
            'type': geometry['type'], 'coordinates': coordinates(geometry['coordinates'])}})
    output = ROOT / (name + '.geojson')
    output.write_text(json.dumps({'type': 'FeatureCollection', 'features': features}, separators=(',', ':')) + '\n')
    print(f'{output.name}: {len(features)} features, {output.stat().st_size:,} bytes')
