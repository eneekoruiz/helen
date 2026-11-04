"""Synthetic packages only; never opens the owner's financial records."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape
from zipfile import ZipFile

SPEC = importlib.util.spec_from_file_location("finance", Path(__file__).resolve().parents[1] / "scripts/finance-workbook.py")
finance = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(finance)


class FinanceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="helen-finance-")
        self.root = Path(self.temp.name)
        self.source = self.root / "source.xlsx"
        header = ''.join(f'<c r="{col}1" t="inlineStr"><is><t>{escape(text)}</t></is></c>' for col, text in zip("ABCDEFG", finance.HEADERS))
        self.sheet = f'<worksheet xmlns="{finance.NS["m"]}"><dimension ref="A1:G2"/><sheetData><row r="1">{header}</row><row r="2"><c r="E2"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>'
        self.write_source()
        self.request = {"source": str(self.source), "directory": str(self.root / "revisions"), "requestId": "sale-1", "movement": {"date": "2026-11-04", "operation": "Venta", "person": "", "account": "Caja prueba", "amount": "20.00", "cashImpact": "20.00", "concept": "Camiseta <azul> & envío"}}

    def tearDown(self):
        self.temp.cleanup()

    def write_source(self):
        with ZipFile(self.source, "w") as book:
            book.writestr("xl/workbook.xml", f'<workbook xmlns="{finance.NS["m"]}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="MOVIMIENTOS" sheetId="1" r:id="rId1"/></sheets></workbook>')
            book.writestr("xl/_rels/workbook.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>')
            book.writestr("xl/worksheets/sheet1.xml", self.sheet)
            book.writestr("xl/styles.xml", "synthetic-preserved")

    def test_copy_readback_money_date_formula_and_idempotency(self):
        original = self.source.read_bytes()
        first = finance.record(self.request)
        self.assertFalse(first["duplicate"])
        self.assertEqual(first["recalculation"], "pending-excel")
        self.assertTrue(finance.record(self.request)["duplicate"])
        self.assertEqual(self.source.read_bytes(), original)
        with ZipFile(first["output"]) as book:
            tree = ET.fromstring(book.read("xl/worksheets/sheet1.xml"))
            self.assertEqual(tree.findtext('.//m:f', namespaces=finance.NS), "1+1")
            row = tree.find('m:sheetData/m:row[@r="3"]', finance.NS)
            self.assertEqual([finance.cell_text(c, []) for c in row][4:], ["20.00", "20.00", "Camiseta <azul> & envío"])
            self.assertEqual(row[0].get("t"), "n")
            self.assertEqual(book.read("xl/styles.xml"), b"synthetic-preserved")
        self.request["movement"]["amount"] = "30.00"
        with self.assertRaisesRegex(ValueError, "requestId"):
            finance.record(self.request)

    def test_invalid_input_never_creates_a_revision(self):
        for amount in ["NaN", "1.001", "1,20", "-1", "0", 20]:
            with self.subTest(amount=amount):
                self.request["movement"]["amount"] = amount
                with self.assertRaises(ValueError):
                    finance.record(self.request)
        self.assertFalse((self.root / "revisions").exists())

    def test_lock_and_corrupt_output_fail_closed(self):
        directory = self.root / "revisions"
        directory.mkdir()
        (directory / ".finance.lock").touch()
        with self.assertRaises(FileExistsError):
            finance.record(self.request)
        (directory / ".finance.lock").unlink()
        result = finance.record(self.request)
        Path(result["output"]).write_bytes(b"modified")
        with self.assertRaisesRegex(ValueError, "altered revision"):
            finance.record(self.request)
        self.assertFalse((directory / ".finance.lock").exists())

    def test_changed_headers_and_full_range_are_rejected(self):
        self.sheet = self.sheet.replace("Fecha", "Changed")
        self.write_source()
        with self.assertRaisesRegex(ValueError, "headers"):
            finance.record(self.request)
        self.sheet = self.sheet.replace("Changed", "Fecha").replace('r="2"', 'r="100"').replace('r="E2"', 'r="E100"')
        self.write_source()
        with self.assertRaisesRegex(ValueError, "range is full"):
            finance.record(self.request)

    def test_queries_use_decimal_and_calendar_month_without_modifying_source(self):
        self.sheet = self.sheet.replace('<row r="2"><c r="E2"><f>1+1</f><v>2</v></c></row>', '')
        self.write_source()
        for index, (day, operation, amount, impact) in enumerate([
            ("2026-11-01", "Ingreso", "0.10", "0.10"),
            ("2026-11-02", "Gasto", "0.20", "-0.20"),
            ("2026-10-31", "Ingreso", "0.30", "0.30"),
        ]):
            self.request.update(requestId=f"query-{index}")
            self.request["movement"].update(date=day, operation=operation, amount=amount, cashImpact=impact)
            self.request["source"] = finance.record(self.request)["output"]
        source = Path(self.request["source"])
        before = source.read_bytes()
        result = finance.query({"source": str(source), "month": "2026-11", "limit": 1})
        self.assertEqual(result["count"], 2)
        self.assertEqual(result["amountByOperation"], {"Ingreso": "0.10", "Gasto": "0.20"})
        self.assertEqual(result["cashImpactByAccount"], {"Caja prueba": "-0.10"})
        self.assertEqual(result["recent"][0]["date"], "2026-11-02")
        self.assertEqual(source.read_bytes(), before)
        self.assertEqual(finance.query({"source": str(source), "month": None, "limit": 10})["count"], 3)

    def test_queries_refuse_cached_formulas_and_invalid_selection(self):
        with self.assertRaisesRegex(ValueError, "cached values"):
            finance.query({"source": str(self.source), "month": None, "limit": 10})
        for month, limit in [("2026-13", 10), (None, True), (None, 101)]:
            with self.assertRaises(ValueError):
                finance.query({"source": str(self.source), "month": month, "limit": limit})
        self.sheet = self.sheet.replace('<c r="E2">', '<c r="E2"><v>1</v></c><c r="E2">')
        self.write_source()
        with self.assertRaisesRegex(ValueError, "duplicate worksheet cells"):
            finance.query({"source": str(self.source), "month": None, "limit": 10})


if __name__ == "__main__":
    unittest.main()
