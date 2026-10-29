/* Koya Bound's map/text composition and photo pointers are the reference.
 * This implementation draws our own geography and user-confirmed itinerary.
 * No photo GPS or actual flight track is implied by the illustrated line.
 */
export const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const radians = Math.PI / 180;
const mix = (a, b, amount) => a + (b - a) * amount;
const smooth = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t); };

export function project([latitude, longitude]) {
  return [longitude * radians, -Math.log(Math.tan(Math.PI / 4 + clamp(latitude, -85, 85) * radians / 2))];
}

export function greatCircle(start, end, amount) {
  const vector = ([lat, lon]) => [Math.cos(lat * radians) * Math.cos(lon * radians), Math.cos(lat * radians) * Math.sin(lon * radians), Math.sin(lat * radians)];
  const a = vector(start), b = vector(end), t = clamp(amount);
  const angle = Math.acos(clamp(a.reduce((sum, value, i) => sum + value * b[i], 0), -1, 1));
  if (angle < 1e-8) return [...start];
  const first = Math.sin((1 - t) * angle) / Math.sin(angle), last = Math.sin(t * angle) / Math.sin(angle);
  const v = a.map((value, i) => value * first + b[i] * last);
  return [Math.atan2(v[2], Math.hypot(v[0], v[1])) / radians, Math.atan2(v[1], v[0]) / radians];
}

export function progressAt(anchors, readingPosition) {
  if (!anchors.length) return 0;
  if (readingPosition <= anchors[0].position) return anchors[0].progress;
  // Monotone cubic interpolation keeps every photo aligned while easing changes
  // in travelling speed, including the pauses at several photos of one place.
  const interval = (i) => Math.max(1, anchors[i + 1].position - anchors[i].position);
  const slope = (i) => (anchors[i + 1].progress - anchors[i].progress) / interval(i);
  const tangent = (i) => {
    if (i === 0) return slope(0);
    if (i === anchors.length - 1) return slope(i - 1);
    const before = slope(i - 1), after = slope(i);
    if (before * after <= 0) return 0;
    const first = 2 * interval(i) + interval(i - 1), last = interval(i) + 2 * interval(i - 1);
    return (first + last) / (first / before + last / after);
  };
  for (let i = 1; i < anchors.length; i++) {
    if (readingPosition <= anchors[i].position) {
      const before = anchors[i - 1], after = anchors[i];
      const span = interval(i - 1), t = clamp((readingPosition - before.position) / span);
      const value = (2 * t ** 3 - 3 * t ** 2 + 1) * before.progress
        + (t ** 3 - 2 * t ** 2 + t) * span * tangent(i - 1)
        + (-2 * t ** 3 + 3 * t ** 2) * after.progress
        + (t ** 3 - t ** 2) * span * tangent(i);
      return clamp(value, Math.min(before.progress, after.progress), Math.max(before.progress, after.progress));
    }
  }
  return anchors.at(-1).progress;
}

export function buildRoute(points) {
  const projected = points.map(project), lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(projected[i][0] - projected[i - 1][0], projected[i][1] - projected[i - 1][1]));
  return { points, projected, lengths, length: lengths.at(-1) || 0 };
}

export function pointOnRoute(route, progress) {
  if (!route.length) return route.points[0];
  const distance = clamp(progress) * route.length;
  for (let i = 1; i < route.points.length; i++) {
    if (distance <= route.lengths[i]) {
      const amount = (distance - route.lengths[i - 1]) / Math.max(1e-12, route.lengths[i] - route.lengths[i - 1]);
      return route.points[i - 1].map((value, axis) => mix(value, route.points[i][axis], amount));
    }
  }
  return route.points.at(-1);
}

export const VEHICLES = {
  plane: 'M16 0 L5 3 L-4 13 L-8 13 L-4 3 L-12 3 L-16 7 L-19 7 L-16 0 L-19 -7 L-16 -7 L-12 -3 L-4 -3 L-8 -13 L-4 -13 L5 -3 Z',
  train: 'M-17 -8 L10 -8 L16 -1 L16 6 L-17 6 Z M-11 8 A3 3 0 1 0 -5 8 A3 3 0 1 0 -11 8 M6 8 A3 3 0 1 0 12 8 A3 3 0 1 0 6 8',
  bus: 'M-16 -9 L12 -9 L16 -4 L16 6 L-16 6 Z M-12 7 A3 3 0 1 0 -6 7 A3 3 0 1 0 -12 7 M6 7 A3 3 0 1 0 12 7 A3 3 0 1 0 6 7'
};

function setupLightbox() {
  const dialog = document.querySelector('.journey-lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const image = dialog.querySelector('img');
  document.querySelectorAll('[data-photo-open]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    image.src = link.href;
    image.alt = link.querySelector('img').alt;
    dialog.showModal();
  }));
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
}

async function initJourney() {
  setupLightbox();
  const canvas = document.getElementById('journey-canvas');
  const payload = document.getElementById('travel-data');
  if (!canvas || !payload) return;
  const { trip, baseurl = '' } = JSON.parse(payload.textContent);
  const configuration = trip.story_map;
  if (!configuration) { canvas.parentElement.hidden = true; return; }
  const context = canvas.getContext('2d');
  if (!context) return;
  const places = new Map(configuration.places.map((place) => [place.id, place]));
  const routes = trip.stops.map((stop) => {
    const start = places.get(stop.route_from), end = places.get(stop.route_to);
    if (!start || !end) return null;
    const points = stop.route_points?.length > 1 ? stop.route_points
      : Array.from({ length: 181 }, (_, i) => greatCircle(start.coordinates, end.coordinates, i / 180));
    return buildRoute(points);
  });
  const chapters = Array.from(document.querySelectorAll('[data-chapter-index]'));
  const text = document.querySelector('.journey-text');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 720px)');
  const icons = Object.fromEntries(Object.entries(VEHICLES).map(([key, path]) => [key, new Path2D(path)]));
  let geography = new Path2D();
  const terrainLayers = [];
  let camera = null, transition = null, markerPoint = null, heading = null;
  let width = 0, height = 0, ratio = 1, target = 0, current = 0, activeChapter = 0, frame = 0;
  let measurements = [], lastTime = 0;

  function measure() {
    const rect = canvas.parentElement.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height);
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    measurements = chapters.map((section, index) => {
      const bounds = section.getBoundingClientRect(), stop = trip.stops[index];
      const top = bounds.top + window.scrollY, bottom = bounds.bottom + window.scrollY;
      const anchors = [{ position: top, progress: stop.map_start || 0 }];
      section.querySelectorAll('.journey-photo, [data-map-arrival]').forEach((anchor) => {
        const box = anchor.getBoundingClientRect();
        anchors.push({ position: box.top + window.scrollY + box.height / 2, progress: Number(anchor.dataset.mapPosition) || 0 });
      });
      anchors.push({ position: bottom, progress: stop.map_end ?? 1 });
      return { top, bottom, anchors };
    });
    updateScroll();
  }

  function updateScroll() {
    const readingPosition = window.scrollY + window.innerHeight * (mobile.matches ? .65 : .45);
    let index = measurements.findIndex((measurement) => readingPosition <= measurement.bottom);
    if (index < 0) index = measurements.length - 1;
    if (index < 0) return;
    const nextTarget = progressAt(measurements[index].anchors, readingPosition);
    if (index !== activeChapter) {
      transition = reducedMotion.matches || !markerPoint ? null : { index: activeChapter, progress: current, from: [...markerPoint], elapsed: 0 };
      activeChapter = index;
      // Enter at the reading position in either direction; do not replay the
      // whole new route from its start when scrolling backwards or jumping.
      current = nextTarget;
    }
    target = nextTarget;
    if (reducedMotion.matches) current = target;
    schedule();
  }

  function schedule() { if (!frame) frame = requestAnimationFrame(animate); }
  function animate(time) {
    frame = 0;
    const elapsed = Math.min(80, lastTime ? time - lastTime : 16);
    lastTime = time;
    current = reducedMotion.matches ? target : mix(current, target, 1 - Math.exp(-elapsed / 180));
    if (Math.abs(current - target) < .0001) current = target;
    const cameraMoving = draw(reducedMotion.matches ? 1 : 1 - Math.exp(-elapsed / 320), elapsed);
    if (current !== target || cameraMoving) schedule();
  }

  function draw(easing = 1, elapsed = 16) {
    const stop = trip.stops[activeChapter];
    const start = places.get(stop?.route_from), end = places.get(stop?.route_to);
    if (!start || !end) return;
    const routeModel = routes[activeChapter];
    const point = pointOnRoute(routeModel, current);
    const pointCenter = project(point);
    if (transition) transition.elapsed += elapsed;
    const chapterBlend = !transition || reducedMotion.matches ? 1 : smooth(0, 700, transition.elapsed);
    markerPoint = transition?.from ? pointCenter.map((value, i) => mix(transition.from[i], value, chapterBlend)) : pointCenter;
    const xs = routeModel.projected.map((p) => p[0]), ys = routeModel.projected.map((p) => p[1]);
    const bounds = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const available = mobile.matches ? width * .78 : width * .44;
    const fitScale = Math.min(available / Math.max(.00001, bounds[1] - bounds[0]), height * .64 / Math.max(.00001, bounds[3] - bounds[2]));
    const wideScale = stop.map_view === 'flight' || stop.transport === 'plane'
      ? available / Math.max(.2, routeModel.length) : fitScale;
    const closeScale = stop.zoom_start || Math.max(wideScale, mobile.matches ? 500 : 1350);
    const zoomOut = smooth(.005, .22, current);
    const zoomIn = smooth(.88, 1, current);
    let desiredScale = mix(mix(closeScale, wideScale, zoomOut), stop.zoom_end || closeScale, zoomIn);
    let desiredCenter = pointCenter;
    if (stop.map_view === 'trail') {
      desiredScale = fitScale * .9 * (stop.zoom_factor || 1);
      const follow = clamp(stop.camera_follow ?? .15);
      desiredCenter = [mix((bounds[0] + bounds[1]) / 2, pointCenter[0], follow), mix((bounds[2] + bounds[3]) / 2, pointCenter[1], follow)];
    } else if (stop.map_view === 'city') desiredScale = Math.min(fitScale, mobile.matches ? 27000 : 48000);
    if (!camera) camera = { center: [...desiredCenter], scale: desiredScale };
    camera.center = camera.center.map((value, i) => mix(value, desiredCenter[i], easing));
    camera.scale = Math.exp(mix(Math.log(camera.scale), Math.log(desiredScale), easing));
    const cameraMoving = Math.hypot(...camera.center.map((value, i) => value - desiredCenter[i])) > 1e-7 || Math.abs(Math.log(camera.scale / desiredScale)) > .0001;
    const { center, scale } = camera;
    const focal = [width * (mobile.matches ? .5 : .73), height * (mobile.matches ? .49 : .39)];
    const screenProjected = (p) => [focal[0] + (p[0] - center[0]) * scale, focal[1] + (p[1] - center[1]) * scale];
    const screen = (coordinates) => screenProjected(project(coordinates));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#fff'; context.fillRect(0, 0, width, height);

    // Quiet pencil-like coastlines and a light land hatch, rather than map tiles.
    context.save();
    context.translate(focal[0], focal[1]); context.scale(scale, scale); context.translate(-center[0], -center[1]);
    context.fillStyle = '#f2f1ed'; context.fill(geography, 'evenodd');
    context.strokeStyle = '#bdbbb4'; context.lineWidth = .65 / scale; context.stroke(geography);
    context.translate(.5 / scale, -.35 / scale);
    context.strokeStyle = '#ddd9d1'; context.lineWidth = .4 / scale; context.stroke(geography);
    context.clip(geography, 'evenodd');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.strokeStyle = '#e2dfd7'; context.lineWidth = .45;
    context.beginPath();
    for (let x = -height; x < width + height; x += 13) { context.moveTo(x, 0); context.lineTo(x + height, height); }
    context.stroke(); context.restore();

    if (terrainLayers.length && scale > 12000) {
      const opacity = clamp((scale - 12000) / 50000) * .6;
      context.save();
      context.lineJoin = 'round'; context.lineWidth = .7;
      terrainLayers.forEach((terrain) => {
        const bounds = terrain.bounds;
        if (bounds) {
          const corners = [[bounds.south, bounds.west], [bounds.north, bounds.east]].map(screen);
          if (Math.max(...corners.map(p => p[0])) < 0 || Math.min(...corners.map(p => p[0])) > width || Math.max(...corners.map(p => p[1])) < 0 || Math.min(...corners.map(p => p[1])) > height) return;
        }
        context.lineWidth = .7;
        terrain.contours.forEach((contour) => {
          context.strokeStyle = `rgba(159,151,134,${opacity * (contour.elevation % 100 === 0 ? 1 : .65)})`;
          context.beginPath(); contour.coordinates.forEach((p, i) => { const at = screen(p); i ? context.lineTo(...at) : context.moveTo(...at); }); context.stroke();
        });
        (terrain.water || []).forEach((water) => {
          context.beginPath(); water.coordinates.forEach((p, i) => { const at = screen(p); i ? context.lineTo(...at) : context.moveTo(...at); });
          if (water.type === 'polygon') { context.closePath(); context.fillStyle = '#f5f7f5'; context.fill(); }
          context.strokeStyle = '#acb9b5'; context.lineWidth = 1; context.stroke();
        });
      });
      context.restore();
    }

    const ocean = screen([44, -37]);
    context.fillStyle = '#c9c9c2'; context.font = 'italic 20px Georgia, serif'; context.textAlign = 'center';
    context.fillText('North Atlantic Ocean', ocean[0], ocean[1] + 80);

    const trace = (points) => { context.beginPath(); points.forEach(([x, y], i) => i ? context.lineTo(x, y) : context.moveTo(x, y)); };
    const paintRoute = (model, progress, opacity) => {
      if (!model || opacity <= 0) return;
      context.save(); context.globalAlpha = opacity;
      const route = Array.from({ length: 301 }, (_, i) => screen(pointOnRoute(model, i / 300)));
      context.strokeStyle = '#c6c5be'; context.lineWidth = 1.35; context.setLineDash([2, 5]); trace(route); context.stroke();
      context.setLineDash([]); context.strokeStyle = '#75766f'; context.lineWidth = 2;
      const visited = route.slice(0, Math.floor(progress * 300) + 1); visited.push(screen(pointOnRoute(model, progress))); trace(visited); context.stroke();
      context.restore();
    };
    const scenes = [];
    if (transition && chapterBlend < 1) {
      const previousStop = trip.stops[transition.index];
      paintRoute(routes[transition.index], transition.progress, 1 - chapterBlend);
      scenes.push({ stop: previousStop, start: places.get(previousStop.route_from), end: places.get(previousStop.route_to), routeModel: routes[transition.index], current: transition.progress, opacity: 1 - chapterBlend });
    }
    paintRoute(routeModel, current, chapterBlend);
    scenes.push({ stop, start, end, routeModel, current, opacity: chapterBlend });

    scenes.forEach(({ stop, start, end, routeModel, current, opacity }) => {
      context.save(); context.globalAlpha = opacity;
      const labels = stop.route_labels ? stop.route_labels.map((id) => places.get(id)).filter(Boolean) : [start, end];
      const uniqueLabels = [...new Map(labels.map((place) => [place.id, place])).values()];
      uniqueLabels.forEach((place) => {
        const [x, y] = screen(place.coordinates);
        if (x < -100 || x > width + 100 || y < -40 || y > height + 40) return;
        if (place.kind === 'water') {
          context.font = 'italic 15px Georgia, serif'; context.textAlign = 'center';
          context.fillStyle = '#8faaa5'; context.strokeStyle = '#fff'; context.lineWidth = 3;
          context.strokeText(place.name, x, y); context.fillText(place.name, x, y);
          return;
        }
        const at = project(place.coordinates);
        let nearest = 0, closest = Infinity;
        routeModel.projected.forEach((p, i) => { const distance = Math.hypot(p[0] - at[0], p[1] - at[1]); if (distance < closest) { closest = distance; nearest = i; } });
        const reached = current + .01 >= routeModel.lengths[nearest] / Math.max(1e-12, routeModel.length);
        context.beginPath(); context.arc(x, y, 3.5, 0, Math.PI * 2);
        context.fillStyle = reached ? '#5d5c56' : '#b9b8b0'; context.fill();
        context.font = `${place.id === start.id ? '600 ' : ''}14px Helvetica, Arial, sans-serif`;
        const labelOnLeft = place.label_side === 'left' || x + 14 + context.measureText(place.name).width > width - 16;
        const labelX = x + (labelOnLeft ? -14 : 14);
        const labelY = y + (place.label_dy ?? -12);
        context.textAlign = labelOnLeft ? 'right' : 'left';
        context.strokeStyle = '#fff'; context.lineWidth = 4; context.lineJoin = 'round';
        context.strokeText(place.name, labelX, labelY); context.fillText(place.name, labelX, labelY);
      });
      context.restore();
    });

    if (!mobile.matches) {
      // Neighbouring photos can remain visible across a chapter boundary.
      // Their pointers fade with their visibility, keeping the actual origins.
      chapters.forEach((chapter, index) => {
        if (Math.abs(index - activeChapter) > 1 || !routes[index]) return;
        chapter.querySelectorAll('.journey-photo').forEach((photo) => {
          const bounds = photo.getBoundingClientRect();
          const visibility = clamp(1 - Math.abs(window.innerHeight / 2 - bounds.top - bounds.height / 2) / (window.innerHeight * .7));
          if (!visibility) return;
          const origin = screen(pointOnRoute(routes[index], Number(photo.dataset.mapPosition) || 0));
          context.fillStyle = `rgba(160,160,153,${visibility * .16})`;
          context.beginPath(); context.moveTo(...origin); context.lineTo(bounds.right, bounds.top); context.lineTo(bounds.right, bounds.bottom); context.closePath(); context.fill();
        });
      });
    }

    // Three intentionally simple silhouettes: plane, train (also Tube), bus.
    const tip = screenProjected(markerPoint), before = screen(pointOnRoute(routeModel, Math.max(0, current - .004)));
    const after = screen(pointOnRoute(routeModel, Math.min(1, current + .004)));
    const angle = Math.atan2(after[1] - before[1], after[0] - before[0]);
    if (heading === null || reducedMotion.matches) heading = angle;
    const turn = Math.atan2(Math.sin(angle - heading), Math.cos(angle - heading));
    heading += turn * (1 - Math.exp(-elapsed / 200));
    const headingMoving = Math.abs(turn) > .0001;
    context.save(); context.translate(...tip); context.rotate(heading);
    const paintMarker = (transport, opacity) => {
      context.save(); context.globalAlpha = opacity;
      context.fillStyle = '#66675f'; context.strokeStyle = '#fff'; context.lineWidth = 3;
      const icon = icons[transport];
      if (icon) { context.stroke(icon); context.fill(icon); }
      else { context.beginPath(); context.arc(0, 0, 4, 0, Math.PI * 2); context.fill(); }
      if (icon && transport !== 'plane') {
        context.fillStyle = '#fff';
        for (let x = -11; x < 10; x += 7) context.fillRect(x, -5, 4, 4);
      }
      context.restore();
    };
    if (transition && chapterBlend < 1) paintMarker(trip.stops[transition.index].transport, 1 - chapterBlend);
    paintMarker(stop.transport, chapterBlend);
    context.restore();

    // The original fades its drawing to white beneath the story column.
    if (!mobile.matches) {
      const edge = text.getBoundingClientRect().right;
      const fade = context.createLinearGradient(edge - 65, 0, edge + 150, 0);
      fade.addColorStop(0, '#fff'); fade.addColorStop(1, 'rgba(255,255,255,0)');
      context.fillStyle = fade; context.fillRect(0, 0, edge + 150, height);
    }
    const transitioning = transition && chapterBlend < 1;
    if (!transitioning) transition = null;
    return cameraMoving || headingMoving || transitioning;
  }

  window.addEventListener('scroll', updateScroll, { passive: true });
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  reducedMotion.addEventListener('change', updateScroll);
  document.querySelectorAll('.journey-photo img').forEach((image) => image.addEventListener('load', measure));
  measure();
  const terrainSources = [...new Set([configuration.terrain, ...(configuration.terrain_layers || [])].filter(Boolean))];
  terrainSources.forEach((source) => {
    fetch(`${baseurl}${source}`).then((response) => response.ok ? response.json() : null).then((data) => { if (data) { terrainLayers.push(data); schedule(); } }).catch(() => {});
  });
  try {
    const response = await fetch(`${baseurl}${configuration.geography}`);
    if (!response.ok) throw new Error(`Map data: ${response.status}`);
    const collection = await response.json();
    const land = new Path2D();
    collection.features.forEach((feature) => {
      const polygons = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates];
      polygons.forEach((polygon) => polygon.forEach((ring) => {
        ring.forEach(([longitude, latitude], i) => { const point = project([latitude, longitude]); i ? land.lineTo(...point) : land.moveTo(...point); });
        land.closePath();
      }));
    });
    geography = land; schedule();
  } catch (error) {
    console.warn('Illustrated map geography unavailable:', error);
    canvas.parentElement.querySelector('.journey-map-fallback').hidden = false;
  }
}

if (typeof document !== 'undefined') initJourney();
