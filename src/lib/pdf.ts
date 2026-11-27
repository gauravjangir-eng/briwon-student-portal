import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";

const DARK = rgb(0x24 / 255, 0x48 / 255, 0x79 / 255);
const LIGHT = rgb(0x4c / 255, 0x89 / 255, 0xc8 / 255);
const INK = rgb(0.06, 0.11, 0.18);
const MUTED = rgb(0.36, 0.42, 0.5);

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = INK) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (page.getWidth() - w) / 2, y, size, font, color });
}

/** pdf-lib standard fonts are WinAnsi only: strip characters they cannot encode. */
const safe = (s: string) => s.normalize("NFKD").replace(/[^\x20-\x7E -ÿ]/g, "");

export async function certificatePdf(c: {
  academy: string; studentName: string; studentCode: string; courseName: string; completionDate: string;
  certificateNumber: string; grade: string; signatoryName: string; signatoryTitle: string; verifyUrl: string;
}) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Certificate ${c.certificateNumber}`);
  doc.setAuthor(c.academy);
  const page = doc.addPage([842, 595]);
  const serif = await doc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const sansBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: DARK, borderWidth: 3 });
  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: LIGHT, borderWidth: 1 });
  page.drawRectangle({ x: 28, y: height - 110, width: width - 56, height: 82, color: DARK });
  centered(page, safe(c.academy).toUpperCase(), height - 70, sansBold, 22, rgb(1, 1, 1));
  centered(page, "EXCELLENCE IN PRACTICAL LEARNING", height - 92, sans, 9, rgb(0.8, 0.88, 0.97));

  centered(page, "Certificate of Completion", height - 165, serif, 34, DARK);
  centered(page, "This is to certify that", height - 200, serifItalic, 14, MUTED);
  centered(page, safe(c.studentName), height - 245, serif, 36, INK);
  page.drawLine({ start: { x: width / 2 - 200, y: height - 255 }, end: { x: width / 2 + 200, y: height - 255 }, thickness: 1, color: LIGHT });
  centered(page, `Student ID ${c.studentCode}`, height - 272, sans, 10, MUTED);
  centered(page, "has successfully completed the course", height - 300, serifItalic, 14, MUTED);
  centered(page, safe(c.courseName), height - 335, serif, 24, DARK);
  centered(page, `with the grade of ${c.grade}`, height - 362, sansBold, 13, LIGHT);

  // Footer: details, QR, signature
  const fy = 95;
  page.drawText("Completion date", { x: 70, y: fy + 30, size: 9, font: sans, color: MUTED });
  page.drawText(c.completionDate, { x: 70, y: fy + 14, size: 12, font: sansBold, color: INK });
  page.drawText("Certificate no.", { x: 70, y: fy - 8, size: 9, font: sans, color: MUTED });
  page.drawText(c.certificateNumber, { x: 70, y: fy - 24, size: 12, font: sansBold, color: INK });

  const qr = await QRCode.toBuffer(c.verifyUrl, { margin: 1, width: 240, color: { dark: "#244879", light: "#ffffff" } });
  const qrImg = await doc.embedPng(qr);
  page.drawImage(qrImg, { x: width / 2 - 45, y: fy - 40, width: 90, height: 90 });
  centered(page, "Scan to verify", fy - 54, sans, 8, MUTED);

  page.drawLine({ start: { x: width - 270, y: fy + 10 }, end: { x: width - 70, y: fy + 10 }, thickness: 1, color: INK });
  page.drawText(safe(c.signatoryName), { x: width - 270, y: fy - 6, size: 11, font: sansBold, color: INK });
  page.drawText(safe(c.signatoryTitle), { x: width - 270, y: fy - 20, size: 9, font: sans, color: MUTED });
  page.drawText(safe(c.verifyUrl), { x: 70, y: 40, size: 7, font: sans, color: MUTED });
  return doc.save();
}

export async function receiptPdf(r: {
  academy: string; receiptNumber: string; paidOn: string; studentName: string; studentCode: string; course: string;
  amount: string; method: string; reference: string; totalFee: string; paidToDate: string; balance: string; recordedAt: string;
}) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Receipt ${r.receiptNumber}`);
  const page = doc.addPage([595, 842]);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();
  page.drawRectangle({ x: 0, y: height - 110, width, height: 110, color: DARK });
  page.drawText(safe(r.academy), { x: 48, y: height - 60, size: 22, font: bold, color: rgb(1, 1, 1) });
  page.drawText("PAYMENT RECEIPT", { x: 48, y: height - 84, size: 10, font: sans, color: rgb(0.8, 0.88, 0.97) });
  page.drawText(r.receiptNumber, { x: width - 48 - bold.widthOfTextAtSize(r.receiptNumber, 12), y: height - 70, size: 12, font: bold, color: rgb(1, 1, 1) });

  let y = height - 160;
  const row = (k: string, v: string, strong = false) => {
    page.drawText(k, { x: 48, y, size: 10, font: sans, color: MUTED });
    page.drawText(safe(v), { x: 220, y, size: strong ? 13 : 11, font: strong ? bold : sans, color: INK });
    y -= 28;
  };
  row("Received from", r.studentName, true);
  row("Student ID", r.studentCode);
  row("Course", r.course);
  row("Payment date", r.paidOn);
  row("Amount received", r.amount, true);
  row("Payment method", r.method);
  row("Reference no.", r.reference || "-");
  y -= 10;
  page.drawLine({ start: { x: 48, y: y + 14 }, end: { x: width - 48, y: y + 14 }, thickness: 0.5, color: LIGHT });
  row("Total course fee", r.totalFee);
  row("Paid to date", r.paidToDate);
  row("Balance remaining", r.balance, true);
  page.drawText(`Recorded ${r.recordedAt}. This is a computer-generated receipt and does not require a signature.`, { x: 48, y: 60, size: 8, font: sans, color: MUTED });
  return doc.save();
}
