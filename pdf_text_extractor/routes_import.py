from __future__ import annotations

import csv
import io
import json
import os
from datetime import datetime
from typing import Any

import openpyxl
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from openai import OpenAI
from pydantic import BaseModel

from auth import CurrentUser
from db import get_db, rows
from rbac import require_min_role

router = APIRouter(prefix="/api/servers/import", tags=["import"])

NEXHIRE_FIELDS: dict[str, str] = {
    "hostname": "Nom / Hôte de l'équipement (REQUIS)",
    "device_type": "Type : laptop | desktop | server | switch | router | firewall | tablet | phone_mobile | phone_ip | monitor | printer | scanner | ups | other",
    "ip_address": "Adresse IP ou numéro de série",
    "asset_tag": "Numéro d'étiquette / code inventaire",
    "os": "Système d'exploitation",
    "cpu_cores": "Nombre de cœurs CPU (entier)",
    "ram_gb": "RAM en gigaoctets (entier)",
    "storage_gb": "Stockage en gigaoctets (entier)",
    "location": "Emplacement physique",
    "environment": "Environnement : production | staging | development | test | backup",
    "status": "Statut : active | idle | to_decommission | decommissioned",
    "purchase_price": "Valeur d'acquisition en dollars (nombre)",
    "acquisition_date": "Date d'achat (YYYY-MM-DD ou DD/MM/YYYY)",
    "warranty_end_date": "Date de fin de garantie",
    "replacement_date": "Date de remplacement prévue",
    "department_name": "Nom du département",
    "notes": "Notes libres",
}

DEVICE_TYPES = {
    "laptop",
    "desktop",
    "server",
    "switch",
    "router",
    "firewall",
    "tablet",
    "phone_mobile",
    "phone_ip",
    "docking_station",
    "monitor",
    "printer",
    "scanner",
    "cable_network",
    "cable_hdmi",
    "cable_vga",
    "cable_displayport",
    "usb_key",
    "usb_adapter",
    "charger",
    "ups",
    "other",
}

STATUS_MAP = {
    "actif": "active",
    "active": "active",
    "inactif": "idle",
    "idle": "idle",
    "à décommissionner": "to_decommission",
    "to_decommission": "to_decommission",
    "décommissionné": "decommissioned",
    "decommissioned": "decommissioned",
}


def _parse_file(content: bytes, filename: str) -> list[dict]:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "csv"
    if ext in ("xlsx", "xls"):
        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        ws = wb.active
        raw_rows = list(ws.iter_rows(values_only=True))
        if not raw_rows:
            return []
        headers = [str(h).strip() if h is not None else f"col_{i}" for i, h in enumerate(raw_rows[0])]
        result = []
        for r in raw_rows[1:]:
            if any(v is not None for v in r):
                result.append(dict(zip(headers, [str(v).strip() if v is not None else "" for v in r])))
        return result
    else:
        text = content.decode("utf-8-sig", errors="replace")
        try:
            dialect = csv.Sniffer().sniff(text[:4096], delimiters=",;\t|")
        except csv.Error:
            dialect = csv.excel
        reader = csv.DictReader(io.StringIO(text), dialect=dialect)
        return [{k.strip(): (v or "").strip() for k, v in row.items()} for row in reader]


def _ai_map_columns(headers: list[str], sample_rows: list[dict]) -> dict[str, str | None]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {}
    client = OpenAI(api_key=api_key)
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    fields_desc = "\n".join(f"  {k}: {v}" for k, v in NEXHIRE_FIELDS.items())
    prompt = f"""Tu reçois les colonnes d'un fichier d'inventaire IT et des lignes d'exemple.
Mappe chaque colonne vers le champ NexHire le plus approprié. Si aucun champ ne correspond, mets null.

Colonnes du fichier : {json.dumps(headers, ensure_ascii=False)}

Exemples (3 premières lignes) :
{json.dumps(sample_rows[:3], ensure_ascii=False, indent=2)}

Champs NexHire disponibles :
{fields_desc}

Réponds UNIQUEMENT avec un objet JSON valide. Format :
{{"colonne_fichier": "champ_nexhire_ou_null", ...}}

Règles :
- Trouve toujours la colonne hostname (nom de l'équipement, hôte, host, device name…)
- Pour device_type, la valeur doit être normalisée en anglais minuscule (ex: "PC portable" → "laptop")
- Ne mappe pas deux colonnes vers le même champ (garde la plus pertinente)
"""
    try:
        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0,
            max_tokens=600,
        )
        return json.loads(resp.choices[0].message.content or "{}")
    except Exception:
        return {}


@router.post("/preview")
async def import_preview(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(require_min_role("admin")),
):
    if not file.filename:
        raise HTTPException(400, "Fichier requis.")
    ext = (file.filename.rsplit(".", 1)[-1].lower()) if "." in file.filename else ""
    if ext not in ("csv", "xlsx", "xls"):
        raise HTTPException(400, "Format non supporté — utilisez CSV ou Excel (.xlsx).")

    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(400, "Fichier trop volumineux (max 5 Mo).")

    try:
        all_rows = _parse_file(content, file.filename)
    except Exception as e:
        import logging as _log

        _log.getLogger(__name__).error("Import parse error file=%s: %s", file.filename, e)
        raise HTTPException(400, "Impossible de lire le fichier — format non supporté ou fichier corrompu.")

    if not all_rows:
        raise HTTPException(400, "Fichier vide ou sans données lisibles.")

    headers = list(all_rows[0].keys())
    mapping = _ai_map_columns(headers, all_rows[:5])

    for h in headers:
        if h not in mapping:
            mapping[h] = None

    return {
        "headers": headers,
        "mapping": mapping,
        "preview": all_rows[:10],
        "all_rows": all_rows[:500],
        "total_rows": len(all_rows),
        "fields": list(NEXHIRE_FIELDS.keys()),
    }


class ImportConfirmPayload(BaseModel):
    rows: list[dict[str, Any]]
    mapping: dict[str, str | None]


@router.post("/confirm")
def import_confirm(
    payload: ImportConfirmPayload,
    user: CurrentUser = Depends(require_min_role("admin")),
):
    if not payload.rows:
        raise HTTPException(400, "Aucune donnée à importer.")
    if len(payload.rows) > 500:
        raise HTTPException(400, "Maximum 500 équipements par import.")

    with get_db() as cur:
        cur.execute(
            "SELECT id, LOWER(name) AS name FROM departments WHERE organization_id = %s",
            (user.organization_id,),
        )
        dept_map = {r["name"]: r["id"] for r in rows(cur)}

    # Inverse le mapping colonne→champ en champ→colonne
    field_to_col: dict[str, str] = {}
    for col, field in payload.mapping.items():
        if field and field not in field_to_col:
            field_to_col[field] = col

    def _get(raw: dict, field: str) -> str | None:
        col = field_to_col.get(field)
        v = raw.get(col, "").strip() if col else ""
        return v or None

    def _date(val: str | None) -> str | None:
        if not val:
            return None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d.%m.%Y"):
            try:
                return datetime.strptime(val, fmt).strftime("%Y-%m-%d")
            except ValueError:
                continue
        return None

    def _float(val: str | None) -> float | None:
        if not val:
            return None
        try:
            cleaned = val.replace(",", ".").replace(" ", "").replace("$", "").replace("CAD", "").replace("\xa0", "")
            return float(cleaned)
        except ValueError:
            return None

    def _int(val: str | None) -> int | None:
        try:
            return int(float(val)) if val else None
        except (ValueError, TypeError):
            return None

    inserted = 0
    skipped = 0
    errors: list[str] = []

    with get_db() as cur:
        for i, raw in enumerate(payload.rows):
            hostname = _get(raw, "hostname")
            if not hostname:
                skipped += 1
                continue

            raw_type = (_get(raw, "device_type") or "other").lower().strip()
            device_type = raw_type if raw_type in DEVICE_TYPES else "other"

            status_raw = (_get(raw, "status") or "active").lower().strip()
            status = STATUS_MAP.get(status_raw, "active")

            dept_raw = (_get(raw, "department_name") or "").lower().strip()
            department_id = dept_map.get(dept_raw)

            try:
                cur.execute(
                    """
                    INSERT INTO servers (
                        organization_id, department_id, device_type, hostname, ip_address,
                        environment, os, cpu_cores, ram_gb, storage_gb,
                        location, status, monthly_cost,
                        asset_tag, purchase_price,
                        acquisition_date, warranty_end_date, replacement_date, notes
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT DO NOTHING
                    """,
                    (
                        user.organization_id,
                        department_id,
                        device_type,
                        hostname,
                        _get(raw, "ip_address"),
                        _get(raw, "environment") or "production",
                        _get(raw, "os"),
                        _int(_get(raw, "cpu_cores")),
                        _int(_get(raw, "ram_gb")),
                        _int(_get(raw, "storage_gb")),
                        _get(raw, "location"),
                        status,
                        0,
                        _get(raw, "asset_tag"),
                        _float(_get(raw, "purchase_price")),
                        _date(_get(raw, "acquisition_date")),
                        _date(_get(raw, "warranty_end_date")),
                        _date(_get(raw, "replacement_date")),
                        _get(raw, "notes"),
                    ),
                )
                inserted += 1
            except Exception as e:
                import logging as _log

                _log.getLogger(__name__).warning("Import row error line=%d hostname=%s: %s", i + 2, hostname, e)
                errors.append(f"Ligne {i + 2} ({hostname}) : erreur lors de l'insertion — vérifiez les données.")
                skipped += 1

    return {"inserted": inserted, "skipped": skipped, "errors": errors[:10]}
