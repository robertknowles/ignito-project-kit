/**
 * reportPdf — turns the mounted Portfolio Brief DOM into a downloaded PDF.
 *
 * Replaces the old `window.print()` flow (which forced users through the
 * browser's print dialog and stamped its own date/URL headers on the pages).
 *
 * Pagination strategy — cut-offs are structurally impossible:
 *  1. The brief flow is CLONED into an off-screen stage (so React's tree is
 *     never mutated) at the exact same width, where it lays out identically.
 *  2. Every direct child of `.brief-flow` is an atomic block. Blocks are
 *     greedily packed into A4-content-height page groups; a `.brief-break`
 *     block always starts a new page. More purchases → more/taller blocks →
 *     the packer simply starts a new page earlier. Blocks are never split.
 *  3. Each group is physically moved into its own fixed-height "page" div,
 *     and every page div is captured SEPARATELY with html-to-image (the
 *     browser itself rasterises, so text/SVG are pixel-faithful). Because a
 *     page's pixels come from its own container — not from slicing one tall
 *     canvas at coordinates measured elsewhere — content can never straddle
 *     or clip at a page boundary, regardless of document length.
 *  4. jsPDF composes the pages and draws the disclaimer footer + "Page X of
 *     Y" vectorially in the bottom margin.
 *
 * The only theoretical exception: a SINGLE block taller than one full page
 * (~35+ rows in one table) would be bottom-truncated by its page container.
 */

export interface PdfProgress {
  /** 0–100 */
  pct: number;
  label: string;
}

interface GenerateOptions {
  fileName: string;
  footerText: string;
  onProgress?: (p: PdfProgress) => void;
}

// A4 geometry (mm)
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_TOP = 13;
const MARGIN_BOTTOM = 16;
const CONTENT_H = PAGE_H - MARGIN_TOP - MARGIN_BOTTOM;

// Raster scale for page capture. The flow is ~794 CSS px wide, so scale 3
// prints at ~290 DPI (scale 2 was ~190 DPI — visibly soft text on paper).
// Transient canvas cost at 3 is ~29MB per page; fine.
const RASTER_SCALE = 3;

const fetchWithTimeout = async (url: string, ms: number): Promise<Response> => {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`${res.status} fetching ${url}`);
    return res;
  } finally {
    window.clearTimeout(timer);
  }
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });

// Inter, self-embedded as data-URI @font-face CSS. We hand this to
// html-to-image instead of letting it scan document.styleSheets — its own
// font discovery walks every stylesheet on the page (Tailwind, PostHog's
// injected recorder styles, cross-origin Google Fonts) and can hang without
// a timeout. Every fetch here is timeout-guarded; on any failure we return
// '' which tells html-to-image to skip font embedding entirely (system-font
// fallback in the capture — degraded but never stuck).
const INTER_CSS_URL =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
let cachedFontCss: string | null = null;

async function buildFontEmbedCss(): Promise<string> {
  if (cachedFontCss !== null) return cachedFontCss;
  try {
    const css = await (await fetchWithTimeout(INTER_CSS_URL, 6000)).text();
    // Keep only the latin-subset @font-face blocks — the brief is English-only
    // and the full unicode-range set balloons the embedded CSS (and with it
    // the per-page SVG) by ~8×.
    const latinBlocks = css
      .split('@font-face')
      .slice(1)
      .filter((b) => b.includes('U+0000-00FF'))
      .map((b) => `@font-face${b.slice(0, b.indexOf('}') + 1)}`);
    const slim = latinBlocks.join('\n');
    const urls = [...new Set([...slim.matchAll(/url\((https:[^)]+)\)/g)].map((m) => m[1]))];
    const dataUrls = new Map<string, string>();
    await Promise.all(
      urls.map(async (u) => {
        const blob = await (await fetchWithTimeout(u, 8000)).blob();
        dataUrls.set(u, await blobToDataUrl(blob));
      })
    );
    cachedFontCss = slim.replace(/url\((https:[^)]+)\)/g, (_, u) => `url(${dataUrls.get(u) ?? u})`);
  } catch {
    cachedFontCss = '';
  }
  return cachedFontCss;
}

/**
 * Rasterise an html-to-image SVG data URL onto a canvas.
 *
 * The SVG must be loaded via a data: URL — Chrome taints the canvas when a
 * foreignObject SVG is drawn from a blob: URL, which would block toDataURL.
 * We re-encode html-to-image's URI-escaped payload as base64 (smaller and
 * cheaper for Chrome to parse than a percent-encoded URL). The historical
 * hang here came from the full Google-Fonts unicode-range set (28 embedded
 * faces); buildFontEmbedCss's latin-only slimming keeps the payload sane.
 */
async function svgUrlToCanvas(
  svgDataUrl: string,
  wPx: number,
  hPx: number,
  scale: number
): Promise<HTMLCanvasElement> {
  const svgText = decodeURIComponent(svgDataUrl.slice(svgDataUrl.indexOf(',') + 1));
  const bytes = new TextEncoder().encode(svgText);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('page SVG failed to load'));
    img.src = `data:image/svg+xml;base64,${btoa(bin)}`;
  });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(wPx * scale);
  canvas.height = Math.round(hPx * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const withTimeout = <T,>(p: Promise<T>, ms: number, what: string): Promise<T> =>
  Promise.race([
    p,
    new Promise<never>((_, reject) =>
      window.setTimeout(() => reject(new Error(`${what} timed out after ${ms}ms`)), ms)
    ),
  ]);

/** Greedily group the flow's direct children into page-sized batches. */
function groupIntoPages(flow: HTMLElement, pageHpx: number): HTMLElement[][] {
  const flowTop = flow.getBoundingClientRect().top;
  const groups: HTMLElement[][] = [];
  let groupTop = 0;
  let hasGroup = false;

  for (const child of Array.from(flow.children)) {
    const block = child as HTMLElement;
    const rect = block.getBoundingClientRect();
    if (rect.height === 0) continue;
    const top = rect.top - flowTop;
    const bottom = top + rect.height;
    const forceBreak = block.classList.contains('brief-break');

    if (!hasGroup || forceBreak || bottom - groupTop > pageHpx) {
      groups.push([block]);
      groupTop = top;
      hasGroup = true;
    } else {
      groups[groups.length - 1].push(block);
    }
  }
  return groups;
}

export async function generateBriefPdf(root: HTMLElement, opts: GenerateOptions): Promise<void> {
  const progress = (pct: number, label: string) => opts.onProgress?.({ pct, label });

  progress(12, 'Preparing your brief…');
  const [{ jsPDF }, htmlToImage] = await Promise.all([
    import('jspdf'),
    import('html-to-image'),
  ]);

  const flow = root.querySelector<HTMLElement>('.brief-flow');
  if (!flow) throw new Error('brief flow root not found');

  const flowWidthPx = flow.getBoundingClientRect().width;
  const pxPerMm = flowWidthPx / PAGE_W;
  const pageHpx = Math.floor(CONTENT_H * pxPerMm);
  const sidePad = getComputedStyle(flow).paddingLeft;

  // Clone the flow into an off-screen stage so we can rearrange blocks into
  // page containers without touching React-owned DOM.
  const clone = flow.cloneNode(true) as HTMLElement;
  const stage = document.createElement('div');
  stage.style.cssText =
    `position:absolute; left:-10000px; top:0; width:${flowWidthPx}px; ` +
    'background:#fff; z-index:-1; pointer-events:none;';
  stage.appendChild(clone);
  document.body.appendChild(stage);

  try {
    // Group blocks by their laid-out positions in the clone (identical widths
    // → identical layout to the live flow).
    const groups = groupIntoPages(clone, pageHpx);

    // Rebuild the clone as a stack of fixed-height page containers. The
    // clone keeps its inherited font/colour styles; each page div takes over
    // the side padding so the captured image spans the full paper width.
    const pageDivs: HTMLElement[] = groups.map((blocks) => {
      const page = document.createElement('div');
      page.style.cssText =
        `box-sizing:border-box; width:${flowWidthPx}px; height:${pageHpx}px; ` +
        `padding:0 ${sidePad}; background:#fff; overflow:hidden; position:relative;`;
      for (const b of blocks) page.appendChild(b);
      return page;
    });
    clone.style.padding = '0';
    clone.replaceChildren(...pageDivs);

    // Embed webfonts once (timeout-guarded) and reuse across page captures.
    progress(20, 'Rendering pages…');
    const fontCss = await buildFontEmbedCss();

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const total = pageDivs.length;

    for (let i = 0; i < total; i++) {
      const svgUrl = await withTimeout(
        htmlToImage.toSvg(pageDivs[i], {
          backgroundColor: '#ffffff',
          fontEmbedCSS: fontCss,
        }),
        20000,
        `page ${i + 1} serialize`
      );
      const canvas = await withTimeout(
        svgUrlToCanvas(svgUrl, flowWidthPx, pageHpx, RASTER_SCALE),
        20000,
        `page ${i + 1} rasterize`
      );

      if (i > 0) pdf.addPage();
      // PNG, not JPEG: the pages are flat-colour text/tables on white, where
      // JPEG's chroma subsampling fuzzes glyph edges. The 'SLOW' flag matters:
      // jsPDF stores PNG pixels UNCOMPRESSED by default (~21MB/page at this
      // scale); flate compression brings mostly-white pages back to sane size.
      pdf.addImage(
        canvas.toDataURL('image/png'), 'PNG',
        0, MARGIN_TOP, PAGE_W, CONTENT_H,
        undefined, 'SLOW'
      );

      // Footer: disclaimer centred in the bottom margin, page number at right.
      pdf.setFontSize(6.5);
      pdf.setTextColor(164, 167, 174); // FAINT
      pdf.text(opts.footerText, PAGE_W / 2, PAGE_H - 8, { align: 'center', maxWidth: PAGE_W - 60 });
      pdf.text(`Page ${i + 1} of ${total}`, PAGE_W - 12, PAGE_H - 8, { align: 'right' });

      progress(20 + Math.round(((i + 1) / total) * 72), `Rendering page ${i + 1} of ${total}…`);
    }

    progress(96, 'Saving…');
    pdf.save(opts.fileName);
    progress(100, 'Downloaded');
  } finally {
    stage.remove();
  }
}
