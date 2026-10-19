# AfriMahjong
**Play. Explore. Discover Africa.**

A mobile-first African-themed Mahjong Solitaire game built with React, TypeScript and Vite. The first version includes tile matching, hints, undo, shuffle, score, levels, local progress and installable/offline PWA support.

## Run locally
```bash
npm install
npm run dev
```

## Production build
```bash
npm run build
npm run preview
```

## Deploy to Vercel
Import `zayyanusani/African-mahjong` from GitHub in Vercel. Use the default Vite settings:
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

The game stores progress on the device using localStorage. No API keys or backend secrets are required for this offline-first version. An Android APK can be packaged later using a native wrapper such as Capacitor after the web version is tested.