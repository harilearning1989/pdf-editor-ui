import { Component, ElementRef, ViewChild } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument, rgb } from 'pdf-lib';
import { FontConfig, FONTS } from '../constants/pdf-constants';

// ✅ Set worker
(pdfjsLib as any).GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

@Component({
  selector: 'app-viewer',
  templateUrl: './viewer.component.html',
  styleUrls: ['./viewer.component.scss']
})
export class ViewerComponent {

  @ViewChild('pageContainer', { static: true }) pageContainer!: ElementRef;

  pages: any[] = [];
  selectedPageIndex: number | null = null;
  isTextMode = false;
  selectedTextElement: HTMLElement | null = null;
  originalFileName: string = 'edited';
  isPdfLoaded = false;
  loadedFonts = new Set<string>();
  fonts: FontConfig[] = FONTS;

  pageElements: HTMLElement[] = [];
  fontSizes = Array.from({ length: 17 }, (_, i) => i + 8); // 8 → 24
  //fontSizes.push(24);
  selectedFontSize: string = '14px';

  isDownloading = false;
  progress = 0;
  totalPages = 0;

  systemFonts: any[] = [];
  googleFonts: any[] = [];

  currentFont: string = 'Arial';

  originalPdfBytes: Uint8Array | null = null;

  constructor() { }

  ngOnInit() {
    this.systemFonts = this.fonts.filter(f => f.type === 'system');
    this.googleFonts = this.fonts.filter(f => f.type === 'google');
  }

  enableTextEdit(textDiv: HTMLElement) {
    const currentText = textDiv.innerText;

    const parent = textDiv.parentElement;
    if (!parent) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentText;

    // copy styles
    input.style.position = 'absolute';
    input.style.left = textDiv.style.left;
    input.style.top = textDiv.style.top;

    input.style.fontSize = textDiv.style.fontSize;
    input.style.fontFamily = textDiv.style.fontFamily;
    input.style.color = textDiv.style.color;
    input.style.fontWeight = textDiv.style.fontWeight;
    input.style.fontStyle = textDiv.style.fontStyle;

    input.style.border = '1px solid black';
    input.style.padding = '2px';

    // replace text with input
    parent.replaceChild(input, textDiv);

    input.focus();

    // 🔥 Save on blur
    input.onblur = () => {
      const newValue = input.value.trim();

      parent.removeChild(input);

      if (!newValue) return;

      const newTextDiv = this.createTextElement(
        newValue,
        parseFloat(input.style.left),
        parseFloat(input.style.top),
        parent
      );

      // 🔥 reapply styles
      newTextDiv.style.fontSize = input.style.fontSize;
      newTextDiv.style.fontFamily = input.style.fontFamily;
      newTextDiv.style.color = input.style.color;
      newTextDiv.style.fontWeight = input.style.fontWeight;
      newTextDiv.style.fontStyle = input.style.fontStyle;

      parent.appendChild(newTextDiv);

      this.makeDraggable(newTextDiv);
    };

    // 🔥 Save on Enter key
    input.onkeydown = (e: any) => {
      if (e.key === 'Enter') {
        input.blur();
      }
    };
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // 🔥 Validate file type
    if (file.type !== 'application/pdf') {
      alert('❌ Only PDF files are allowed');
      event.target.value = ''; // reset input
      this.isPdfLoaded = false;
      return;
    }
    // ✅ Valid PDF
    this.isPdfLoaded = true;

    this.originalFileName = file.name
      .replace('.pdf', '')
      .replace(/\s+/g, '_');

    const fileReader = new FileReader();

    fileReader.onload = async () => {
      const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
      await this.loadPdf(typedArray);
    };
    fileReader.readAsArrayBuffer(file);
  }

  // 📄 Load PDF
  async loadPdf(data: any) {
    try {
      this.pages = [];
      this.selectedPageIndex = null;

      this.pageContainer.nativeElement.innerHTML = '';

      const loadingTask = pdfjsLib.getDocument({ data });
      const pdf = await loadingTask.promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        this.pages.push({ page, pageNumber: i });
      }

      setTimeout(() => this.renderPages(), 0);

    } catch (error) {
      console.error('Error loading PDF:', error);
    }
  }

  // 🎨 Render pages + enable text
  renderPages() {
    const container = this.pageContainer.nativeElement;

    // clear previous
    container.innerHTML = '';
    this.pageElements = [];

    this.pages.forEach((p, index) => {

      // 🧱 1. Create wrapper (each page container)
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.margin = '10px';

      // store reference for scrolling
      this.pageElements[index] = wrapper;

      // 🧱 2. Create canvas
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;

      const viewport = p.page.getViewport({ scale: 1.5 });

      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.classList.add('pdf-page');

      // 🖱️ Page selection click
      canvas.onclick = () => this.selectPage(index);

      // 🧱 3. Add canvas to wrapper
      wrapper.appendChild(canvas);

      // 🧱 4. Add wrapper to DOM
      container.appendChild(wrapper);

      // 🧱 5. Enable text feature
      this.enableTextOnPage(wrapper);

      // 🧱 6. Render PDF page
      p.page.render({
        canvasContext: context,
        viewport: viewport
      } as any);
    });
  }

  enableTextOnPage(wrapper: HTMLElement) {
    wrapper.onclick = (e: any) => {

      if (!this.isTextMode) return;

      const rect = wrapper.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const input = document.createElement('input');
      input.type = 'text';

      input.style.position = 'absolute';
      input.style.left = x + 'px';
      input.style.top = y + 'px';
      input.style.fontSize = '16px';
      input.style.border = '1px solid black';
      input.style.padding = '2px';

      wrapper.appendChild(input);
      input.focus();

      input.onblur = () => {
        const value = input.value.trim();
        wrapper.removeChild(input);

        if (!value) return;

        const textDiv = this.createTextElement(value, x, y, wrapper);

        wrapper.appendChild(textDiv);

        this.makeDraggable(textDiv);

        this.isTextMode = false;
      };
    };
  }

  createTextElement(
    value: string,
    x: number,
    y: number,
    wrapper: HTMLElement
  ): HTMLElement {

    const textDiv = document.createElement('div');
    textDiv.innerText = value;

    // 📍 Position
    textDiv.style.position = 'absolute';
    textDiv.style.left = x + 'px';
    textDiv.style.top = y + 'px';

    // 🎨 Default styles
    textDiv.style.fontSize = '16px';
    textDiv.style.fontFamily = this.currentFont || 'Arial';
    textDiv.style.color = 'black';
    textDiv.style.fontWeight = 'normal';
    textDiv.style.fontStyle = 'normal';

    // UX
    textDiv.style.cursor = 'move';
    textDiv.style.userSelect = 'none';
    textDiv.style.padding = '2px';
    textDiv.style.minWidth = '20px';

    // 🖱️ SELECT TEXT
    textDiv.onclick = (event: any) => {
      event.stopPropagation();
      this.selectText(textDiv);
    };

    // ✏️ DOUBLE CLICK TO EDIT
    textDiv.ondblclick = (event: any) => {
      event.stopPropagation();
      this.enableTextEdit(textDiv);
    };

    return textDiv;
  }

  // 🎯 Page selection
  selectPage(index: number) {
    this.selectedPageIndex = index;

    const canvases = document.querySelectorAll('.pdf-page');

    canvases.forEach((canvas, i) => {
      const el = canvas as HTMLElement;

      el.style.border = i === index
        ? '3px solid blue'
        : '1px solid #ccc';
    });

    // 🔥 SCROLL TO PAGE
    const pageEl = this.pageElements[index];

    if (pageEl) {
      pageEl.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }

    console.log('Selected page:', index + 1);
  }

  // ✏️ Enable text mode
  enableTextMode() {
    this.isTextMode = true;
    console.log('Text mode enabled');
  }

  // 🖱️ Drag text
  makeDraggable(element: HTMLElement) {
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    element.addEventListener('mousedown', (e) => {
      e.preventDefault();

      isDragging = true;

      // mouse position
      startX = e.clientX;
      startY = e.clientY;

      // current element position
      initialLeft = element.offsetLeft;
      initialTop = element.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      element.style.left = initialLeft + dx + 'px';
      element.style.top = initialTop + dy + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
    });
  }

  selectText(element: HTMLElement) {
    // remove highlight from previous
    if (this.selectedTextElement) {
      this.selectedTextElement.style.outline = 'none';
    }

    this.selectedTextElement = element;

    // highlight selected text
    element.style.outline = '2px dashed blue';
  }

  deleteSelectedText() {
    if (!this.selectedTextElement) return;

    const parent = this.selectedTextElement.parentElement;
    parent?.removeChild(this.selectedTextElement);

    this.selectedTextElement = null;
  }

  toggleBold() {
    if (!this.selectedTextElement) return;

    const currentWeight = this.selectedTextElement.style.fontWeight;

    this.selectedTextElement.style.fontWeight =
      currentWeight === 'bold' ? 'normal' : 'bold';
  }

  changeFontSize(event: any) {
    if (!this.selectedTextElement) return;

    const size = event.target.value;
    this.selectedTextElement.style.fontSize = size;
  }

  changeColor(event: any) {
    if (!this.selectedTextElement) return;

    const color = event.target.value;
    this.selectedTextElement.style.color = color;
  }

  async downloadPdf() {
    this.isDownloading = true;

    const pdf = new jsPDF('p', 'mm', 'a4');

    const container = this.pageContainer.nativeElement;
    const pages = container.children;

    this.totalPages = pages.length;
    this.progress = 0;

    try {
      for (let i = 0; i < pages.length; i++) {
        const pageElement = pages[i];

        const canvas = await html2canvas(pageElement);
        const imgData = canvas.toDataURL('image/png');

        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

        // ✅ update progress
        this.progress = Math.round(((i + 1) / this.totalPages) * 100);
      }

      const timestamp = this.getTimestamp();
      const fileName = `${this.originalFileName}_${timestamp}.pdf`;

      pdf.save(fileName);

    } finally {
      this.isDownloading = false;
    }
  }

  getTimestamp(): string {
    const now = new Date();

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
  }

  toggleItalic() {
    if (!this.selectedTextElement) return;

    const current = this.selectedTextElement.style.fontStyle;
    this.selectedTextElement.style.fontStyle =
      current === 'italic' ? 'normal' : 'italic';
  }



  loadFont(fontName: string) {
    if (this.loadedFonts.has(fontName)) return;

    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}&display=swap`;
    link.rel = 'stylesheet';

    document.head.appendChild(link);

    this.loadedFonts.add(fontName);

    console.log(`Font loaded: ${fontName}`);
  }
  changeFontFamily(event: any) {
    const fontName = event.target.value;

    // 🔥 store selected font (for new text)
    this.currentFont = fontName;

    // 🔍 find font config
    const font = this.fonts.find(f => f.name === fontName);

    // 🔥 load dynamically if needed
    if (font?.type === 'google') {
      this.loadFont(fontName);
    }

    // 🎯 apply to selected text (if exists)
    if (this.selectedTextElement) {
      this.selectedTextElement.style.fontFamily = `'${fontName}', sans-serif`;
    }
  }

  hexToRgb(hex: string) {
    const r = parseInt(hex.substring(1, 3), 16) / 255;
    const g = parseInt(hex.substring(3, 5), 16) / 255;
    const b = parseInt(hex.substring(5, 7), 16) / 255;

    return rgb(r, g, b);
  }

}