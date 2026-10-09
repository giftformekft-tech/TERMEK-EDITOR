# Studio UI smoke test

Run from the repository root with Node.js, Playwright and Chrome installed:

```powershell
$env:PLAYWRIGHT_MODULE = 'path/to/node_modules/playwright'
$env:FABRIC_JS_PATH = 'path/to/fabric-5.3.0.min.js'
node tests/studio-smoke.cjs
node tests/appearance-preview.cjs
node tests/team-smoke.cjs
```

`PLAYWRIGHT_MODULE` is optional when `playwright` resolves normally. `CHROME_PATH` optionally selects a Chrome executable. Fabric is the same 5.3.0 browser dependency already loaded by the plugin.

The test runs the actual frontend template, stylesheet and editor code in a browser with an in-memory product/catalog and mocked REST responses. It checks the tool panels, inline colour and size choice (several sizes require an explicit choice, the cart button explains what is missing), the text field, layers, history, stable object positions across viewport changes, the back-side offer with its surcharge, preview mode, templates with confirmation, cart failure recovery and success, theme colours, touch targets and responsive access at 1440, 1024, 768, 390 and 320 pixels. Screenshots go to the ignored `tmp/ui-qa` directory. No live shop or customer data is accessed.

This does not replace a WordPress/WooCommerce integration test of admin persistence, live product data, pricing, or successful checkout.

Mobile coverage also checks the five-tab bar without horizontal scrolling, that an open bottom sheet never covers the tab bar, the top cart button opening the order summary with final cart submission and bulk ordering, cold-start prices (including numeric-only data without the desktop price container), centred icons under theme button padding, and restoring an unfinished design from the browser after a reload.

The appearance test uses the real admin preview markup and script with form fixtures. It verifies changing primary/secondary colors, square corners, and restoring defaults without submitting a form.

The team designer test (`team-smoke.cjs`) runs the real `/csapatruha-tervezo/` template, stylesheet and script with an in-memory catalog and a mocked order endpoint. It checks the mode choice, the work-only presets, the logo preset (file chooser, 9×9 cm at the left chest), editing a back text that keeps its preset width, the print price groups, the colour × size quantities with the discount on product + print, the contrast warning, cart failure and success with the full request body (rows, per-colour previews, ~300 dpi print files), the roster (name, number, size and colour per shirt, the active player shown on the canvas and its side, duplicate number warning, the name/number surcharge, the shared print without names and one name/number file per player), restoring a draft with its roster after reload, and phone widths 390 and 320 without horizontal scrolling.
