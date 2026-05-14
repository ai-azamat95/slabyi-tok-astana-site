#!/usr/bin/env python3
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path
from urllib.parse import urlparse

try:
    import openpyxl
except ImportError as exc:
    raise SystemExit("Install openpyxl or run this script with the Codex bundled Python runtime.") from exc


SOURCE_URL = "https://b2b.barlau.kz/upload/tmp/sotbit_b2bcabinet_blank/excelExportApi.xlsx"
ROOT = Path(__file__).resolve().parents[1]
TMP_DIR = ROOT / "tmp"
XLSX_PATH = TMP_DIR / "excelExportApi.xlsx"
OUT_DATA = ROOT / "barlau-products.js"
OUT_DIR = ROOT / "assets" / "barlau"

GROUPS = [
    ("hiwatch-ip", "IP камеры HiWatch", 5),
    ("hikvision-ip", "IP камеры Hikvision", 5),
    ("wifi", "Wi-Fi камеры", 5),
    ("recorders", "Регистраторы", 5),
    ("poe", "PoE коммутаторы", 5),
    ("storage", "Жесткие диски и память", 5),
]


def download(url, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=60) as response:
        target.write_bytes(response.read())


def clean_filename(value):
    value = re.sub(r"[^a-zA-Z0-9а-яА-ЯёЁ]+", "-", value.lower()).strip("-")
    return value[:72] or "barlau-product"


def parse_price(value):
    match = re.search(r"[\d.]+", str(value or ""))
    return int(round(float(match.group(0)))) if match else 0


def parse_stock(value):
    text = str(value or "").strip()
    if text.startswith(">"):
        return 101 if text == ">100" else 11
    try:
        return int(float(text))
    except ValueError:
        return 0


def money(value):
    return f"{value:,.0f}".replace(",", " ") + " ₸"


def brand_key(value):
    text = str(value or "").lower()
    if "hikvision" in text:
        return "hikvision"
    if "hiwatch" in text:
        return "hiwatch"
    if "hilook" in text:
        return "hilook"
    if "ezviz" in text:
        return "ezviz"
    if "seagate" in text:
        return "seagate"
    return "other"


def product_type(row):
    device_type = str(row["Тип устройства"] or "").lower()
    if "видеорегистратор" in device_type:
        return "recorder"
    if "poe" in device_type or "коммутатор" in device_type:
        return "poe"
    if "hdd" in device_type or "диск" in device_type or "карта памяти" in device_type:
        return "storage"
    return "camera"


def normalize_row(headers, values):
    row = {header: values[index] if index < len(values) else None for index, header in enumerate(headers)}
    if "Бренд" in row and "Бренд " not in row:
        row["Бренд "] = row["Бренд"]
    row["price"] = parse_price(row.get("Цена"))
    row["stock"] = parse_stock(row.get("Остатки"))
    return row


def is_available(row):
    return row["price"] > 0 and row["stock"] > 0


def matches_group(row, key):
    brand = str(row.get("Бренд ") or "")
    category = str(row.get("Категории") or "")
    device_type = str(row.get("Тип устройства") or "")
    name = str(row.get("Название") or "")
    text = f"{brand} {category} {device_type} {name}".lower()

    if key == "hiwatch-ip":
        return brand == "HiWatch" and "IP Видеонаблюдение" in category and "IP Камера" in device_type and "PT" not in device_type
    if key == "hikvision-ip":
        return (
            brand == "Hikvision"
            and "Видеонаблюдение" in category
            and "IP Камера" in device_type
            and "PT" not in device_type
            and row["price"] < 90000
        )
    if key == "wifi":
        return ("wifi" in text or "wi-fi" in text) and "камера" in device_type.lower() and brand in {"Hikvision", "HiLook", "Ezviz"}
    if key == "recorders":
        return (
            "Видеорегистратор" in device_type
            and brand in {"HiWatch", "Hikvision", "HiLook"}
            and "мобильный" not in device_type.lower()
            and row["price"] < 150000
        )
    if key == "poe":
        return "PoE Коммутатор" in device_type or "PoE Коммутаторы" in category
    if key == "storage":
        return ("HDD Жесткий диск" in device_type or "Карта памяти" in device_type) and row["price"] < 200000
    return False


def image_path(row):
    image_url = str(row.get("Детальная картинка") or "").strip()
    if not image_url:
        return "assets/cctv-products.png"

    parsed = urlparse(image_url)
    ext = Path(parsed.path).suffix or ".jpg"
    filename = f"{row['ID']}-{clean_filename(str(row.get('Название') or 'product'))}{ext}"
    target = OUT_DIR / filename
    relative = f"assets/barlau/{filename}"

    if not target.exists():
        try:
            download(image_url, target)
        except Exception as exc:
            print(f"Image skipped for {row['ID']}: {exc}", file=sys.stderr)
            return "assets/cctv-products.png"

    return relative


def to_product(row, group_key, group_title):
    title = str(row.get("Название") or "").strip()
    source_url = str(row.get("URL товара") or "").strip()
    price = int(row["price"])
    stock = row["stock"]
    return {
        "id": row["ID"],
        "title": title,
        "brand": brand_key(row.get("Бренд ")),
        "type": product_type(row),
        "categoryUrl": source_url,
        "sourceUrl": source_url,
        "sourceImage": str(row.get("Детальная картинка") or "").strip(),
        "price": price,
        "priceText": money(price),
        "stock": stock,
        "stockText": str(row.get("Остатки") or "").strip(),
        "article": str(row.get("Артикул") or "").strip(),
        "deviceType": str(row.get("Тип устройства") or "").strip(),
        "groupKey": group_key,
        "groupTitle": group_title,
        "image": image_path(row),
    }


def main():
    if len(sys.argv) > 1:
        source_path = Path(sys.argv[1])
    else:
        download(SOURCE_URL, XLSX_PATH)
        source_path = XLSX_PATH

    workbook = openpyxl.load_workbook(source_path, read_only=True, data_only=True)
    worksheet = workbook.active
    iterator = worksheet.iter_rows(values_only=True)
    headers = [str(value or "").strip() for value in next(iterator)]
    rows = [normalize_row(headers, values) for values in iterator if values and values[0]]

    products = []
    used_ids = set()
    for group_key, group_title, limit in GROUPS:
        candidates = [row for row in rows if is_available(row) and matches_group(row, group_key)]
        candidates.sort(key=lambda row: (row["price"], -row["stock"], str(row.get("Название") or "")))
        for row in candidates:
            if row["ID"] in used_ids:
                continue
            products.append(to_product(row, group_key, group_title))
            used_ids.add(row["ID"])
            if sum(1 for product in products if product["groupKey"] == group_key) >= limit:
                break

    output = (
        f"window.barlauPriceSource = {json.dumps({'url': SOURCE_URL, 'updatedAt': date.today().isoformat()}, ensure_ascii=False)};\n"
        f"window.barlauProducts = {json.dumps(products, ensure_ascii=False, indent=2)};\n"
    )
    OUT_DATA.write_text(output, encoding="utf-8")
    print(f"Imported {len(products)} B2B products into {OUT_DATA}")


if __name__ == "__main__":
    main()
