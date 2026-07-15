import { jsPDF } from "jspdf";
import { Database, formatRupiah, formatTanggalIndo, getTodayDateString } from "./db";
import { HEADER_LOGO_BASE64 } from "./headerLogo";
import { 
  Siswa, 
  Tutor, 
  ProgramBelajar, 
  RiwayatPertemuan, 
  TransaksiRekeningSiswa, 
  TransaksiHonorTutor, 
  PembayaranSiswa, 
  SlipGaji, 
  KasLembaga 
} from "../types";

// Pre-load and convert the PNG logo to JPEG format in the browser to bypass jsPDF PNG limitations
let cachedJpegLogo: string | null = null;
if (typeof window !== "undefined") {
  const img = new Image();
  img.onload = () => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff"; // White background to prevent transparency turning black in JPEG
        ctx.fillRect(0, 0, 128, 128);
        ctx.drawImage(img, 0, 0, 128, 128);
        cachedJpegLogo = canvas.toDataURL("image/jpeg", 0.95);
      }
    } catch (e) {
      console.error("Error pre-converting logo:", e);
    }
  };
  img.src = HEADER_LOGO_BASE64;
}

// Helper to draw clean lines and titles
function drawHeader(doc: jsPDF, title: string, subtitle: string, periodStr: string = "Semua Periode") {

  // Draw Custom Brand Vector Logo - "Rumah Belajar"
  // This draws the exact roof with chimney, brand text, and brush stroke underline in beautiful, crisp, high-contrast vector format!
  try {
    const greyR = 120;
    const greyG = 120;
    const greyB = 125;
    
    // Set color to matches the original logo's grey color
    doc.setFillColor(greyR, greyG, greyB);
    doc.setDrawColor(greyR, greyG, greyB);

    
    // Asli: x=17.2, w=1.2, h=2.5. Baru: w=0.6, h=1.25
    // 1. Persegi (Pintu/Elemen) - Y ditambah 1 (19.25 + 1 = 20.25)
    doc.rect(18.0, 20.25, 0.6, 1.25, "F");

    // 2. Atap (Segitiga Luar) - Y ditambah 1 (21.2 -> 22.2, 19.1 -> 20.1)
    doc.triangle(16.2, 22.2, 19.85, 20.1, 23.5, 22.2, "F");

    // 3. Inner white carving triangle - Y ditambah 1 (21.3 -> 22.3, 19.45 -> 20.45)
    doc.setFillColor(255, 255, 255);
    doc.triangle(16.85, 22.3, 19.85, 20.45, 22.85, 22.3, "F");

    // Restore grey color for the text and underline
    doc.setFillColor(greyR, greyG, greyB);
    doc.setTextColor(greyR, greyG, greyB);

    // 3. The Text "Rumah"
    // Use Helvetica Bold for high readability in small sizes  
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Rumah", 18.0, 24.3);

    // 4. The Text "Belajar"
    doc.setFontSize(8.5);
    doc.text("Belajar", 18.0, 27.8);

    // Koordinat baru (Lebar diperpendek): (25.0, 28.6), (25.0, 29.0), (29.5, 28.8)

    doc.triangle(25.0, 28.6, 25.0, 29.0, 29.5, 28.8, "F");

  } catch (e) {
    console.error("Failed to draw vector logo:", e);
    // Ultimate Fallback: draw a simple visual placeholder
    doc.setDrawColor(120, 120, 125);
    doc.setLineWidth(0.5);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 15, 16, 16, 3, 3, "FD");
  }

  // Title
  doc.setTextColor(30, 41, 59); // Charcoal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("RUMAH BELAJAR", 35, 21);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate
  doc.text("Jalan Ahmad Yani (Kampung ARAYA) Gondanglegi Kulon", 35, 26);
  doc.text("081555949222 | rumahbelajargondanglegikulon@gmail.com", 35, 30);

  // Document Info (Right Aligned)
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const titleWidth = doc.getTextWidth(title.toUpperCase());
  doc.text(title.toUpperCase(), 195 - titleWidth, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const docNum = `No: DOC/${Math.floor(100000 + Math.random() * 900000)}`;
  doc.text(docNum, 195 - doc.getTextWidth(docNum), 26);
  
  const pStr = `Periode: ${periodStr}`;
  doc.text(pStr, 195 - doc.getTextWidth(pStr), 30);

  const tglCetak = `Dicetak: ${formatTanggalIndo(getTodayDateString())}`;
  doc.text(tglCetak, 195 - doc.getTextWidth(tglCetak), 34);

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.8);
  doc.line(15, 37, 195, 37);
}

function drawFooter(doc: jsPDF, pageNum: number) {
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 278, 195, 278);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Aplikasi Sistemasi & Automatisasi - Rumah Belajar", 15, 283);
  doc.text(`Halaman ${pageNum}`, 195 - doc.getTextWidth(`Halaman ${pageNum}`), 283);
}

function drawSignature(doc: jsPDF, y: number, name: string = "Admin Operational") {
  if (y > 240) return; // Prevent signature overflowing to footer
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(51, 65, 85);
  
  doc.text("Mengetahui,", 145, y);
  doc.text("Rumah Belajar,", 145, y + 4);
  
  doc.setDrawColor(203, 213, 225);
  doc.line(145, y + 22, 185, y + 22); // Signature line
  
  doc.setFont("helvetica", "bold");
  doc.text(name, 145, y + 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Staf Administrasi", 145, y + 30);
}

// Draw a table grid nicely
function drawTableGrid(
  doc: jsPDF, 
  startY: number, 
  headers: string[], 
  widths: number[], 
  rows: string[][],
  alignments: ("left" | "right" | "center")[] = []
): number {
  let curY = startY;

  // Table Header Background (Ink-friendly light grey)
  doc.setFillColor(241, 245, 249); 
  doc.rect(15, curY, 180, 8, "F");
  
  doc.setDrawColor(203, 213, 225); // Slate-200 border
  doc.setLineWidth(0.5);
  doc.line(15, curY, 195, curY);
  doc.line(15, curY + 8, 195, curY + 8);

  // Headers (Charcoal text instead of white text on blue)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  
  let curX = 15;
  headers.forEach((h, idx) => {
    const w = widths[idx];
    const align = alignments[idx] || "left";
    let textX = curX + 2;
    if (align === "right") {
      textX = curX + w - doc.getTextWidth(h) - 2;
    } else if (align === "center") {
      textX = curX + (w / 2) - (doc.getTextWidth(h) / 2);
    }
    doc.text(h, textX, curY + 5.5);
    curX += w;
  });

  curY += 8;

  // Rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  rows.forEach((row, rowIdx) => {
    // Check page boundaries
    if (curY > 265) {
      drawFooter(doc, 1); // For simple demonstration, keep page 1 footer or add pages
      doc.addPage();
      curY = 45;
      // Re-draw table header on new page (Ink-friendly light grey)
      doc.setFillColor(241, 245, 249);
      doc.rect(15, curY, 180, 8, "F");
      
      doc.setDrawColor(203, 213, 225); // Slate-200 border
      doc.setLineWidth(0.5);
      doc.line(15, curY, 195, curY);
      doc.line(15, curY + 8, 195, curY + 8);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      
      let newX = 15;
      headers.forEach((h, idx) => {
        const w = widths[idx];
        const align = alignments[idx] || "left";
        let textX = newX + 2;
        if (align === "right") {
          textX = newX + w - doc.getTextWidth(h) - 2;
        } else if (align === "center") {
          textX = newX + (w / 2) - (doc.getTextWidth(h) / 2);
        }
        doc.text(h, textX, curY + 5.5);
        newX += w;
      });
      curY += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
    }

    // Zebra stripes
    if (rowIdx % 2 === 1) {
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(15, curY, 180, 7.5, "F");
    }

    // Border line bottom of row
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.line(15, curY + 7.5, 195, curY + 7.5);

    let rowX = 15;
    row.forEach((cell, cellIdx) => {
      const w = widths[cellIdx];
      const align = alignments[cellIdx] || "left";
      let cellTextX = rowX + 2;
      if (align === "right") {
        cellTextX = rowX + w - doc.getTextWidth(cell) - 2;
      } else if (align === "center") {
        cellTextX = rowX + (w / 2) - (doc.getTextWidth(cell) / 2);
      }
      doc.text(cell, cellTextX, curY + 5);
      rowX += w;
    });

    curY += 7.5;
  });

  return curY;
}

function formatKeteranganTutor(ket: string): string {
  let result = ket;

  // 1. Mengeluarkan nama program dari dalam tanda kurung (logika bawaan)
  if (result.startsWith("Riwayat Pertemuan") && result.includes(" - Siswa: ") && result.endsWith(")")) {
    const openParenIndex = result.lastIndexOf(" (");
    if (openParenIndex !== -1) {
      const mainPart = result.substring(0, openParenIndex);
      const programName = result.substring(openParenIndex + 2, result.length - 1);
      result = `${mainPart} - ${programName}`;
    }
  }

  // 2. Membersihkan kata yang tidak diinginkan
  return result
    .replace(/Riwayat Pertemuan\s*/gi, "") // Menghapus "Riwayat Pertemuan" dan spasi setelahnya
    .replace(/Siswa:\s*/gi, "")            // Menghapus "Siswa:" dan spasi setelahnya
    .replace(/^-\s*/, "")                  // Menghapus tanda strip "-" jika tertinggal di awal kalimat
    .trim();
}

// Helper to extract program name from tutor transaction description
function extractProgramFromTutorKeterangan(ket: string): string | null {
  if (!ket.startsWith("Riwayat Pertemuan")) return null;
  const parts = ket.split(" - ");
  if (parts.length >= 3) {
    return parts[2].trim();
  }
  if (parts.length === 2 && parts[1].includes("(") && parts[1].endsWith(")")) {
    const openParen = parts[1].lastIndexOf(" (");
    if (openParen !== -1) {
      return parts[1].substring(openParen + 2, parts[1].length - 1).trim();
    }
  }
  return null;
}

// 1. INDIVIDUAL: REKENING BELAJAR SISWA PDF (LAPORAN BIAYA & PEMBAYARAN BELAJAR)
export function downloadRekeningBelajarPDF(siswa: Siswa, program: ProgramBelajar, ledger: TransaksiRekeningSiswa[], periodStr: string) {
  const doc = new jsPDF();

  drawHeader(doc, "LAPORAN BIAYA & SPP SISWA", "Rincian Biaya Bimbingan Belajar dan Pembayaran Siswa", periodStr);
 
  // 1. Identitas Siswa
  // Student Info Cards - Ink-saving
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 42, 180, 22, 2, 2, "FD");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("IDENTITAS SISWA", 20, 48);
  doc.text("PROGRAM BELAJAR AKTIF", 115, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Nama Siswa   : ${siswa.nama}`, 20, 53);
  doc.text(`ID Siswa         : ${siswa.id}`, 20, 57);
  doc.text(`Telepon Wali  : ${siswa.teleponOrangTua}`, 20, 61);

  doc.text(`Nama Program  : ${program ? program.nama : "Umum / Belum Terikat"}`, 115, 53);
  doc.text(`Tarif Belajar   : ${program ? `${formatRupiah(program.tarifSiswa)} / pertemuan` : "-"}`, 115, 57);
  doc.text(`Jenjang / Mapel: ${program ? `${program.jenjang} / ${program.mapel}` : "-"}`, 115, 61);

  // 2. Kalkulasi Data
  const totalDebit = ledger.filter(l => l.tipe === "debit").reduce((sum, l) => sum + l.jumlah, 0);
  const totalKredit = ledger.filter(l => l.tipe === "kredit").reduce((sum, l) => sum + l.jumlah, 0);
  const currentSaldo = ledger.length > 0 ? ledger[ledger.length - 1].saldoBerjalan : 0;
  const isLunas = currentSaldo <= 0;

  let currentY = 70;

  // --- Layout Kiri: Kalkulasi Paket ---
  const packageCounts: { [name: string]: number } = {};
  ledger.forEach(item => {
    if (item.tipe === "debit" && item.keterangan.startsWith("Riwayat Pertemuan")) {
      const parts = item.keterangan.split(" - ");
      if (parts.length >= 2) {
        const prog = parts[1].trim();
        packageCounts[prog] = (packageCounts[prog] || 0) + 1;
      }
    }
  });
  const packageStrings = Object.entries(packageCounts).map(([name, count]) => ({ name, count: `${count}x` }));

  // Background Kiri
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text("KALKULASI PAKET BELAJAR", 20, currentY + 7);

// --- Layout Kiri: Kalkulasi Paket ---
  // ... (setup awal sama seperti sebelumnya)

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  let listY = currentY + 14;
  
  packageStrings.forEach((pkg) => {
    // Nama paket di kiri
    doc.text(pkg.name, 20, listY);
    
    // Angka/Perkalian di posisi X=90 dengan rata kanan (align: "right")
    // Ini akan membuat semua angka sejajar rapi di garis yang sama
    doc.text(pkg.count, 60, listY, { align: "right" });
    
    listY += 6;
  });

  // --- Layout Kanan: Ringkasan Tagihan ---
  // Background Kanan
  doc.setFillColor(255, 255, 255); // Slate-100 (Biru keabuan muda)
  doc.roundedRect(105, currentY, 90, 33, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("RINGKASAN TAGIHAN", 110, currentY + 7);

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Total Tagihan", 110, currentY + 15);
  doc.text("Total Dibayar", 110, currentY + 21);
  doc.text(isLunas ? "Status" : "Sisa Tagihan", 110, currentY + 27);

  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  doc.setTextColor(37, 99, 235);
  doc.text(formatRupiah(totalDebit), 190, currentY + 15, { align: "right" });
  doc.setTextColor(22, 163, 74);
  doc.text(formatRupiah(totalKredit), 190, currentY + 21, { align: "right" });
  doc.setTextColor(isLunas ? 22 : 185, isLunas ? 101 : 28, isLunas ? 52 : 28);
  doc.text(isLunas ? "LUNAS" : formatRupiah(currentSaldo), 190, currentY + 27, { align: "right" });

  // 3. Render Tabel (Start di bawah box)
  const tableStartY = currentY + 40;
  const headers = ["No", "Tanggal", "Keterangan", "Biaya", "Pembayaran", "Sisa"];
  const widths = [10, 25, 71, 25, 25, 24];
  const alignments = ["center", "center", "left", "right", "right", "right"];

  const rows = ledger.map((item, index) => [
    String(index + 1),
    formatTanggalIndo(item.tanggal),
    item.keterangan,
    item.tipe === "debit" ? formatRupiah(item.jumlah) : "-",
    item.tipe === "kredit" ? formatRupiah(item.jumlah) : "-",
    formatRupiah(item.saldoBerjalan)
  ]);

  const endY = drawTableGrid(doc, tableStartY, headers, widths, rows, alignments);
  drawSignature(doc, endY + 10, "Administrasi Keuangan");
  drawFooter(doc, 1);
  doc.save(`REKENING_BELAJAR_${siswa.nama.replace(/\s+/g, "_")}.pdf`);

}
export function downloadSlipGajiPDF(slip: SlipGaji, tutor: Tutor, ledger: TransaksiHonorTutor[]) {
  const doc = new jsPDF();
  drawHeader(doc, "SLIP GAJI / HONOR TUTOR", "Bukti Pembayaran Honor Resmi Lembaga", slip.periode);

  // 1. Identitas Tutor (Header Box)
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 42, 180, 23, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("IDENTITAS TUTOR", 20, 48);
  doc.text("INFORMASI PEMBAYARAN", 115, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Nama Tutor    : ${tutor.nama}`, 20, 53);
  doc.text(`ID Tutor          : ${tutor.id}`, 20, 57);
  doc.text(`No Telepon    : ${tutor.telepon}`, 20, 61);

  doc.text(`No Slip Gaji     : ${slip.id}`, 115, 53);
  doc.text(`Tanggal Bayar : ${formatTanggalIndo(slip.tanggal)}`, 115, 57);
  doc.text(`Periode Gaji    : ${slip.periode}`, 115, 61);

  // 2. Kalkulasi Data (Seluruh data berjalan tanpa batas slice)
  const relevantLedger = ledger.filter(item => item.tanggal <= slip.tanggal); 
  
  const packageCounts: { [name: string]: number } = {};
  relevantLedger.forEach(item => {
    const prog = extractProgramFromTutorKeterangan(item.keterangan);
    if (prog) packageCounts[prog] = (packageCounts[prog] || 0) + 1;
  });

  const currentY = 72; // Disetel 72 agar ada jarak dari box identitas

  // --- Kiri: Kalkulasi Paket (Box) ---
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("KALKULASI SESI", 20, currentY + 7);
  
  doc.setFont("helvetica", "normal");
  Object.entries(packageCounts).forEach(([name, count], i) => {
    doc.text(name, 20, currentY + 14 + (i * 6));
    doc.text(`${count}x`, 60, currentY + 14 + (i * 6), { align: "right" });
  });

  // --- Kanan: Ringkasan Honor (Box) ---
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(105, currentY, 90, 35, 2, 2, "FD"); 
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("RINGKASAN HONOR", 110, currentY + 7);
  
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Total Honor", 110, currentY + 14);
  doc.text("Potongan", 110, currentY + 20);
  
  // Menampilkan keterangan potongan jika ada
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  const infoPotongan = slip.keteranganPotongan ? `(${slip.keteranganPotongan})` : "";
  doc.text(infoPotongan, 110, currentY + 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Total Diterima", 110, currentY + 30);

  // Nilai Nominal dengan Pewarnaan
  doc.setFontSize(9);
  doc.setTextColor(37, 99, 235); // Biru (Total Kotor)
  doc.text(formatRupiah(slip.totalHonor || slip.jumlah), 190, currentY + 14, { align: "right" });
  
  doc.setTextColor(220, 38, 38); // Merah (Potongan)
  doc.text(formatRupiah(slip.potongan || 0), 190, currentY + 20, { align: "right" });
  
  doc.setTextColor(22, 163, 74); // Hijau (Total Bersih)
  doc.text(formatRupiah(slip.jumlah), 190, currentY + 30, { align: "right" });

  // 3. Tabel Mutasi (Otomatis memuat seluruh baris relevan)
  const tableStartY = currentY + 42; // Start tabel diberi jarak 5 poin dari bawah box
  const headers = ["No", "Tanggal", "Keterangan", "Mutasi", "Saldo"];
  const widths = [10, 25, 75, 35, 35];
  const alignments: ("left" | "right" | "center")[] = ["center", "center", "left", "right", "right"];
  
  const rows = relevantLedger.map((item, idx) => [
    String(idx + 1),
    formatTanggalIndo(item.tanggal),
    formatKeteranganTutor(item.keterangan),
    item.tipe === "kredit" ? `+ ${formatRupiah(item.jumlah)}` : `- ${formatRupiah(item.jumlah)}`,
    formatRupiah(item.saldoBerjalan)
  ]);

  const endY = drawTableGrid(doc, tableStartY, headers, widths, rows, alignments);

  // 4. Catatan & Tanda Tangan
  let footerY = endY + 10;
  
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Catatan Slip: ${slip.catatan || "-"}`, 15, footerY);
  doc.text("Pembayaran dilakukan secara tunai/transfer bank ke rekening Tutor terdaftar.", 15, footerY + 4);

  // Signatures
  const sigY = footerY + 15;
  
  // Pengecekan halaman untuk tanda tangan (jika tabel sangat panjang)
  if (sigY > 260) {
    doc.addPage();
    footerY = 20; // Reset ke atas halaman baru
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  
  // Signature Kiri (Tutor)
  doc.text("Penerima (Tutor),", 25, sigY);
  doc.line(25, sigY + 22, 65, sigY + 22);
  doc.setFont("helvetica", "bold");
  doc.text(tutor.nama, 25, sigY + 26);

  // Signature Kanan (Admin)
  doc.setFont("helvetica", "normal");
  doc.text("Penyalur (Admin),", 145, sigY);
  doc.line(145, sigY + 22, 185, sigY + 22);
  doc.setFont("helvetica", "bold");
  doc.text("Jadwal Bimbel Rumah Belajar", 145, sigY + 26);

  drawFooter(doc, 1);
  doc.save(`SLIP_GAJI_${tutor.nama.replace(/\s+/g, "_")}_${slip.id}.pdf`);
}


// 4. INDIVIDUAL: REKENING HONOR TUTOR
export function downloadRekeningHonorTutorPDF(tutor: Tutor, ledger: TransaksiHonorTutor[], periodStr: string) {
  const doc = new jsPDF();
  drawHeader(doc, "REKENING HONOR TUTOR", "Rincian Hak Pendapatan & Penarikan Honor", periodStr);

  // Info Box - Ink-saving white with thin border
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, 42, 180, 20, 2, 2, "FD");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Tutor: ${tutor.nama} (ID: ${tutor.id})`, 20, 48);
  doc.setFont("helvetica", "normal");
  doc.text(`ID Login: ${tutor.idLogin} | Kontak: ${tutor.telepon}`, 20, 53);
  doc.text(`Bergabung: ${formatTanggalIndo(tutor.tanggalBergabung)}`, 20, 58);

  const earned = ledger.filter(l => l.tipe === "kredit").reduce((sum, l) => sum + l.jumlah, 0);
  const paid = ledger.filter(l => l.tipe === "debit").reduce((sum, l) => sum + l.jumlah, 0);
  const currentOwed = ledger.length > 0 ? ledger[ledger.length - 1].saldoBerjalan : 0;

  // Table starts at 68 (since 3 summary boxes are now at the bottom)
  const headers = ["No", "Tanggal", "Keterangan", "Honor Masuk", "Dicairkan (-)", "Saldo Honor"];
  const widths = [12, 25, 73, 23, 23, 24];
  const alignments: ("left" | "right" | "center")[] = ["center", "center", "left", "right", "right", "right"];

  const rows = ledger.map((item, idx) => [
    String(idx + 1),
    formatTanggalIndo(item.tanggal),
    item.keterangan,
    item.tipe === "kredit" ? formatRupiah(item.jumlah) : "-",
    item.tipe === "debit" ? formatRupiah(item.jumlah) : "-",
    formatRupiah(item.saldoBerjalan)
  ]);

  const endY = drawTableGrid(doc, 68, headers, widths, rows, alignments);

  // 3 Boxes at the bottom (below the table) - Ink-saving white with thin borders
  let nextY = endY + 8;
  if (nextY > 215) {
    doc.addPage();
    nextY = 45;
  }

  // Box 1: Total Pendapatan
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, nextY, 56, 14, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("TOTAL PENDAPATAN (KREDIT)", 19, nextY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(formatRupiah(earned), 19, nextY + 11);

  // Box 2: Total Dicairkan
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(77, nextY, 56, 14, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("TOTAL DICAIRKAN (DEBIT)", 81, nextY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(formatRupiah(paid), 81, nextY + 11);

  // Box 3: Saldo Honor Terutang
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(139, nextY, 56, 14, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("SALDO HONOR TERUTANG", 143, nextY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text(formatRupiah(currentOwed), 143, nextY + 11);

  drawSignature(doc, nextY + 22, "Kepala Lembaga");
  drawFooter(doc, 1);
  doc.save(`REKENING_HONOR_${tutor.nama.replace(/\s+/g, "_")}.pdf`);
}

// 5. INSTITUTIONAL: LAPORAN LABA RUGI (PROFIT & LOSS)
export function downloadLaporanLabaRugiPDF(db: Database, periodStr: string, startDate?: string, endDate?: string) {
  const doc = new jsPDF();
  drawHeader(doc, "LAPORAN LABA RUGI", "Laporan Operasional dan Keuangan", periodStr);

  const filterByDate = (dateStr: string) => {
    if (!startDate && !endDate) return true;
    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  };

  // Calculations based on filtered periods or overall
  // Let's gather values:
  // Revenue = Debit postings to students (Tuition fee invoiced)
  // Expenses = Tutor honors incurred (Kredit postings to tutors) + any custom expenses
  // Wait! In "Buku Tabungan" / cash-accrual concept:
  // Operational revenue is the total tuition fees billed (or payments collected depending on concept). Let's show BOTH concepts (Accrual Billed vs Cash Collected) because it's highly professional!
  
  const tuitionBilled = db.studentLedger
    .filter(l => l.tipe === "debit" && filterByDate(l.tanggal))
    .reduce((sum, l) => sum + l.jumlah, 0);

  const cashCollected = db.payments
    .filter(p => filterByDate(p.tanggal))
    .reduce((sum, p) => sum + p.jumlah, 0);

  const tutorHonorsIncurred = db.tutorLedger
    .filter(l => l.tipe === "kredit" && filterByDate(l.tanggal))
    .reduce((sum, l) => sum + l.jumlah, 0);
  
  // Custom general expenses (non-tutor operational from kas)
  // Filters out payments of tutor honor (referensiId starts with 'SG-') to avoid double counting
  const generalExpenses = db.kas
    .filter(k => k.tipe === "keluar" && (!k.referensiId || !k.referensiId.startsWith("SG")) && filterByDate(k.tanggal))
    .reduce((sum, k) => sum + k.jumlah, 0);

  const totalHonorsPaid = db.slips
    .filter(s => filterByDate(s.tanggal))
    .reduce((sum, s) => sum + s.jumlah, 0);

  const estimatedAccrualNet = tuitionBilled - tutorHonorsIncurred - generalExpenses;
  const cashBasisNet = cashCollected - totalHonorsPaid - generalExpenses;

  // Detailed rows for visual P&L - Starts higher up because totals box moved to the bottom
  let y = 46;
  
  // Section 1: PENDAPATAN
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // Charcoal instead of Blue to save ink
  doc.text("1. PENDAPATAN OPERASIONAL", 15, y);
  y += 6;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Tagihan Sesi Belajar Siswa / SPP (Piutang Akrual)", 20, y);
  doc.text(formatRupiah(tuitionBilled), 150, y);
  y += 5;

  doc.text("Penerimaan Pembayaran Riil (Kas Masuk)", 20, y);
  doc.text(formatRupiah(cashCollected), 150, y);
  y += 7;

  // Section 2: BEBAN OPERASIONAL
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59); // Charcoal instead of Red to save ink
  doc.text("2. BEBAN OPERASIONAL", 15, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.text("Beban Honor Tutor Terutang (Akrual)", 20, y);
  doc.text(`(${formatRupiah(tutorHonorsIncurred)})`, 150, y);
  y += 5;

  doc.text("Realisasi Pembayaran Honor (Slip Gaji)", 20, y);
  doc.text(`(${formatRupiah(totalHonorsPaid)})`, 150, y);
  y += 5;

  doc.text("Beban Operasional Lainnya", 20, y);
  doc.text(`(${formatRupiah(generalExpenses)})`, 150, y);
  y += 8;

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.line(15, y, 195, y);
  y += 6;

  // Total Laba Rugi
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  doc.text("ESTIMASI LABA OPERASIONAL (AKRUAL)", 15, y);
  doc.text(formatRupiah(estimatedAccrualNet), 150, y);
  y += 6;

  doc.text("ESTIMASI LABA KAS BERJALAN (REALISASI KAS)", 15, y);
  doc.text(formatRupiah(cashBasisNet), 150, y);
  y += 10;

  // RINGKASAN ESTIMASI LABA BERSIH - Placed at the bottom in an ink-saving white box with a thin border
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, y, 180, 22, 1.5, 1.5, "FD");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("RINGKASAN ESTIMASI LABA BERSIH", 20, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Metode Akrual (Berdasarkan Sesi Terlaksana): ${formatRupiah(estimatedAccrualNet)}`, 20, y + 12);
  doc.text(`Metode Arus Kas (Berdasarkan Pembayaran Riil): ${formatRupiah(cashBasisNet)}`, 20, y + 17);

  drawSignature(doc, y + 34, "Direktur Utama");
  drawFooter(doc, 1);
  doc.save(`LAPORAN_LABA_RUGI_${periodStr.replace(/\s+/g, "_")}.pdf`);
}

// 6. INSTITUTIONAL: REKAP TAGIHAN SISWA
export function downloadRekapTagihanSiswaPDF(students: Siswa[], db: Database, periodStr: string, startDate?: string, endDate?: string) {
  const doc = new jsPDF();
  drawHeader(doc, "REKAPITULASI TAGIHAN SISWA", "Daftar Biaya Les dan Sisa Tagihan Siswa", periodStr);

  const filterByDate = (dateStr: string) => {
    if (!startDate && !endDate) return true;
    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  };

  const headers = ["No", "ID Siswa", "Nama Siswa", "Program Belajar", "Total Biaya", "Total Bayar", "Sisa Tagihan"];
  const widths = [10, 18, 40, 47, 22, 22, 21];
  const alignments: ("left" | "right" | "center")[] = ["center", "center", "left", "left", "right", "right", "right"];

  const rows = students.map((s, idx) => {
    const studentLedgerFull = db.studentLedger.filter(tx => tx.siswaId === s.id);
    const studentLedgerFiltered = studentLedgerFull.filter(tx => filterByDate(tx.tanggal));

    const debit = studentLedgerFiltered.filter(tx => tx.tipe === "debit").reduce((sum, tx) => sum + tx.jumlah, 0);
    const credit = studentLedgerFiltered.filter(tx => tx.tipe === "kredit").reduce((sum, tx) => sum + tx.jumlah, 0);
    
    // Sisa piutang up to the end date of the period
    const ledgerUpToEnd = studentLedgerFull.filter(tx => !endDate || tx.tanggal <= endDate);
    const balance = ledgerUpToEnd.length > 0 ? ledgerUpToEnd[ledgerUpToEnd.length - 1].saldoBerjalan : 0;
    
    const prog = db.programs.find(p => p.id === s.programId);
    
    return [
      String(idx + 1),
      s.id,
      s.nama,
      prog ? prog.nama : "-",
      formatRupiah(debit),
      formatRupiah(credit),
      formatRupiah(balance)
    ];
  });

  const totalOutstanding = students.reduce((sum, s) => {
    const l = db.studentLedger.filter(tx => tx.siswaId === s.id).filter(tx => !endDate || tx.tanggal <= endDate);
    const current = l.length > 0 ? l[l.length - 1].saldoBerjalan : 0;
    return sum + (current > 0 ? current : 0);
  }, 0);

  const endY = drawTableGrid(doc, 42, headers, widths, rows, alignments);

  let nextY = endY + 8;
  if (nextY > 240) {
    doc.addPage();
    nextY = 45;
  }

  // Total Outstanding Bar drawn below details - Ink-saving
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, nextY, 180, 14, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("TOTAL SISA TAGIHAN SISWA (BELUM LUNAS)", 20, nextY + 9);
  const outStr = formatRupiah(totalOutstanding);
  doc.text(outStr, 190 - doc.getTextWidth(outStr), nextY + 9);

  drawSignature(doc, nextY + 24, "Supervisor Keuangan");
  drawFooter(doc, 1);
  doc.save(`REKAP_TAGIHAN_SISWA.pdf`);
}

export function downloadRekapHonorTutorPDF(tutors: Tutor[], db: Database, periodStr: string, startDate?: string, endDate?: string) {
  const doc = new jsPDF();
  drawHeader(doc, "REKAPITULASI HONOR TUTOR", "Daftar Kewajiban Honor Tutor Lembaga", periodStr);

  const filterByDate = (dateStr: string) => {
    if (!startDate && !endDate) return true;
    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  };

  // Tambahkan header "Frekuensi"
  const headers = ["No", "ID Tutor", "Nama Tutor", "Nama Paket", "Sesi", "Total", "Dibayar", "Sisa"];
  const widths = [10, 18, 40, 35, 12, 22, 22, 20]; // Penyesuaian lebar kolom
  const alignments: ("left" | "right" | "center")[] = ["center", "center", "left", "left", "center", "right", "right", "right"];

  let rowIdx = 1;
  const rows: any[][] = [];

  tutors.forEach((t) => {
    const tutorSessions = db.sessions.filter(tx => tx.tutorId === t.id);
    const distinctPrograms = Array.from(new Set(tutorSessions.map(tx => tx.programNama)));
    
    const tutorLedgerFull = db.tutorLedger.filter(tx => tx.tutorId === t.id);
    const tutorLedgerFiltered = tutorLedgerFull.filter(tx => filterByDate(tx.tanggal));
    const earned = tutorLedgerFiltered.filter(tx => tx.tipe === "kredit").reduce((sum, tx) => sum + tx.jumlah, 0);
    const paid = tutorLedgerFiltered.filter(tx => tx.tipe === "debit").reduce((sum, tx) => sum + tx.jumlah, 0);
    const ledgerUpToEnd = tutorLedgerFull.filter(tx => !endDate || tx.tanggal <= endDate);
    const currentOwed = ledgerUpToEnd.length > 0 ? ledgerUpToEnd[ledgerUpToEnd.length - 1].saldoBerjalan : 0;

    if (distinctPrograms.length === 0) {
      rows.push([String(rowIdx++), t.id, t.nama, "-", "-", formatRupiah(earned), formatRupiah(paid), formatRupiah(currentOwed)]);
    } else {
      distinctPrograms.forEach((program, idx) => {
        // Hitung frekuensi sesi untuk program ini saja
        const frequency = tutorSessions.filter(s => s.programNama === program).length;

        if (idx === 0) {
          rows.push([String(rowIdx++), t.id, t.nama, program, String(frequency), formatRupiah(earned), formatRupiah(paid), formatRupiah(currentOwed)]);
        } else {
          rows.push(["", "", "", program, String(frequency), "", "", ""]);
        }
      });
    }
  });

  // ... (Sisanya sama seperti logika sebelumnya)
  const totalOwedAll = tutors.reduce((sum, t) => {
    const l = db.tutorLedger.filter(tx => tx.tutorId === t.id).filter(tx => !endDate || tx.tanggal <= endDate);
    return sum + (l.length > 0 ? l[l.length - 1].saldoBerjalan : 0);
  }, 0);

  const endY = drawTableGrid(doc, 42, headers, widths, rows, alignments);

  // Footer & Total
  let nextY = endY + 8;
  if (nextY > 240) { doc.addPage(); nextY = 45; }

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, nextY, 180, 14, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("TOTAL UTANG HONOR TUTOR YANG BELUM DIBAYARKAN", 20, nextY + 9);
  const outStr = formatRupiah(totalOwedAll);
  doc.text(outStr, 190 - doc.getTextWidth(outStr), nextY + 9);

  drawSignature(doc, nextY + 24, "Kepala Operasional");
  drawFooter(doc, 1);
  doc.save(`REKAP_HONOR_TUTOR.pdf`);
}

// 8. INSTITUTIONAL: REKAP TITIPAN TUTOR
export function downloadRekapTitipanTutorPDF(tutors: Tutor[], db: Database, periodStr: string, startDate?: string, endDate?: string) {
  const doc = new jsPDF();
  drawHeader(doc, "REKAPITULASI TITIPAN TUTOR", "Saldo Pembayaran Siswa yang Dititip pada Tutor", periodStr);

  const filterByDate = (dateStr: string) => {
    if (!startDate && !endDate) return true;
    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  };

  const headers = ["No", "ID Tutor", "Nama Tutor", "Titipan", "Diserahkan", "Mengendap"];
  const widths = [12, 22, 53, 31, 31, 31];
  const alignments: ("left" | "right" | "center")[] = ["center", "center", "left", "right", "right", "right"];

  const rows = tutors.map((t, idx) => {
    const tutorPaymentsFull = db.payments.filter(p => p.metode === "tutor" && p.tutorId === t.id);
    const tutorPaymentsFiltered = tutorPaymentsFull.filter(p => filterByDate(p.tanggal));

    const totalIn = tutorPaymentsFiltered.reduce((sum, p) => sum + p.jumlah, 0);
    const totalHandedOver = tutorPaymentsFiltered.filter(p => p.statusTitipan === "diserahkan").reduce((sum, p) => sum + p.jumlah, 0);
    const currentOnHands = tutorPaymentsFiltered.filter(p => p.statusTitipan === "pending").reduce((sum, p) => sum + p.jumlah, 0);
    
    return [
      String(idx + 1),
      t.id,
      t.nama,
      formatRupiah(totalIn),
      formatRupiah(totalHandedOver),
      formatRupiah(currentOnHands)
    ];
  });

  const totalPendingDeposits = db.payments
    .filter(p => p.metode === "tutor" && p.statusTitipan === "pending" && filterByDate(p.tanggal))
    .reduce((sum, p) => sum + p.jumlah, 0);

  const endY = drawTableGrid(doc, 42, headers, widths, rows, alignments);

  let nextY = endY + 8;
  if (nextY > 240) {
    doc.addPage();
    nextY = 45;
  }

  // Ink-saving totals box
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, nextY, 180, 14, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("TOTAL SALDO TITIPAN YANG BELUM DISERAHKAN OLEH TUTOR", 20, nextY + 9);
  const outStr = formatRupiah(totalPendingDeposits);
  doc.text(outStr, 190 - doc.getTextWidth(outStr), nextY + 9);

  drawSignature(doc, nextY + 24, "Administrasi Keuangan");
  drawFooter(doc, 1);
  doc.save(`REKAP_TITIPAN_TUTOR.pdf`);
}

// 9. INSTITUTIONAL: REKAP ABSENSI TUTOR & SISWA
export function downloadRekapAbsensiPDF(db: Database, periodStr: string, startDate?: string, endDate?: string) {
  const doc = new jsPDF();
  drawHeader(doc, "REKAPITULASI KEHADIRAN / ABSENSI", "Laporan Rekap Absensi Tutor & Siswa", periodStr);

  const filterByDate = (dateStr: string) => {
    if (!startDate && !endDate) return true;
    if (startDate && dateStr < startDate) return false;
    if (endDate && dateStr > endDate) return false;
    return true;
  };

  const headers = ["No", "Tanggal", "Nama Tutor", "Nama Siswa", "Paket Belajar", "Status"];
  const widths = [10, 25, 40, 40, 41, 24];
  const alignments: ("left" | "right" | "center")[] = ["center", "center", "left", "left", "left", "center"];

  interface UnifiedItem {
    tanggal: string;
    tutorNama: string;
    siswaNama: string;
    programNama: string;
    status: "Setuju" | "Pending" | "Ditolak";
  }

  const items: UnifiedItem[] = [];

  // Ambil sesi final
  (db.sessions || []).forEach(s => {
    if (filterByDate(s.tanggal)) {
      items.push({
        tanggal: s.tanggal,
        tutorNama: s.tutorNama,
        siswaNama: s.siswaNama,
        programNama: s.programNama,
        status: "Setuju"
      });
    }
  });

  // Ambil laporan pending/ditolak
  (db.attendanceReports || []).forEach(r => {
    if (r.status !== "setuju" && filterByDate(r.tanggal)) {
      items.push({
        tanggal: r.tanggal,
        tutorNama: r.tutorNama,
        siswaNama: r.siswaNama,
        programNama: r.programNama,
        status: r.status === "pending" ? "Pending" : "Ditolak"
      });
    }
  });

  // Sorting: Tanggal -> Nama Tutor -> Nama Siswa
  items.sort((a, b) => {
    const dateComp = a.tanggal.localeCompare(b.tanggal);
    if (dateComp !== 0) return dateComp;
    
    const tutorComp = a.tutorNama.localeCompare(b.tutorNama);
    if (tutorComp !== 0) return tutorComp;
    
    return a.siswaNama.localeCompare(b.siswaNama);
  });

  const rows = items.map((r, idx) => {
    return [
      String(idx + 1),
      formatTanggalIndo(r.tanggal).split(" ").slice(0, 2).join(" "),
      r.tutorNama,
      r.siswaNama,
      r.programNama,
      r.status
    ];
  });

  const totalSessionsCount = items.length;
  const approvedCount = items.filter(r => r.status === "Setuju").length;
  const pendingCount = items.filter(r => r.status === "Pending").length;
  const rejectedCount = items.filter(r => r.status === "Ditolak").length;

  const endY = drawTableGrid(doc, 42, headers, widths, rows, alignments);

  let nextY = endY + 8;
  if (nextY > 230) {
    doc.addPage();
    nextY = 45;
  }

  // Box Ringkasan
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(15, nextY, 180, 20, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  
  doc.text(`RINGKASAN KEHADIRAN PERIODE INI`, 20, nextY + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total Kehadiran: ${totalSessionsCount} Pertemuan`, 20, nextY + 13);
  doc.text(`• Disetujui / Selesai: ${approvedCount}`, 75, nextY + 13);
  doc.text(`• Menunggu Verifikasi: ${pendingCount}`, 125, nextY + 13);
  doc.text(`• Ditolak: ${rejectedCount}`, 165, nextY + 13);

  drawSignature(doc, nextY + 32, "Kepala Operasional");
  drawFooter(doc, 1);
  doc.save(`REKAP_ABSENSI_BELAJAR.pdf`);
}