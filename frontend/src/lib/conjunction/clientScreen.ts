import type { SkyCatalogEntry } from "../../components/earth";
import type { CatalogObject } from "../../types";

export type LiveApproach = {
  objectId: string;
  name: string;
  tcaUtc: string;
  missDistanceM: number;
  relativeVelocityKmS: number;
  pc: number;
};

type ScreenEntry = {
  id: string;
  name: string;
  line1: string;
  line2: string;
};

function primaryEntry(catalog: CatalogObject): ScreenEntry | null {
  if (!catalog.tle?.line1 || !catalog.tle.line2) return null;
  return {
    id: catalog.norad_id ?? catalog.object_id,
    name: catalog.name,
    line1: catalog.tle.line1,
    line2: catalog.tle.line2
  };
}

function candidateEntry(entry: SkyCatalogEntry): ScreenEntry | null {
  if (!entry.line1 || !entry.line2) return null;
  return {
    id: entry.noradId ?? entry.id,
    name: entry.name,
    line1: entry.line1,
    line2: entry.line2
  };
}

export function screenLiveApproaches(
  primary: CatalogObject,
  catalog: SkyCatalogEntry[],
  options: { windowHours?: number; stepMinutes?: number; covarianceM?: number } = {}
): Promise<LiveApproach[]> {
  const selected = primaryEntry(primary);
  if (!selected || typeof Worker === "undefined") return Promise.resolve([]);

  const requestId = Date.now();
  const candidates = catalog
    .map(candidateEntry)
    .filter((entry): entry is ScreenEntry => Boolean(entry));

  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./clientScreen.worker.ts", import.meta.url), { type: "module" });
    const timer = window.setTimeout(() => {
      worker.terminate();
      resolve([]);
    }, 20_000);

    worker.onmessage = (event: MessageEvent<{ requestId: number; approaches: LiveApproach[] }>) => {
      if (event.data.requestId !== requestId) return;
      window.clearTimeout(timer);
      worker.terminate();
      resolve(event.data.approaches);
    };
    worker.onerror = (event) => {
      window.clearTimeout(timer);
      worker.terminate();
      reject(event.error ?? new Error(event.message));
    };
    worker.postMessage({
      requestId,
      primary: selected,
      candidates,
      windowHours: options.windowHours ?? 24,
      stepMinutes: options.stepMinutes ?? 30,
      covarianceM: options.covarianceM ?? 1000
    });
  });
}
