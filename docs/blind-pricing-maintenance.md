# Blind Pricing Maintenance

## Source workbook

The active workbook and its import rules are configured in:

- `scripts/blinds-workbook.config.json`

Change `sourceWorkbook` when a replacement price list arrives. Add or remove worksheet names in
`pricingSheets`. Use `tableTitleOverrides` and `tableBandOverrides` only when an Excel heading is
ambiguous.

Regenerate the app data with:

```sh
npm run import:blinds-workbook
```

Validate without changing generated files with:

```sh
npm run validate:blinds-workbook
```

## Normal and discounted prices

Generated tables are stored in `src/data/priceTables/workbookPriceTables.json`. Every table has
clearly separated variants:

```json
{
  "priceVariants": {
    "normal": {
      "label": "Normal company list prices",
      "bands": {}
    },
    "companyDiscounted": {
      "label": "Discounted prices from company",
      "bands": {}
    }
  }
}
```

The quote form uses normal prices by default. The `Discounted prices from company` control switches
only to `priceVariants.companyDiscounted` for the selected product.

Do not combine the two sections. The importer verifies that both variants have the same bands,
widths, and heights before writing app data.

## Editable modules

- Blind type names and workbook matching: `src/data/blinds/productTypes.ts`
- Blind type picker hierarchy: `src/components/BlindTypeGroupedPicker.tsx`
- Extras and their blind-type restrictions: `src/data/extras/extras.json`
- Generated price grids: `src/data/priceTables/workbookPriceTables.json`
- Generated fabric and finish choices: `src/data/fabrics/workbookFabrics.json`
- Import coverage and audit results: `src/data/priceTables/workbookCoverage.json`

The blind colour entered on a quote is free text. It is stored on the quote item and does not alter
the selected pricing band unless the workbook defines that colour as a separate product/finish.
