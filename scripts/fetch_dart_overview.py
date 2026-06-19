"""
DART Open API — 종목 회사개요(기업개황) 수집 → stocks.overview

필요 환경변수:
  DART_API_KEY  — https://opendart.fss.or.kr/ 에서 발급

사용:
  py scripts/fetch_dart_overview.py --limit 50
  py scripts/fetch_dart_overview.py --missing-only
  py scripts/fetch_dart_overview.py --code 005930
"""

from __future__ import annotations

import argparse
import io
import os
import sys
import time
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

import psycopg2
import urllib.request
import urllib.parse
import json

ROOT = Path(__file__).resolve().parents[1]
DART_BASE = "https://opendart.fss.or.kr/api"
CORP_CODE_CACHE = ROOT / "scripts" / ".dart_corp_codes.xml"


def load_env_file() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        if key.strip() and key.strip() not in os.environ:
            os.environ[key.strip()] = value.strip().strip('"').strip("'")


load_env_file()


def get_connection():
    url = os.environ.get("LOCAL_DATABASE_URL") or os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL 필요")
    return psycopg2.connect(url)


def dart_get(path: str, params: dict[str, str]) -> dict:
    api_key = os.environ.get("DART_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("DART_API_KEY 환경변수가 필요합니다.")
    params = {**params, "crtfc_key": api_key}
    url = f"{DART_BASE}/{path}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "foreign-flow-detective/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
    if path.endswith(".xml"):
        return {"_xml": raw}
    return json.loads(raw.decode("utf-8"))


def load_corp_code_map(force: bool = False) -> dict[str, str]:
    """stock_code(6) → corp_code(8)"""
    if not force and CORP_CODE_CACHE.exists():
        xml_bytes = CORP_CODE_CACHE.read_bytes()
    else:
        data = dart_get("corpCode.xml", {})
        xml_bytes = data["_xml"]
        if isinstance(xml_bytes, bytes) and xml_bytes[:2] == b"PK":
            with zipfile.ZipFile(io.BytesIO(xml_bytes)) as zf:
                name = next(n for n in zf.namelist() if n.endswith(".xml"))
                xml_bytes = zf.read(name)
        CORP_CODE_CACHE.write_bytes(xml_bytes)

    root = ET.fromstring(xml_bytes)
    mapping: dict[str, str] = {}
    for item in root.findall("list"):
        stock_code = (item.findtext("stock_code") or "").strip()
        corp_code = (item.findtext("corp_code") or "").strip()
        if stock_code and corp_code:
            mapping[stock_code] = corp_code
    return mapping


def format_overview(data: dict) -> str:
    """company.json 응답 → 회사개요 텍스트."""
    if data.get("status") != "000":
        return ""

    parts: list[str] = []
    name = data.get("corp_name") or data.get("stock_name")
    if name:
        parts.append(f"{name}")

    ceo = data.get("ceo_nm")
    if ceo:
        parts.append(f"대표이사: {ceo}")

    est = data.get("est_dt")
    if est and len(est) == 8:
        parts.append(f"설립일: {est[:4]}-{est[4:6]}-{est[6:8]}")

    addr = data.get("adres")
    if addr:
        parts.append(f"주소: {addr}")

    hm = data.get("hm_url")
    if hm:
        parts.append(f"홈페이지: {hm}")

    induty = data.get("induty_code")
    if induty:
        parts.append(f"업종코드: {induty}")

    acc = data.get("acc_mt")
    if acc:
        parts.append(f"결산월: {acc}월")

    return "\n".join(parts)


def fetch_company_overview(corp_code: str) -> tuple[str, str]:
    data = dart_get("company.json", {"corp_code": corp_code})
    overview = format_overview(data)
    corp_name = data.get("corp_name") or ""
    return overview, corp_name


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--code", help="단일 종목코드")
    parser.add_argument("--limit", type=int, default=100, help="최대 처리 종목 수")
    parser.add_argument("--missing-only", action="store_true", help="overview 없는 종목만")
    parser.add_argument("--delay", type=float, default=0.15, help="API 호출 간격(초)")
    args = parser.parse_args()

    try:
        corp_map = load_corp_code_map()
    except Exception as exc:
        print(f"[ERROR] corpCode.xml 로드 실패: {exc}", file=sys.stderr)
        return 1

    conn = get_connection()
    updated = 0
    skipped = 0
    try:
        with conn:
            with conn.cursor() as cur:
                if args.code:
                    codes = [args.code.zfill(6)]
                elif args.missing_only:
                    cur.execute(
                        """
                        SELECT code FROM stocks
                        WHERE overview IS NULL OR overview = ''
                        ORDER BY code
                        LIMIT %s
                        """,
                        (args.limit,),
                    )
                    codes = [r[0] for r in cur.fetchall()]
                else:
                    cur.execute(
                        "SELECT code FROM stocks ORDER BY code LIMIT %s",
                        (args.limit,),
                    )
                    codes = [r[0] for r in cur.fetchall()]

                print(f"[fetch_dart] {len(codes)}종목 처리 시작")
                for i, code in enumerate(codes, 1):
                    corp_code = corp_map.get(code)
                    if not corp_code:
                        skipped += 1
                        continue
                    try:
                        overview, _ = fetch_company_overview(corp_code)
                        if not overview:
                            skipped += 1
                            continue
                        cur.execute(
                            """
                            UPDATE stocks
                            SET overview = %s, dart_corp_code = %s
                            WHERE code = %s
                            """,
                            (overview, corp_code, code),
                        )
                        updated += 1
                        if i % 20 == 0:
                            print(f"[fetch_dart] {i}/{len(codes)} — {updated}건 저장")
                    except Exception as exc:
                        print(f"[WARN] {code}: {exc}", file=sys.stderr)
                        skipped += 1
                    if args.delay > 0 and i < len(codes):
                        time.sleep(args.delay)

        print(f"[fetch_dart] 완료: {updated}건 저장, {skipped}건 스킵")
        return 0
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
