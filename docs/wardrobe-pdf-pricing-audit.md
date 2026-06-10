# Wardrobe PDF Pricing Audit

Source of truth: `references/2026 PRICE LIST wardrobe.pdf`

Audit date: 2026-06-10

## PDF extraction

- The PDF has 60 pages.
- Embedded PDF text extraction was not usable for pricing tables; it produced only minimal text.
- OCR was run with `scripts/ocr-pdf.swift`, then grouped with `scripts/wardrobe-ocr-to-lines.mjs`.
- OCR output was used to verify the section/page map and spot-check mapped prices against the catalogue pages.

## PDF sections found

- Page 3: contents.
- Page 16: Create door prices, Create panel prices, Create worktop prices.
- Page 19: Manhattan door prices.
- Pages 20-21: Cairo fretted doors and Cairo fretted door prices.
- Pages 22-23: glazed and feature doors, glazing prices.
- Page 29: Serica slab supermatt door, panel and accessory prices.
- Page 31: Vision acrylic door, panel and accessory prices.
- Page 33: Milano door, panel and accessory prices.
- Pages 34-35: Fusion textured and Fusion mirror gloss door, panel and accessory prices.
- Page 36: Plas cut and edge colours and prices.
- Page 39: Sliding Door Builder.
- Page 41: acoustic panel prices.
- Pages 42-43: Monument sinks/taps availability.
- Pages 44-45: handles, including single and 50s prices.
- Pages 46-47: Hettich hinges and i-Hinges.
- Pages 48-49: Slimbox drawers and storage tower items.
- Pages 50-51: storage accessories.
- Pages 52-53: LED integrated lighting.
- Page 54: bedroom and kitchen accessories.

## Current implementation

Pricing catalog: `src/data/wardrobe/categories.ts`

The catalog uses `references/2026 PRICE LIST wardrobe.pdf` as its source reference and contains real mapped prices for:

- Create vinyl doors.
- Create panels.
- Create worktops.
- Manhattan doors.
- Cairo fretted doors.
- Glazed and feature door glazing/add-on prices.
- Serica slab doors and panels.
- Vision acrylic doors and panels.
- Milano doors and panels.
- Fusion textured doors and panels.
- Fusion mirror gloss doors and panels.
- Plas cut and edge boards.
- Acoustic panels and end caps.
- Handles, including single and 50s nett prices.
- Hettich hinges and i-Hinges.
- Slimbox drawers and drawer parts.
- Storage tower and internal storage accessories.
- LED lighting and accessories.
- Bedroom/kitchen accessories.
- Monument sinks and taps.

## Manual or incomplete mapping

- Sliding doors are intentionally manual. Page 39 states pricing is available online via the Integral Sliding Door Builder, not as a PDF price grid.
- `Custom Item (manual price)` remains a manual fallback for catalogue items that need staff verification.
- Some PDF accessory/availability pages include availability charts or ordering instructions rather than direct price tables; those still require manual checking before adding new mapped products.

## Missing price behaviour

- Wardrobe products using `manual` pricing now show a clear warning until staff enter a verified manual unit price.
- Wardrobe grid lookups warn when dimensions are outside the mapped grid or a price cell is unavailable.
- The quote builder blocks adding a wardrobe item while a pricing warning is active, preventing silent `£0` wardrobe lines.

## Fitting / labour behaviour

- Fitting is represented as normal `labour` quote line items.
- Labour/fitting is available in Project, Blinds-only and Wardrobes-only quote modes.
- Each area can add a room-specific labour/fitting line.
- The quote summary can add an overall fitting cost, stored as an editable labour line.
- Products subtotal and fitting subtotal are displayed separately in the builder and customer preview/export.
