# Modern hospital neighborhood map extracts

These OpenStreetMap extracts support the local terrain explorer. They are modern geographic references, not a reconstruction of December 2004 or January 2005. No claim is made that a modern building existed during the tsunami response. Temporary hospital locations are not mapped into modern campuses.

All files were retrieved on 13 September 2026. Each JSON records the source API's actual `timestamp_osm_base` as `snapshotAt`, its retrieval timestamp, exact query, hospital point and OSM object URL. Mirror snapshots differ. The interface displays each extract's own snapshot date.

| Extract | Hospital reference | Map snapshot | Coverage |
| --- | --- | --- | --- |
| `hospital-terrain-meulaboh.json` | [RSUD Cut Nyak Dhien, OSM way 1350536137](https://www.openstreetmap.org/way/1350536137), polygon bounding-box center 4.1559501 N, 96.1302815 E | 1 June 2026 | 1,624 building footprints, roads, two mapped drains and hospital boundary |
| `hospital-terrain-adam-malik.json` | [Adam Malik, OSM way 275295457](https://www.openstreetmap.org/way/275295457), reference 3.51839 N, 98.60863 E | 13 September 2026 | 1,899 building footprints, roads, mapped water polygons, green areas and hospital boundary |
| `hospital-terrain-melati.json` | [Melati, OSM node 9791489808](https://www.openstreetmap.org/node/9791489808), reference 3.56613 N, 98.95903 E | 13 September 2026 | Roads, Sei Perbaungan, Sei Sibunga-bunga and a ditch. No building footprints were returned. The interface explicitly identifies this gap. |

Meulaboh's point was verified by querying named hospital objects in the surrounding area through Overpass. Adam Malik's reference also agrees with the [Indonesian Ministry of Health institution listing](https://ditmutunakes.kemkes.go.id/index.php/detail-institusi/rsup-h-adam-malik/4d54417a). Modern location verification does not establish continuity of the 2005 building arrangement.

## Data and rendering

Queries selected OSM ways tagged `building`, `highway`, `waterway`, `natural=water`, `landuse=forest|grass|meadow`, or `amenity=hospital` in a roughly 1.3 km square centered on each reference. `out geom` supplied geographic coordinates. Meulaboh came from `https://overpass.kumi.systems/api/interpreter`; the other extracts came from `https://overpass-api.de/api/interpreter` after mirror timeouts. The precise query is retained in every asset.

Coordinates are projected to local meters using 111,195 meters per latitude degree and the center latitude's cosine for longitude, then rounded to 0.1 meter for compact storage. The rounding is a storage choice, not a claim of survey accuracy. Feature names and OSM way IDs are retained. Relation multipolygons were not requested, so the extract is incomplete and must not be used for navigation or flood modeling.

The scene uses flat ground. All building heights are illustrative: 6 meters for ordinary footprints and 11 meters for hospital footprints. Road and stream widths are display assumptions. A gold mast marks the modern reference point; it is not a mapped historical radio antenna. Sparse mapping is identified in the interface rather than filled with invented houses. The terrain explorer does not calculate RF or modify propagation geometry.

All geometry is bundled. The explorer makes no runtime map-service requests. Source links are optional references.

## Attribution and license

© OpenStreetMap contributors. Source data is available under the [Open Database License](https://www.openstreetmap.org/copyright). The three JSON files are adapted OSM data and remain available under ODbL 1.0. This attribution is displayed in both 3D and flat-map views. Other repository code retains its existing license.
