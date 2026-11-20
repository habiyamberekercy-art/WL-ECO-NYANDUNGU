/*
# Update zone and pond coordinates to match real Nyandungu Eco-Park location

## Overview
The OSM relation for Nyandungu Urban Wetland Eco Tourism Park (relation 14458649)
has a bounding box of lat -1.9662 to -1.9501, lon 30.1329 to 30.1637.
The previous coordinates placed zones around 30.125-30.136 which was ~1km west
of the actual park. This migration shifts all zone and pond coordinates into the
real park footprint.

## Changes
1. Updates park_zones latitude/longitude for all 6 zones to fit within the real park boundary.
2. Updates ponds latitude/longitude for all 8 ponds to cluster in the wetland area.
3. No structural changes — same columns, same rows, just corrected values.

## Notes
- Zone centers are placed in plausible locations within the park based on the park's
  north-south orientation along the Nyandungu valley.
- Ponds are clustered in the central wetland area where catchment/filtration ponds exist.
*/
UPDATE park_zones SET latitude = -1.9525, longitude = 30.1380 WHERE name = 'Acacia Savannah';
UPDATE park_zones SET latitude = -1.9590, longitude = 30.1500 WHERE name = 'Central Wetland';
UPDATE park_zones SET latitude = -1.9540, longitude = 30.1420 WHERE name = 'Medicinal Garden';
UPDATE park_zones SET latitude = -1.9570, longitude = 30.1460 WHERE name = 'Mixed Woodlands';
UPDATE park_zones SET latitude = -1.9535, longitude = 30.1440 WHERE name = 'Pope''s Garden';
UPDATE park_zones SET latitude = -1.9550, longitude = 30.1550 WHERE name = 'Recreational Zone';

UPDATE ponds SET latitude = -1.9595, longitude = 30.1490 WHERE name = 'Pond 1 - Primary Catchment';
UPDATE ponds SET latitude = -1.9600, longitude = 30.1500 WHERE name = 'Pond 2 - Filtration Basin';
UPDATE ponds SET latitude = -1.9585, longitude = 30.1485 WHERE name = 'Pond 3 - Retention Cell A';
UPDATE ponds SET latitude = -1.9555, longitude = 30.1545 WHERE name = 'Pond 4 - Recreational Lake';
UPDATE ponds SET latitude = -1.9605, longitude = 30.1510 WHERE name = 'Pond 5 - Secondary Catchment';
UPDATE ponds SET latitude = -1.9580, longitude = 30.1475 WHERE name = 'Pond 6 - Bio-retention Cell';
UPDATE ponds SET latitude = -1.9595, longitude = 30.1520 WHERE name = 'Pond 7 - Overflow Basin';
UPDATE ponds SET latitude = -1.9545, longitude = 30.1530 WHERE name = 'Pond 8 - Polishing Pond';
