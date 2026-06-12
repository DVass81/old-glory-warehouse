from __future__ import annotations

import csv
import json
import re
from io import StringIO
from pathlib import Path
from typing import Any

import streamlit as st


ROOT = Path(__file__).resolve().parent
SEED_FILE = ROOT / "src" / "data" / "real" / "icc-real-warehouse-seed.ts"


st.set_page_config(page_title="Old Glory Warehouse", layout="wide")


@st.cache_data
def load_seed_records() -> list[dict[str, Any]]:
    if not SEED_FILE.exists():
        return []

    content = SEED_FILE.read_text(encoding="utf-8")
    match = re.search(r"export const iccRealWarehouseSeed = (\[.*?\]) satisfies", content, re.S)
    if not match:
        return []
    return json.loads(match.group(1))


def csv_bytes(records: list[dict[str, Any]]) -> bytes:
    if not records:
        return b""
    fields = sorted({field for record in records for field in record})
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=fields)
    writer.writeheader()
    writer.writerows(records)
    return output.getvalue().encode("utf-8")


def number(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


records = load_seed_records()
needs_review = [
    record
    for record in records
    if record.get("reviewStatus") == "needsReview" or record.get("status") == "needsReview"
]
available = [record for record in records if record.get("status") == "available"]

st.title("Old Glory Warehouse")
st.caption("Streamlit view of the committed ICC copper warehouse seed data.")

if not records:
    st.error("No committed ICC seed records were found. Check src/data/real/icc-real-warehouse-seed.ts.")
    st.stop()

metric_cols = st.columns(4)
metric_cols[0].metric("Total boxes", f"{len(records):,}")
metric_cols[1].metric("Total weight", f"{sum(number(record.get('weightLbs')) for record in records):,.0f} lb")
metric_cols[2].metric("Needs Review", f"{len(needs_review):,}")
metric_cols[3].metric("Available", f"{len(available):,}")

search = st.text_input("Search PO, supplier, part, box, location, FTZ lot", "")
row_filter = st.multiselect(
    "Rows",
    sorted({str(record.get("row", "")) for record in records if record.get("row")}),
)
status_filter = st.multiselect(
    "Status",
    sorted({str(record.get("status", "")) for record in records if record.get("status")}),
)


def matches(record: dict[str, Any]) -> bool:
    if row_filter and record.get("row") not in row_filter:
        return False
    if status_filter and record.get("status") not in status_filter:
        return False
    if search.strip():
        haystack = " ".join(
            str(record.get(field, ""))
            for field in [
                "poNumber",
                "supplier",
                "partNumber",
                "copperSize",
                "boxNumber",
                "warehouseLocation",
                "ftzLotId",
            ]
        ).lower()
        return search.strip().lower() in haystack
    return True


filtered_records = [record for record in records if matches(record)]

dashboard_tab, inventory_tab, review_tab, export_tab = st.tabs(
    ["Dashboard", "Inventory", "Needs Review", "Exports"]
)

with dashboard_tab:
    by_row: dict[str, float] = {}
    for record in records:
        row = str(record.get("row", "Needs Review"))
        by_row[row] = by_row.get(row, 0) + number(record.get("weightLbs"))
    st.subheader("Weight by row")
    st.bar_chart(by_row)

with inventory_tab:
    st.subheader(f"Inventory ({len(filtered_records):,} records)")
    st.dataframe(filtered_records, use_container_width=True, hide_index=True)

with review_tab:
    st.subheader(f"Needs Review ({len(needs_review):,} records)")
    st.dataframe(needs_review, use_container_width=True, hide_index=True)

with export_tab:
    st.subheader("Download active data")
    st.download_button(
        "Download filtered inventory CSV",
        data=csv_bytes(filtered_records),
        file_name="old-glory-filtered-inventory.csv",
        mime="text/csv",
    )
    st.download_button(
        "Download Needs Review CSV",
        data=csv_bytes(needs_review),
        file_name="old-glory-needs-review.csv",
        mime="text/csv",
    )

st.info(
    "For the full 3D warehouse, editable inventory, labels, and FIFO workflows, deploy the Next.js app "
    "to a Node host such as Vercel. This Streamlit app is a cloud-safe data viewer."
)
