/**
 * PDF Text Extractor - extracts text from PDF files in the browser
 * using pdfjs-dist. Used for broker letter / financial document upload.
 */

import * as pdfjsLib from 'pdfjs-dist'

/**
 * Extract text from a PDF file.
 * Returns the full text content or throws on failure.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  // Set worker source lazily - ensures it's set on the same module instance
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString()
  }
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
