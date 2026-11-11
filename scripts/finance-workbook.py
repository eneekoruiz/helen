"""Offline XLSX adapter. Writes immutable copies; never replaces the source book.

Input on stdin: {source, directory, requestId, movement}. The caller must pass the
previous result as source for the next movement. No network or Excel execution.
"""
from datetime import date, timedelta
from copy import copy
from decimal import Decimal, InvalidOperation
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape
from zipfile import BadZipFile, ZipFile

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
HEADERS = ["Fecha", "Tipo Operación", "Persona Asociada", "Cuenta/Caja", "Importe (€)", "Impacto Caja", "Concepto"]


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def money(value, positive=False):
    if not isinstance(value, str) or not re.fullmatch(r"-?\d{1,10}(?:\.\d{1,2})?", value):
        raise ValueError("Money must be a decimal string with at most two decimal places.")
    amount = Decimal(value)
    if not amount.is_finite() or (positive and amount <= 0):
        raise ValueError("Amount must be positive.")
    return format(amount.quantize(Decimal("0.01")), "f")


def validate_movement(raw):
    fields = {"date", "operation", "person", "account", "amount", "cashImpact", "concept"}
    if not isinstance(raw, dict) or set(raw) != fields:
        raise ValueError("Provide date, operation, person, account, amount, cashImpact and concept explicitly.")
    if not isinstance(raw["date"], str) or date.fromisoformat(raw["date"]).isoformat() != raw["date"]:
        raise ValueError("Use an ISO calendar date.")
    result = dict(raw)
    for field in ["operation", "person", "account", "concept"]:
        text = raw[field]
        if not isinstance(text, str) or len(text) > 500 or any(ord(c) < 32 for c in text):
            raise ValueError("Invalid movement text.")
        result[field] = text.strip()
        if field != "person" and not result[field]:
            raise ValueError(f"Missing {field}; ask the owner rather than guessing.")
    result["amount"] = money(raw["amount"], positive=True)
    result["cashImpact"] = money(raw["cashImpact"])
    if abs(Decimal(result["cashImpact"])) > Decimal(result["amount"]):
        raise ValueError("Cash impact cannot exceed movement amount.")
    return result


def cell_text(cell, strings):
    if cell.get("t") == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//m:t", NS))
    value = cell.findtext("m:v", default="", namespaces=NS)
    if cell.get("t") == "s":
        if not re.fullmatch(r"\d+", value) or int(value) >= len(strings):
            raise ValueError("Invalid shared string reference.")
        return strings[int(value)]
    if cell.get("t") not in (None, "n", "str", "d"):
        raise ValueError("Unsupported movement cell type.")
    return value


def movement_sheet(book):
    names = book.namelist()
    if len(names) != len(set(names)) or len(names) > 1000 or sum(i.file_size for i in book.infolist()) > 50 * 1024 * 1024:
        raise ValueError("Workbook package exceeds limits or has duplicate parts.")
    if any("vbaproject" in name.lower() or name.startswith("xl/externalLinks/") for name in names):
        raise ValueError("Macros and external links require a separate reviewed adapter.")
    workbook = ET.fromstring(book.read("xl/workbook.xml"))
    sheets = [s for s in workbook.findall("m:sheets/m:sheet", NS) if s.get("name") == "MOVIMIENTOS"]
    if len(sheets) != 1:
        raise ValueError("Expected one MOVIMIENTOS sheet.")
    relationship = sheets[0].get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
    rels = ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))
    target = next((r.get("Target", "") for r in rels if r.get("Id") == relationship and not r.get("TargetMode")), "")
    part = target.lstrip("/") if target.startswith("/xl/") else "xl/" + target
    if not re.fullmatch(r"xl/worksheets/sheet\d+\.xml", part):
        raise ValueError("Unsupported worksheet relationship.")
    strings = []
    if "xl/sharedStrings.xml" in names:
        strings = ["".join(n.text or "" for n in si.findall(".//m:t", NS)) for si in ET.fromstring(book.read("xl/sharedStrings.xml"))]
    original = book.read(part)
    tree = ET.fromstring(original)
    rows = tree.findall("m:sheetData/m:row", NS)
    row_ids = [row.get("r", "") for row in rows]
    if len(row_ids) != len(set(row_ids)) or any(not re.fullmatch(r"[1-9]\d{0,6}", number) or int(number) > 1048576 for number in row_ids):
        raise ValueError("Invalid or duplicate worksheet rows.")
    for row in rows:
        refs = [cell.get("r", "") for cell in row]
        if len(refs) != len(set(refs)) or any(not re.fullmatch(r"[A-Z]{1,3}" + row.get("r"), ref) for ref in refs):
            raise ValueError("Invalid or duplicate worksheet cells.")
    header = next((row for row in rows if row.get("r") == "1"), None)
    if header is None or [cell_text(c, strings) for c in header][:7] != HEADERS or [c.get("r") for c in header][:7] != [f"{c}1" for c in "ABCDEFG"]:
        raise ValueError("Workbook headers changed; review the mapping before writing.")
    return part, original, workbook, rows, strings


def updated_parts(book, movement):
    part, original, workbook, rows, _ = movement_sheet(book)
    last = max(int(row.get("r")) for row in rows)
    number = last + 1
    # shortcut: existing summaries/filter cover 100 rows; require review before extending their formulas.
    if number > 100:
        raise ValueError("Reserved movement range is full; extend and verify workbook formulas first.")
    closing = b"</sheetData>"
    if original.count(closing) != 1:
        raise ValueError("Unsupported worksheet XML serialization.")
    previous = {re.sub(r"\d+$", "", c.get("r", "")): c.get("s") for c in rows[-1]}
    values = [movement[k] for k in ["date", "operation", "person", "account", "amount", "cashImpact", "concept"]]
    calendar = workbook.find("m:workbookPr", NS)
    base = date(1904, 1, 1) if calendar is not None and calendar.get("date1904") in ("1", "true") else date(1899, 12, 30)
    if date.fromisoformat(values[0]) < date(1904, 1, 1):
        raise ValueError("Only dates from 1904 onwards are supported.")
    values[0] = str((date.fromisoformat(values[0]) - base).days)
    cells = []
    for col, value in zip("ABCDEFG", values, strict=True):
        style = f' s="{int(previous[col])}"' if previous.get(col) is not None else ""
        if col in "AEF":
            cells.append(f'<c r="{col}{number}"{style} t="n"><v>{value}</v></c>')
        else:
            cells.append(f'<c r="{col}{number}"{style} t="inlineStr"><is><t xml:space="preserve">{escape(value)}</t></is></c>')
    row_xml = f'<row r="{number}">{"".join(cells)}</row>'.encode("utf-8")
    changed = original.replace(closing, row_xml + closing, 1)
    changed = re.sub(rb'(<dimension\b[^>]*\bref=")[^"]+("[^>]*/>)', lambda m: m[1] + f"A1:G{number}".encode() + m[2], changed, count=1)
    return part, changed, number, values


def query(request):
    if not isinstance(request, dict) or set(request) != {"source", "month", "limit"}:
        raise ValueError("Expected source, month and limit.")
    month = request["month"]
    if month is not None and (not isinstance(month, str) or not re.fullmatch(r"\d{4}-(?:0[1-9]|1[0-2])", month)):
        raise ValueError("Use an ISO month.")
    if type(request["limit"]) is not int or not 1 <= request["limit"] <= 100:
        raise ValueError("Limit must be from 1 to 100.")
    source = Path(request["source"]).resolve(strict=True)
    if source.suffix.lower() != ".xlsx" or source.stat().st_size > 20 * 1024 * 1024:
        raise ValueError("Expected a bounded XLSX workbook.")
    before = digest(source)
    movements = []
    with ZipFile(source) as book:
        _, _, workbook, rows, strings = movement_sheet(book)
        calendar = workbook.find("m:workbookPr", NS)
        base = date(1904, 1, 1) if calendar is not None and calendar.get("date1904") in ("1", "true") else date(1899, 12, 30)
        for row in rows:
            if row.get("r") == "1":
                continue
            cells = {re.sub(r"\d+$", "", c.get("r", "")): c for c in row if re.fullmatch(r"[A-G]\d+", c.get("r", ""))}
            if any(c.find("m:f", NS) is not None for c in cells.values()):
                raise ValueError("Formula movement cells require reviewed recalculation; cached values are not trusted.")
            values = [cell_text(cells[col], strings) if col in cells else "" for col in "ABCDEFG"]
            if not any(values):
                continue
            if "A" not in cells or cells["A"].get("t", "n") != "n" or not re.fullmatch(r"\d{1,7}", values[0]):
                raise ValueError("Expected an integer Excel calendar date.")
            values[0] = (base + timedelta(days=int(values[0]))).isoformat()
            movement = validate_movement(dict(zip(["date", "operation", "person", "account", "amount", "cashImpact", "concept"], values, strict=True)))
            movements.append({"row": int(row.get("r")), **movement})
    if digest(source) != before:
        raise ValueError("Workbook changed during the query; retry against a stable revision.")
    selected = [m for m in movements if month is None or m["date"].startswith(month)]
    by_operation, by_account = {}, {}
    for movement in selected:
        operation, account = movement["operation"], movement["account"]
        by_operation[operation] = by_operation.get(operation, Decimal(0)) + Decimal(movement["amount"])
        by_account[account] = by_account.get(account, Decimal(0)) + Decimal(movement["cashImpact"])
    return {"sourceHash": before, "month": month, "count": len(selected),
            "recent": sorted(selected, key=lambda m: (m["date"], m["row"]), reverse=True)[:request["limit"]],
            "amountByOperation": {k: format(v, ".2f") for k, v in by_operation.items()},
            "cashImpactByAccount": {k: format(v, ".2f") for k, v in by_account.items()},
            "interpretation": "Recorded amounts and cash impacts only; not profit or account balances."}


def record(request):
    if not isinstance(request, dict) or set(request) != {"source", "directory", "requestId", "movement"}:
        raise ValueError("Expected source, directory, requestId and movement.")
    key = request["requestId"]
    if not isinstance(key, str) or not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", key):
        raise ValueError("Invalid requestId.")
    movement = validate_movement(request["movement"])
    source = Path(request["source"]).resolve(strict=True)
    if source.suffix.lower() != ".xlsx" or source.stat().st_size > 20 * 1024 * 1024:
        raise ValueError("Expected an XLSX workbook no larger than 20 MB.")
    directory = Path(request["directory"]).resolve()
    directory.mkdir(parents=True, exist_ok=True)
    output = directory / f"{key}.xlsx"
    journal = directory / f"{key}.json"
    if source == output:
        raise ValueError("The source must never be overwritten.")
    source_hash = digest(source)
    fingerprint = hashlib.sha256(json.dumps({"source": str(source), "hash": source_hash, "movement": movement}, sort_keys=True).encode()).hexdigest()
    lock = directory / ".finance.lock"
    descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    temporary = None
    try:
        if journal.exists():
            previous = json.loads(journal.read_text("utf-8"))
            if previous["fingerprint"] != fingerprint:
                raise ValueError("requestId already belongs to another movement or source revision.")
            if output.exists() and digest(output) == previous["hash"]:
                return {"output": str(output), "row": previous["row"], "duplicate": True, "recalculation": "pending-excel"}
            raise ValueError("Incomplete or altered revision; inspect it before retrying.")
        if output.exists():
            raise ValueError("Refusing to replace an existing output.")
        with ZipFile(source) as book:
            part, changed, row, values = updated_parts(book, movement)
            fd, name = tempfile.mkstemp(prefix=".finance-", suffix=".xlsx", dir=directory)
            os.close(fd)
            temporary = Path(name)
            with ZipFile(temporary, "w") as written:
                for info in book.infolist():
                    written.writestr(copy(info), changed if info.filename == part else book.read(info.filename))
            with ZipFile(temporary) as written:
                if written.testzip() is not None or any(book.read(n) != written.read(n) for n in book.namelist() if n != part):
                    raise ValueError("Workbook verification failed.")
                added = ET.fromstring(written.read(part)).find(f'm:sheetData/m:row[@r="{row}"]', NS)
                if added is None or [cell_text(c, []) for c in added] != values:
                    raise ValueError("Movement readback failed.")
        if digest(source) != source_hash:
            raise ValueError("Source changed concurrently; no revision committed.")
        # The journal is durable before the immutable output, so a retry never adds a second movement.
        with journal.open("x", encoding="utf-8") as stream:
            json.dump({"fingerprint": fingerprint, "hash": digest(temporary), "row": row}, stream)
            stream.flush()
            os.fsync(stream.fileno())
        os.link(temporary, output)
        return {"output": str(output), "row": row, "duplicate": False, "recalculation": "pending-excel"}
    finally:
        os.close(descriptor)
        if temporary is not None:
            temporary.unlink(missing_ok=True)
        lock.unlink()


if __name__ == "__main__":
    try:
        raw = sys.stdin.buffer.read(65537)
        if len(raw) > 65536:
            raise ValueError("Request exceeds 64 KB.")
        print(json.dumps(query(json.loads(raw)) if sys.argv[1:] == ["query"] else record(json.loads(raw)), ensure_ascii=True))
    except (ValueError, OSError, KeyError, IndexError, OverflowError, InvalidOperation, ET.ParseError, BadZipFile) as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=True))
        sys.exit(1)
