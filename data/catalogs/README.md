# Catalog Fixtures

Catalog fixture files are JSON snapshots used by the backend Catalog Data Service.

## Current Fixtures

- `demo-protect-isro.json`: deterministic Round 1 catalog for the Protect ISRO hero flow.

## Schema Notes

Each fixture contains:

- `catalog`: catalog metadata.
- `objects`: normalized satellite/debris objects.
- `watchlists`: named lists of object IDs.

TLE values in demo fixtures are used for parser and flow readiness. They are not operational current ephemerides unless a fixture explicitly says so.
