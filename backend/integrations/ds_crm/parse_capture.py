"""Read a Proxyman HAR export and surface the auth + clientes-list requests.

Usage: python parse_capture.py capture.har
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.parse import urlparse


KEYWORDS_AUTH = ("login", "auth", "session", "token", "signin", "credential")
KEYWORDS_CLIENT = ("client", "cliente", "customer", "contact", "lead", "process")


def summarise(entry: dict) -> dict:
    req = entry["request"]
    res = entry["response"]
    url = req["url"]
    parsed = urlparse(url)
    body = req.get("postData", {}).get("text", "")
    res_body = res.get("content", {}).get("text", "") or ""
    return {
        "method": req["method"],
        "host": parsed.netloc,
        "path": parsed.path,
        "query": parsed.query,
        "status": res["status"],
        "req_headers": {h["name"]: h["value"] for h in req.get("headers", [])},
        "req_body_preview": body[:600],
        "res_headers": {h["name"]: h["value"] for h in res.get("headers", [])},
        "res_body_preview": res_body[:1200],
        "res_body_len": len(res_body),
    }


def classify(s: dict) -> list[str]:
    tags = []
    path_lower = (s["path"] + " " + s["query"]).lower()
    body_lower = (s["req_body_preview"] + " " + s["res_body_preview"]).lower()
    if any(k in path_lower or k in body_lower for k in KEYWORDS_AUTH):
        tags.append("AUTH")
    if any(k in path_lower for k in KEYWORDS_CLIENT):
        tags.append("CLIENT")
    if s["method"] in ("POST", "PUT", "PATCH"):
        tags.append("WRITE")
    return tags


def main(har_path: str) -> None:
    har = json.loads(Path(har_path).read_text())
    entries = har["log"]["entries"]
    print(f"# {len(entries)} entries\n")

    grouped = {"AUTH": [], "CLIENT": [], "OTHER": []}
    for e in entries:
        s = summarise(e)
        tags = classify(s)
        if "AUTH" in tags:
            grouped["AUTH"].append((s, tags))
        elif "CLIENT" in tags:
            grouped["CLIENT"].append((s, tags))
        else:
            grouped["OTHER"].append((s, tags))

    for label in ("AUTH", "CLIENT"):
        print(f"\n{'=' * 80}\n# {label} candidates ({len(grouped[label])})\n{'=' * 80}")
        for s, tags in grouped[label]:
            print(f"\n[{','.join(tags)}] {s['method']} {s['host']}{s['path']}"
                  f"{('?' + s['query']) if s['query'] else ''}  -> {s['status']}")
            if s["req_body_preview"]:
                print(f"  req body: {s['req_body_preview']}")
            if s["res_body_preview"]:
                print(f"  res body: {s['res_body_preview'][:400]}")
            auth_hdr = s["req_headers"].get("Authorization") or s["req_headers"].get("authorization")
            cookie_hdr = s["req_headers"].get("Cookie") or s["req_headers"].get("cookie")
            if auth_hdr:
                print(f"  Authorization: {auth_hdr[:80]}...")
            if cookie_hdr:
                print(f"  Cookie: {cookie_hdr[:120]}...")

    print(f"\n# OTHER hosts seen: {sorted({s['host'] for s, _ in grouped['OTHER']})}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: python parse_capture.py <capture.har>")
        sys.exit(1)
    main(sys.argv[1])
