# Luma–Vietnamese 500K Parallel Corpus

This branch contains a deterministic synthetic corpus for bootstrapping Luma translation tooling.

## Contents

- 500,000 unique Luma–Vietnamese sentence pairs.
- 80/10/10 deterministic train, validation and test assignment.
- Grammar metadata for every record.
- Ten gzip-compressed JSONL shards with SHA-256 checksums in `manifest.json`.
- GitHub transport stores each binary shard as `.jsonl.gz.b64`; run the decoder after checkout.

## Generate

```bash
python3 generate_luma_dataset.py
python3 decode_luma_shards.py
```

## Important limitation

The corpus is controlled synthetic data, not 500,000 human-authored translations. It is suitable for parser, pipeline and baseline-model development. Human review and naturally authored text are required before production translation use.

## License

CC BY 4.0.
