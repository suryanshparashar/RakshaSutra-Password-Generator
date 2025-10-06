# RakshaSutra - Build Instructions

## Requirements

- **Node.js**: 18.0 or higher
- **npm**: 9.0 or higher

## Build Instructions

### Install Dependencies

```
npm install
```

### Production Build

```
npm run build
```

Output will be in the `dist/` folder.

### Development Build

```
npm run dev
```

## Build Output

The `dist/` folder will contain:

- `index.html`
- `manifest.json`
- `index.css`
- `index.js`
- `logo.png` (128x128)

## Technology Stack

- React 18
- TypeScript 5
- Vite 5
- Web Crypto API (for cryptographically secure random generation)

## Notes

- Build time: ~3 seconds
- All processing happens client-side
- No external API calls or data collection
- Source code is unobfuscated beyond standard Vite production minification
