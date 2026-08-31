# Dataset transport

GitHub connector transport cannot write binary files directly. Each gzip shard is stored as ordered Base64 parts:

`luma-vi-00001.jsonl.gz.b64.part000`, `part001`, ...

After checkout, restore all ten gzip shards and verify their SHA-256 checksums:

```bash
cd luma
python3 scripts/decode_luma_parts.py
```

The restored files appear in `dataset/luma-vi-500k/`.
