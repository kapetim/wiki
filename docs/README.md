# wiki docs

Documentation for the **wiki** repository. The overview lives in the root
[`README.md`](../README.md).

## Concerns

This repo carries the shared five concerns — each a `scripts/<name>.sh` run
inside a `docker/<name>.Dockerfile`, driven by the profile hub
(`kapetim/kapetim`):

| Concern | Script | Dockerfile |
| --- | --- | --- |
| CI | `scripts/ci.sh` | `docker/ci.Dockerfile` |
| Release | `scripts/release.sh` | `docker/release.Dockerfile` |
| Pages | `scripts/pages.sh` | `docker/pages.Dockerfile` |
| Data ingest | `scripts/data-ingestor.sh` | `docker/data-ingestor.Dockerfile` |
| Data process | `scripts/data-processor.sh` | `docker/data-processor.Dockerfile` |
