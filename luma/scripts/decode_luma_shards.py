#!/usr/bin/env python3
"""Decode GitHub-safe base64 transport files into gzip JSONL shards."""
import base64
from pathlib import Path

ROOT = Path(__file__).parent / "dataset" / "luma-vi-500k"
for source in sorted(ROOT.glob("*.jsonl.gz.b64")):
    target = source.with_suffix("")
    target.write_bytes(base64.b64decode(source.read_text(encoding="ascii")))
    print(target)
