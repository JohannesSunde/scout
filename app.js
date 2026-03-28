// ── STORAGE ──
const STORAGE_KEY = 'scout_locations';

function loadLocations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return getDefaultLocations();
}

function saveLocations() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
  } catch (e) {
    showToast('Storage full — data may not persist');
  }
}

function getDefaultLocations() {
  return [
    {
      id: 1,
      name: "Aker Brygge Waterfront",
      desc: "Beautiful reflections in the fjord at dawn. City lights mirror perfectly in calm water.",
      time: "blue-hour",
      status: "shot",
      dir: "E",
      seasons: ["spring","summer"],
      access: "Public. Best avoided on weekend evenings (crowded).",
      x: 62, y: 48
    },
    {
      id: 2,
      name: "Ekeberg Ridge",
      desc: "Overlooking the Oslo fjord and city skyline. Incredible panorama especially in autumn fog.",
      time: "golden-morning",
      status: "scouted",
      dir: "W",
      seasons: ["autumn","winter"],
      access: "Free parking at Ekebergparken. 5 min walk to viewpoint.",
      x: 71, y: 55
    },
    {
      id: 3,
      name: "Nordmarka Forest Trail",
      desc: "Tall pines filter the light beautifully. Snow scenes in winter are extraordinary.",
      time: "golden-evening",
      status: "revisit",
      dir: "SW",
      seasons: ["winter","autumn"],
      access: "Trailhead at Frognerseteren. Ski tracks in winter.",
      x: 35, y: 25
    },
    {
      id: 4,
      name: "Vigeland Park — Monolith",
      desc: "The sculpture park reads totally differently in early morning mist. Virtually empty before 7am.",
      time: "golden-morning",
      status: "shot",
      dir: "SE",
      seasons: ["spring","summer","autumn"],
      access: "Open 24h. Free. Best before 8am.",
      x: 45, y: 42
    },
    {
      id: 5,
      name: "Hovedøya Island",
      desc: "Medieval monastery ruins with fjord views. Accessible by ferry. Wildflowers in June.",
      time: "overcast",
      status: "scouted",
      dir: "N",
      seasons: ["spring","summer"],
      access: "Ferry from Aker Brygge. No cars. Tripods OK.",
      x: 78, y: 68
    }
  ];
}

// ── STATE ──
let locations = loadLocations();
let nextId = locations.reduce((m, l) => Math.max(m, l.id), 0) + 1;
let selectedId = null;
let currentFilter = 'all';
let currentView = 'map';
let pendingPin = null;
let selectedDir = null;
let selectedSeasons = [];

// ── CONSTANTS ──
const TIME_LABELS = {
  'golden-morning': '🌅 Golden Morning',
  'golden-evening': '🌇 Golden Evening',
  'blue-hour': '🌃 Blue Hour',
  'overcast': '☁️ Overcast',
  'midday': '☀️ Midday',
  'any': '🕐 Any Time'
};

const STATUS_LABELS = {
  'scouted': 'Scouted',
  'shot': 'Shot',
  'revisit': 'Revisit'
};

const DIR_ANGLES = { N:270, NE:315, E:0, SE:45, S:90, SW:135, W:180, NW:225 };

// ── LIGHT INDICATOR ──
function getLightIndicator(loc) {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;

  const windows = {
    'golden-morning': { start: 5.5, end: 8.5, label: 'Golden morning light' },
    'golden-evening': { start: 17.5, end: 20.5, label: 'Golden evening light' },
    'blue-hour':      { start: 5.0, end: 6.0,  label: 'Blue hour' },
    'overcast': null,
    'midday':         { start: 11,  end: 14,   label: 'Midday light' },
    'any': null
  };

  const w = windows[loc.time];
  if (!w) return { type: 'light-good', dot: true, text: 'Good any time of day' };

  if (hour >= w.start && hour <= w.end) {
    return { type: 'light-good', dot: true, text: `${w.label} — right now!` };
  }

  if (hour < w.start) {
    const mins = Math.round((w.start - hour) * 60);
    if (mins < 120) return { type: 'light-soon', dot: true, text: `${w.label} in ${mins}m` };
  }

  const hoursUntil = hour < w.start
    ? w.start - hour
    : (24 - hour + w.start);
  const minsUntil = Math.round(hoursUntil * 60);
  const hh = Math.floor(minsUntil / 60);
  const mm = minsUntil % 60;
  const timeStr = hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
  return { type: 'light-missed', dot: false, text: `Next ${w.label} in ${timeStr}` };
}

// ── FILTER ──
function getFilteredLocations() {
  return locations.filter(loc => {
    switch (currentFilter) {
      case 'all':     return true;
      case 'scouted': return loc.status === 'scouted';
      case 'shot':    return loc.status === 'shot';
      case 'revisit': return loc.status === 'revisit';
      case 'morning': return loc.time === 'golden-morning';
      case 'golden':  return loc.time === 'golden-morning' || loc.time === 'golden-evening';
      default:        return true;
    }
  });
}

// ── RENDER ──
function renderAll() {
  renderPins();
  renderList();
  document.getElementById('count-all').textContent = locations.length;
}

function renderPins() {
  const container = document.getElementById('pins-container');
  container.innerHTML = '';
  getFilteredLocations().forEach(loc => {
    const pin = document.createElement('div');
    pin.className = `map-pin status-${loc.status}${selectedId === loc.id ? ' selected' : ''}`;
    pin.style.left = loc.x + '%';
    pin.style.top = loc.y + '%';
    const emoji = loc.status === 'scouted' ? '📍' : loc.status === 'shot' ? '✓' : '★';
    pin.innerHTML = `
      <div class="pin-label">${loc.name}</div>
      <div class="pin-dot"><span>${emoji}</span></div>
    `;
    pin.addEventListener('click', e => { e.stopPropagation(); selectLocation(loc.id); });
    container.appendChild(pin);
  });
}

function renderList() {
  const list = document.getElementById('location-list');
  const filtered = getFilteredLocations();

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <div class="big">📷</div>
      <p>No locations yet.<br>Add your first scout spot.</p>
    </div>`;
    return;
  }

  list.innerHTML = filtered.map(loc => {
    const light = getLightIndicator(loc);
    const seasons = loc.seasons && loc.seasons.length
      ? loc.seasons.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' · ')
      : 'Any season';
    const dotEl = light.dot
      ? `<div class="light-dot"></div>`
      : `<div style="width:7px;height:7px;border-radius:50%;background:currentColor;opacity:0.3;flex-shrink:0"></div>`;

    return `
      <div class="loc-card status-${loc.status}${selectedId === loc.id ? ' selected' : ''}" onclick="selectLocation(${loc.id})">
        <div class="card-top">
          <div class="loc-name">${escHtml(loc.name)}</div>
          <div class="status-badge">${STATUS_LABELS[loc.status]}</div>
        </div>
        ${loc.desc ? `<div class="loc-desc">${escHtml(loc.desc)}</div>` : ''}
        <div class="card-meta">
          <div class="meta-pill">${TIME_LABELS[loc.time] || loc.time}</div>
          ${loc.dir ? `<div class="meta-pill">Light from ${loc.dir}</div>` : ''}
          <div class="meta-pill">${seasons}</div>
        </div>
        <div class="light-indicator ${light.type}">
          ${dotEl} ${light.text}
        </div>
      </div>
    `;
  }).join('');
}

function renderDetail(loc) {
  document.getElementById('detail-name').textContent = loc.name;

  const light = getLightIndicator(loc);
  const seasons = loc.seasons && loc.seasons.length
    ? loc.seasons.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')
    : 'Any';

  const angle = loc.dir ? DIR_ANGLES[loc.dir] || 0 : 0;
  const rad = (angle - 90) * Math.PI / 180;
  const rx = 18 + 11 * Math.cos(rad);
  const ry = 18 + 11 * Math.sin(rad);

  const dotEl = light.dot
    ? `<div class="light-dot"></div>`
    : `<div style="width:7px;height:7px;border-radius:50%;background:currentColor;opacity:0.3;flex-shrink:0"></div>`;

  document.getElementById('detail-body').innerHTML = `
    <div class="detail-grid">
      <div class="detail-field">
        <label>Best Light</label>
        <div class="value">${TIME_LABELS[loc.time] || loc.time}</div>
      </div>
      <div class="detail-field">
        <label>Status</label>
        <div class="value">${STATUS_LABELS[loc.status]}</div>
      </div>
      <div class="detail-field">
        <label>Light Direction</label>
        <div class="value rose-wrap">
          <svg width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="#e0dbd2" stroke-width="1"/>
            <text x="18" y="7" text-anchor="middle" font-family="DM Mono,monospace" font-size="5" fill="#8a8278">N</text>
            <text x="18" y="33" text-anchor="middle" font-family="DM Mono,monospace" font-size="5" fill="#8a8278">S</text>
            <text x="5" y="20" text-anchor="middle" font-family="DM Mono,monospace" font-size="5" fill="#8a8278">W</text>
            <text x="31" y="20" text-anchor="middle" font-family="DM Mono,monospace" font-size="5" fill="#8a8278">E</text>
            ${loc.dir ? `
            <line x1="18" y1="18" x2="${rx.toFixed(1)}" y2="${ry.toFixed(1)}" stroke="#c8902a" stroke-width="2" stroke-linecap="round"/>
            <circle cx="${rx.toFixed(1)}" cy="${ry.toFixed(1)}" r="2.5" fill="#c8902a"/>` : ''}
          </svg>
          <span>${loc.dir || '—'}</span>
        </div>
      </div>
      <div class="detail-field">
        <label>Best Season</label>
        <div class="value">${seasons}</div>
      </div>
    </div>
    ${loc.desc ? `
    <div class="detail-field" style="margin-bottom:12px">
      <label>Notes</label>
      <div class="value" style="font-size:13px;line-height:1.6;color:var(--ink-mid)">${escHtml(loc.desc)}</div>
    </div>` : ''}
    ${loc.access ? `
    <div class="detail-field" style="margin-bottom:12px">
      <label>Access</label>
      <div class="value" style="font-size:12px;color:var(--ink-mid)">${escHtml(loc.access)}</div>
    </div>` : ''}
    <div class="light-indicator ${light.type}" style="margin-top:4px">
      ${dotEl} ${light.text}
    </div>
  `;

  document.getElementById('detail-panel').classList.add('open');
}

// ── INTERACTIONS ──
function selectLocation(id) {
  selectedId = id;
  const loc = locations.find(l => l.id === id);
  if (!loc) return;
  renderAll();
  renderDetail(loc);

  // On mobile, scroll card into view
  const card = document.querySelector(`.loc-card.selected`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeDetail() {
  selectedId = null;
  document.getElementById('detail-panel').classList.remove('open');
  renderAll();
}

function deleteSelected() {
  if (!selectedId) return;
  const loc = locations.find(l => l.id === selectedId);
  if (!loc) return;
  if (!confirm(`Delete "${loc.name}"?`)) return;
  locations = locations.filter(l => l.id !== selectedId);
  saveLocations();
  closeDetail();
  showToast('Location deleted');
}

function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderAll();
}

function setView(v) {
  currentView = v;
  const body = document.getElementById('app-body');
  document.getElementById('btn-map').classList.toggle('active', v === 'map');
  document.getElementById('btn-list').classList.toggle('active', v === 'list');
  body.classList.toggle('list-view', v === 'list');
  if (v === 'list') closeDetail();
  renderAll();
}

// Map click to add
document.getElementById('map-canvas').addEventListener('click', function(e) {
  if (e.target.closest('.map-pin')) return;
  if (e.target.closest('.detail-panel')) return;
  const rect = this.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1);
  const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1);
  pendingPin = { x: parseFloat(x), y: parseFloat(y) };
  document.getElementById('map-hint').style.opacity = '0';
  openAddForm();
});

// ── FORM ──
function openAddForm() {
  selectedDir = null;
  selectedSeasons = [];
  document.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.season-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('f-name').value = '';
  document.getElementById('f-desc').value = '';
  document.getElementById('f-access').value = '';
  document.getElementById('f-time').value = 'golden-morning';
  document.getElementById('f-status').value = 'scouted';
  document.getElementById('add-form').classList.add('open');
  setTimeout(() => document.getElementById('f-name').focus(), 150);
}

function closeAddForm() {
  document.getElementById('add-form').classList.remove('open');
  pendingPin = null;
}

function selectDir(btn) {
  document.querySelectorAll('.dir-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  selectedDir = btn.dataset.dir;
}

function toggleSeason(btn) {
  const s = btn.dataset.season;
  btn.classList.toggle('selected');
  if (selectedSeasons.includes(s)) {
    selectedSeasons = selectedSeasons.filter(x => x !== s);
  } else {
    selectedSeasons.push(s);
  }
}

function saveLocation() {
  const name = document.getElementById('f-name').value.trim();
  if (!name) {
    document.getElementById('f-name').focus();
    document.getElementById('f-name').style.borderColor = 'var(--red)';
    setTimeout(() => document.getElementById('f-name').style.borderColor = '', 1500);
    return;
  }

  const pos = pendingPin || {
    x: parseFloat((15 + Math.random() * 70).toFixed(1)),
    y: parseFloat((15 + Math.random() * 70).toFixed(1))
  };

  const loc = {
    id: nextId++,
    name,
    desc: document.getElementById('f-desc').value.trim(),
    time: document.getElementById('f-time').value,
    status: document.getElementById('f-status').value,
    dir: selectedDir,
    seasons: [...selectedSeasons],
    access: document.getElementById('f-access').value.trim(),
    x: pos.x,
    y: pos.y
  };

  locations.push(loc);
  saveLocations();
  closeAddForm();
  renderAll();
  selectLocation(loc.id);
  showToast('Location saved');
}

// Close form on backdrop click
document.getElementById('add-form').addEventListener('click', function(e) {
  if (e.target === this) closeAddForm();
});

// ── TOAST ──
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}

// ── UTILS ──
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── ONLINE/OFFLINE ──
function updateOnlineStatus() {
  const banner = document.getElementById('offline-banner');
  if (banner) banner.classList.toggle('show', !navigator.onLine);
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// ── SERVICE WORKER ──
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

// ── KEYBOARD SHORTCUTS ──
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (document.getElementById('add-form').classList.contains('open')) closeAddForm();
    else if (document.getElementById('detail-panel').classList.contains('open')) closeDetail();
  }
  if (e.key === 'n' && !e.target.matches('input,textarea,select')) openAddForm();
});

// ── INIT ──
renderAll();
