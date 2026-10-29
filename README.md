# JohnathanOneal.github.io
Source of https://johnathanoneal.github.io built with Jekyll

## Travel journals

The travel index is at `/travels/`. Scotland (October 2026) and Japan (March 2025)
are draft journals. Scotland currently includes Day 0 departure, Day 1 arrival
and rail travel, Day 2 walking and Dalwhinnie, and Day 3's Bealach circuit and
Blair Athol distillery. Days are edited individually
from the saved photo favourites. Content is stored in
`docs/_data/travels.json`; the shared layouts render the index and each trip.

To fill in a trip, set its `introduction`, optional `cover` and `cover_alt`, then
add entries to `stops` in travel order. Each stop uses this structure:

```json
{
  "label": "Day 2",
  "title": "A walking loop",
  "day_number": 2,
  "route_from": "place-id",
  "route_to": "place-id",
  "transport": "walk",
  "map_view": "trail",
  "route_points": [[56.70, -3.73], [56.72, -3.75], [56.70, -3.73]],
  "map_start": 0,
  "map_end": 1,
  "date_label": "Day or date",
  "notes": "Your notes, with optional Markdown.",
  "photos": [
    {
      "src": "/assets/travels/trip-slug/photo.jpg",
      "alt": "Description of the photograph",
      "caption": "Optional caption",
      "map_position": 0.5,
      "width": 1600,
      "height": 1200
    }
  ]
}
```

Each `stop` is a story section; a day can have several sections. Point IDs refer
to entries in `story_map.places`. `route_points` is an illustrative path in
`[latitude, longitude]` order; flights can omit it to use an arc. `map_position`
ties each photo to progress along its section's route. Views can be `flight`,
`city`, `regional`, or `trail`. Walkers use a simple dot; vehicle silhouettes are
limited to plane, train, and bus. Example coordinates above are illustrative.

Keep source originals outside the published `docs/` directory. Read capture
dates and GPS from those originals before producing smaller website images;
retain manual stop assignments separately so rebuilding images cannot lose the
itinerary. The source album or cloud link is only a transfer mechanism.

Trip pages follow the layout and scrolling behavior of
[Koya Bound](https://walkkumano.com/koyabound/): a full-height photographic
opening, a narrow photo/story column on the left, and a fixed illustrated map
behind it on the right. Scrolling continuously advances the route, pans and
zooms the drawing, and links visible photos to the map with subtle cones.
Transport markers are simple plane, train (including Tube), or bus silhouettes.

The trip map is drawn locally in Canvas from public-domain Natural Earth
geography with local elevation contours and water outlines; it does not load a
street-map service. Day 0 uses the user-confirmed Boston departure and Heathrow
destination. Its arc is
an illustration of the itinerary, not a flight track or recovered photo GPS.
The plane remains in transit at the end of Day 0; arrival belongs to Day 1.
Day 1 switches to a train marker for the Tube and the LNER north to Pitlochry.
Day 2 has three movements: the Craigower loop, the train to Dalwhinnie and back,
and the Loch Faskally/fish-ladder loop. Walking sections zoom into local contours
and reference trail outlines; train sections pull back. These are approximations
of the itinerary, not the user's recorded GPS tracks. The travel index uses
Leaflet 1.9.4.

Day 3 follows the Walkhighlands Bealach stage sequence using an independently
reconstructed, generalized OSM path outline: over the pass to Killiecrankie,
back beside the River Garry and Loch Faskally, then straight to Blair Athol in
Pitlochry. It is one continuous walking chapter with the same Bealach framing
throughout. The distillery is the final endpoint; there is no intermediate
Pitlochry stop or separate distillery scene. `zoom_factor` and `camera_follow`
control the chapter's map framing.

Day 4 alternates three train journeys with two continuous walking scenes:
Dunkeld & Birnam station through the Hermitage and back via Dunkeld, then
Blair Atholl station through Blair Castle and its grounds. The Atholl Arms
stays within the castle walk; Robertson's music and whisky close the return to
Pitlochry. `story_map.terrain_layers` adds local terrain assets while preserving
the original Pitlochry layer. The Scotland cover uses `IMG_3495.HEIC`, with
`cover_position` controlling its full-screen crop.

The castle walk continues from Hercules Garden through the northern woods and
St Bride's Kirk. Days 5 and 6 add the train to Edinburgh and one continuous city
walk per day: Johnnie Walker, Fishers and the nighttime return; then the castle,
National Gallery, Calton Hill and Stramash. Edinburgh uses its own local terrain
layer. Pub and meal photos remain within their day's walking scene.

Days 7–9 finish the itinerary: Stockbridge and the Botanics, the airport bus and
flight to Dublin, a continuous Dublin walk, and the direct flight to Boston.
The photo-free final flight uses `arrival_passage` to place its arrival anchor
before the bottom of the page, so scrolling can complete the Atlantic crossing.
`opening_passage` can put travel space before an arrival photo. Walking lines,
the airport bus corridor and flight arcs remain approximate illustrations.

The Dublin day starts and ends in Smithfield. Photo positions use monotone cubic
interpolation to keep their locations exact while easing changes in speed.
Chapter changes blend routes, markers and labels; the camera and vehicle
heading ease separately. Backward scrolling enters a chapter at the current
reading position, and reduced-motion preferences bypass the animations.
Run `node scripts/test_journey.mjs` to check photo alignment and interpolation.

From the `docs` directory, run `bundle exec jekyll serve` to preview.

For a travel-only preview without Ruby, install
`scripts/requirements-travel-preview.txt`, then run
`python scripts/preview_travels.py` from the repository root. Open
`http://127.0.0.1:4173/travels/scotland-2026/#stop-1`. It renders the same travel
templates with Python Liquid and automatically reloads when their content,
styles, or images change. This is a local editing preview, not a full Jekyll
build of the rest of the site.

## Local photo selection

The preview also serves `/review/scotland-2026/`, a chronological contact sheet
with a day selector, larger photo views, and favourite buttons. Selections save
automatically in `.travel-review/scotland-2026/favorites.json`; this library is
gitignored and is not part of the public website. The approved three Day 0
photos are initially selected. Subsequent days are edited from the user's picks,
with supporting photos chosen as needed.

The sheet includes all 475 still photos from the supplied Scotland ZIP. Photos
sort by their original capture timestamp, timezone, and subsecond value. The
single screenshot without a timezone uses the dominant timezone for that date
and is marked approximate. Thumbnails use cached review images when available;
opening a photo generates a larger, color-corrected copy from the untouched ZIP.

The local preparation command is `python scripts/prepare_photo_review.py
--archive "path/to/Scotland 2026.zip" --inventory "path/to/inventory.json"`.
The inventory is the photo metadata report generated during ZIP inspection.
Rebuilding thumbnails preserves existing favourites.
