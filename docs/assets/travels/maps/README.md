# Map geography and design reference

`north-atlantic.geojson` is a reduced, simplified subset of Natural Earth's
1:50m country polygons. Source:
https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson

Natural Earth data is public domain:
https://www.naturalearthdata.com/about/terms-of-use/

The trip-page reference is Craig Mod and Dan Rubin's Koya Bound:
https://walkkumano.com/koyabound/

The reference's actual `css/style.css`, `js/app.js`, and
`img/map-koya-3-testing4.svg` were inspected for composition, gray map styling,
camera movement, per-photo map positions, photo-pointer cones, and transport
icons. This repository uses its own map drawing code and its own photo assets.
The underlying technique is described by Lucas Bebber at Codrops:
https://tympanus.net/codrops/2015/12/16/animated-map-path-for-interactive-storytelling/

## Pitlochry terrain and water

`pitlochry-terrain.json` contains real 25 m elevation contours derived from
public Mapzen/Tilezen Terrarium elevation tiles, plus simplified OpenStreetMap
Loch Faskally / Loch Dunmore and River Tummel / Garry water geometry. Coverage
extends north through the Bealach and Killiecrankie for Day 3.
Source URLs, processing metadata, and attribution are embedded in the asset.

- Terrain: https://registry.opendata.aws/terrain-tiles/
- Water geometry: https://www.openstreetmap.org/copyright (ODbL)

## Illustrative walking and train routes

Walking routes are approximate reference outlines, not the user's recorded tracks.
The accommodation address is kept out of the public data.

- Craigower reference: https://www.walkhighlands.co.uk/perthshire/craigower.shtml
- Craigower path geometry: https://highland-discovery.com/tours/craigower-path/
  (public download credited to Perth & Kinross Countryside Trust).
- Loch loop reference: https://www.walkhighlands.co.uk/perthshire/salmon-ladder.shtml
- Loch reference geometry: https://sobt.co.uk/walk-pitlochry-dam/
- LNER route context: https://assets.ctfassets.net/mxack5k9p2sw/1gXLQ3vbrY5zcWx7bsgQ3g/61856e0c22328de7baf0480303a4f1c8/m_lner2903-lner-route-map-update.pdf
- Bealach stage sequence: https://www.walkhighlands.co.uk/perthshire/bealach-route.shtml
- Day 3 pass and riverside geometry: public OpenStreetMap roads/paths, including
  hiking relation https://www.openstreetmap.org/relation/16411959 (ODbL).
- Blair Athol location: https://www.malts.com/en-au/blair-athol/visit and public
  OSM attraction geometry. The broad town connector is illustrative.

Rail lines are broad waypoint-based illustrations. Tea, meals, accommodation
approaches, and short lifts are not represented as additional Day 2 map stops.
Day 3's computed trace length is not displayed as the user's measured walking
distance. No restricted Walkhighlands GPX or private accommodation approach was
included in the reconstructed illustration.
The return and distillery approach form a single continuous walking route;
Blair Athol is its endpoint, with no intermediate arrival or change of map scene.

## Dunkeld and Blair Atholl

`dunkeld-terrain.json` and `blair-atholl-terrain.json` use the same 25 m
Tilezen elevation contours and simplified OSM water schema as the Pitlochry
asset. Each includes its source URLs and attribution. Layers are drawn only
when their bounds are visible at local walking scale.

Day 4's Hermitage outline follows the main Braan circuit, with a broad approach
from Dunkeld & Birnam station and a riverside return through Dunkeld. Blair
Atholl is the village and railway station, distinct from Blair Athol distillery
in Pitlochry. The castle and grounds form one walking scene, including the
return past the Atholl Arms; small refreshments do not create extra map scenes.

- Hermitage reference: https://www.walkhighlands.co.uk/perthshire/hermitage.shtml
- Station approach: https://www.nts.org.uk/visit/places/the-hermitage/planning-your-visit
- Public OSM path relations: https://www.openstreetmap.org/relation/18310722
  and https://www.openstreetmap.org/relation/3136799 (ODbL).
- Castle context: https://atholl-estates.co.uk/blair-castle/visitor-information/

As with the earlier chapters, these are reference-based illustrations, not
recorded tracks. Castle grounds and rail connections are generalized.

The castle circuit runs from the castle to Hercules Garden, then through the
northern woods around Diana Grove and St Bride's Kirk before returning to the
village. The photo sequence follows that order.

## Edinburgh

`edinburgh-terrain.json` adds factual 25 m contours from Tilezen and mapped OSM
water; source coverage, processing and attribution are embedded in the asset.
Each Edinburgh day uses one continuous, generalized street-based walking line.
Dinner and evening venues stay within that day's walking scene. CoDE The Court
is the Parliament Square hostel, distinct from CoDE's Rose Street property.

- CoDE The Court: https://staywithcode.com/contact-us/
- Johnnie Walker: https://www.johnniewalker.com/en-us/visit-us-princes-street/plan-your-visit
- Fishers in the City: https://www.fishersrestaurants.co.uk/fishers-in-the-city/
- Castle approach: https://www.edinburghcastle.scot/plan-your-visit/getting-here/
- National Gallery: https://www.nationalgalleries.org/visit/scottish-national-gallery
- Calton Hill: https://caltonhilltrust.org/
- Stramash: https://stramashedinburgh.com/find-us/

The train illustration uses a broad Perth, Fife and Forth Bridge corridor;
the exact ticket routing has not been supplied. City lines illustrate the
itinerary rather than asserting which minor streets or steps were taken.

## Stockbridge, Dublin and the return flight

`edinburgh-north-terrain.json` supplies garden and Water of Leith context;
`dublin-terrain.json` supplies factual contours, the Liffey and Royal Canal.
Both include their Tilezen/OSM source URLs, processing notes and attribution.

The final Edinburgh walk goes through Stockbridge to the Royal Botanic Garden.
The airport bus is a broad corridor: no particular boarding point or numbered
service is claimed. The Dublin walk joins Guinness Storehouse, the National
Museum of Ireland at Collins Barracks, Jameson Bow St., The Cobblestone and
Dalymount Park. The last represents the club bar and stadium, with no match
attendance or separate pub implied. Food photos do not introduce guessed venue
addresses. The final flights are mathematical great-circle illustrations
between the airport reference points, including Dublin directly to Boston.

- Royal Botanic Garden: https://www.rbge.org.uk/visit/royal-botanic-garden-edinburgh/
- Storehouse: https://www.guinness-storehouse.com/en/getting-here
- Collins Barracks: https://www.museum.ie/en-IE/Museums/Decorative-Arts-History
- Jameson Bow St.: https://www.jamesonwhiskey.com/en-ie/visit-our-distilleries/
- The Cobblestone: https://www.smithfieldandstoneybatter.ie/portfolio/the-cobblestone/
- Dalymount: https://www.leagueofireland.ie/news/dalymount-park-planning-permission-granted/

The Dublin walk starts and ends in the user-confirmed Smithfield area. Its
district marker represents the public quarter, not an accommodation building.
The original inner route and photo sequence are retained inside the wider loop.
