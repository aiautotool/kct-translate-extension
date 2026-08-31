#!/usr/bin/env python3
"""Join Base64 transport parts and restore verified gzip JSONL shards."""
import base64, hashlib, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "dataset" / "luma-vi-500k"
manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
for item in manifest["shards"]:
    name = item["file"]
    parts = sorted(ROOT.glob(name + ".b64.part*"))
    if not parts:
        raise SystemExit(f"Missing transport parts for {name}")
    encoded = "".join(p.read_text(encoding="ascii").strip() for p in parts)
    data = base64.b64decode(encoded)
    digest = hashlib.sha256(data).hexdigest()
    if digest != item["sha256"]:
        raise SystemExit(f"Checksum mismatch for {name}: {digest}")
    (ROOT / name).write_bytes(data)
    print(f"restored {name} ({len(data)} bytes, sha256={digest})")
