import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';

(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export class PdfService {

  async loadPdf(data: Uint8Array) {
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;

    const pages = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      pages.push({ page, pageNumber: i });
    }

    return pages;
  }

  async renderPage(page: any, canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    const viewport = page.getViewport({ scale: 1.5 });

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context!,
      viewport
    }).promise;
  }
}