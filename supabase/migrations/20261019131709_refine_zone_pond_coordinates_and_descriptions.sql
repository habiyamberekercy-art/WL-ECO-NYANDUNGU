/*
 * Refine zone and pond coordinates to better match the real Nyandungu Eco-Park layout.
 * The park runs north-south along the Nyandungu valley. Wetland/ponds are central,
 * gardens on the west, savannah north, woodlands on the slopes, recreation to the east.
 */

-- Zones: spread across the park footprint more realistically
UPDATE park_zones SET latitude = -1.9520, longitude = 30.1365, description = 'Open acacia-dotted grassland at the northern entrance of Nyandungu Eco-Park, featuring native savannah grasses and acacia trees.' WHERE name = 'Acacia Savannah';
UPDATE park_zones SET latitude = -1.9575, longitude = 30.1495, description = 'The heart of Nyandungu — a series of interconnected catchment, filtration, and retention ponds that treat stormwater from the Nyabugogo catchment before it reaches the wetland.' WHERE name = 'Central Wetland';
UPDATE park_zones SET latitude = -1.9535, longitude = 30.1410, description = 'A curated garden showcasing Rwanda''s medicinal plants and traditional herbs, with interpretive signage for visitors.' WHERE name = 'Medicinal Garden';
UPDATE park_zones SET latitude = -1.9560, longitude = 30.1450, description = 'Diverse woodland area with indigenous tree species providing habitat for birds and small mammals along the valley slopes.' WHERE name = 'Mixed Woodlands';
UPDATE park_zones SET latitude = -1.9530, longitude = 30.1435, description = 'A tranquility garden dedicated to Pope John Paul II''s 1990 visit to Kigali, featuring manicured landscapes and contemplative spaces.' WHERE name = 'Pope''s Garden';
UPDATE park_zones SET latitude = -1.9555, longitude = 30.1555, description = 'Recreational center with a lake for boating, walking trails, a restaurant, and picnic areas for ecotourism visitors.' WHERE name = 'Recreational Zone';

-- Ponds: place within the central wetland area in a realistic chain
UPDATE ponds SET latitude = -1.9580, longitude = 30.1475 WHERE name = 'Pond 1 - Primary Catchment';
UPDATE ponds SET latitude = -1.9588, longitude = 30.1490 WHERE name = 'Pond 2 - Filtration Basin';
UPDATE ponds SET latitude = -1.9570, longitude = 30.1480 WHERE name = 'Pond 3 - Retention Cell A';
UPDATE ponds SET latitude = -1.9550, longitude = 30.1545 WHERE name = 'Pond 4 - Recreational Lake';
UPDATE ponds SET latitude = -1.9595, longitude = 30.1505 WHERE name = 'Pond 5 - Secondary Catchment';
UPDATE ponds SET latitude = -1.9575, longitude = 30.1500 WHERE name = 'Pond 6 - Bio-retention Cell';
UPDATE ponds SET latitude = -1.9600, longitude = 30.1515 WHERE name = 'Pond 7 - Overflow Basin';
UPDATE ponds SET latitude = -1.9545, longitude = 30.1530 WHERE name = 'Pond 8 - Polishing Pond';
