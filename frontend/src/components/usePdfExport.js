import { useState, useCallback } from 'react';
import jsPDF from 'jspdf';

/* ═══════════════════════════════════════════════════════════════
   TEMSA Digital Twin — Professional PDF Report Generator
   Native jsPDF rendering (no screenshots). Corporate quality.
   ═══════════════════════════════════════════════════════════════ */

const C = {
  brand: [200, 16, 46],       // TEMSA red
  brandDark: [160, 12, 36],
  dark: [15, 23, 42],
  surface: [30, 41, 59],
  surfaceAlt: [51, 65, 85],
  white: [255, 255, 255],
  text: [226, 232, 240],
  textMuted: [148, 163, 184],
  textDim: [100, 116, 139],
  accent: [96, 165, 250],     // Blue
  green: [52, 211, 153],
  amber: [251, 191, 36],
  red: [248, 113, 113],
  purple: [167, 139, 250],
  line: [51, 65, 85],
};

const PW = 210; // A4 width mm
const PH = 297; // A4 height mm
const ML = 18;  // margin left
const MR = 18;  // margin right
const MT = 22;  // margin top
const MB = 22;  // margin bottom
const CW = PW - ML - MR; // content width

function fmt(v, decimals = 1) {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') return v.toFixed(decimals);
  return String(v);
}

class PdfBuilder {
  constructor(title) {
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.y = MT;
    this.pageNum = 1;
    this.title = title;
    this.doc.setFont('helvetica');
  }

  /* ── Page management ── */
  checkSpace(needed) {
    if (this.y + needed > PH - MB) {
      this.newPage();
    }
  }

  newPage() {
    this.doc.addPage();
    this.pageNum++;
    this.y = MT;
  }

  /* ── Footer on all pages ── */
  addFooters() {
    const total = this.doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i);
      // Bottom line
      this.doc.setDrawColor(...C.line);
      this.doc.setLineWidth(0.3);
      this.doc.line(ML, PH - 14, PW - MR, PH - 14);
      // Left text
      this.doc.setFontSize(7);
      this.doc.setTextColor(...C.textDim);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text('TEMSA Ulaşım Araçları A.Ş. — Digital Twin Platform', ML, PH - 10);
      // Right text
      this.doc.text(`Sayfa ${i} / ${total}`, PW - MR, PH - 10, { align: 'right' });
      // Date
      const now = new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
      this.doc.text(now, PW / 2, PH - 10, { align: 'center' });
    }
  }

  /* ── Cover page ── */
  addCoverPage(subtitle, meta = []) {
    const doc = this.doc;
    // Full dark background
    doc.setFillColor(...C.dark);
    doc.rect(0, 0, PW, PH, 'F');
    // Red accent bar at top
    doc.setFillColor(...C.brand);
    doc.rect(0, 0, PW, 4, 'F');
    // Red accent strip left
    doc.setFillColor(...C.brand);
    doc.rect(0, 0, 5, PH, 'F');

    // Logo area
    doc.setFillColor(...C.brand);
    doc.roundedRect(ML, 50, 44, 44, 4, 4, 'F');
    doc.setTextColor(...C.white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('TEMSA', ML + 22, 69, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('DIGITAL TWIN', ML + 22, 78, { align: 'center' });

    // Title
    doc.setTextColor(...C.white);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('Varyant Teknik Raporu', ML, 120);

    // Subtitle
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.accent);
    doc.text(subtitle, ML, 132);

    // Separator line
    doc.setDrawColor(...C.brand);
    doc.setLineWidth(1);
    doc.line(ML, 140, ML + 80, 140);

    // Meta info
    doc.setFontSize(10);
    doc.setTextColor(...C.textMuted);
    let my = 155;
    meta.forEach(([k, v]) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.textDim);
      doc.text(k, ML, my);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.text);
      doc.text(String(v || '—'), ML + 50, my);
      my += 8;
    });

    // Classification
    doc.setFontSize(8);
    doc.setTextColor(...C.textDim);
    doc.text('GİZLİ — Şirket İçi Kullanım', PW - MR, PH - 30, { align: 'right' });
    doc.text('Bu rapor TEMSA Digital Twin platformu tarafından otomatik oluşturulmuştur.', ML, PH - 30);

    this.newPage();
  }

  /* ── Section header ── */
  addSectionHeader(title, number) {
    this.checkSpace(18);
    const doc = this.doc;
    // Dark background for page
    doc.setFillColor(...C.dark);
    doc.rect(0, this.y - 4, PW, 14, 'F');
    // Red accent
    doc.setFillColor(...C.brand);
    doc.rect(ML, this.y - 2, 3, 10, 'F');
    // Text
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.white);
    doc.text(`${number}. ${title}`, ML + 7, this.y + 5);
    this.y += 16;
  }

  /* ── Sub header ── */
  addSubHeader(title) {
    this.checkSpace(12);
    const doc = this.doc;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.accent);
    doc.text(title, ML, this.y + 3);
    doc.setDrawColor(...C.surfaceAlt);
    doc.setLineWidth(0.2);
    doc.line(ML, this.y + 5, PW - MR, this.y + 5);
    this.y += 10;
  }

  /* ── Key-value list ── */
  addKeyValueRows(items, colWidth = CW / 2) {
    const doc = this.doc;
    items.forEach(([key, val], i) => {
      if (val == null || val === '') return;
      this.checkSpace(7);
      const rowY = this.y;
      // Alternating row bg
      if (i % 2 === 0) {
        doc.setFillColor(20, 30, 48);
        doc.rect(ML, rowY - 1.5, CW, 6.5, 'F');
      }
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.textMuted);
      doc.text(String(key), ML + 2, rowY + 3);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.text);
      doc.text(String(val), ML + colWidth, rowY + 3);
      this.y += 6.5;
    });
  }

  /* ── Data table ── */
  addTable(headers, rows, opts = {}) {
    const doc = this.doc;
    const colCount = headers.length;
    const colW = opts.colWidths || headers.map(() => CW / colCount);
    const headerH = 8;
    const rowH = 6.5;

    this.checkSpace(headerH + rowH * Math.min(rows.length, 3));

    // Header row
    doc.setFillColor(...C.surface);
    doc.rect(ML, this.y, CW, headerH, 'F');
    // Red top line for header
    doc.setFillColor(...C.brand);
    doc.rect(ML, this.y, CW, 0.8, 'F');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.textMuted);
    let x = ML;
    headers.forEach((h, i) => {
      doc.text(String(h).toUpperCase(), x + 2, this.y + 5.5);
      x += colW[i];
    });
    this.y += headerH;

    // Data rows
    rows.forEach((row, ri) => {
      this.checkSpace(rowH + 2);
      if (ri % 2 === 0) {
        doc.setFillColor(18, 27, 44);
        doc.rect(ML, this.y, CW, rowH, 'F');
      }
      x = ML;
      doc.setFontSize(7.5);
      row.forEach((cell, ci) => {
        const color = opts.cellColors?.[ci] || C.text;
        doc.setTextColor(...color);
        doc.setFont('helvetica', opts.boldCols?.includes(ci) ? 'bold' : 'normal');
        doc.text(String(cell ?? '—'), x + 2, this.y + 4.5);
        x += colW[ci];
      });
      this.y += rowH;
    });
    this.y += 4;
  }

  /* ── KPI cards row ── */
  addKpiRow(kpis) {
    this.checkSpace(22);
    const doc = this.doc;
    const cardW = (CW - (kpis.length - 1) * 3) / kpis.length;
    let x = ML;
    kpis.forEach((kpi) => {
      // Card bg
      doc.setFillColor(...C.surface);
      doc.roundedRect(x, this.y, cardW, 18, 2, 2, 'F');
      // Value
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...(kpi.color || C.white));
      doc.text(String(kpi.value ?? '—'), x + cardW / 2, this.y + 9, { align: 'center' });
      // Label
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.textDim);
      doc.text(kpi.label.toUpperCase(), x + cardW / 2, this.y + 14.5, { align: 'center' });
      // Unit
      if (kpi.unit) {
        doc.setFontSize(6);
        doc.text(kpi.unit, x + cardW / 2, this.y + 17, { align: 'center' });
      }
      x += cardW + 3;
    });
    this.y += 24;
  }

  /* ── Spacer ── */
  addSpace(mm = 6) {
    this.y += mm;
  }

  /* ── Note/callout ── */
  addNote(text) {
    this.checkSpace(12);
    const doc = this.doc;
    doc.setFillColor(25, 35, 55);
    doc.roundedRect(ML, this.y, CW, 10, 2, 2, 'F');
    doc.setFillColor(...C.accent);
    doc.rect(ML, this.y, 2.5, 10, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...C.textMuted);
    doc.text(text, ML + 6, this.y + 6.5);
    this.y += 14;
  }

  /* ── Apply dark bg to all pages ── */
  applyDarkBg() {
    const total = this.doc.getNumberOfPages();
    for (let i = 2; i <= total; i++) {
      this.doc.setPage(i);
      this.doc.setFillColor(...C.dark);
      this.doc.rect(0, 0, PW, PH, 'F');
    }
  }

  save(filename) {
    this.applyDarkBg();
    this.addFooters();
    this.doc.save(`${filename}.pdf`);
  }
}

/* ═══════════════════════════════════════════════════════════════
   VARIANT REPORT
   ═══════════════════════════════════════════════════════════════ */
export function generateVariantPdf({ variant: v, vehicle: veh, counts, fuelMap, loadCurves, gearRatios, outputData }) {
  const pdf = new PdfBuilder('Varyant Raporu');

  // ── Cover page
  pdf.addCoverPage(
    `${veh?.model_name || ''} — ${v.engine_manufacturer} ${v.engine_model}`,
    [
      ['Varyant Kodu', v.variant_code],
      ['Araç Modeli', veh?.model_name],
      ['Motor', `${v.engine_manufacturer} ${v.engine_model}`],
      ['Yakıt Tipi', v.fuel_type?.toUpperCase()],
      ['Kategori', veh?.category?.toUpperCase()],
      ['Rapor Türü', 'Tam Teknik Analiz'],
    ]
  );

  // ── Page 2+: Switch to dark bg via applyDarkBg later
  // 1. TECHNICAL SPECS
  pdf.addSectionHeader('Teknik Özellikler', 1);

  // KPI summary
  pdf.addKpiRow([
    { label: 'Yakıt Haritası', value: counts?.fuel_map_points || 0, color: C.accent },
    { label: 'Yük Eğrisi', value: counts?.load_curve_points || 0, color: C.green },
    { label: 'Vites Sayısı', value: counts?.gear_ratios || 0, color: C.amber },
    { label: 'Güç (kW)', value: v.rated_power_w ? Math.round(v.rated_power_w / 1000) : '—', color: C.white },
  ]);

  // Motor
  pdf.addSubHeader('Motor Bilgileri');
  pdf.addKeyValueRows([
    ['Üretici', v.engine_manufacturer],
    ['Model', v.engine_model],
    ['Sertifika No', v.engine_cert_number],
    ['Hacim', v.displacement_cc ? `${v.displacement_cc} cc` : null],
    ['Nominal Devir', v.rated_speed_rpm ? `${v.rated_speed_rpm} rpm` : null],
    ['Nominal Güç', v.rated_power_w ? `${Math.round(v.rated_power_w / 1000)} kW (${Math.round(v.rated_power_w / 745.7)} HP)` : null],
    ['Maksimum Tork', v.max_torque_nm ? `${v.max_torque_nm} Nm` : null],
    ['Rölanti Devir', v.idling_speed_rpm ? `${v.idling_speed_rpm} rpm` : null],
    ['Yakıt Tipi', v.fuel_type],
  ].filter(([, val]) => val != null));
  pdf.addSpace();

  // Vehicle
  pdf.addSubHeader('Araç Bilgileri');
  pdf.addKeyValueRows([
    ['Model', veh?.model_name],
    ['Kategori', veh?.category],
    ['Şasi Konfigürasyonu', veh?.chassis_config],
    ['Aks Konfigürasyonu', veh?.axle_config],
    ['Maks. GVW', v.max_laden_mass_kg ? `${v.max_laden_mass_kg} kg` : null],
    ['Sıfır Emisyon Araç', v.zero_emission_vehicle ? 'Evet' : 'Hayır'],
  ].filter(([, val]) => val != null));
  pdf.addSpace();

  // Gearbox
  pdf.addSubHeader('Şanzıman Bilgileri');
  pdf.addKeyValueRows([
    ['Üretici', v.gearbox_manufacturer],
    ['Model', v.gearbox_model],
    ['Tip', v.gearbox_type],
    ['Vites Sayısı', v.gear_count],
  ].filter(([, val]) => val != null));
  pdf.addSpace();

  // Axle & Tyre
  pdf.addSubHeader('Aks & Lastik');
  pdf.addKeyValueRows([
    ['Aks Oranı', v.axle_ratio],
    ['Aks Tipi', v.axle_type],
    ['Ön Lastik', `${v.tyre_front_manufacturer || v.tyre_manufacturer || ''} ${v.tyre_front_model || v.tyre_model || ''} ${v.tyre_front_dimension || v.tyre_dimension || ''}`],
    ['Arka Lastik', `${v.tyre_rear_manufacturer || v.tyre_manufacturer || ''} ${v.tyre_rear_model || v.tyre_model || ''} ${v.tyre_rear_dimension || v.tyre_dimension || ''}`],
  ].filter(([, val]) => val && val.trim()));
  pdf.addSpace();

  // ADAS
  pdf.addSubHeader('ADAS & Yardımcı Sistemler');
  pdf.addKeyValueRows([
    ['Motor Start/Stop', v.engine_stop_start ? 'Evet' : 'Hayır'],
    ['Eco Roll', v.eco_roll ? 'Evet' : 'Hayır'],
    ['Prediktif Cruise', v.predictive_cruise || 'Hayır'],
    ['Fan Teknolojisi', v.fan_technology],
    ['Direksiyon Pompa', v.steering_pump_tech],
    ['Alternatör', v.alternator_tech],
    ['Retarder', v.retarder_type],
  ].filter(([, val]) => val != null));

  // ── 2. GEARBOX
  if (gearRatios?.length > 0) {
    pdf.newPage();
    pdf.addSectionHeader('Şanzıman & Vites Oranları', 2);
    pdf.addTable(
      ['Vites', 'Oran'],
      gearRatios.map(r => [`${r.gear_number}. Vites`, r.ratio.toFixed(4)]),
      {
        colWidths: [CW * 0.4, CW * 0.6],
        boldCols: [1],
      }
    );
    pdf.addNote(`Toplam ${gearRatios.length} vites · Aks oranı: ${v.axle_ratio || '—'} · Şanzıman: ${v.gearbox_manufacturer || ''} ${v.gearbox_model || ''}`);
  }

  // ── 3. FUEL MAP
  if (fuelMap?.length > 0) {
    pdf.newPage();
    pdf.addSectionHeader('Yakıt Tüketim Haritası', 3);

    // Summary
    const speeds = [...new Set(fuelMap.map(d => d.engine_speed))].sort((a, b) => a - b);
    const avgFc = fuelMap.reduce((s, d) => s + d.fuel_consumption, 0) / fuelMap.length;
    const maxFc = Math.max(...fuelMap.map(d => d.fuel_consumption));
    const minFc = Math.min(...fuelMap.filter(d => d.fuel_consumption > 0).map(d => d.fuel_consumption));

    pdf.addKpiRow([
      { label: 'Veri Noktası', value: fuelMap.length, color: C.accent },
      { label: 'Devir Aralığı', value: speeds.length, color: C.green },
      { label: 'Ort. Yakıt (g/h)', value: fmt(avgFc, 0), color: C.amber },
      { label: 'Maks. Yakıt (g/h)', value: fmt(maxFc, 0), color: C.red },
    ]);

    // Show a summary per RPM
    pdf.addSubHeader('Devir Başına Yakıt Ortalaması');
    const rpmSummary = speeds.slice(0, 20).map(rpm => {
      const points = fuelMap.filter(d => d.engine_speed === rpm);
      const avg = points.reduce((s, d) => s + d.fuel_consumption, 0) / points.length;
      return [
        `${Math.round(rpm)} rpm`,
        String(points.length),
        fmt(Math.min(...points.map(d => d.torque)), 1),
        fmt(Math.max(...points.map(d => d.torque)), 1),
        fmt(avg, 1),
      ];
    });
    pdf.addTable(
      ['RPM', 'Nokta', 'Min Tork (Nm)', 'Maks Tork (Nm)', 'Ort. Yakıt (g/h)'],
      rpmSummary,
      {
        colWidths: [CW * 0.15, CW * 0.12, CW * 0.22, CW * 0.22, CW * 0.29],
        boldCols: [4],
        cellColors: { 4: C.amber },
      }
    );

    // Detailed data sample
    if (fuelMap.length > 20) {
      pdf.addNote(`Toplam ${fuelMap.length} veri noktası mevcut. Yukarıda devir bazlı özet gösterilmektedir.`);
    }
  }

  // ── 4. TORQUE CURVES
  if (loadCurves?.length > 0) {
    pdf.newPage();
    pdf.addSectionHeader('Tork Eğrisi Verileri', 4);

    const peakTorque = Math.max(...loadCurves.map(d => d.max_torque || 0));
    const peakRpm = loadCurves.find(d => d.max_torque === peakTorque)?.engine_speed;
    const maxDrag = Math.min(...loadCurves.map(d => d.drag_torque || 0));

    pdf.addKpiRow([
      { label: 'Veri Noktası', value: loadCurves.length, color: C.accent },
      { label: 'Tepe Tork (Nm)', value: fmt(peakTorque, 0), color: C.green },
      { label: 'Tepe Devir (RPM)', value: fmt(peakRpm, 0), color: C.white },
      { label: 'Maks. Drag (Nm)', value: fmt(maxDrag, 0), color: C.red },
    ]);

    pdf.addSubHeader('Full Load & Drag Tork Değerleri');
    // Sample every N points to fit on page
    const step = Math.max(1, Math.floor(loadCurves.length / 30));
    const sampled = loadCurves.filter((_, i) => i % step === 0 || i === loadCurves.length - 1);
    pdf.addTable(
      ['RPM', 'Maks Tork (Nm)', 'Drag Tork (Nm)'],
      sampled.map(d => [
        fmt(d.engine_speed, 0),
        fmt(d.max_torque, 1),
        fmt(d.drag_torque, 1),
      ]),
      {
        colWidths: [CW * 0.3, CW * 0.35, CW * 0.35],
        boldCols: [1],
        cellColors: { 1: C.accent, 2: C.red },
      }
    );
  }

  // ── 5. VECTO RESULTS
  if (outputData?.summary) {
    pdf.newPage();
    pdf.addSectionHeader('VECTO Simülasyon Sonuçları', 5);

    const s = outputData.summary;
    pdf.addKpiRow([
      { label: 'Toplam Sonuç', value: s.total_results, color: C.white },
      { label: 'Ort. CO₂ (g/km)', value: s.co2_avg, color: C.amber },
      { label: 'Min CO₂ (g/km)', value: s.co2_min, color: C.green },
      { label: 'Maks. CO₂ (g/km)', value: s.co2_max, color: C.red },
    ]);

    // Vehicle info
    if (outputData.vehicle) {
      pdf.addSubHeader('VECTO Araç Bilgileri');
      const ov = outputData.vehicle;
      pdf.addKeyValueRows([
        ['Araç Grubu', ov.vehicle_group],
        ['Kategori', ov.vehicle_category],
        ['Motor Gücü', ov.engine_rated_power_kw ? `${ov.engine_rated_power_kw} kW` : null],
        ['Yakıt', ov.fuel_type],
        ['Aks Konfigürasyonu', ov.axle_configuration],
        ['Maks. Yüklü Kütle', ov.tech_max_laden_mass_kg ? `${ov.tech_max_laden_mass_kg} kg` : null],
        ['VECTO Versiyon', ov.tool_version],
      ].filter(([, val]) => val != null));
      pdf.addSpace();
    }

    // Subgroup mission tables
    const MISSION_ORDER = ['Heavy Urban', 'Urban', 'Suburban', 'Interurban', 'Coach'];
    const subgroups = Object.entries(outputData.subgroups || {}).sort(([a], [b]) => a.localeCompare(b));

    subgroups.forEach(([sg, sgData]) => {
      pdf.checkSpace(30);
      pdf.addSubHeader(`${sg} — Ortalama CO₂: ${sgData.co2_avg} g/km`);

      const missions = (sgData.missions || []).sort((a, b) => {
        const mi = MISSION_ORDER.indexOf(a.mission) - MISSION_ORDER.indexOf(b.mission);
        return mi !== 0 ? mi : (a.loading || '').localeCompare(b.loading || '');
      });

      pdf.addTable(
        ['Misyon', 'Yük', 'CO₂ g/km', 'CO₂ g/pkm', 'Yakıt g/km', 'L/100km', 'Enerji MJ/km', 'Hız km/h'],
        missions.map(m => [
          m.mission,
          m.loading?.includes('Low') ? 'LOW' : 'REF',
          fmt(m.co2_g_km),
          fmt(m.co2_g_pkm, 2),
          fmt(m.fc_g_km),
          fmt(m.fc_l_100km, 2),
          fmt(m.energy_mj_km, 2),
          fmt(m.avg_speed),
        ]),
        {
          colWidths: [CW * 0.16, CW * 0.08, CW * 0.12, CW * 0.12, CW * 0.12, CW * 0.12, CW * 0.14, CW * 0.14],
          boldCols: [2],
          cellColors: { 2: C.amber, 4: C.accent },
        }
      );
    });
  }

  pdf.save(`${v.variant_code}_Teknik_Rapor`);
}

/* ═══════════════════════════════════════════════════════════════
   COMPARISON REPORT
   ═══════════════════════════════════════════════════════════════ */
export function generateComparePdf({ variants, insights, specRows, fuelRows }) {
  const pdf = new PdfBuilder('Karşılaştırma Raporu');
  const varNames = variants.map(v => v.model_name || v.variant_code?.substring(0, 12));

  // Cover
  pdf.doc.setFillColor(...C.dark);
  pdf.doc.rect(0, 0, PW, PH, 'F');
  pdf.doc.setFillColor(...C.brand);
  pdf.doc.rect(0, 0, PW, 4, 'F');
  pdf.doc.setFillColor(...C.brand);
  pdf.doc.rect(0, 0, 5, PH, 'F');

  // Logo
  pdf.doc.setFillColor(...C.brand);
  pdf.doc.roundedRect(ML, 50, 44, 44, 4, 4, 'F');
  pdf.doc.setTextColor(...C.white);
  pdf.doc.setFontSize(22);
  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.text('TEMSA', ML + 22, 69, { align: 'center' });
  pdf.doc.setFontSize(8);
  pdf.doc.setFont('helvetica', 'normal');
  pdf.doc.text('DIGITAL TWIN', ML + 22, 78, { align: 'center' });

  pdf.doc.setTextColor(...C.white);
  pdf.doc.setFontSize(28);
  pdf.doc.setFont('helvetica', 'bold');
  pdf.doc.text('Varyant Karşılaştırma Raporu', ML, 120);

  pdf.doc.setFontSize(13);
  pdf.doc.setTextColor(...C.accent);
  pdf.doc.text(`${variants.length} Varyant Analizi`, ML, 132);

  pdf.doc.setDrawColor(...C.brand);
  pdf.doc.setLineWidth(1);
  pdf.doc.line(ML, 140, ML + 80, 140);

  let my = 155;
  variants.forEach((v, i) => {
    const colors = [[96, 165, 250], [52, 211, 153], [251, 191, 36], [248, 113, 113], [167, 139, 250], [244, 114, 182]];
    pdf.doc.setFillColor(...(colors[i] || C.text));
    pdf.doc.circle(ML + 2, my - 1.5, 2, 'F');
    pdf.doc.setFontSize(10);
    pdf.doc.setFont('helvetica', 'bold');
    pdf.doc.setTextColor(...C.text);
    pdf.doc.text(v.model_name || '—', ML + 8, my);
    pdf.doc.setFont('helvetica', 'normal');
    pdf.doc.setFontSize(8);
    pdf.doc.setTextColor(...C.textDim);
    pdf.doc.text(v.variant_code?.substring(0, 24) || '', ML + 8, my + 5);
    my += 14;
  });

  pdf.doc.setFontSize(8);
  pdf.doc.setTextColor(...C.textDim);
  pdf.doc.text('GİZLİ — Şirket İçi Kullanım', PW - MR, PH - 30, { align: 'right' });

  pdf.newPage();

  // ── 1. Specs comparison table
  pdf.addSectionHeader('Teknik Özellik Karşılaştırması', 1);

  if (specRows?.length > 0) {
    const headers = ['Özellik', ...varNames.map(n => n.substring(0, 14))];
    const colW = [CW * 0.22, ...varNames.map(() => (CW * 0.78) / varNames.length)];

    const rows = specRows.map(row => {
      const values = variants.map(v => {
        const val = v.specs[row.key];
        return val != null ? `${val}${row.unit ? ` ${row.unit}` : ''}` : '—';
      });
      return [row.label, ...values];
    });

    pdf.addTable(headers, rows, { colWidths: colW, boldCols: [0] });
  }

  // ── 2. Fuel & Performance stats
  if (fuelRows?.length > 0) {
    pdf.addSpace();
    pdf.addSubHeader('Yakıt & Performans İstatistikleri');

    const headers = ['Metrik', ...varNames.map(n => n.substring(0, 14))];
    const colW = [CW * 0.22, ...varNames.map(() => (CW * 0.78) / varNames.length)];

    const rows = fuelRows.map(row => {
      const values = variants.map(v => {
        const val = row.fn(v);
        return val != null ? String(val) : '—';
      });
      return [row.label, ...values];
    });

    pdf.addTable(headers, rows, { colWidths: colW });
  }

  // ── 3. AI Insights
  if (insights?.length > 0) {
    pdf.checkSpace(20);
    pdf.addSectionHeader('Karşılaştırma Analizi', 2);
    insights.forEach(ins => {
      pdf.addNote(`${ins.icon === 'zap' ? '⚡' : ins.icon === 'fuel' ? '⛽' : '⚙'} ${ins.message}`);
    });
  }

  // ── 4. Per-variant gear ratios
  const hasGears = variants.some(v => v.gear_ratios?.length > 0);
  if (hasGears) {
    pdf.newPage();
    pdf.addSectionHeader('Vites Oranları Karşılaştırması', 3);
    const maxGears = Math.max(...variants.map(v => v.gear_ratios?.length || 0));
    const headers = ['Vites', ...varNames.map(n => n.substring(0, 14))];
    const colW = [CW * 0.18, ...varNames.map(() => (CW * 0.82) / varNames.length)];

    const rows = Array.from({ length: maxGears }, (_, g) => {
      return [
        `${g + 1}. Vites`,
        ...variants.map(v => v.gear_ratios?.[g]?.ratio?.toFixed(4) || '—'),
      ];
    });
    pdf.addTable(headers, rows, { colWidths: colW, boldCols: [...varNames.map((_, i) => i + 1)] });
  }

  pdf.save(`Varyant_Karsilastirma_${variants.length}_arac`);
}

// Alias for VariantList compatibility
export const generateListComparePdf = generateComparePdf;

/* ═══════════════════════════════════════════════════════════════
   HOOKS (for button state)
   ═══════════════════════════════════════════════════════════════ */
export function usePdfState() {
  const [exporting, setExporting] = useState(false);

  const run = useCallback(async (generatorFn, data) => {
    setExporting(true);
    try {
      await new Promise(r => setTimeout(r, 50)); // Let UI update
      generatorFn(data);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setExporting(false);
    }
  }, []);

  return { exporting, run };
}

