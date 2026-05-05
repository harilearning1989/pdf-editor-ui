import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export class ExportService {

  async exportToPdf(container: HTMLElement, fileName: string, progressCb?: (p: number) => void) {

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pages = container.children;

    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i] as HTMLElement);
      const imgData = canvas.toDataURL('image/png');

      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (i > 0) pdf.addPage();

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      progressCb?.(Math.round(((i + 1) / pages.length) * 100));
    }

    pdf.save(fileName);
  }
}