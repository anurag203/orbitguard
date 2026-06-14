import { chromium } from "playwright-core";

const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader-webgl", "--ignore-gpu-blocklist"]
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const bad = [];
page.on("response", (r) => {
  if (r.status() >= 400) bad.push(`${r.status()} ${r.url()}`);
});

await page.goto(BASE + "/sky", { waitUntil: "networkidle", timeout: 20000 });
await page.waitForTimeout(8000);

const info = await page.evaluate(() => {
  const out = {};
  // What GL backend are we on?
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
    out.renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "n/a";
    out.glOk = !!gl;
  } catch (e) {
    out.rendererErr = String(e);
  }
  // Inspect the live R3F canvas(es).
  const canvases = [...document.querySelectorAll("canvas")];
  out.canvasCount = canvases.length;
  out.canvases = canvases.map((cv) => {
    const rect = cv.getBoundingClientRect();
    let nonBlack = -1;
    try {
      const tmp = document.createElement("canvas");
      tmp.width = Math.min(cv.width, 200);
      tmp.height = Math.min(cv.height, 200);
      const c2 = tmp.getContext("2d");
      c2.drawImage(cv, 0, 0, tmp.width, tmp.height);
      const data = c2.getImageData(0, 0, tmp.width, tmp.height).data;
      nonBlack = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 8 || data[i + 1] > 8 || data[i + 2] > 8) nonBlack++;
      }
    } catch (e) {
      nonBlack = "err:" + e.message;
    }
    return { w: cv.width, h: cv.height, cssW: Math.round(rect.width), cssH: Math.round(rect.height), nonBlackSampled: nonBlack };
  });
  return out;
});

console.log("4xx responses:", JSON.stringify(bad, null, 2));
console.log("diag:", JSON.stringify(info, null, 2));
await browser.close();
