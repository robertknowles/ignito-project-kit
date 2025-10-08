import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface PDFGenerationOptions {
  clientName: string;
  onProgress?: (stage: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export const generateClientReport = async (options: PDFGenerationOptions) => {
  const { clientName, onProgress, onComplete, onError } = options;

  try {
    onProgress?.('Preparing document...');
    
    // Create PDF in portrait mode
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    
    // Add header with client name
    pdf.setFontSize(20);
    pdf.setTextColor(17, 24, 39); // #111827
    pdf.text('Investment Strategy Report', margin, 20);
    
    pdf.setFontSize(16);
    pdf.setTextColor(59, 130, 246); // #3b82f6
    pdf.text(clientName, margin, 30);
    
    pdf.setFontSize(10);
    pdf.setTextColor(107, 114, 128); // #6b7280
    pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, 38);
    
    // Draw a line separator
    pdf.setDrawColor(243, 244, 246); // #f3f4f6
    pdf.line(margin, 42, pageWidth - margin, 42);

    let currentY = 50;

    // Capture Timeline
    onProgress?.('Capturing Investment Timeline...');
    const timelineElement = document.getElementById('pdf-timeline');
    if (timelineElement) {
      const timelineCanvas = await html2canvas(timelineElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      const timelineImgData = timelineCanvas.toDataURL('image/png');
      const timelineHeight = (timelineCanvas.height * contentWidth) / timelineCanvas.width;
      
      // Check if we need a new page
      if (currentY + timelineHeight > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
      }
      
      pdf.addImage(timelineImgData, 'PNG', margin, currentY, contentWidth, timelineHeight);
      currentY += timelineHeight + 10;
    }

    // Capture Portfolio Growth Chart
    onProgress?.('Capturing Portfolio Growth Chart...');
    const portfolioElement = document.getElementById('pdf-portfolio');
    if (portfolioElement) {
      // Wait a bit for Recharts to fully render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const portfolioCanvas = await html2canvas(portfolioElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      const portfolioImgData = portfolioCanvas.toDataURL('image/png');
      const portfolioHeight = (portfolioCanvas.height * contentWidth) / portfolioCanvas.width;
      
      // Check if we need a new page
      if (currentY + portfolioHeight > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
      }
      
      pdf.addImage(portfolioImgData, 'PNG', margin, currentY, contentWidth, portfolioHeight);
      currentY += portfolioHeight + 10;
    }

    // Capture Cashflow Chart
    onProgress?.('Capturing Cashflow Chart...');
    const cashflowElement = document.getElementById('pdf-cashflow');
    if (cashflowElement) {
      // Wait a bit for Recharts to fully render
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const cashflowCanvas = await html2canvas(cashflowElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      
      const cashflowImgData = cashflowCanvas.toDataURL('image/png');
      const cashflowHeight = (cashflowCanvas.height * contentWidth) / cashflowCanvas.width;
      
      // Check if we need a new page
      if (currentY + cashflowHeight > pageHeight - margin) {
        pdf.addPage();
        currentY = margin;
      }
      
      pdf.addImage(cashflowImgData, 'PNG', margin, currentY, contentWidth, cashflowHeight);
    }

    // Add footer
    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175); // #9ca3af
      pdf.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Save the PDF
    onProgress?.('Saving PDF...');
    const fileName = `${clientName.replace(/\s+/g, '_')}_Investment_Report.pdf`;
    pdf.save(fileName);
    
    onComplete?.();
  } catch (error) {
    console.error('Error generating PDF:', error);
    onError?.(error as Error);
  }
};

