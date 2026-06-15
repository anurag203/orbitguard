import { afterEach, describe, expect, it, vi } from "vitest";

import type { SkyCatalogEntry } from "../../components/earth";
import { fetchLiveCatalog, MIN_HEALTHY_LIVE, type SkyCatalogResult } from "./liveCatalog";

type MockResponseInit = {
  ok: boolean;
  status: number;
  body: unknown;
};

function makeResponse(init: MockResponseInit): Response {
  const isString = typeof init.body === "string";
  const text = isString ? (init.body as string) : JSON.stringify(init.body);
  return {
    ok: init.ok,
    status: init.status,
    statusText: "",
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(isString ? undefined : init.body)
  } as unknown as Response;
}

function idAt(offset: number): string {
  return String(offset).padStart(5, "0");
}

function tleFor(id: string, name = `OBJECT ${id}`): string {
  return [
    name,
    `1 ${id}U 98067A   26165.50000000  .00010000  00000+0  10000-3 0  9991`,
    `2 ${id}  51.6396  68.7930 0004156  57.6971 302.4420 15.50022909445618`
  ].join("\n");
}

function tleBlob(start: number, count: number, label = "OBJECT"): string {
  return Array.from({ length: count }, (_, index) => {
    const id = idAt(start + index);
    return tleFor(id, `${label} ${id}`);
  }).join("\n");
}

function offlineEntry(id: string): SkyCatalogEntry {
  return {
    id,
    noradId: id,
    name: `BAKED ${id}`,
    line1: `1 ${id}U 98067A   26165.50000000  .00010000  00000+0  10000-3 0  9991`,
    line2: `2 ${id}  51.6396  68.7930 0004156  57.6971 302.4420 15.50022909445618`,
    kind: "satellite",
    source: "offline"
  };
}

function offlineCatalog(ids: string[]): SkyCatalogResult {
  return {
    meta: {
      source: "offline",
      sourceUrl: "/data/catalog-sky.json",
      fetchedAtUtc: new Date(0).toISOString(),
      groups: ["offline-bake"],
      count: ids.length
    },
    objects: ids.map(offlineEntry)
  };
}

function uniqueNorads(objects: SkyCatalogEntry[]): Set<string> {
  return new Set(objects.map((entry) => entry.noradId ?? entry.id));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchLiveCatalog", () => {
  it("backfills the baked catalog when the active group returns the CelesTrak cache guard", async () => {
    const liveId = "25544";
    const bakedIds = [liveId, ...Array.from({ length: 4_999 }, (_, index) => idAt(30_000 + index))];
    const backfill = vi.fn().mockResolvedValue(offlineCatalog(bakedIds));
    const fetchMock = vi.fn(async (url: string) => {
      const request = String(url);
      if (request.includes("FORMAT=json")) return makeResponse({ ok: true, status: 200, body: [] });
      if (request.includes("GROUP=active")) {
        return makeResponse({ ok: true, status: 200, body: "Please use the cached data that you already have." });
      }
      return makeResponse({ ok: true, status: 200, body: tleFor(liveId, "ISS (ZARYA)") });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchLiveCatalog({ groups: ["active", "stations"], backfill });
    const norads = uniqueNorads(result.objects);

    expect(result.objects.length).toBeGreaterThanOrEqual(5_000);
    expect(norads.size).toBe(result.objects.length);
    expect(backfill).toHaveBeenCalledTimes(1);
    expect(result.meta.notes).toMatch(/rate-limited/i);
    expect(result.meta.notes).toContain("active");
    expect(result.meta.notes).toMatch(/Backfilled/i);
  });

  it("does not backfill when the live catalog is already healthy", async () => {
    const backfill = vi.fn().mockResolvedValue(offlineCatalog([idAt(40_000)]));
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const request = String(url);
        if (request.includes("FORMAT=json")) return makeResponse({ ok: true, status: 200, body: [] });
        return makeResponse({ ok: true, status: 200, body: tleBlob(10_000, MIN_HEALTHY_LIVE, "LIVE") });
      })
    );

    const result = await fetchLiveCatalog({ groups: ["active"], backfill });

    expect(result.objects).toHaveLength(MIN_HEALTHY_LIVE);
    expect(backfill).not.toHaveBeenCalled();
    expect(result.meta.notes).not.toMatch(/Backfilled/i);
    expect(result.meta.notes).not.toMatch(/rate-limited/i);
  });
});
