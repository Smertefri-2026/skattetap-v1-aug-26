import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 56;
const INK = rgb(0.06, 0.09, 0.16);
const INK_SOFT = rgb(0.28, 0.33, 0.4);

/** Minimal, shared text-flow helper for the plain, structured PDFs
 * Skattetap generates -- same look for every report type. */
export class PdfWriter {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  bodyFont: PDFFont;
  boldFont: PDFFont;

  private constructor(doc: PDFDocument, bodyFont: PDFFont, boldFont: PDFFont) {
    this.doc = doc;
    this.bodyFont = bodyFont;
    this.boldFont = boldFont;
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  static async create() {
    const doc = await PDFDocument.create();
    const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);
    return new PdfWriter(doc, bodyFont, boldFont);
  }

  private ensureSpace(lines: number, lineHeight: number) {
    if (this.y - lines * lineHeight < MARGIN) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.y = PAGE_HEIGHT - MARGIN;
    }
  }

  private wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  title(text: string) {
    this.ensureSpace(2, 22);
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 20, font: this.boldFont, color: INK });
    this.y -= 30;
  }

  heading(text: string) {
    this.ensureSpace(2, 18);
    this.y -= 6;
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 13, font: this.boldFont, color: INK });
    this.y -= 18;
  }

  paragraph(text: string) {
    const lines = this.wrap(text, this.bodyFont, 10.5, PAGE_WIDTH - MARGIN * 2);
    for (const line of lines) {
      this.ensureSpace(1, 15);
      this.page.drawText(line, { x: MARGIN, y: this.y, size: 10.5, font: this.bodyFont, color: INK_SOFT });
      this.y -= 15;
    }
    this.y -= 6;
  }

  bulletList(items: string[], empty: string) {
    if (items.length === 0) {
      this.paragraph(empty);
      return;
    }
    for (const item of items) {
      const lines = this.wrap(`• ${item}`, this.bodyFont, 10.5, PAGE_WIDTH - MARGIN * 2 - 10);
      for (const [i, line] of lines.entries()) {
        this.ensureSpace(1, 15);
        this.page.drawText(line, {
          x: MARGIN + (i === 0 ? 0 : 10),
          y: this.y,
          size: 10.5,
          font: this.bodyFont,
          color: INK_SOFT,
        });
        this.y -= 15;
      }
    }
    this.y -= 6;
  }

  async bytes() {
    return this.doc.save();
  }
}
