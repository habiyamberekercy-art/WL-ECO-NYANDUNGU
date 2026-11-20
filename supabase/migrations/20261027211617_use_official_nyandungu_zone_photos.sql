/*
# Use official Nyandungu Eco-Park photos and descriptions for park zones

1. Modified Tables
- `park_zones`: `image_url` for all six zones now points to photos published on the official
  park website (nyandunguecopark.rw) instead of generic stock photos. `description` for the
  Medicinal Garden, Pope's Garden and Acacia Savannah now uses the park's own wording.

2. Security
- No changes to RLS, policies or grants.

3. Notes
1. Matched by zone name so it is safe to re-run.
2. No rows are added or removed; coordinates are unchanged.
*/

UPDATE park_zones SET
  image_url = 'https://cdn.prod.website-files.com/649d52c85c2b81b728d6bf89/6525243d8bee31a18a0e21ce_Par-30-min.jpg',
  description = 'A conservation project housing a variety of medicinal plants. Among the foliage you will discover aloe vera, renowned for treating burns and cuts, artemisia annua, a traditional remedy for malaria, and the golden hues of turmeric, known for its anti-inflammatory properties. More than a garden, it is a classroom where nature and medicine interweave.'
WHERE name = 'Medicinal Garden';

UPDATE park_zones SET
  image_url = 'https://cdn.prod.website-files.com/649d52c85c2b81b728d6bf89/654a03d467460e6638114fe5_Pope%27s%20Garden.jpg',
  description = 'The tranquil and historical spot where Pope John Paul II addressed the Rwandan people during his apostolic journey in 1990. Perfect for picnics and relaxation, this idyllic setting harmoniously blends history and serenity.'
WHERE name = 'Pope''s Garden';

UPDATE park_zones SET
  image_url = 'https://cdn.prod.website-files.com/649d52c85c2b81b728d6bf89/65212813715f2d58c156296d_BD4A9572.JPG',
  description = 'Open acacia-dotted landscapes offering sprawling views of the rolling hills that envelop the park, perfect for picnics, sports, and immersing yourself in the grandeur of the great outdoors.'
WHERE name = 'Acacia Savannah';

UPDATE park_zones SET
  image_url = 'https://cdn.prod.website-files.com/649d52c85c2b81b728d6bf89/6520cff414fe4921386beb28_BD4A9528.JPG'
WHERE name = 'Central Wetland';

UPDATE park_zones SET
  image_url = 'https://cdn.prod.website-files.com/649d52c85c2b81b728d6bf89/64cb879e8282eeb9927d0283_BD4A0312.JPG'
WHERE name = 'Mixed Woodlands';

UPDATE park_zones SET
  image_url = 'https://cdn.prod.website-files.com/649d52c85c2b81b728d6bf89/64abf75320c8ecf9bf4d7d76_DV5A1760.jpg'
WHERE name = 'Recreational Zone';