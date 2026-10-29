(() => {
  'use strict';
  const api = '/__photo-review/scotland-2026/';
  const sheet = document.getElementById('photo-sheet');
  const daySelect = document.getElementById('day-select');
  const onlyFavorites = document.getElementById('favorites-only');
  const status = document.getElementById('selection-status');
  const dialog = document.getElementById('photo-dialog');
  const largeImage = document.getElementById('large-photo');
  const previewLoading = document.getElementById('preview-loading');
  const dialogFavorite = document.getElementById('dialog-favorite');
  let photos = [], favorites = new Set(), pending = new Set(), currentPhoto = null;
  let saveChain = Promise.resolve(), lastError = '';

  async function jsonRequest(url, options) {
    const response = await fetch(url, { cache: 'no-store', ...options });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return response.json();
  }

  function dayLabel(photo) {
    const date = new Date(`${photo.date}T12:00:00Z`);
    const label = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date);
    return `Day ${photo.day_number} · ${label}`;
  }

  function updateStatus() {
    status.classList.toggle('error', !!lastError);
    status.textContent = lastError || `${favorites.size} favourites in the trip · ${pending.size ? 'Saving…' : 'Saved on this computer'}`;
    document.querySelectorAll('[data-favorite-id]').forEach((button) => {
      const id = button.dataset.favoriteId, selected = favorites.has(id);
      button.setAttribute('aria-pressed', String(selected));
      button.disabled = pending.has(id);
      button.replaceChildren();
      const star = document.createElement('span');
      star.className = 'favorite-star'; star.textContent = selected ? '★' : '☆'; star.setAttribute('aria-hidden', 'true');
      button.append(star, document.createTextNode(selected ? 'Favourite' : 'Mark favourite'));
    });
    document.querySelectorAll('[data-card-id]').forEach((card) => card.classList.toggle('is-favorite', favorites.has(card.dataset.cardId)));
    document.querySelectorAll('[data-day-count]').forEach((counter) => {
      const dayPhotos = photos.filter((photo) => photo.date === counter.dataset.dayCount);
      counter.textContent = `${dayPhotos.length} photos · ${dayPhotos.filter((photo) => favorites.has(photo.id)).length} favourites`;
    });
  }

  function toggleFavorite(id) {
    if (pending.has(id)) return;
    const wasSelected = favorites.has(id), selected = !wasSelected;
    selected ? favorites.add(id) : favorites.delete(id);
    pending.add(id); lastError = ''; updateStatus();
    saveChain = saveChain.then(async () => {
      try {
        const saved = await jsonRequest(api + 'favorites', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo_id: id, favorite: selected })
        });
        const confirmed = new Set(saved.favorite_ids);
        for (const waiting of pending) {
          if (waiting !== id) favorites.has(waiting) ? confirmed.add(waiting) : confirmed.delete(waiting);
        }
        favorites = confirmed;
      } catch (_) {
        wasSelected ? favorites.add(id) : favorites.delete(id);
        lastError = 'That pick could not be saved. Check the preview is running, then try again.';
      } finally {
        pending.delete(id); updateStatus();
        if (onlyFavorites.checked) renderSheet();
      }
    });
  }

  function openPhoto(photo) {
    if (typeof dialog.showModal !== 'function') {
      window.open(api + `preview/${photo.id}.webp`, '_blank');
      return;
    }
    currentPhoto = photo;
    document.getElementById('dialog-label').textContent = `${dayLabel(photo)} · ${photo.filename} · ${photo.display_time}`;
    dialogFavorite.dataset.favoriteId = photo.id;
    updateStatus();
    largeImage.hidden = true; previewLoading.hidden = false;
    previewLoading.textContent = 'Loading larger photo…';
    largeImage.alt = `${photo.filename}, ${photo.date} at ${photo.display_time}`;
    largeImage.onload = () => { previewLoading.hidden = true; largeImage.hidden = false; };
    largeImage.onerror = () => { previewLoading.textContent = 'Could not load the larger photo. Close and try again.'; };
    largeImage.src = api + `preview/${photo.id}.webp`;
    if (!dialog.open) dialog.showModal();
  }

  function photoCard(photo) {
    const card = document.createElement('article');
    card.className = 'photo-card'; card.dataset.cardId = photo.id;
    const open = document.createElement('a');
    open.className = 'photo-open'; open.href = api + `preview/${photo.id}.webp`;
    open.setAttribute('aria-label', `View photo ${photo.day_sequence}: ${photo.filename}`);
    open.addEventListener('click', (event) => { event.preventDefault(); openPhoto(photo); });
    const image = document.createElement('img');
    image.src = api + `thumb/${photo.id}.webp`; image.alt = photo.filename;
    image.loading = 'lazy'; image.decoding = 'async';
    const number = document.createElement('span');
    number.className = 'photo-number'; number.textContent = String(photo.day_sequence).padStart(2, '0');
    open.append(image, number);
    const info = document.createElement('div'); info.className = 'photo-info';
    const meta = document.createElement('div'); meta.className = 'photo-meta';
    const filename = document.createElement('span'); filename.textContent = photo.filename;
    const time = document.createElement('time');
    time.dateTime = photo.captured_at;
    time.textContent = `${photo.timezone_inferred ? '~ ' : ''}${photo.display_time}`;
    time.title = photo.timezone_inferred ? 'Timezone inferred from other photos that day; chronological position is approximate.' : `Capture time ${photo.captured_at}`;
    meta.append(filename, time);
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'favorite-button'; button.dataset.favoriteId = photo.id;
    button.addEventListener('click', () => toggleFavorite(photo.id));
    info.append(meta, button); card.append(open, info);
    return card;
  }

  function renderSheet() {
    sheet.replaceChildren();
    const visible = photos.filter((photo) => (daySelect.value === 'all' || photo.date === daySelect.value) && (!onlyFavorites.checked || favorites.has(photo.id)));
    const groups = new Map();
    visible.forEach((photo) => { if (!groups.has(photo.date)) groups.set(photo.date, []); groups.get(photo.date).push(photo); });
    for (const [date, dayPhotos] of groups) {
      const section = document.createElement('section'); section.className = 'day-section';
      const heading = document.createElement('div'); heading.className = 'day-heading';
      const title = document.createElement('h2'); title.textContent = dayLabel(dayPhotos[0]);
      const count = document.createElement('span'); count.dataset.dayCount = date;
      heading.append(title, count);
      const grid = document.createElement('div'); grid.className = 'photo-grid';
      dayPhotos.forEach((photo) => grid.append(photoCard(photo)));
      section.append(heading, grid); sheet.append(section);
    }
    if (!visible.length) {
      const empty = document.createElement('p'); empty.className = 'empty-state';
      empty.textContent = 'No favourites selected here yet. Switch off “Favourites only” to see the full sheet.';
      sheet.append(empty);
    }
    updateStatus();
  }

  daySelect.addEventListener('change', () => {
    const url = new URL(window.location.href); url.searchParams.set('day', daySelect.value);
    history.replaceState(null, '', url); renderSheet();
  });
  onlyFavorites.addEventListener('change', renderSheet);
  dialogFavorite.addEventListener('click', () => { if (currentPhoto) toggleFavorite(currentPhoto.id); });
  document.getElementById('dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key) || !currentPhoto) return;
    const visible = photos.filter((photo) => (daySelect.value === 'all' || photo.date === daySelect.value) && (!onlyFavorites.checked || favorites.has(photo.id)));
    const index = visible.findIndex((photo) => photo.id === currentPhoto.id);
    const next = visible[index + (event.key === 'ArrowRight' ? 1 : -1)];
    if (next) { event.preventDefault(); openPhoto(next); }
  });

  Promise.all([jsonRequest(api + 'manifest'), jsonRequest(api + 'favorites')]).then(([manifest, state]) => {
    photos = manifest.photos;
    favorites = new Set(state.favorite_ids);
    const days = new Map(); photos.forEach((photo) => { if (!days.has(photo.date)) days.set(photo.date, photo); });
    daySelect.replaceChildren(new Option(`All days · ${photos.length} photos`, 'all'));
    for (const [date, first] of days) daySelect.add(new Option(`${dayLabel(first)} (${photos.filter((photo) => photo.date === date).length})`, date));
    const requested = new URL(window.location.href).searchParams.get('day');
    daySelect.value = requested === 'all' || days.has(requested) ? requested : (photos.find((photo) => photo.day_number === 1)?.date || 'all');
    daySelect.disabled = false; renderSheet();
  }).catch(() => {
    status.classList.add('error'); status.textContent = 'The photo library is not ready. Reload in a moment.';
    sheet.textContent = 'The contact sheet is being prepared. Your existing picks are safe.';
  });
})();
