# Required backend change

One small addition to the API, so the interface can re-run a calculation and
verify a number in front of the user.

**File:** `app/api/routes/investigations.py`
**Function:** `evidence()`

Find this block:

```python
            "verification_status": f.verification_status,
            "caveats": f.caveats,
            "calculation": {
```

Replace it with:

```python
            "verification_status": f.verification_status,
            "caveats": f.caveats,
            "finding_type": f.finding_type,
            "magnitude": f.magnitude,
            "unit": f.unit,
            # exposed so a client can re-run the exact call and compare
            # checksums, which is what verification means here
            "tool_run_id": str(f.tool_run_id) if f.tool_run_id else None,
            "calculation": {
```

Then restart the API.

No migration, no new package, no other file changes.

## Why

`GET /api/investigations/{id}/evidence` already returned the tool name,
parameters, result and checksum for each finding — but not the id of the run
itself. Without that id the front end can display the calculation but cannot
call `GET /api/tool-runs/{id}/verify` to re-execute it.

That endpoint is the one that demonstrates the project's central claim: a
number is not trusted because the system says so, it is trusted because you can
make the system compute it again and watch the checksums match.

Everything else in the interface works without this change; only the
**Re-run this calculation** button on the Evidence tab stays disabled.
