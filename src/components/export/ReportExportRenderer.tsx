import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useBranding } from '../../contexts/BrandingContext';
import { useClient } from '../../contexts/ClientContext';
import { PortfolioBriefReport } from './PortfolioBriefReport';
import type { ReportMeta } from './ReportShell';

interface ReportExportRendererProps {
  /** True = render the brief into the print root and open the print dialog. */
  active: boolean;
  /** Called once the print dialog closes so the host can reset. */
  onDone: () => void;
}

/** Wait for any <img> inside the node to finish loading (the firm logo). */
function imagesReady(node: HTMLElement): Promise<void> {
  const imgs = Array.from(node.querySelectorAll('img'));
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            })
    )
  ).then(() => undefined);
}

/**
 * ReportExportRenderer — mounts the unified Portfolio Brief into an on-screen
 * print root (`#brief-print-root`), waits for fonts and the logo to load, then
 * calls `window.print()`. The `@media print` stylesheet in index.css scopes the
 * print output to this root and drives pagination via CSS fragmentation, so the
 * brief flows across A4 pages with full colour and vector-crisp SVG charts.
 *
 * On screen the print root is visually inert (opacity 0, behind everything);
 * the browser's print engine reveals it only while printing.
 */
export const ReportExportRenderer: React.FC<ReportExportRendererProps> = ({ active, onDone }) => {
  const { branding } = useBranding();
  const { activeClient } = useClient();
  const rootRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!active || runningRef.current) return;
    runningRef.current = true;

    const toastId = toast.loading('Opening print dialog…');
    let cancelled = false;

    const handleAfterPrint = () => {
      window.removeEventListener('afterprint', handleAfterPrint);
      toast.dismiss(toastId);
      runningRef.current = false;
      onDone();
    };

    (async () => {
      try {
        // Let the off-screen report mount, then wait for fonts + logo so the
        // print capture isn't missing glyphs or the brand mark.
        await new Promise((r) => window.setTimeout(r, 150));
        if (document.fonts?.ready) await document.fonts.ready;
        if (rootRef.current) await imagesReady(rootRef.current);
        if (cancelled) return;

        window.addEventListener('afterprint', handleAfterPrint);
        window.print();
      } catch (err) {
        toast.error('Could not open the print dialog. Please try again.', { id: toastId });
        console.error('[ReportExportRenderer] print failed:', err);
        window.removeEventListener('afterprint', handleAfterPrint);
        runningRef.current = false;
        onDone();
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  const meta: ReportMeta = {
    title: 'Portfolio Brief',
    clientName: activeClient?.name || 'Your Portfolio',
    branding: {
      companyName: branding.companyName,
      logoUrl: branding.logoUrl,
      primaryColor: branding.primaryColor,
    },
  };

  // Portal to <body> so the print root is a direct sibling of #root. In print,
  // index.css hides #root and lets this element flow in normal document flow —
  // essential because absolutely/fixed-positioned elements do NOT fragment
  // across printed pages (they stay on page 1 and clip). On screen the print
  // root is parked off-screen (see the `@media screen` rules in index.css).
  return createPortal(
    <div id="brief-print-root" aria-hidden style={{ background: '#ffffff' }}>
      <div ref={rootRef}>
        <PortfolioBriefReport meta={meta} />
      </div>
    </div>,
    document.body
  );
};
