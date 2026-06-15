import * as THREE from "three";

import { getSatrec, propagateToScene } from "./propagate";
import type { SkyCatalogEntry } from "./types";

type InitMessage = {
  type: "init";
  entries: SkyCatalogEntry[];
};

type TickMessage = {
  type: "tick";
  requestId: number;
  epochMs: number;
};

type WorkerMessage = InitMessage | TickMessage;

const PARKED = 9999;
const _pos = new THREE.Vector3();
let satrecs: ReturnType<typeof getSatrec>[] = [];
const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};

function writePositions(date: Date): Float32Array {
  const positions = new Float32Array(satrecs.length * 3);
  for (let i = 0; i < satrecs.length; i += 1) {
    const satrec = satrecs[i];
    if (satrec && propagateToScene(satrec, date, _pos)) {
      positions[i * 3] = _pos.x;
      positions[i * 3 + 1] = _pos.y;
      positions[i * 3 + 2] = _pos.z;
    } else {
      positions[i * 3] = PARKED;
      positions[i * 3 + 1] = PARKED;
      positions[i * 3 + 2] = PARKED;
    }
  }
  return positions;
}

ctx.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  if (message.type === "init") {
    satrecs = message.entries.map((entry) => getSatrec(entry));
    ctx.postMessage({ type: "ready", count: satrecs.length });
    return;
  }

  if (message.type === "tick") {
    const positions = writePositions(new Date(message.epochMs));
    ctx.postMessage(
      { type: "positions", requestId: message.requestId, buffer: positions.buffer },
      [positions.buffer]
    );
  }
};
