# Bundled visual assets

The globe uses Natural Earth **1:50 million** vector cartography, bundled locally so country search, coastlines, lakes, and major rivers work offline. This replaces the earlier 1:110 million map with more detailed islands and coastlines, including a selectable Singapore polygon.

| Asset | Source | Bundled size |
| --- | --- | ---: |
| `countries.geojson` | [Admin-0 countries](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson) | 921,293 bytes |
| `land.geojson` | [Land](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_land.geojson) | 715,365 bytes |
| `lakes.geojson` | [Lakes](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_lakes.geojson) | 174,735 bytes |
| `rivers.geojson` | [Rivers and lake centerlines](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_rivers_lake_centerlines.geojson) | 178,440 bytes |

Total: **1,989,833 bytes** before transport compression. The source snapshot was downloaded on 13 September 2026. [Natural Earth data is public domain](https://www.naturalearthdata.com/about/terms-of-use/); attribution is provided for provenance.

`maps/build.py` reproduces the transformation with the Python standard library: retain country navigation properties, simplify linework with a 0.025-degree Douglas–Peucker tolerance, round coordinates to four decimal places, preserve closed rings, and keep rivers with source scale rank at most 5. Run `python3 content/maps/build.py` to download and rebuild, or pass a directory containing the four original `land.json`, `countries.json`, `lakes.json`, and `rivers.json` files. This is a display optimization; decimal precision does not imply survey accuracy.

The 242 admin-0 entries are cartographic map units, not a count of sovereign countries. Boundaries and labels follow Natural Earth's conventions and can be disputed. Coordinates shown by search are label locations, not capitals or radio positions. Very small features remain generalized or omitted at this scale.

The 4096 × 2048 globe texture, atmosphere, stars, terrain mesh, and radio markers are generated locally. Coastlines, water bodies, and borders are geographic context only. They do not supply elevation, obstructions, or RF loss. The separate terrain view remains a schematic illustration, not a real elevation dataset or an RF model.
