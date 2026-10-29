/* The journal text works independently of Leaflet and external map tiles. */
(() => {
  'use strict';
  const container = document.querySelector('[data-travel-map]');
  const dataElement = document.getElementById('travel-data');
  if (!container || !dataElement) return;

  const showFallback = () => {
    const message = container.parentElement.querySelector('.map-fallback');
    if (message) message.hidden = false;
  };
  if (!window.L) {
    container.hidden = true;
    showFallback();
    return;
  }

  const data = JSON.parse(dataElement.textContent);
  const baseurl = (data.baseurl || '').replace(/\/$/, '');
  const map = L.map(container, { scrollWheelZoom: false });
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  tiles.on('tileerror', showFallback);

  if (container.dataset.travelMap === 'atlas') {
    map.setView([37, 62], 2);
    data.trips.forEach((trip) => {
      const link = document.createElement('a');
      link.href = `${baseurl}/travels/${encodeURIComponent(trip.slug)}/`;
      link.textContent = `${trip.title} · ${trip.date_label} ↗`;
      L.circleMarker(trip.center, {
        radius: 8, color: '#f6f3eb', weight: 2, fillOpacity: 1,
        fillColor: trip.theme === 'japan' ? '#a44332' : '#365540'
      }).addTo(map).bindPopup(link).bindTooltip(trip.title, { direction: 'top' });
    });
    return;
  }

  const trip = data.trip;
  map.setView(trip.center, trip.zoom);
  const stops = trip.stops || [];
  const routeStops = stops.flatMap((stop, storyIndex) => {
    const point = stop.coordinates;
    return Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)
      && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180
      ? [{ ...stop, storyIndex }] : [];
  });
  if (!routeStops.length) return;
  const color = trip.theme === 'japan' ? '#a44332' : '#365540';
  // Stop coordinates connect as a schematic itinerary, not a recorded GPS track.
  const coordinates = routeStops.map((stop) => stop.coordinates);
  L.polyline(coordinates, { color, opacity: .28, weight: 3, dashArray: '5 7' }).addTo(map);
  const progress = L.polyline([], { color, weight: 4 }).addTo(map);
  const markers = routeStops.map((stop) => {
    const link = document.createElement('a');
    link.href = `#stop-${stop.storyIndex + 1}`;
    link.textContent = stop.label ? `${stop.label}. ${stop.title}` : stop.title;
    return L.circleMarker(stop.coordinates, { radius: 6, color, fillColor: '#f6f3eb', fillOpacity: 1, weight: 2 })
      .addTo(map).bindPopup(link).bindTooltip(stop.title);
  });
  const fitRoute = () => map.fitBounds(L.latLngBounds(coordinates), { padding: [35, 35], maxZoom: 11, animate: false });
  fitRoute();
  document.getElementById('fit-route')?.addEventListener('click', fitRoute);

  const sections = Array.from(document.querySelectorAll('[data-stop-index]'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktop = window.matchMedia('(min-width: 701px)');
  let active = -1;
  const activate = (index, follow) => {
    if (index === active) return;
    active = index;
    sections.forEach((section, i) => section.classList.toggle('is-active', i === index));
    markers.forEach((marker, i) => marker.setStyle({
      fillColor: routeStops[i].storyIndex <= index ? color : '#f6f3eb',
      radius: routeStops[i].storyIndex === index ? 9 : 6
    }));
    progress.setLatLngs(routeStops.filter((stop) => stop.storyIndex <= index).map((stop) => stop.coordinates));
    const current = routeStops.find((stop) => stop.storyIndex === index);
    if (follow && desktop.matches && current) map.panTo(current.coordinates, { animate: !reducedMotion.matches, duration: .6 });
  };
  let queued = false;
  const update = () => {
    queued = false;
    // Read positions every time, so reverse scrolling and images loading remain correct.
    const readingLine = window.innerHeight * .45;
    let index = 0;
    sections.forEach((section, i) => { if (section.getBoundingClientRect().top <= readingLine) index = i; });
    activate(index, true);
  };
  const scheduleUpdate = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  activate(0, false);
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate);
  window.addEventListener('load', scheduleUpdate);
  document.querySelectorAll('.story-stop img').forEach((img) => img.addEventListener('load', scheduleUpdate));
  scheduleUpdate();
})();
