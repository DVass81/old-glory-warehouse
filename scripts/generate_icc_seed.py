from __future__ import annotations

import json
import re
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\Me\Downloads\Copper Layout (2).xlsx")
TARGET = ROOT / "src" / "data" / "real" / "icc-real-warehouse-seed.ts"

NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

MISSING = "Needs Review"
REVIEW_DATE = "9999-12-31T00:00:00.000Z"


def column_index(ref: str) -> int:
    match = re.match(r"([A-Z]+)", ref)
    if not match:
        return 0
    value = 0
    for char in match.group(1):
        value = value * 26 + ord(char) - 64
    return value - 1


def read_shared_strings(zip_file: ZipFile) -> list[str]:
    try:
        root = ET.fromstring(zip_file.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return [
        "".join(text.text or "" for text in item.findall(".//a:t", NS))
        for item in root.findall("a:si", NS)
    ]


def cell_value(cell: ET.Element, shared_strings: list[str]) -> str:
    value = cell.find("a:v", NS)
    if value is None or value.text is None:
        return ""
    text = value.text
    if cell.attrib.get("t") == "s" and text.isdigit():
        index = int(text)
        if index < len(shared_strings):
            return shared_strings[index]
    return text


def read_rows(path: Path) -> list[dict[str, str]]:
    with ZipFile(path) as zip_file:
        shared_strings = read_shared_strings(zip_file)
        root = ET.fromstring(zip_file.read("xl/worksheets/sheet1.xml"))
        rows: list[list[str]] = []
        for row in root.findall(".//a:sheetData/a:row", NS):
            cells = []
            for cell in row.findall("a:c", NS):
                cells.append((column_index(cell.attrib.get("r", "A")), cell_value(cell, shared_strings)))
            if not cells:
                continue
            values = [""] * (max(index for index, _ in cells) + 1)
            for index, value in cells:
                values[index] = str(value).strip()
            rows.append(values)

    headers = rows[0]
    records = []
    for row_number, values in enumerate(rows[1:], start=2):
        record = dict(zip(headers, values + [""] * (len(headers) - len(values))))
        if any(record.get(header, "").strip() for header in headers):
            record["_spreadsheetRow"] = str(row_number)
            records.append(record)
    return records


def normalize_position(value: str) -> str:
    if value.isdigit():
        return value.zfill(2)
    return value or MISSING


def numeric(value: str) -> float:
    try:
        return float(value)
    except ValueError:
        return 0


def classify_status(raw_status: str, issues: list[str]) -> str:
    normalized = raw_status.strip().lower()
    if not normalized:
        issues.append("Missing status")
        return "needsReview"
    if "reserve" in normalized:
        return "reserved"
    if "hold" in normalized or "quality" in normalized:
        return "held"
    if "ship" in normalized:
        return "shipped"
    if "pick" in normalized or "consume" in normalized:
        return "picked"
    if "available" in normalized:
        return "available"
    issues.append(f"Unknown status: {raw_status}")
    return "needsReview"


def build_seed(records: list[dict[str, str]]) -> list[dict[str, object]]:
    seen_locations: dict[str, int] = {}
    seed: list[dict[str, object]] = []

    for index, row in enumerate(records, start=1):
        issues: list[str] = []
        raw_row = row.get("Row", "").strip().upper()
        raw_position = row.get("Position", "").strip()
        raw_level = row.get("Level", "").strip()
        position = normalize_position(raw_position)
        level = int(raw_level) if raw_level.isdigit() else 0
        warehouse_location = (
            f"{raw_row}-{position}-L{level}" if raw_row and position != MISSING and level else MISSING
        )
        part = row.get("Part", "").strip() or MISSING
        alloy = row.get("Alloy", "").strip() or MISSING
        weight = numeric(row.get("Weight", "").strip())

        if part == MISSING:
            issues.append("Missing Part Number / Copper Size")
        if alloy == MISSING:
            issues.append("Missing alloy")
        if not raw_row:
            issues.append("Missing row")
        if not raw_position:
            issues.append("Missing position")
        if not raw_level:
            issues.append("Missing level")
        if not weight:
            issues.append("Missing or invalid weight")

        if raw_row and raw_row not in list("ABCDEFGHIJ"):
            issues.append(f"Invalid row: {raw_row}")

        max_level = 3 if raw_row in list("ABCD") else 4 if raw_row in list("EFGHIJ") else 0
        box_length = 12 if raw_row in list("ABCD") else 6
        storage_side = "left12ft" if raw_row in list("ABCD") else "right6ft"
        if max_level and level > max_level:
            issues.append(f"Level {level} exceeds row {raw_row} max level {max_level}")

        if warehouse_location != MISSING:
            if warehouse_location in seen_locations:
                issues.append(
                    f"Duplicate location also used by spreadsheet row {seen_locations[warehouse_location]}"
                )
            else:
                seen_locations[warehouse_location] = int(row["_spreadsheetRow"])

        for missing_field in [
            "Supplier",
            "PO Number",
            "Box Number",
            "Date Received",
            "FTZ Lot ID",
            "HTS Code",
            "Country of Origin",
            "Cost",
        ]:
            issues.append(f"Missing {missing_field}")

        status = classify_status(row.get("Status", ""), issues)
        if issues and status == "available":
            status = "needsReview"

        box_number = f"ICC-{warehouse_location}" if warehouse_location != MISSING else f"ICC-ROW-{row['_spreadsheetRow']}"
        seed.append(
            {
                "id": f"icc-{index:04d}",
                "source": "icc-seed",
                "sourceRow": int(row["_spreadsheetRow"]),
                "partNumber": part,
                "copperSize": part,
                "sku": part,
                "alloy": alloy,
                "copperForm": "other",
                "grade": alloy,
                "supplier": MISSING,
                "poNumber": MISSING,
                "boxNumber": box_number,
                "row": raw_row or MISSING,
                "position": position,
                "level": level,
                "warehouseLocation": warehouse_location,
                "warehouseZone": raw_row or MISSING,
                "locationId": warehouse_location.lower(),
                "boxLengthFt": box_length,
                "storageSide": storage_side,
                "weightLbs": weight,
                "dateReceived": MISSING,
                "receivedAt": REVIEW_DATE,
                "ftzLotId": MISSING,
                "ftzStatus": "needsReview",
                "htsCode": MISSING,
                "countryOfOrigin": MISSING,
        "costUsd": None,
                "unitValueUsd": 0,
                "tariffRate": 0,
                "tariffExposureUsd": 0,
                "status": status,
                "originalStatus": MISSING,
                "reviewStatus": "needsReview" if issues else "valid",
                "reviewIssues": issues,
                "fifoRank": index,
            }
        )

    return seed


def main() -> None:
    records = read_rows(SOURCE)
    seed = build_seed(records)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    content = """import type { InventoryBox } from \"@/data/mock/warehouse-data\";

export const ICC_REAL_WAREHOUSE_SOURCE = \"Copper Layout (2).xlsx\";
export const ICC_REAL_WAREHOUSE_IMPORTED_AT = \"2026-06-12T00:00:00.000Z\";

export const iccRealWarehouseSeed = %s satisfies InventoryBox[];
""" % json.dumps(seed, indent=2)
    TARGET.write_text(content, encoding="utf-8")
    print(f"Wrote {len(seed)} records to {TARGET}")


if __name__ == "__main__":
    main()
