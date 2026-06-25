#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import zipfile
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "scripts" / "blinds-workbook.config.json"
CONFIG = json.loads(CONFIG_PATH.read_text())
WORKBOOK = ROOT / CONFIG["sourceWorkbook"]
OUT_TABLES = ROOT / "src" / "data" / "priceTables" / "workbookPriceTables.json"
OUT_SUPPLIERS = ROOT / "src" / "data" / "suppliers" / "workbookSuppliers.json"
OUT_FABRICS = ROOT / "src" / "data" / "fabrics" / "workbookFabrics.json"
OUT_COVERAGE = ROOT / "src" / "data" / "priceTables" / "workbookCoverage.json"
OUT_ANALYSIS = ROOT / "docs" / "blind-workbook-analysis.md"

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

TARGET_SHEETS = set(CONFIG["pricingSheets"])
REFERENCE_SHEETS = set(CONFIG["referenceSheets"])
COMPANY_SHEETS = set(CONFIG["companySheets"])
COMPANY_NAME_BY_SHEET = CONFIG["companyNames"]
SINGLE_PRODUCT_SHEETS = set(CONFIG.get("singleProductSheets", []))
TABLE_TITLE_OVERRIDES = CONFIG.get("tableTitleOverrides", {})
TABLE_BAND_OVERRIDES = CONFIG.get("tableBandOverrides", {})
REQUIRED_BLIND_TYPES = set(CONFIG.get("requiredBlindTypes", []))

BAND_RE = re.compile(r"^(?:price\s+band\s+)?([A-Z]{1,3})(?:\s|$)", re.I)
IGNORE_TITLE_WORDS = {
    "mm",
    "inches",
    "inch",
    "width",
    "height",
    "drop",
    "size",
    "prices",
    "price",
    "band",
}


@dataclass
class Sheet:
    name: str
    path: str
    state: str
    cells: dict[tuple[int, int], Any]
    cell_styles: dict[tuple[int, int], int]
    formulas: dict[tuple[int, int], str]
    max_row: int
    max_col: int


@dataclass
class TableCandidate:
    sheet: str
    title: str
    band: str
    header_row: int
    start_col: int
    end_col: int
    height_col: int
    widths: list[int]
    heights: list[int]
    matrix: list[list[float]]
    cell_range: str


def col_to_index(col: str) -> int:
    n = 0
    for ch in col:
        n = n * 26 + ord(ch.upper()) - 64
    return n


def index_to_col(n: int) -> str:
    out = ""
    while n:
        n, rem = divmod(n - 1, 26)
        out = chr(65 + rem) + out
    return out


def cell_ref(row: int, col: int) -> str:
    return f"{index_to_col(col)}{row}"


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "standard"


def workbook_source() -> str:
    try:
        return str(WORKBOOK.resolve().relative_to(ROOT.resolve()))
    except ValueError:
        return str(WORKBOOK.resolve())


def clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value).strip())


def is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def as_money(value: Any) -> float | None:
    if is_number(value):
        number = float(value)
        if 0 <= number < 10000:
            return round(number + 0.0000001, 2)
    if isinstance(value, str):
        text = value.replace("£", "").replace(",", "").strip()
        try:
            number = float(text)
        except ValueError:
            return None
        if 0 <= number < 10000:
            return round(number + 0.0000001, 2)
    return None


def as_dimension(value: Any) -> int | None:
    if is_number(value):
        number = float(value)
    elif isinstance(value, str):
        text = value.replace(",", "").strip().lower()
        mm_match = re.search(r"/\s*(\d{3,4})(?:\D|$)", text)
        if mm_match:
            number = float(mm_match.group(1))
        elif "cm" in text:
            cm_match = re.search(r"(\d+(?:\.\d+)?)\s*cm", text)
            if not cm_match:
                return None
            number = float(cm_match.group(1)) * 10
        else:
            number_match = re.fullmatch(r"\d+(?:\.\d+)?", text)
            if not number_match:
                return None
            number = float(text)
    else:
        return None

    if 100 <= number <= 6000 and abs(number - round(number)) < 0.001:
        return int(round(number))
    return None


def read_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    values: list[str] = []
    for si in root.findall("main:si", NS):
        parts = [node.text or "" for node in si.findall(".//main:t", NS)]
        values.append("".join(parts))
    return values


def read_workbook(zf: zipfile.ZipFile) -> tuple[list[tuple[str, str, str]], list[dict[str, str]]]:
    workbook = ET.fromstring(zf.read("xl/workbook.xml"))
    rels = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
    rel_by_id = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels.findall("pkgrel:Relationship", NS)
    }
    sheets: list[tuple[str, str, str]] = []
    for sheet in workbook.findall(".//main:sheet", NS):
        name = sheet.attrib["name"]
        rid = sheet.attrib[f"{{{NS['rel']}}}id"]
        state = sheet.attrib.get("state", "visible")
        target = rel_by_id[rid]
        path = "xl/" + target.lstrip("/")
        if not path.startswith("xl/worksheets/"):
            path = "xl/worksheets/" + Path(target).name
        sheets.append((name, path, state))

    defined_names: list[dict[str, str]] = []
    for node in workbook.findall(".//main:definedName", NS):
        defined_names.append(
            {
                "name": node.attrib.get("name", ""),
                "localSheetId": node.attrib.get("localSheetId", ""),
                "refersTo": node.text or "",
            }
        )
    return sheets, defined_names


def read_red_font_style_ids(zf: zipfile.ZipFile) -> set[int]:
    try:
        root = ET.fromstring(zf.read("xl/styles.xml"))
    except KeyError:
        return set()

    red_font_ids: set[int] = set()
    fonts = root.find("main:fonts", NS)
    if fonts is not None:
        for index, font in enumerate(fonts.findall("main:font", NS)):
            color = font.find("main:color", NS)
            if color is None:
                continue
            rgb = color.attrib.get("rgb", "").upper()
            indexed = color.attrib.get("indexed")
            if rgb in {"FFFF0000", "FFFE0000"} or indexed == "10":
                red_font_ids.add(index)

    red_style_ids: set[int] = set()
    cell_xfs = root.find("main:cellXfs", NS)
    if cell_xfs is not None:
        for index, xf in enumerate(cell_xfs.findall("main:xf", NS)):
            font_id = xf.attrib.get("fontId")
            if font_id is not None and int(font_id) in red_font_ids:
                red_style_ids.add(index)
    return red_style_ids


def read_sheet(zf: zipfile.ZipFile, name: str, path: str, state: str, shared: list[str]) -> Sheet:
    root = ET.fromstring(zf.read(path))
    cells: dict[tuple[int, int], Any] = {}
    cell_styles: dict[tuple[int, int], int] = {}
    formulas: dict[tuple[int, int], str] = {}
    max_row = 0
    max_col = 0
    for cell in root.findall(".//main:c", NS):
        ref = cell.attrib.get("r", "")
        match = re.match(r"([A-Z]+)(\d+)", ref)
        if not match:
            continue
        col = col_to_index(match.group(1))
        row = int(match.group(2))
        if "s" in cell.attrib:
            cell_styles[(row, col)] = int(cell.attrib["s"])
        formula_node = cell.find("main:f", NS)
        if formula_node is not None and formula_node.text:
            formulas[(row, col)] = formula_node.text
        value_node = cell.find("main:v", NS)
        inline_text = cell.find(".//main:t", NS)
        value: Any = None
        cell_type = cell.attrib.get("t")
        if cell_type == "s" and value_node is not None:
            value = shared[int(value_node.text or 0)]
        elif cell_type == "inlineStr" and inline_text is not None:
            value = inline_text.text or ""
        elif value_node is not None:
            raw = value_node.text or ""
            try:
                number = float(raw)
                value = int(number) if number.is_integer() else number
            except ValueError:
                value = raw
        if value is not None and value != "":
            cells[(row, col)] = value
            max_row = max(max_row, row)
            max_col = max(max_col, col)
    return Sheet(
        name=name,
        path=path,
        state=state,
        cells=cells,
        cell_styles=cell_styles,
        formulas=formulas,
        max_row=max_row,
        max_col=max_col,
    )


def row_values(sheet: Sheet, row: int) -> list[Any]:
    return [sheet.cells.get((row, col)) for col in range(1, sheet.max_col + 1)]


def numeric_runs(sheet: Sheet, row: int) -> list[tuple[int, int, list[int]]]:
    runs: list[tuple[int, int, list[int]]] = []
    col = 1
    while col <= sheet.max_col:
        dims: list[int] = []
        start = col
        while col <= sheet.max_col:
            dim = as_dimension(sheet.cells.get((row, col)))
            if dim is None:
                break
            dims.append(dim)
            col += 1
        if len(dims) >= 3 and all(a < b for a, b in zip(dims, dims[1:])):
            runs.append((start, col - 1, dims))
        col = max(col + 1, start + 1)
    return runs


def find_height_col(sheet: Sheet, row: int, start_col: int) -> int | None:
    candidates = range(max(1, start_col - 4), start_col)
    best_col = None
    best_count = 0
    for col in candidates:
        count = 0
        for r in range(row + 1, min(sheet.max_row, row + 40) + 1):
            dim = as_dimension(sheet.cells.get((r, col)))
            if dim is not None:
                count += 1
        if count > best_count:
            best_col = col
            best_count = count
    return best_col if best_count >= 2 else None


def extract_matrix(
    sheet: Sheet,
    header_row: int,
    start_col: int,
    end_col: int,
    height_col: int,
) -> tuple[list[int], list[list[float]], int]:
    heights: list[int] = []
    matrix: list[list[float]] = []
    last_row = header_row
    blank_streak = 0
    for row in range(header_row + 1, min(sheet.max_row, header_row + 60) + 1):
        height = as_dimension(sheet.cells.get((row, height_col)))
        prices = [as_money(sheet.cells.get((row, col))) for col in range(start_col, end_col + 1)]
        present = [price for price in prices if price is not None]
        if height is not None and len(present) == len(prices):
            heights.append(height)
            matrix.append([float(price) for price in prices if price is not None])
            last_row = row
            blank_streak = 0
            continue
        if height is not None and len(present) >= max(2, int(len(prices) * 0.65)):
            # Partial price grids are not imported because missing cells must not be hidden.
            break
        blank_streak += 1
        if heights and blank_streak >= 2:
            break
    return heights, matrix, last_row


def detect_band(sheet: Sheet, header_row: int, start_col: int) -> str:
    for row in range(header_row - 3, header_row + 1):
        for col in range(max(1, start_col - 5), min(sheet.max_col, start_col + 2) + 1):
            value = sheet.cells.get((row, col))
            if not isinstance(value, str):
                continue
            text = clean_text(value)
            low = text.lower()
            if any(word in low for word in ("width", "warranty", "maximum", "minimum", "drop")):
                continue
            match = BAND_RE.match(text)
            if match and match.group(1).upper() not in {"MM", "INCH", "WIDTH", "MAX", "NO"}:
                return match.group(1).upper()
    return "Standard"


def detect_title(sheet: Sheet, header_row: int, start_col: int, band: str) -> str:
    candidates: list[str] = []
    for row in range(max(1, header_row - 8), header_row + 1):
        for col in range(1, min(sheet.max_col, start_col + 3) + 1):
            value = sheet.cells.get((row, col))
            if not isinstance(value, str):
                continue
            text = clean_text(value)
            low = text.lower()
            if not text or low in IGNORE_TITLE_WORDS:
                continue
            if as_dimension(text) is not None:
                continue
            if low in {"(mm)", "(inch)", "(inches)"} or low.endswith("cm"):
                continue
            if low.startswith(("width", "drop", "height")):
                continue
            band_match = BAND_RE.match(text)
            if band_match and (
                band_match.group(1).upper() == band
                or re.fullmatch(r"[A-Z]{1,3}", text, re.I)
            ):
                continue
            if any(
                word in low
                for word in (
                    "price list",
                    "ex vat",
                    "free",
                    "please",
                    "note",
                    "additional cost",
                    "surcharge",
                    "prices are for",
                )
            ):
                continue
            candidates.append(text)
    if candidates:
        return candidates[-1]
    return sheet.name


def find_tables(sheet: Sheet) -> tuple[list[TableCandidate], list[str]]:
    tables: list[TableCandidate] = []
    notes: list[str] = []
    used_headers: set[tuple[int, int, int]] = set()
    for row in range(1, sheet.max_row + 1):
        for start_col, end_col, widths in numeric_runs(sheet, row):
            header_key = (row, start_col, end_col)
            if header_key in used_headers:
                continue
            height_col = find_height_col(sheet, row, start_col)
            if height_col is None:
                continue
            heights, matrix, last_row = extract_matrix(sheet, row, start_col, end_col, height_col)
            if len(heights) < 2 or not matrix:
                continue
            if len(set(heights)) != len(heights):
                notes.append(
                    f"Skipped duplicate height grid at {sheet.name}!{cell_ref(row, start_col)}."
                )
                continue
            band = detect_band(sheet, row, start_col)
            title = detect_title(sheet, row, start_col, band)
            title = TABLE_TITLE_OVERRIDES.get(sheet.name, {}).get(str(row), title)
            band = TABLE_BAND_OVERRIDES.get(sheet.name, {}).get(str(row), band)
            cell_range = f"{cell_ref(row, start_col)}:{cell_ref(last_row, end_col)}"
            tables.append(
                TableCandidate(
                    sheet=sheet.name,
                    title=title,
                    band=band,
                    header_row=row,
                    start_col=start_col,
                    end_col=end_col,
                    height_col=height_col,
                    widths=widths,
                    heights=heights,
                    matrix=matrix,
                    cell_range=cell_range,
                )
            )
            used_headers.add(header_key)
    return dedupe_tables(tables), notes


def dedupe_tables(tables: list[TableCandidate]) -> list[TableCandidate]:
    out: list[TableCandidate] = []
    seen: set[tuple[str, int, int, str]] = set()
    for table in tables:
        key = (table.sheet, table.header_row, table.start_col, table.band)
        if key in seen:
            continue
        seen.add(key)
        out.append(table)
    return out


def is_discounted_table(sheet: Sheet, table: TableCandidate) -> bool:
    row_end = table.header_row + len(table.heights) + 2
    for (row, col), formula in sheet.formulas.items():
        if (
            table.header_row < row <= row_end
            and table.start_col <= col <= table.end_col
            and re.search(r"\*\s*\(\s*1\s*-", formula)
        ):
            return True

    for row in range(max(1, table.header_row - 5), table.header_row + 1):
        for col in range(max(1, table.start_col - 2), table.end_col + 1):
            value = sheet.cells.get((row, col))
            if isinstance(value, str) and re.search(r"\bdiscount(?:ed)?\b", value, re.I):
                return True
    return table.title.strip().lower() == "discount"


def classify_pricing_tables(
    sheet: Sheet, tables: list[TableCandidate]
) -> tuple[list[TableCandidate], list[TableCandidate]]:
    discounted_ids = {id(table) for table in tables if is_discounted_table(sheet, table)}
    if discounted_ids:
        paired: dict[tuple[int, str, tuple[int, ...], tuple[int, ...]], list[TableCandidate]] = {}
        for table in tables:
            key = (table.header_row, table.band, tuple(table.widths), tuple(table.heights))
            paired.setdefault(key, []).append(table)
        for candidates in paired.values():
            if len(candidates) > 1:
                rightmost = max(candidates, key=lambda candidate: candidate.start_col)
                discounted_ids.add(id(rightmost))

    discounted = [table for table in tables if id(table) in discounted_ids]
    list_price = [table for table in tables if id(table) not in discounted_ids]
    return list_price, discounted


def select_pricing_tables(sheet: Sheet, tables: list[TableCandidate]) -> list[TableCandidate]:
    list_price, discounted = classify_pricing_tables(sheet, tables)
    if not discounted:
        return tables
    if len(list_price) == len(discounted):
        return [
            replace(table, title=list_price[index].title, band=list_price[index].band)
            for index, table in enumerate(discounted)
        ]

    list_groups: dict[tuple[str, tuple[int, ...], tuple[int, ...]], list[TableCandidate]] = {}
    discounted_group_indexes: dict[tuple[str, tuple[int, ...], tuple[int, ...]], int] = {}
    for candidate in list_price:
        key = (candidate.band, tuple(candidate.widths), tuple(candidate.heights))
        list_groups.setdefault(key, []).append(candidate)

    selected: list[TableCandidate] = []
    for table in discounted:
        key = (table.band, tuple(table.widths), tuple(table.heights))
        matches = list_groups.get(key, [])
        if matches:
            match_index = discounted_group_indexes.get(key, 0)
            source = matches[min(match_index, len(matches) - 1)]
            discounted_group_indexes[key] = match_index + 1
            table = replace(table, title=source.title)
        selected.append(table)
    return selected


def group_tables(tables: list[TableCandidate]) -> list[dict[str, Any]]:
    groups: dict[tuple[str, str, tuple[int, ...], tuple[int, ...]], list[TableCandidate]] = {}
    for table in tables:
        group_title = table.title
        if table.sheet in SINGLE_PRODUCT_SHEETS:
            group_title = table.sheet
        key = (table.sheet, group_title, tuple(table.widths), tuple(table.heights))
        groups.setdefault(key, []).append(table)

    price_tables: list[dict[str, Any]] = []
    id_counts: dict[str, int] = {}
    for (sheet, title, widths, heights), candidates in groups.items():
        bands: dict[str, list[list[float]]] = {}
        ranges: list[str] = []
        for candidate in candidates:
            band = candidate.band
            if band in bands:
                band = f"{band}-{candidate.header_row}"
            bands[band] = candidate.matrix
            ranges.append(f"{candidate.band}:{candidate.cell_range}")
        product_id_base = f"wb-{slugify(sheet)}"
        if title != sheet:
            product_id_base = f"{product_id_base}-{slugify(title)}"
        id_counts[product_id_base] = id_counts.get(product_id_base, 0) + 1
        product_id = product_id_base
        if id_counts[product_id_base] > 1:
            product_id = f"{product_id_base}-{id_counts[product_id_base]}"
        table_id = f"{product_id}-2026"
        price_tables.append(
            {
                "id": table_id,
                "supplierId": supplier_id_for_source("Workbook Pricing"),
                "productTypeId": product_id,
                "year": 2026,
                "currency": "GBP",
                "source": f"{workbook_source()}::{sheet}",
                "priceSourceLabel": source_label(sheet, title),
                "workbookSheetName": sheet,
                "workbookCellRange": ", ".join(ranges),
                "notes": "Generated from workbook by scripts/import-blinds-workbook.py. Verify sheets marked manualReview in workbookCoverage.json before relying on ambiguous tables.",
                "widthsLabel": "Width (mm)",
                "heightsLabel": "Height (mm)",
                "bandsLabel": "Band / range",
                "matrixLabel": "Prices ex VAT",
                "nullLabel": "Missing prices are invalid and must be corrected in the workbook import.",
                "widths": list(widths),
                "heights": list(heights),
                "bands": bands,
            }
        )
    return sorted(price_tables, key=lambda item: item["id"])


def attach_discounted_bands(
    price_tables: list[dict[str, Any]],
    discounted_tables: list[dict[str, Any]],
) -> list[str]:
    errors: list[str] = []
    discounted_by_id = {table["id"]: table for table in discounted_tables}
    for table in price_tables:
        table["priceVariants"] = {
            "normal": {
                "label": "Normal company list prices",
                "source": table["source"],
                "bands": table["bands"],
            }
        }
        discounted = discounted_by_id.get(table["id"])
        if discounted is None:
            continue
        if (
            table["widths"] == discounted["widths"]
            and table["heights"][: len(discounted["heights"])] == discounted["heights"]
            and len(table["heights"]) > len(discounted["heights"])
            and set(table["bands"]) == set(discounted["bands"])
        ):
            for band, list_matrix in table["bands"].items():
                discounted_matrix = discounted["bands"][band]
                ratio = next(
                    (
                        round(discounted_value / list_value, 6)
                        for list_row, discounted_row in zip(list_matrix, discounted_matrix)
                        for list_value, discounted_value in zip(list_row, discounted_row)
                        if list_value > 0 and discounted_value > 0
                    ),
                    None,
                )
                if ratio is None:
                    errors.append(f"{table['id']} discount ratio could not be determined.")
                    continue
                for list_row in list_matrix[len(discounted_matrix) :]:
                    discounted_matrix.append([round(value * ratio, 2) for value in list_row])
            discounted["heights"] = list(table["heights"])
        if table["widths"] != discounted["widths"] or table["heights"] != discounted["heights"]:
            errors.append(f"{table['id']} list and discounted dimensions do not match.")
            continue
        if set(table["bands"]) != set(discounted["bands"]):
            errors.append(f"{table['id']} list and discounted bands do not match.")
            continue
        table["priceVariants"]["companyDiscounted"] = {
            "label": "Discounted prices from company",
            "source": discounted["source"],
            "bands": discounted["bands"],
        }
    return errors


def finalize_price_table_schema(price_tables: list[dict[str, Any]]) -> None:
    for table in price_tables:
        table.pop("bands", None)


def source_label(sheet: str, title: str) -> str:
    if title and title != sheet:
        return f"{sheet}, {title}"
    return sheet


def supplier_id_for_source(source_name: str) -> str:
    return f"workbook-{slugify(source_name)}"


def make_suppliers(
    price_tables: list[dict[str, Any]],
    fabrics: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    table_by_product = {table["productTypeId"]: table for table in price_tables}
    supplier_product_types: dict[str, dict[str, dict[str, str]]] = {}
    supplier_names: dict[str, str] = {}

    for fabric in fabrics:
        supplier_id = fabric["supplierId"]
        supplier_names[supplier_id] = fabric.get("supplierName") or clean_supplier_name(supplier_id)
        table = table_by_product.get(fabric["productTypeId"])
        if table is None:
            continue
        supplier_product_types.setdefault(supplier_id, {})
        supplier_product_types[supplier_id][fabric["productTypeId"]] = {
            "id": fabric["productTypeId"],
            "name": table["priceSourceLabel"],
            "priceTableId": table["id"],
        }

    fallback_id = supplier_id_for_source("Workbook Pricing")
    supplier_names.setdefault(fallback_id, "Workbook Pricing")
    supplier_product_types.setdefault(fallback_id, {})
    for table in price_tables:
        supplier_product_types[fallback_id].setdefault(
            table["productTypeId"],
            {
                "id": table["productTypeId"],
                "name": table["priceSourceLabel"],
                "priceTableId": table["id"],
            },
        )

    return [
        {
            "id": supplier_id,
            "name": supplier_names[supplier_id],
            "productTypes": sorted(product_types.values(), key=lambda item: item["name"]),
        }
        for supplier_id, product_types in sorted(supplier_product_types.items())
    ]


def clean_supplier_name(supplier_id: str) -> str:
    return supplier_id.removeprefix("workbook-").replace("-", " ").title()


def clean_option_text(value: str) -> str:
    text = clean_text(value)
    text = re.sub(r"^prices are for\s+", "", text, flags=re.I)
    text = text.replace(" - ", " / ")
    text = text.replace(",", " /")
    text = re.sub(r"\s+", " ", text).strip(" -/")
    return text or "Standard"


def blind_type_for_product(product_type_id: str, product_type_name: str) -> str | None:
    low_id = product_type_id.lower()
    low_name = product_type_name.lower()
    if "pf-pleated-dual-control" in low_id:
        return "perfect-fit-pleated-dual-control"
    if "pf-pleated-dual-blinds" in low_id:
        return "perfect-fit-pleated-dual-blinds"
    if "pf-roller" in low_id:
        return "perfect-fit-roller"
    if "pf-vision" in low_id:
        return "perfect-fit-vision"
    if "pf-pleated" in low_id:
        return "perfect-fit-pleated"
    if "fit-to-frame-pleated" in low_id:
        return "fit-to-frame-pleated"
    if "3bs-pleated" in low_id:
        return "three-sided-pleated"
    if "fit-to-frame-aluminium" in low_id:
        return "fit-to-frame-aluminium"
    if "pf-aluminium" in low_id or "perfect-fit-aluminium" in low_id:
        return "perfect-fit-aluminium"
    if "pf-wood" in low_id or "perfect-fit-wood" in low_id:
        return "perfect-fit-wood"
    if "perfect-fit-shutter" in low_id:
        return "perfect-fit-shutter"
    if "aluminium-venetians" in low_id or "25mm-aluminium" in low_id:
        return "aluminium-venetian"
    if "aqua-fauxwood" in low_id or "aquawood-fauxwood" in low_id:
        return "aqua-fauxwood"
    if "arena-fauxwood" in low_id:
        return "arena-fauxwood"
    if "essence-fauxwood" in low_id:
        return "essence-fauxwood"
    if "urban-fauxwood" in low_id:
        return "urban-fauxwood"
    if "expressions-fauxwood" in low_id:
        return "expressions-fauxwood"
    if "sunwood-faux" in low_id or "sunwood-fauxwood" in low_id:
        return "sunwood-faux"
    if "sunwood-wood" in low_id:
        return "sunwood-wood"
    if "freehang-pleated" in low_id:
        return "freehang-pleated"
    if "allusion" in low_id:
        return "allusion"
    if "nightshade" in low_id:
        return "nightshade"
    if "romans" in low_id or "roman" in low_name:
        return "roman"
    if "pvc" in low_id or "pvc" in low_name:
        return "pvc-rigid"
    if "vision" in low_id:
        return "vision"
    if "vertical" in low_id or "vertical" in low_name:
        return "vertical"
    if "roller" in low_id or low_name == "roller":
        return "roller"
    return None


def selection_kind_for_product(product_type_id: str) -> str:
    blind_type = blind_type_for_product(product_type_id, product_type_id)
    if blind_type in {
        "pvc-rigid",
        "aluminium-venetian",
        "perfect-fit-aluminium",
        "perfect-fit-wood",
        "perfect-fit-shutter",
        "fit-to-frame-aluminium",
        "aqua-fauxwood",
        "arena-fauxwood",
        "sunwood-faux",
        "sunwood-wood",
        "essence-fauxwood",
        "urban-fauxwood",
        "expressions-fauxwood",
    }:
        return "finish"
    return "fabric"


def is_customer_selectable_option_text(label: str, pricing_source: str = "") -> bool:
    text = clean_option_text(label)
    if not text:
        return False
    combined = f"{text} {pricing_source}".lower()
    if as_dimension(text) is not None:
        return False
    if re.fullmatch(r"(?:standard|band\s+[a-z]{1,3})", text, re.I):
        return False
    if re.fullmatch(r"[a-z]{1,3}\s*-\s*band\s+[a-z]{1,3}", text, re.I):
        return False
    if re.fullmatch(r"(?:pf\s+roller|perfect\s+fit\s+konnect)\s*-\s*band\s+[a-z]{1,3}", text, re.I):
        return False
    if re.search(r"\b(additional\s+cost|surcharge|workbook|worksheet|pricing\s+table)\b", combined, re.I):
        return False
    if re.search(r"\bprices?\s+are\s+for\b", combined, re.I):
        return False
    if re.search(r"\bband\s+[a-z]{1,3}\b", text, re.I):
        return False
    if text.lower() in {sheet.lower() for sheet in TARGET_SHEETS}:
        return False
    return True


def is_surcharge_pricing_source(value: str) -> bool:
    return bool(re.search(r"\b(additional\s+cost|surcharge)\b", value, re.I))


def make_default_fabrics(price_tables: list[dict[str, Any]]) -> list[dict[str, Any]]:
    fabrics: list[dict[str, Any]] = []
    fallback_supplier_id = supplier_id_for_source("Workbook Pricing")
    for table in price_tables:
        if is_surcharge_pricing_source(table["priceSourceLabel"]):
            continue
        source = table["source"]
        bands = list(table["bands"].keys())
        blind_type = blind_type_for_product(table["productTypeId"], table["priceSourceLabel"])
        for band in bands:
            label = "Standard" if band == "Standard" else f"Band {band}"
            fabrics.append(
                {
                    "id": f"{table['productTypeId']}-{slugify(label)}",
                    "supplierId": fallback_supplier_id,
                    "supplierName": "Workbook Pricing",
                    "productTypeId": table["productTypeId"],
                    "name": label,
                    "displayName": label,
                    "band": band,
                    "source": source,
                    "pricingSource": table["priceSourceLabel"],
                    "pricingReferenceNote": pricing_reference_note(
                        "Workbook Pricing", band, table["priceSourceLabel"]
                    ),
                    "compatibleBlindTypes": [blind_type] if blind_type else [],
                    "selectionKind": "pricingBandFallback",
                    "isFallback": True,
                }
            )
    return fabrics


def make_table_finish_options(
    price_tables: list[dict[str, Any]],
    mapped_fabrics: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    mapped_product_ids = {fabric["productTypeId"] for fabric in mapped_fabrics}
    options: list[dict[str, Any]] = []
    fallback_supplier_id = supplier_id_for_source("Workbook Pricing")
    seen: set[str] = set()

    for table in price_tables:
        if table["productTypeId"] in mapped_product_ids:
            continue
        blind_type = blind_type_for_product(table["productTypeId"], table["priceSourceLabel"])
        if blind_type is None:
            continue
        base_label = table["priceSourceLabel"]
        if "," in base_label:
            base_label = base_label.split(",", 1)[1]
        base_label = clean_option_text(base_label)
        if not is_customer_selectable_option_text(base_label, table["priceSourceLabel"]):
            continue
        for band in table["bands"].keys():
            display_name = base_label
            fabric_id = f"{table['productTypeId']}-{slugify(display_name)}"
            if fabric_id in seen:
                continue
            seen.add(fabric_id)
            options.append(
                {
                    "id": fabric_id,
                    "supplierId": fallback_supplier_id,
                    "supplierName": "Workbook Pricing",
                    "company": "Workbook Pricing",
                    "blindType": blind_type,
                    "productTypeId": table["productTypeId"],
                    "name": display_name,
                    "displayName": display_name,
                    "band": band,
                    "source": table["source"],
                    "pricingSource": table["priceSourceLabel"],
                    "collection": table["workbookSheetName"],
                    "pricingReferenceNote": pricing_reference_note(
                        "Workbook Pricing", band, table["priceSourceLabel"]
                    ),
                    "compatibleBlindTypes": [blind_type],
                    "selectionKind": selection_kind_for_product(table["productTypeId"]),
                    "isFallback": False,
                }
            )
    return options


def price_table_for_product(price_tables: list[dict[str, Any]], product_type_id: str) -> dict[str, Any] | None:
    return next((table for table in price_tables if table["productTypeId"] == product_type_id), None)


def make_finish_option(
    *,
    company: str,
    blind_type: str,
    product_type_id: str,
    name: str,
    band: str,
    source_sheet: str,
    pricing_source: str,
    pricing_reference_note: str,
    collection: str | None = None,
) -> dict[str, Any]:
    return {
        "id": (
            f"{product_type_id}-{slugify(company)}-{slugify(blind_type)}-"
            f"{slugify(collection or company)}-{slugify(name)}-{slugify(band)}"
        ),
        "supplierId": supplier_id_for_source(company),
        "supplierName": company,
        "company": company,
        "blindType": blind_type,
        "productTypeId": product_type_id,
        "name": name,
        "displayName": name,
        "band": band,
        "source": f"{workbook_source()}::{source_sheet}",
        "collection": collection or company,
        "pricingSource": pricing_source,
        "pricingReferenceNote": pricing_reference_note,
        "compatibleBlindTypes": [blind_type],
        "selectionKind": "finish",
        "isFallback": False,
    }


def split_colour_list(value: Any) -> list[str]:
    if not isinstance(value, str):
        return []
    text = clean_text(value)
    if not text:
        return []
    parts = re.split(r"\s*,\s*|\s+-\s+", text)
    return [clean_text(part) for part in parts if clean_text(part)]


def finish_names_from_cells(sheet: Sheet, cells: list[tuple[int, int]]) -> list[str]:
    names: list[str] = []
    seen: set[str] = set()
    for row, col in cells:
        for name in split_colour_list(sheet.cells.get((row, col))):
            if not is_customer_selectable_option_text(name):
                continue
            key = name.lower()
            if key in seen:
                continue
            seen.add(key)
            names.append(name)
    return names


def finish_names_from_range(
    sheet: Sheet,
    *,
    row_start: int,
    row_end: int,
    col_start: int,
    col_end: int,
) -> list[str]:
    cells = [
        (row, col)
        for row in range(row_start, row_end + 1)
        for col in range(col_start, col_end + 1)
    ]
    return finish_names_from_cells(sheet, cells)


def add_finish_options(
    *,
    options: list[dict[str, Any]],
    names: list[str],
    company: str,
    blind_type: str,
    product_type_id: str,
    band: str,
    sheet: Sheet,
    price_tables: list[dict[str, Any]],
    collection: str,
    pricing_reference_note: str,
) -> None:
    table = price_table_for_product(price_tables, product_type_id)
    if table is None:
        return
    for name in names:
        options.append(
            make_finish_option(
                company=company,
                blind_type=blind_type,
                product_type_id=product_type_id,
                name=name,
                band=band,
                source_sheet=sheet.name,
                pricing_source=table["priceSourceLabel"],
                pricing_reference_note=pricing_reference_note,
                collection=collection,
            )
        )


def parse_aqua_fauxwood_options(
    sheets: list[Sheet],
    price_tables: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    sheet = next((item for item in sheets if item.name == "Aqua Fauxwood"), None)
    product_type_id = "wb-aqua-fauxwood-white-smooth-white-grain-niagra-grey-grey-wash-grey-nightfall"
    table = price_table_for_product(price_tables, product_type_id)
    if sheet is None or table is None:
        return []
    header = next(
        (
            clean_text(value)
            for (row, _col), value in sheet.cells.items()
            if row <= 6 and isinstance(value, str) and " - " in value
        ),
        "",
    )
    options: list[dict[str, Any]] = []
    for name in [clean_text(part) for part in header.split(" - ")]:
        if not is_customer_selectable_option_text(name):
            continue
        options.append(
            make_finish_option(
                company="Aqua Fauxwood",
                blind_type="aqua-fauxwood",
                product_type_id=product_type_id,
                name=name,
                band="Standard",
                source_sheet=sheet.name,
                pricing_source=table["priceSourceLabel"],
                pricing_reference_note="Internal pricing reference: Aqua Fauxwood.",
            )
        )
    return options


def arena_fauxwood_band_table(price_tables: list[dict[str, Any]], band: str) -> dict[str, Any] | None:
    for table in price_tables:
        if not table["productTypeId"].startswith("wb-arena-fauxwood"):
            continue
        if re.search(rf"\bband\s+{re.escape(band)}\b", table["priceSourceLabel"], re.I):
            return table
    return None


def parse_arena_fauxwood_options(
    sheets: list[Sheet],
    price_tables: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    sheet = next((item for item in sheets if item.name == "Arena Fauxwood"), None)
    if sheet is None:
        return []

    options: list[dict[str, Any]] = []
    seen: set[str] = set()
    current_band: str | None = None
    for row in range(1, sheet.max_row + 1):
        for col in range(1, sheet.max_col + 1):
            value = sheet.cells.get((row, col))
            if isinstance(value, str):
                match = re.search(r"\bBand\s+([A-Z])\b", value, re.I)
                if match:
                    current_band = match.group(1).upper()
            if col not in {18, 19} or current_band is None or not isinstance(value, str):
                continue
            name = clean_text(value)
            if not is_customer_selectable_option_text(name):
                continue
            table = arena_fauxwood_band_table(price_tables, current_band)
            if table is None:
                continue
            band_key = "ANY" if "ANY" in table["bands"] else "Standard"
            key = f"{current_band}:{name.lower()}"
            if key in seen:
                continue
            seen.add(key)
            options.append(
                make_finish_option(
                    company="Arena Fauxwood",
                    blind_type="arena-fauxwood",
                    product_type_id=table["productTypeId"],
                    name=name,
                    band=band_key,
                    source_sheet=sheet.name,
                    pricing_source=table["priceSourceLabel"],
                    pricing_reference_note=f"Internal pricing reference: Arena Fauxwood, Band {current_band}.",
                )
            )

    band_d_table = arena_fauxwood_band_table(price_tables, "D")
    if band_d_table is not None:
        for name in ["Highshine White", "Cool White"]:
            key = f"D:{name.lower()}"
            if key in seen:
                continue
            seen.add(key)
            options.append(
                make_finish_option(
                    company="Arena Fauxwood",
                    blind_type="arena-fauxwood",
                    product_type_id=band_d_table["productTypeId"],
                    name=name,
                    band="ANY" if "ANY" in band_d_table["bands"] else "Standard",
                    source_sheet=sheet.name,
                    pricing_source=band_d_table["priceSourceLabel"],
                    pricing_reference_note="Internal pricing reference: Arena Fauxwood, Band D.",
                )
            )
    return options


def parse_sunwood_wood_options(
    sheets: list[Sheet],
    price_tables: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    sheet = next((item for item in sheets if item.name == "Sunwood Wood"), None)
    product_type_id = "wb-sunwood-wood-35"
    if sheet is None or price_table_for_product(price_tables, product_type_id) is None:
        return []
    if any(re.search(r"\*\s*\(\s*1\s*-", formula) for formula in sheet.formulas.values()):
        return []

    options: list[dict[str, Any]] = []
    sections = [
        {
            "cells": [(5, 2)],
            "band": "INS",
            "collection": "Sunwood 35mm Essential Collection",
            "note": "Internal pricing reference: Sunwood Wood, 35mm Essential Collection.",
        },
        {
            "cells": [(15, 2), (16, 2)],
            "band": "INS-18",
            "collection": "Sunwood 50mm Essential Collection, Soft Grain & Perfect Grain",
            "note": "Internal pricing reference: Sunwood Wood, 50mm Essential Collection.",
        },
        {
            "cells": [(26, 2)],
            "band": "INS-28",
            "collection": "Sunwood 50mm Gloss",
            "note": "Internal pricing reference: Sunwood Wood, 50mm Gloss.",
        },
    ]
    for section in sections:
        add_finish_options(
            options=options,
            names=finish_names_from_cells(sheet, section["cells"]),
            company="Sunwood Wood",
            blind_type="sunwood-wood",
            product_type_id=product_type_id,
            band=section["band"],
            sheet=sheet,
            price_tables=price_tables,
            collection=section["collection"],
            pricing_reference_note=section["note"],
        )
    return options


def parse_sunwood_faux_options(
    sheets: list[Sheet],
    price_tables: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    sheet = next((item for item in sheets if item.name == "Sunwood Faux"), None)
    product_type_id = "wb-sunwood-faux-sunwood-fauxwood-35-50mm"
    table = price_table_for_product(price_tables, product_type_id)
    if sheet is None or table is None:
        return []
    return [
        make_finish_option(
            company="Sunwood Faux",
            blind_type="sunwood-faux",
            product_type_id=product_type_id,
            name="Sunwood Fauxwood 35/50mm",
            band="Standard",
            source_sheet=sheet.name,
            pricing_source=table["priceSourceLabel"],
            pricing_reference_note="Internal pricing reference: Sunwood Fauxwood 35/50mm.",
            collection="Sunwood Fauxwood",
        )
    ]


def parse_perfect_fit_wood_options(
    sheets: list[Sheet],
    price_tables: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    sheet = next((item for item in sheets if item.name == "PF Wood"), None)
    product_type_id = "wb-pf-wood-35"
    table = price_table_for_product(price_tables, product_type_id)
    if sheet is None or table is None:
        return []
    return [
        make_finish_option(
            company="Perfect Fit Sunwood",
            blind_type="perfect-fit-wood",
            product_type_id=product_type_id,
            name="Perfect Fit Sunwood 25mm",
            band="INS",
            source_sheet=sheet.name,
            pricing_source=table["priceSourceLabel"],
            pricing_reference_note="Internal pricing reference: Perfect Fit Sunwood 25mm.",
            collection="Perfect Fit Sunwood",
        )
    ]


def parse_perfect_fit_aluminium_options(
    sheets: list[Sheet],
    price_tables: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    sheet = next((item for item in sheets if item.name == "PF Aluminium"), None)
    if sheet is None:
        return []

    options: list[dict[str, Any]] = []
    add_finish_options(
        options=options,
        names=finish_names_from_range(sheet, row_start=6, row_end=28, col_start=13, col_end=19),
        company="Perfect Fit Aluminium",
        blind_type="perfect-fit-aluminium",
        product_type_id="wb-pf-aluminium-perfect-fit-25mm-plain-aluminium-venetians",
        band="Standard",
        sheet=sheet,
        price_tables=price_tables,
        collection="Perfect Fit 25mm Plain Aluminium Venetians",
        pricing_reference_note="Internal pricing reference: Perfect Fit Aluminium, plain colours.",
    )
    add_finish_options(
        options=options,
        names=finish_names_from_range(sheet, row_start=32, row_end=54, col_start=13, col_end=19),
        company="Perfect Fit Aluminium",
        blind_type="perfect-fit-aluminium",
        product_type_id="wb-pf-aluminium-perfect-fit-25mm-special-effects-aluminium-venetians",
        band="Standard",
        sheet=sheet,
        price_tables=price_tables,
        collection="Perfect Fit 25mm Special Effects Aluminium Venetians",
        pricing_reference_note="Internal pricing reference: Perfect Fit Aluminium, special effects.",
    )
    return options


def parse_aluminium_venetian_options(
    sheets: list[Sheet],
    price_tables: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    sheet = next((item for item in sheets if item.name == "Aluminium Venetians"), None)
    if sheet is None:
        return []

    options: list[dict[str, Any]] = []
    add_finish_options(
        options=options,
        names=finish_names_from_range(sheet, row_start=5, row_end=27, col_start=25, col_end=31),
        company="Aluminium Venetians",
        blind_type="aluminium-venetian",
        product_type_id="wb-aluminium-venetians-plain-metallic",
        band="Standard",
        sheet=sheet,
        price_tables=price_tables,
        collection="Plain / Metallic",
        pricing_reference_note="Internal pricing reference: Aluminium Venetians, plain/metallic.",
    )
    add_finish_options(
        options=options,
        names=finish_names_from_range(sheet, row_start=31, row_end=53, col_start=25, col_end=31),
        company="Aluminium Venetians",
        blind_type="aluminium-venetian",
        product_type_id="wb-aluminium-venetians-brushed-filtra-caruso-woodline-stripe-hammered-textured-premium-metalic",
        band="Standard",
        sheet=sheet,
        price_tables=price_tables,
        collection="Brushed / Filtra / Caruso / Woodline / Stripe / Hammered / Textured / Premium Metallic",
        pricing_reference_note="Internal pricing reference: Aluminium Venetians, special effects.",
    )
    return options


def parse_roman_fabric_options(
    sheets: list[Sheet],
    price_tables: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    sheet = next((item for item in sheets if item.name == "Romans"), None)
    product_type_id = "wb-romans"
    table = price_table_for_product(price_tables, product_type_id)
    if sheet is None or table is None:
        return []

    options: list[dict[str, Any]] = []
    seen: set[str] = set()
    for row in range(1, sheet.max_row + 1):
        for col in range(1, sheet.max_col + 1):
            value = sheet.cells.get((row, col))
            if not isinstance(value, str):
                continue
            match = re.fullmatch(r"Price\s+Band\s+([A-Z])", clean_text(value), re.I)
            if match is None:
                continue
            band = match.group(1).upper()
            if band not in table["bands"]:
                continue
            names = finish_names_from_cells(sheet, [(row + 1, col)])
            for name in names:
                key = f"{band}:{name.lower()}"
                if key in seen:
                    continue
                seen.add(key)
                options.append(
                    make_finish_option(
                        company="Fabric Box Romans",
                        blind_type="roman",
                        product_type_id=product_type_id,
                        name=name,
                        band=band,
                        source_sheet=sheet.name,
                        pricing_source=table["priceSourceLabel"],
                        pricing_reference_note=f"Internal pricing reference: Romans, Band {band}.",
                        collection=f"Roman Band {band}",
                    )
                )
    return options


def names_from_dash_title(value: str) -> list[str]:
    text = clean_text(value)
    if not text:
        return []
    return [
        clean_option_text(part)
        for part in re.split(r"\s+-\s+|\s*,\s*", text)
        if is_customer_selectable_option_text(clean_text(part))
    ]


def parse_direct_named_table_options(
    price_tables: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    specs = {
        "Vision": {"company": "Vision", "blindType": "vision", "collection": "Vision"},
        "PF Vision": {
            "company": "Perfect Fit Vision",
            "blindType": "perfect-fit-vision",
            "collection": "Perfect Fit Vision",
        },
        "Allusion": {"company": "Allusion", "blindType": "allusion", "collection": "Allusion"},
    }
    options: list[dict[str, Any]] = []
    seen: set[str] = set()

    for table in price_tables:
        sheet_name = table.get("workbookSheetName")
        spec = specs.get(sheet_name)
        if spec is None:
            continue
        label = table["priceSourceLabel"]
        title = label.split(",", 1)[1].strip() if "," in label else ""
        if not title or not is_customer_selectable_option_text(title, label):
            continue
        for name in names_from_dash_title(title):
            band = next(iter(table["bands"]))
            key = f"{sheet_name}:{name.lower()}:{band}:{table['productTypeId']}"
            if key in seen:
                continue
            seen.add(key)
            options.append(
                make_finish_option(
                    company=spec["company"],
                    blind_type=spec["blindType"],
                    product_type_id=table["productTypeId"],
                    name=name,
                    band=band,
                    source_sheet=sheet_name,
                    pricing_source=table["priceSourceLabel"],
                    pricing_reference_note=f"Internal pricing reference: {spec['company']}, Band {band}.",
                    collection=spec["collection"],
                )
            )
    return options


def parse_finish_options(
    sheets: list[Sheet],
    price_tables: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    return (
        parse_aqua_fauxwood_options(sheets, price_tables)
        + parse_arena_fauxwood_options(sheets, price_tables)
        + parse_sunwood_wood_options(sheets, price_tables)
        + parse_sunwood_faux_options(sheets, price_tables)
        + parse_perfect_fit_wood_options(sheets, price_tables)
        + parse_perfect_fit_aluminium_options(sheets, price_tables)
        + parse_aluminium_venetian_options(sheets, price_tables)
        + parse_roman_fabric_options(sheets, price_tables)
        + parse_direct_named_table_options(price_tables)
    )


def pricing_reference_note(supplier_name: str, band: str, pricing_source: str) -> str:
    band_text = "" if band == "Standard" else f", Band {band}"
    return f"Internal pricing reference: {supplier_name}{band_text}. Pricing source: {pricing_source}."


def blind_type_from_section(text: str) -> str | None:
    low = clean_text(text).lower()
    if not low:
        return None
    if any(word in low for word in ["width", "drop", "height", "size"]):
        return None
    if "perfect fit" in low and "roller" in low:
        return "perfect-fit-roller"
    if "pf" in low and "roller" in low:
        return "perfect-fit-roller"
    if "perfect fit" in low and "vision" in low:
        return "perfect-fit-vision"
    if "pf" in low and "vision" in low:
        return "perfect-fit-vision"
    if "allusion" in low:
        return "allusion"
    if "vision" in low:
        return "vision"
    if "pvc" in low:
        return "pvc-rigid"
    if "89mm" in low or "89 mm" in low:
        return "vertical"
    if "vertical" in low:
        return "vertical"
    if "roller" in low:
        return "roller"
    return None


def is_header_label(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    return clean_text(value).lower() in {"name", "fabric", "design"}


def is_band_label(value: Any) -> bool:
    return isinstance(value, str) and clean_text(value).lower() == "band"


def company_name_for_sheet(sheet: Sheet) -> str:
    return COMPANY_NAME_BY_SHEET.get(sheet.name, sheet.name)


def is_red_cell(sheet: Sheet, row: int, col: int, red_style_ids: set[int]) -> bool:
    style = sheet.cell_styles.get((row, col))
    return style in red_style_ids if style is not None else False


def is_discontinued_row(
    sheet: Sheet,
    row: int,
    name_col: int,
    band_col: int,
    red_style_ids: set[int],
    name: str,
    band: str,
) -> bool:
    combined = f"{name} {band}".lower()
    if any(token in combined for token in ["discontinued", "n/a", "not available"]):
        return True
    return is_red_cell(sheet, row, name_col, red_style_ids) or is_red_cell(
        sheet, row, band_col, red_style_ids
    )


def normalize_fabric_band(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    band = clean_text(value).upper().replace(" ", "")
    if re.fullmatch(r"[A-Z]{1,3}", band):
        return band
    return None


def section_context_for_header(sheet: Sheet, row: int, col: int) -> tuple[str | None, str]:
    labels: list[str] = []
    for r in range(row, max(0, row - 6), -1):
        for c in range(max(1, col - 1), min(sheet.max_col, col + 2) + 1):
            value = sheet.cells.get((r, c))
            if not isinstance(value, str):
                continue
            text = clean_text(value)
            if not text or text.lower() in {"name", "fabric", "design", "band", "width"}:
                continue
            labels.append(text)
            blind_type = blind_type_from_section(text)
            if blind_type:
                return blind_type, text
    return None, " ".join(reversed(labels[-2:]))


def find_company_fabric_blocks(sheet: Sheet) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    seen: set[tuple[int, int, int]] = set()
    for row in range(1, sheet.max_row + 1):
        for col in range(1, sheet.max_col + 1):
            value = sheet.cells.get((row, col))
            if is_header_label(value):
                band_col = None
                for c in range(col + 1, min(sheet.max_col, col + 4) + 1):
                    if is_band_label(sheet.cells.get((row, c))):
                        band_col = c
                        break
                if band_col is None:
                    continue
                blind_type, section = section_context_for_header(sheet, row - 1, col)
                if blind_type is None:
                    continue
                key = (row, col, band_col)
                if key in seen:
                    continue
                seen.add(key)
                blocks.append(
                    {
                        "headerRow": row,
                        "nameCol": col,
                        "bandCol": band_col,
                        "blindType": blind_type,
                        "section": section,
                    }
                )
                continue

            blind_type = blind_type_from_section(str(value)) if isinstance(value, str) else None
            if blind_type is None:
                continue
            if not is_band_label(sheet.cells.get((row, col + 1))):
                continue
            key = (row, col, col + 1)
            if key in seen:
                continue
            seen.add(key)
            blocks.append(
                {
                    "headerRow": row,
                    "nameCol": col,
                    "bandCol": col + 1,
                    "blindType": blind_type,
                    "section": clean_text(value),
                }
            )
    return blocks


def price_table_priority(table: dict[str, Any]) -> tuple[int, int, str]:
    label = table["priceSourceLabel"]
    if "," not in label:
        return (0, len(label), table["productTypeId"])
    return (1, len(label), table["productTypeId"])


def find_product_for_blind_type_band(
    price_tables: list[dict[str, Any]],
    blind_type: str,
    band: str,
) -> str | None:
    candidates = [
        table
        for table in price_tables
        if blind_type_for_product(table["productTypeId"], table["priceSourceLabel"]) == blind_type
        and band in table["bands"]
        and not is_surcharge_pricing_source(table["priceSourceLabel"])
    ]
    if not candidates:
        return None
    return sorted(candidates, key=price_table_priority)[0]["productTypeId"]


def fabric_pricing_reference_note(company: str, band: str) -> str:
    return f"Internal pricing reference: {company}, Band {band}."


def parse_reference_fabrics(
    sheets: list[Sheet],
    price_tables: list[dict[str, Any]],
    red_style_ids: set[int],
) -> tuple[list[dict[str, Any]], list[str]]:
    fabrics: list[dict[str, Any]] = []
    notes: list[str] = []
    seen: set[str] = set()
    reference_by_name = {sheet.name: sheet for sheet in sheets if sheet.name in COMPANY_SHEETS}
    table_by_product = {table["productTypeId"]: table for table in price_tables}

    for sheet in reference_by_name.values():
        company = company_name_for_sheet(sheet)
        supplier_id = supplier_id_for_source(company)
        blocks = find_company_fabric_blocks(sheet)
        for block in blocks:
            name_col = block["nameCol"]
            band_col = block["bandCol"]
            blind_type = block["blindType"]
            section = block["section"]
            blank_streak = 0
            for row in range(block["headerRow"] + 1, sheet.max_row + 1):
                name_value = sheet.cells.get((row, name_col))
                band_value = sheet.cells.get((row, band_col))
                if name_value in (None, "") and band_value in (None, ""):
                    blank_streak += 1
                    if blank_streak >= 2:
                        break
                    continue
                blank_streak = 0
                if is_header_label(name_value):
                    break
                if not isinstance(name_value, str):
                    continue
                name = clean_text(name_value)
                band = normalize_fabric_band(band_value)
                if not name or band is None:
                    if isinstance(band_value, str) and clean_text(band_value):
                        notes.append(
                            f"Skipped unsupported fabric band {sheet.name}!{cell_ref(row, band_col)} = {band_value!r}."
                        )
                    continue
                if is_discontinued_row(sheet, row, name_col, band_col, red_style_ids, name, band):
                    continue
                if not is_customer_selectable_option_text(name, section):
                    notes.append(
                        f"Skipped non-selectable fabric/finish label {sheet.name}!{cell_ref(row, name_col)} = {name_value!r}."
                    )
                    continue
                product_id = find_product_for_blind_type_band(price_tables, blind_type, band)
                if product_id is None:
                    notes.append(
                        f"Could not map fabric {sheet.name}!{cell_ref(row, name_col)} ({name}, blind type {blind_type}, band {band})."
                    )
                    continue
                table = table_by_product.get(product_id)
                if table is None:
                    notes.append(
                        f"Could not find price table for mapped fabric {sheet.name}!{cell_ref(row, name_col)} ({name}, product {product_id})."
                    )
                    continue
                fabric_id = (
                    f"{product_id}-{slugify(company)}-{slugify(blind_type)}-"
                    f"{slugify(section)}-{slugify(name)}-{slugify(band)}"
                )
                if fabric_id in seen:
                    continue
                seen.add(fabric_id)
                fabrics.append(
                    {
                        "id": fabric_id,
                        "supplierId": supplier_id,
                        "supplierName": company,
                        "company": company,
                        "blindType": blind_type,
                        "productTypeId": product_id,
                        "name": name,
                        "displayName": name,
                        "band": band,
                        "source": f"{workbook_source()}::{sheet.name}",
                        "collection": section,
                        "pricingSource": table["priceSourceLabel"],
                        "pricingReferenceNote": fabric_pricing_reference_note(company, band),
                        "compatibleBlindTypes": [blind_type],
                        "selectionKind": selection_kind_for_product(product_id),
                        "isFallback": False,
                    }
                )
    return fabrics, notes


def validate_price_tables(price_tables: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    ids = set()
    for table in price_tables:
        if table["id"] in ids:
            errors.append(f"Duplicate price table id: {table['id']}")
        ids.add(table["id"])
        widths = table["widths"]
        heights = table["heights"]
        if widths != sorted(widths):
            errors.append(f"{table['id']} widths are not ascending.")
        if heights != sorted(heights):
            errors.append(f"{table['id']} heights are not ascending.")
        variants = [
            (variant_name, variant["bands"])
            for variant_name, variant in table["priceVariants"].items()
        ]
        for variant, bands in variants:
            for band, matrix in bands.items():
                if len(matrix) != len(heights):
                    errors.append(f"{table['id']} {variant} band {band} has wrong row count.")
                for row_index, row in enumerate(matrix):
                    if len(row) != len(widths):
                        errors.append(
                            f"{table['id']} {variant} band {band} row {row_index} has wrong width count."
                        )
                    for col_index, value in enumerate(row):
                        if value is None:
                            errors.append(
                                f"{table['id']} {variant} band {band} has null at {row_index},{col_index}."
                            )
                        if not isinstance(value, (int, float)):
                            errors.append(
                                f"{table['id']} {variant} band {band} has non-numeric at {row_index},{col_index}."
                            )
    return errors


def validate_fabrics(fabrics: list[dict[str, Any]], price_tables: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []
    table_by_product = {table["productTypeId"]: table for table in price_tables}
    blind_types_with_options: set[str] = set()

    for fabric in fabrics:
        if not fabric.get("supplierId") or not fabric.get("supplierName"):
            errors.append(f"{fabric.get('id')} is missing supplier metadata.")
        if not fabric.get("compatibleBlindTypes"):
            errors.append(f"{fabric.get('id')} is missing compatible blind types.")
        else:
            blind_types_with_options.update(fabric["compatibleBlindTypes"])
        table = table_by_product.get(fabric.get("productTypeId", ""))
        if table is None:
            errors.append(f"{fabric.get('id')} references missing product table {fabric.get('productTypeId')}.")
            continue
        band = fabric.get("band")
        if not band:
            errors.append(f"{fabric.get('id')} is missing band/range metadata.")
        elif band not in table["bands"]:
            errors.append(f"{fabric.get('id')} band {band} is missing in {table['id']}.")
        if not fabric.get("pricingSource"):
            errors.append(f"{fabric.get('id')} is missing pricingSource.")
        if not fabric.get("isFallback"):
            label = fabric.get("displayName") or fabric.get("name") or ""
            if not fabric.get("blindType"):
                errors.append(f"{fabric.get('id')} is missing blindType metadata.")
            if not fabric.get("company"):
                errors.append(f"{fabric.get('id')} is missing company metadata.")
            if not is_customer_selectable_option_text(label, fabric.get("collection", "")):
                errors.append(f"{fabric.get('id')} exposes non-selectable label {label!r}.")
            if re.search(r"\b(discontinued|n/a|not available)\b", label, re.I):
                errors.append(f"{fabric.get('id')} exposes unavailable fabric {label!r}.")

    for blind_type in REQUIRED_BLIND_TYPES:
        if blind_type not in blind_types_with_options:
            errors.append(f"UI blind type {blind_type} has no generated option or fallback.")
    return errors


def validate_customer_exports() -> list[str]:
    errors: list[str] = []
    for path in [
        ROOT / "src" / "components" / "ProjectQuotePreview.tsx",
        ROOT / "src" / "components" / "QuotePreview.tsx",
    ]:
        if not path.exists():
            continue
        text = path.read_text()
        if "pricingReferenceNote" in text or "Internal pricing reference" in text:
            errors.append(f"{path.relative_to(ROOT)} renders internal pricing reference text.")
    return errors


def dedupe_fabrics(fabrics: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str]] = set()
    for fabric in fabrics:
        blind_type = ",".join(fabric.get("compatibleBlindTypes", []))
        key = (
            blind_type,
            fabric.get("productTypeId", ""),
            clean_text(fabric.get("displayName") or fabric.get("name") or "").lower(),
            fabric.get("band", ""),
        )
        if key in seen:
            continue
        seen.add(key)
        out.append(fabric)
    return out


def build() -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], dict[str, Any], str]:
    if not WORKBOOK.exists():
        raise SystemExit(f"Workbook not found: {WORKBOOK}")

    with zipfile.ZipFile(WORKBOOK) as zf:
        shared = read_shared_strings(zf)
        red_style_ids = read_red_font_style_ids(zf)
        workbook_sheets, defined_names = read_workbook(zf)
        sheets = [read_sheet(zf, name, path, state, shared) for name, path, state in workbook_sheets]

    all_list_candidates: list[TableCandidate] = []
    all_discounted_candidates: list[TableCandidate] = []
    coverage_sheets: list[dict[str, Any]] = []
    list_price_candidates = 0
    discounted_candidates = 0

    for sheet in sheets:
        candidates, notes = find_tables(sheet)
        list_candidates, discount_candidates = classify_pricing_tables(sheet, candidates)
        selected_candidates = select_pricing_tables(sheet, candidates)
        if sheet.name in TARGET_SHEETS:
            all_list_candidates.extend(list_candidates if discount_candidates else candidates)
            if discount_candidates:
                all_discounted_candidates.extend(selected_candidates)
            discounted_candidates += len(discount_candidates)
            list_price_candidates += len(list_candidates)

        if sheet.name in TARGET_SHEETS:
            status = "imported" if candidates else "manualReview"
            reason = None if candidates else "No complete width/height pricing grid was detected."
        elif sheet.name in REFERENCE_SHEETS:
            status = "skipped"
            reason = "Reference, fabric-band, cover, or supplier metadata sheet. Not a direct quote pricing grid."
        else:
            status = "manualReview" if candidates else "skipped"
            reason = None if candidates else "No blind pricing grid detected."

        coverage_sheets.append(
            {
                "sheet": sheet.name,
                "status": status,
                "reason": reason,
                "detectedTables": [
                    {
                        "title": table.title,
                        "band": table.band,
                        "range": table.cell_range,
                        "widths": len(table.widths),
                        "heights": len(table.heights),
                    }
                    for table in candidates
                ],
                "selectedPricingTables": [
                    {
                        "title": table.title,
                        "band": table.band,
                        "range": table.cell_range,
                        "variant": variant,
                    }
                    for variant, selected in (
                        ("list", list_candidates if discount_candidates else candidates),
                        ("discounted", selected_candidates if discount_candidates else []),
                    )
                    for table in selected
                ] if sheet.name in TARGET_SHEETS else [],
                "notes": notes,
            }
        )

    price_tables = group_tables(all_list_candidates)
    discounted_price_tables = group_tables(all_discounted_candidates)
    variant_errors = attach_discounted_bands(price_tables, discounted_price_tables)
    workbook_fabrics, fabric_notes = parse_reference_fabrics(sheets, price_tables, red_style_ids)
    finish_options = parse_finish_options(sheets, price_tables)
    table_finish_options = make_table_finish_options(
        price_tables, workbook_fabrics + finish_options
    )
    fallback_fabrics = make_default_fabrics(price_tables)
    fabrics = dedupe_fabrics(workbook_fabrics + finish_options + table_finish_options + fallback_fabrics)
    suppliers = make_suppliers(price_tables, fabrics)
    validation_errors = (
        variant_errors
        + validate_price_tables(price_tables)
        + validate_fabrics(fabrics, price_tables)
        + validate_customer_exports()
    )

    coverage = {
        "source": workbook_source(),
        "generatedBy": "scripts/import-blinds-workbook.py",
        "summary": {
            "worksheetsFound": len(sheets),
            "pricingTablesImported": len(price_tables),
            "productTypesImported": len({table["productTypeId"] for table in price_tables}),
            "discountedPriceTablesImported": sum(
                "companyDiscounted" in table["priceVariants"] for table in price_tables
            ),
            "fabricMappingsImported": len(workbook_fabrics),
            "finishOrColourOptionsGenerated": len(finish_options) + len(table_finish_options),
            "fallbackBandOptionsGenerated": len(fallback_fabrics),
            "validationErrors": len(validation_errors),
            "definedNames": len(defined_names),
            "formulaCells": sum(len(sheet.formulas) for sheet in sheets),
            "listPriceGridsDetected": list_price_candidates,
            "discountedGridsDetected": discounted_candidates,
            "listPriceGridsSelected": len(all_list_candidates),
            "discountedGridsSelected": len(all_discounted_candidates),
        },
        "validationErrors": validation_errors,
        "fabricMappingNotes": fabric_notes[:500],
        "definedNames": defined_names,
        "sheets": coverage_sheets,
    }
    analysis = make_analysis_report(sheets, defined_names, coverage, workbook_fabrics, finish_options + table_finish_options)
    finalize_price_table_schema(price_tables)
    return price_tables, suppliers, fabrics, coverage, analysis


def make_analysis_report(
    sheets: list[Sheet],
    defined_names: list[dict[str, str]],
    coverage: dict[str, Any],
    mapped_fabrics: list[dict[str, Any]],
    finish_options: list[dict[str, Any]],
) -> str:
    mapped_by_source: dict[str, int] = {}
    products_by_blind_type: dict[str, set[str]] = {}
    for fabric in mapped_fabrics + finish_options:
        mapped_by_source[fabric.get("supplierName", "Workbook Pricing")] = (
            mapped_by_source.get(fabric.get("supplierName", "Workbook Pricing"), 0) + 1
        )
        for blind_type in fabric.get("compatibleBlindTypes", []):
            products_by_blind_type.setdefault(blind_type, set()).add(fabric["productTypeId"])

    lines = [
        "# Blind Workbook Analysis",
        "",
        f"Source workbook: `{coverage['source']}`",
        "",
        "This file is generated by `scripts/import-blinds-workbook.py`. It documents how the blinds workbook was read and which sheets feed pricing, fabric/finish mappings, extras, and manual review notes.",
        "",
        "## Summary",
        "",
        f"- Worksheets found: {coverage['summary']['worksheetsFound']}",
        f"- Named ranges found: {coverage['summary']['definedNames']}",
        f"- Formula cells found: {coverage['summary']['formulaCells']}",
        f"- Pricing tables imported: {coverage['summary']['pricingTablesImported']}",
        f"- Fabric-to-band mappings extracted: {coverage['summary']['fabricMappingsImported']}",
        f"- Finish/colour options generated from pricing grids: {coverage['summary']['finishOrColourOptionsGenerated']}",
        f"- Manual fallback band options generated: {coverage['summary']['fallbackBandOptionsGenerated']}",
        "",
        "## Worksheets",
        "",
        "| Sheet | Visibility | Purpose | Status | Pricing grids | Formulas | Notes |",
        "| --- | --- | --- | --- | ---: | ---: | --- |",
    ]
    coverage_by_sheet = {sheet["sheet"]: sheet for sheet in coverage["sheets"]}
    for sheet in sheets:
        coverage_sheet = coverage_by_sheet.get(sheet.name, {})
        purpose = sheet_purpose(sheet.name)
        notes = "; ".join(coverage_sheet.get("notes", [])[:3]) or coverage_sheet.get("reason") or ""
        lines.append(
            f"| {sheet.name} | {sheet.state} | {purpose} | {coverage_sheet.get('status', 'unknown')} | {len(coverage_sheet.get('detectedTables', []))} | {len(sheet.formulas)} | {notes} |"
        )

    lines.extend(["", "## Named Ranges", ""])
    if defined_names:
        for item in defined_names[:100]:
            lines.append(f"- `{item['name']}` -> `{item['refersTo']}`")
        if len(defined_names) > 100:
            lines.append(f"- ...{len(defined_names) - 100} more named ranges omitted from this report.")
    else:
        lines.append("- No named ranges were found.")

    lines.extend(["", "## Fabric / Finish Mapping Sources", ""])
    for source, count in sorted(mapped_by_source.items()):
        lines.append(f"- {source}: {count} selectable fabric/finish options")

    lines.extend(["", "## Product Compatibility", ""])
    for blind_type, product_ids in sorted(products_by_blind_type.items()):
        lines.append(f"- {blind_type}: {', '.join(sorted(product_ids))}")

    lines.extend(["", "## Manual Review", ""])
    manual = [
        sheet
        for sheet in coverage["sheets"]
        if sheet["status"] == "manualReview" or sheet.get("notes") or sheet.get("reason")
    ]
    if manual:
        for sheet in manual:
            reason = sheet.get("reason") or "; ".join(sheet.get("notes", [])) or "Review detected table context."
            lines.append(f"- {sheet['sheet']}: {reason}")
    else:
        lines.append("- No manual review items were detected.")

    lines.extend(
        [
            "",
            "## Customer Export Check",
            "",
            "- Internal pricing reference notes are generated for staff UI only.",
            "- Customer export components must not render `pricingReferenceNote` or `Internal pricing reference` text.",
        ]
    )
    return "\n".join(lines) + "\n"


def sheet_purpose(name: str) -> str:
    if name in TARGET_SHEETS:
        return "Pricing grid"
    if name in {"Fabric Box 2026", "United", "Louvolite 2026", "Eclipse 2026", "Arena 2026"}:
        return "Supplier fabric-to-band lookup"
    if name == "Alutrade":
        return "Supplier/finish lookup and aluminium pricing reference"
    if name == "Cover":
        return "Workbook cover"
    if name == "Sheet1":
        return "Workbook reference/helper sheet"
    return "Unclassified workbook sheet"


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")


def main() -> None:
    global WORKBOOK
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument(
        "--workbook",
        type=Path,
        help="Override the workbook path from scripts/blinds-workbook.config.json.",
    )
    args = parser.parse_args()
    if args.workbook:
        WORKBOOK = args.workbook if args.workbook.is_absolute() else ROOT / args.workbook

    price_tables, suppliers, fabrics, coverage, analysis = build()
    if coverage["validationErrors"]:
        for error in coverage["validationErrors"]:
            print(error)
        raise SystemExit(1)

    if not args.validate_only:
        write_json(OUT_TABLES, price_tables)
        write_json(OUT_SUPPLIERS, suppliers)
        write_json(OUT_FABRICS, fabrics)
        write_json(OUT_COVERAGE, coverage)
        OUT_ANALYSIS.parent.mkdir(parents=True, exist_ok=True)
        OUT_ANALYSIS.write_text(analysis)

    print(json.dumps(coverage["summary"], indent=2))
    for sheet in coverage["sheets"]:
        print(f"{sheet['status']}: {sheet['sheet']} ({len(sheet['detectedTables'])} tables)")


if __name__ == "__main__":
    main()
