# Web Tools Collection

A collection of simple, useful web tools hosted on Netlify.

## Tools

- **Tap Counter** (`/counter`) - A simple tap counter with dark mode support
- **Image to BMP Converter** (`/bmp-convert`) - Convert PNG/JPEG images to BMP format locally in your browser

## Local Development

To run locally, use a local server (required for ES6 modules):

```bash
npx serve
```

Then open the URL shown in your terminal (typically `http://localhost:3000`).

- Home page: `http://localhost:3000/`
- Counter tool: `http://localhost:3000/counter`
- BMP Converter: `http://localhost:3000/bmp-convert`

## Deployment

### Netlify Deployment

This repository is configured for Netlify hosting:

1. Connect your repository to Netlify
2. Build command: (leave empty - no build needed for static site)
3. Publish directory: `.` (root)
4. Netlify will automatically:
   - Serve static files from the root directory
   - Apply redirects from `netlify.toml` for clean URLs (`/counter`, `/bmp-convert`)

The `netlify.toml` file configures URL redirects so that `/counter` and `/bmp-convert` work without needing `/counter/index.html`.

## Adding New Tools

To add a new tool:

1. Create a new directory (e.g., `/new-tool/`)
2. Add `index.html` in that directory (and any CSS/JS files needed)
3. Add redirect in `netlify.toml`:
   ```toml
   [[redirects]]
     from = "/new-tool"
     to = "/new-tool/index.html"
     status = 200
   ```
4. Add tool entry to the `tools` array in `/index.html`
