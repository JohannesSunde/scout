# Scout — Field Notes

A clean, offline-capable PWA for photographers to scout and annotate shoot locations.

## Features

- 📍 **Map view** — drop pins anywhere on a canvas map
- 📋 **List view** — filterable card grid of all your locations
- 🌅 **Live light indicator** — tells you if ideal light is *right now*, *coming soon*, or *later*
- 🧭 **Light direction** — compass rose showing ideal light direction per spot
- 🔖 **Status tracking** — Scouted / Shot / Want to revisit
- 📴 **Offline support** — works without internet via Service Worker
- 💾 **Persistent storage** — all data saved in localStorage

## Deploy to GitHub Pages

1. Push this folder to a GitHub repository:

```bash
git init
git add .
git commit -m "Initial Scout PWA"
git remote add origin https://github.com/YOUR_USERNAME/scout-pwa.git
git push -u origin main
```

2. Go to **Settings → Pages** in your GitHub repo
3. Set Source to **Deploy from a branch → main → / (root)**
4. Your app will be live at `https://YOUR_USERNAME.github.io/scout-pwa/`

> **Tip:** For a custom domain, add a `CNAME` file with your domain name.

## Install as a PWA

Once deployed, open the URL on:
- **iOS Safari** → Share → Add to Home Screen
- **Android Chrome** → Menu → Add to Home Screen / Install App
- **Desktop Chrome/Edge** → Click the install icon in the address bar

## Local Development

Just open `index.html` in a browser. For Service Worker support (offline mode), serve it locally:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Then visit `http://localhost:8080`.

## Customising

- **Default locations** — edit `getDefaultLocations()` in `app.js`
- **Light windows** — edit the `windows` object in `getLightIndicator()` in `app.js`
- **Colors & fonts** — edit CSS variables in `:root` in `style.css`

## File Structure

```
scout-pwa/
├── index.html      # App shell
├── style.css       # All styles
├── app.js          # All logic + state
├── sw.js           # Service worker (offline cache)
├── manifest.json   # PWA manifest
└── icons/
    ├── icon-192.svg
    └── icon-512.svg
```
