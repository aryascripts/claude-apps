# Netlify Hosting Refactor Plan

## Overview

Transform the repository into a multi-tool website hosted on Netlify with:

- A home page listing all tools
- Each tool accessible at its own path (e.g., `/counter`, `/bmp-convert`)
- Clean, maintainable structure for adding new tools

## Current Structure

```
web-tools/
├── README.md
├── LICENSE
├── counter/
│   └── index.html
└── bmp-convert/
    ├── index.html
    ├── styles.css
    ├── script.js
    ├── encoder.js
    ├── preview.js
    ├── helpers.js
    └── ... (other files)
```

## Target Structure

```
web-tools/
├── README.md
├── LICENSE
├── index.html                    # NEW: Home page
├── styles.css                    # NEW: Home page styles
├── netlify.toml                  # NEW: Netlify configuration (redirects only)
├── counter/                      # Plain HTML/JS tool
│   └── index.html
└── bmp-convert/                  # Plain HTML/JS tool
    ├── index.html
    ├── styles.css
    ├── script.js
    └── ... (other files)
```

## Implementation Steps

### Step 1: Create Root Home Page (`index.html`)

- **Location**: `/index.html` (root directory)
- **Purpose**: Landing page with tool cards/buttons
- **Features**:
  - Match bmp-convert design system exactly
  - List of all tools with:
    - Tool name
    - One-sentence description
    - Clickable card/button that links to the tool
  - Responsive design
  - Same structure as bmp-convert (container, cards, etc.)
- **Styling**: Reference `/bmp-convert/styles.css` directly in the HTML
  ```html
  <link rel="stylesheet" href="/bmp-convert/styles.css" />
  ```

### Step 2: Create Home Page Styles (`styles.css`)

- **Location**: `/styles.css` (root directory) - **OPTIONAL**
- **Purpose**: Additional styles specific to home page layout (if needed)
- **Note**: Most styling will come from referencing `/bmp-convert/styles.css`
- **Approach**:
  - Reference bmp-convert styles.css in the HTML
  - Only add minimal additional CSS if needed for home page specific layout
  - Use same CSS classes from bmp-convert (`.card`, `.btn-convert`, etc.) where possible

### Step 3: Configure Netlify Routing (`netlify.toml`)

- **Location**: `/netlify.toml` (root directory)
- **Purpose**: Configure Netlify to serve tools correctly with clean URLs
- **Configuration**:

  ```toml
  [build]
    publish = "."

  # Redirect tool paths to their index.html files
  [[redirects]]
    from = "/counter"
    to = "/counter/index.html"
    status = 200

  [[redirects]]
    from = "/bmp-convert"
    to = "/bmp-convert/index.html"
    status = 200
  ```

- **Why**: Ensures `/counter` and `/bmp-convert` URLs work correctly without needing `/counter/index.html`

### Step 4: Verify Tool Paths

- **Counter Tool**:
  - Already self-contained in `counter/index.html`
  - No changes needed (all styles/scripts inline)
- **BMP Convert Tool**:
  - Check that relative paths in `bmp-convert/index.html` work correctly
  - Files like `styles.css`, `script.js` should be referenced as `./styles.css` or `styles.css` (relative to the HTML file)
  - Verify all asset paths are relative (not absolute)

### Step 5: Update README.md

- Update documentation to reflect new structure
- Add Netlify deployment instructions
- Update local development instructions if needed

### Step 6: Test Locally

- Test home page loads correctly
- Test navigation from home page to each tool
- Test each tool works independently
- Test direct URLs (e.g., `/counter`, `/bmp-convert`)
- Verify all assets load correctly

### Step 7: Prepare for Netlify Deployment

- Ensure `netlify.toml` is in root
- Document deployment process

## Tool Configuration

### Plain HTML/JS Tools

- **Structure**: Tool files directly in `tool-name/` directory
- **Example**: `counter/`, `bmp-convert/`
- **Build**: None required (static files)
- **Serving**: Direct from `tool-name/index.html`
- **Netlify Redirect**: `from = "/tool-name"` → `to = "/tool-name/index.html"`

### Tool Metadata Structure

For easy maintenance, we can structure tool info in the home page:

```javascript
const tools = [
  {
    name: "Tap Counter",
    path: "/counter",
    description: "A simple tap counter with dark mode support",
  },
  {
    name: "Image to BMP Converter",
    path: "/bmp-convert",
    description:
      "Convert PNG/JPEG images to BMP format locally in your browser",
  },
];
```

## File Changes Summary

### New Files

1. `/index.html` - Home page (references `/bmp-convert/styles.css` for styling)
2. `/styles.css` - Home page styles (optional, only if additional styles needed beyond bmp-convert)
3. `/netlify.toml` - Netlify configuration (redirects only)

### Modified Files

1. `/README.md` - Update documentation

### Unchanged Files

- `/counter/index.html` - No changes needed
- `/bmp-convert/index.html` - Verify paths, but likely no changes
- All other tool files - No changes needed

## Design Considerations

### Home Page Design

- **Layout**: Grid or flexbox with tool cards (matching bmp-convert card layout)
- **Styling**: **Reference `/bmp-convert/styles.css` directly**
  - Link to `/bmp-convert/styles.css` in the home page HTML
  - Use existing CSS classes from bmp-convert (`.card`, `.btn-convert`, etc.)
  - Same gradient background, cards, buttons automatically
  - Same color palette and CSS variables automatically
- **Implementation**:
  - Home page HTML includes: `<link rel="stylesheet" href="/bmp-convert/styles.css" />`
  - Use bmp-convert's existing classes for consistency
  - Only add minimal custom CSS if needed for home page specific layout

### Navigation

- Home page → Tool: Direct link
- Tool → Home: Consider adding a "Back to Home" link (optional, can be added later)

## Testing Checklist

- [ ] Home page loads and displays all tools
- [ ] Each tool button links to correct path
- [ ] `/counter` loads counter tool correctly
- [ ] `/bmp-convert` loads BMP converter correctly
- [ ] All assets (CSS, JS, images) load correctly in tools
- [ ] Direct navigation to tool URLs works
- [ ] Responsive design works on mobile
- [ ] No console errors
- [ ] Works with `npx serve` locally

## Future Considerations

### Adding New Tools

1. Create new directory (e.g., `/new-tool/`)
2. Add `index.html` in that directory (and any CSS/JS files needed)
3. Add redirect in `netlify.toml`: `from = "/new-tool"` → `to = "/new-tool/index.html"`
4. Add tool entry to home page `tools` array

### Potential Enhancements

- Search functionality (if many tools)
- Categories/tags for tools
- Tool icons/thumbnails
- "Back to Home" button in each tool
- Shared header/footer component (if needed)

## Deployment Notes

### Netlify Setup

1. Connect repository to Netlify
2. Build command: (leave empty - no build needed for static site)
3. Set publish directory: `.` (root)
4. Netlify will serve static files and apply redirects from `netlify.toml`
5. Deploy

### Custom Domain

- Configure `tools.netlify.com` or custom domain in Netlify settings
- Update README with new URL

## Benefits of This Simple Approach

- **Simple**: No build complexity - just static files
- **Fast**: No build step means faster deployments
- **Easy to maintain**: Clear structure, easy to add new tools
- **No Breaking Changes**: Existing tools continue to work as-is
- **Future-proof**: Can add build support later if needed without changing this structure

## Next Steps After Plan Approval

1. Create home page HTML structure
2. Reference `/bmp-convert/styles.css` in home page HTML
3. Use bmp-convert CSS classes (`.card`, `.btn-convert`, etc.) for styling
4. Add minimal custom CSS if needed (only for home page specific layout)
5. Add Netlify configuration (`netlify.toml`)
6. Test locally with `npx serve`
7. Update documentation
8. Deploy to Netlify
