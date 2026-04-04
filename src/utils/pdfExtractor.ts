/**
 * PDF Text Extractor — extracts text from PDF files in the browser
 * using pdfjs-dist. Used for broker letter / financial document upload.
 */

import * as pdfjsLib from 'pdfjs-dist'

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

/**
 * Extract text from a PDF file.
 * Returns the full text content or throws on failure.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  const textParts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ')
    if (pageText.trim()) {
      textParts.push(pageText.trim())
    }
  }

  const fullText = textParts.join('\n\n')

  if (fullText.length < 20) {
    throw new Error('SCAN_PDF')
  }

  return fullText
}
