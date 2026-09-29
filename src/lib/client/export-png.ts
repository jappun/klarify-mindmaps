"use client";

// Export the mindmap SVG as a PNG: clone the live SVG, reframe it to the visible nodes, add a title
// and legend, embed the Switzer font (SVG-as-image can't see page fonts), rasterize at 2×.

export type LegendItem = { label: string; color: string; style?: "dot" | "halo" | "gray" };
export type Bounds = { x0: number; y0: number; x1: number; y1: number };

const SCALE = 2;
const PAD = 48;
const TITLE_H = 64;
const LEGEND_H = 56;
const FONT = "Switzer, ui-sans-serif, system-ui, sans-serif";
const SVG_NS = "http://www.w3.org/2000/svg";

let fontDataUrl: Promise<string | null> | null = null;
function loadFont() {
  fontDataUrl ??= fetch("/fonts/Switzer-500.woff2")
    .then((r) => (r.ok ? r.blob() : null))
    .then(
      (b) =>
        b &&
        new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(b);
        }),
    )
    .catch(() => null);
  return fontDataUrl;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, text?: string) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (text) node.textContent = text;
  return node;
}

export async function exportMindmapPng({
  svg,
  bounds,
  title,
  legend,
  filename,
}: {
  svg: SVGSVGElement;
  /** World-space bounds of what to include. */
  bounds: Bounds;
  title: string;
  legend: LegendItem[];
  filename: string;
}) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  // Drop the pan/zoom camera so node coordinates are in world space.
  clone.querySelector("[data-camera]")?.removeAttribute("transform");

  const width = Math.max(bounds.x1 - bounds.x0 + PAD * 2, 640);
  const height = bounds.y1 - bounds.y0 + PAD * 2 + TITLE_H + LEGEND_H;
  const cx = (bounds.x0 + bounds.x1) / 2;
  const left = cx - width / 2;
  const top = bounds.y0 - PAD - TITLE_H;

  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("viewBox", `${left} ${top} ${width} ${height}`);
  clone.setAttribute("width", String(width * SCALE));
  clone.setAttribute("height", String(height * SCALE));
  clone.removeAttribute("class");

  const font = await loadFont();
  const style = el("style", {});
  style.textContent =
    (font ? `@font-face{font-family:Switzer;font-weight:500;src:url(${font}) format("woff2");}` : "") +
    `text{font-family:${FONT};}`;
  clone.insertBefore(style, clone.firstChild);
  clone.insertBefore(el("rect", { x: left, y: top, width, height, fill: "#ffffff" }), style.nextSibling);

  // Title
  clone.appendChild(el("text", { x: left + PAD, y: top + 40, "font-size": 20, "font-weight": 500, fill: "#364153" }, title));

  // Legend along the bottom
  let lx = left + PAD;
  const ly = top + height - LEGEND_H / 2;
  for (const item of legend) {
    if (item.style === "halo") {
      clone.appendChild(el("circle", { cx: lx + 6, cy: ly, r: 7, fill: "#ffffff", stroke: item.color, "stroke-width": 3.5 }));
    } else if (item.style === "gray") {
      clone.appendChild(el("circle", { cx: lx + 6, cy: ly, r: 6, fill: item.color, stroke: "#cfcfcf", "stroke-width": 1 }));
    } else {
      clone.appendChild(el("circle", { cx: lx + 6, cy: ly, r: 6, fill: item.color }));
    }
    clone.appendChild(el("text", { x: lx + 18, y: ly + 4.5, "font-size": 13, fill: "#4a5565" }, item.label));
    lx += 18 + item.label.length * 7 + 24;
  }

  const markup = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width * SCALE;
    canvas.height = height * SCALE;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!png) throw new Error("Couldn't render the image.");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(png);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
