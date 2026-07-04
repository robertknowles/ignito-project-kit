import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { useBranding } from '../../contexts/BrandingContext';
import { useClient } from '../../contexts/ClientContext';
import { PortfolioBriefReport } from './PortfolioBriefReport';
import { generateBriefPdf, type PdfProgress } from './reportPdf';
import type { ReportMeta } from './ReportShell';

interface ReportExportRendererProps {
  /** True = render the brief off-screen and generate/download the PDF. */
  active: boolean;
  /** Called once the download has finished (or failed) so the host can reset. */
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

const FOOTER_TEXT =
  'This document is a financial model, not financial, credit or tax advice. Figures are estimates based on the inputs entered, not a forecast or guarantee of future performance.';

const dateStamp = (): string =>
  new Date().toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });

/** UUI-styled progress card, bottom-right, shown while the PDF generates. */
const DownloadProgress: React.FC<{ progress: PdfProgress; clientName: string }> = ({ progress, clientName }) => (
  <div
    style={{
      position: 'fixed',
      right: 24,
      bottom: 24,
      zIndex: 10000,
      width: 320,
      background: '#FFFFFF',
      border: '1px solid #E9EAEB',
      borderRadius: 12,
      boxShadow: '0 12px 24px -6px rgba(16,24,40,0.12), 0 2px 6px rgba(16,24,40,0.06)',
      padding: '14px 16px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    }}
  >
    <div style={{ fontSize: 13, fontWeight: 600, color: '#181D27' }}>
      Downloading Portfolio Brief
    </div>
    <div style={{ fontSize: 11, color: '#717680', marginTop: 2 }}>
      {clientName} · {progress.label}
    </div>
    <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: '#F5F5F6', overflow: 'hidden' }}>
      <div
        style={{
          height: '100%',
          width: `${Math.max(4, Math.min(100, progress.pct))}%`,
          borderRadius: 999,
          background: '#7C5CFC',
          transition: 'width 220ms ease',
        }}
      />
    </div>
  </div>
);

/**
 * ReportExportRenderer — mounts the unified Portfolio Brief into an off-screen
 * root (`#brief-print-root`), waits for fonts and the logo to load, then
 * generates a PDF client-side (html2canvas + jsPDF, see reportPdf.ts) and
 * downloads it directly — no print dialog, no browser-stamped headers. A
 * progress card shows on the page while the file is produced.
 *
 * If PDF generation fails for any reason, falls back to the previous
 * `window.print()` flow (the `@media print` stylesheet in index.css still
 * paginates the brief for that path).
 */
export const ReportExportRenderer: React.FC<ReportExportRendererProps> = ({ active, onDone }) => {
  const { branding } = useBranding();
  const { activeClient } = useClient();
  const rootRef = useRef<HTMLDivElement>(null);
  const runningRef = useRef(false);
  const [progress, setProgress] = useState<PdfProgress>({ pct: 0, label: 'Preparing…' });

  const clientName = activeClient?.name || 'Your Portfolio';

  useEffect(() => {
    if (!active || runningRef.current) return;
    runningRef.current = true;

    let cancelled = false;
    setProgress({ pct: 4, label: 'Preparing…' });

    const finish = () => {
      runningRef.current = false;
      onDone();
    };

    (async () => {
      try {
        // Let the off-screen report mount, then wait for fonts + logo so the
        // capture isn't missing glyphs or the brand mark.
        await new Promise((r) => window.setTimeout(r, 150));
        if (document.fonts?.ready) await document.fonts.ready;
        if (rootRef.current) await imagesReady(rootRef.current);
        if (cancelled || !rootRef.current) return;
        setProgress({ pct: 10, label: 'Preparing your brief…' });

        await generateBriefPdf(rootRef.current, {
          fileName: `Portfolio Brief - ${clientName} - ${dateStamp()}.pdf`,
          footerText: FOOTER_TEXT,
          onProgress: (p) => { if (!cancelled) setProgress(p); },
        });
        if (cancelled) return;
        toast.success('Portfolio Brief downloaded');
        finish();
      } catch (err) {
        console.error('[ReportExportRenderer] PDF generation failed, falling back to print:', err);
        if (cancelled) return;
        // Fallback: the old print-dialog flow.
        const handleAfterPrint = () => {
          window.removeEventListener('afterprint', handleAfterPrint);
          finish();
        };
        try {
          window.addEventListener('afterprint', handleAfterPrint);
          window.print();
        } catch {
          window.removeEventListener('afterprint', handleAfterPrint);
          toast.error('Could not generate the PDF. Please try again.');
          finish();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  const meta: ReportMeta = {
    title: 'Portfolio Brief',
    clientName,
    branding: {
      companyName: branding.companyName,
      logoUrl: branding.logoUrl,
      primaryColor: branding.primaryColor,
    },
  };

  // Portal to <body> so the brief lives beside #root. On screen it is parked
  // off-screen (see `@media screen` rules in index.css) but fully laid out and
  // opaque, so html2canvas captures it faithfully. The print fallback still
  // relies on the `@media print` rules to reveal it in normal flow.
  return createPortal(
    <>
      <div id="brief-print-root" aria-hidden style={{ background: '#ffffff' }}>
        <div ref={rootRef}>
          <PortfolioBriefReport meta={meta} />
        </div>
      </div>
      <DownloadProgress progress={progress} clientName={clientName} />
    </>,
    document.body
  );
};
