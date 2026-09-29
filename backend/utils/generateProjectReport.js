const PDFDocument = require("pdfkit");
const https = require("https");
const http = require("http");
 
// ============================================================
// LAYOUT CONSTANTS
// ============================================================
 
const MARGIN = 45;
const contentWidth = (doc) => doc.page.width - MARGIN * 2;
 
const blockText = (doc, text, options = {}) => {
  doc.text(text, MARGIN, doc.y, { width: contentWidth(doc), ...options });
};
 
// ============================================================
// HELPERS
// ============================================================
 
const safe = (value, fallback = "Not available") => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return String(value);
};
 
const numberOrNull = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
 
const formatNumber = (value, decimals = 1) => {
  const n = numberOrNull(value);
  if (n === null) return "Not available";
  return n.toFixed(decimals);
};
 
// Compact fallback for table cells: narrow numeric/date columns wrap
// ugly and misalign row borders if they have to fit the full
// "Not available" string, so table cells use "N/A" instead.
const tableNumber = (value, decimals = 3) => {
  const n = numberOrNull(value);
  return n === null ? "N/A" : n.toFixed(decimals);
};
 
const tableDate = (value) => {
  const d = formatDate(value);
  return d === "Not available" ? "N/A" : d;
};
 
const formatMeters = (value) => {
  const n = numberOrNull(value);
  if (n === null) return "Not available";
  return `${n.toFixed(1)} m`;
};
 
const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};
 
const formatDateTime = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString("en-IN");
};
 
const getImpactStatus = (score) => {
  const n = numberOrNull(score);
  if (n === null) return "Not available";
  if (n >= 75) return "Good";
  if (n >= 50) return "Moderate";
  if (n >= 25) return "Poor";
  return "Critical";
};
 
const statusColor = (status) => {
  switch (status) {
    case "Good":
      return COLORS.green;
    case "Moderate":
      return COLORS.secondary;
    case "Poor":
      return COLORS.orange;
    case "Critical":
      return COLORS.red;
    default:
      return COLORS.gray;
  }
};
 
const getScore = (value, max) => {
  const n = numberOrNull(value);
  if (n === null) return null;
  return (n / max) * 100;
};
 
const getChange = (before, after) => {
  const b = numberOrNull(before);
  const a = numberOrNull(after);
  if (b === null || a === null) return null;
  return a - b;
};
 
const isRawObjectId = (value) =>
  typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
 
const personName = (person, fallbackLabel = "Not assigned") => {
  if (!person) return fallbackLabel;
  if (typeof person === "object") {
    return safe(person.name || person.fullName, fallbackLabel);
  }
  if (isRawObjectId(person)) {
    return "Assigned (name not loaded)";
  }
  return safe(person, fallbackLabel);
};
 
const classifyNDVI = (ndvi) => {
  const n = numberOrNull(ndvi);
  if (n === null) return "Not available";
  if (n >= 0.6) return "Dense Vegetation";
  if (n >= 0.4) return "Moderate Vegetation";
  if (n >= 0.2) return "Sparse Vegetation";
  if (n >= 0) return "Bare Soil / Minimal Vegetation";
  return "Water / Non-vegetated";
};
 
const classifyNDWI = (ndwi) => {
  const n = numberOrNull(ndwi);
  if (n === null) return "Not available";
  if (n >= 0.3) return "High Water Content";
  if (n >= 0) return "Moderate Water Content";
  return "Low / No Water Content";
};
 
const resolveNdviClass = (satellite) =>
  safe(satellite?.ndviClassification) !== "Not available"
    ? satellite.ndviClassification
    : classifyNDVI(satellite?.ndvi);
 
const resolveNdwiClass = (satellite) =>
  safe(satellite?.ndwiClassification) !== "Not available"
    ? satellite.ndwiClassification
    : classifyNDWI(satellite?.ndwi);
 
const getSatelliteComparisonPair = (
  beforeSatellite,
  afterSatellite,
  satelliteAnalyses = []
) => {
  if (beforeSatellite || afterSatellite) {
    return { before: beforeSatellite || null, after: afterSatellite || null };
  }
 
  if (satelliteAnalyses.length >= 2) {
    const sorted = [...satelliteAnalyses].sort((a, b) => {
      const da = new Date(a.satelliteDate || a.createdAt || 0).getTime();
      const db = new Date(b.satelliteDate || b.createdAt || 0).getTime();
      return da - db;
    });
    return {
      before: sorted[0],
      after: sorted[sorted.length - 1],
      derived: true,
    };
  }
 
  if (satelliteAnalyses.length === 1) {
    return { before: null, after: satelliteAnalyses[0], singleOnly: true };
  }
 
  return { before: null, after: null };
};
 
// ============================================================
// IMAGE DOWNLOADER
// ============================================================
 
const downloadImage = (url) => {
  return new Promise((resolve, reject) => {
    if (!url) {
      return reject(new Error("Image URL not available"));
    }
        if (url.startsWith("data:")) {
      const base64 = url.split(",")[1];
      if (!base64) return reject(new Error("Invalid data URL"));
      return resolve(Buffer.from(base64, "base64"));
    }
 
    const client = url.startsWith("https") ? https : http;
 
    const request = client.get(url, (response) => {
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        return downloadImage(response.headers.location)
          .then(resolve)
          .catch(reject);
      }
 
      if (response.statusCode !== 200) {
        return reject(
          new Error(`Image request failed: ${response.statusCode}`)
        );
      }
 
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    });
 
    request.setTimeout(10000, () => {
      request.destroy(new Error("Image request timed out"));
    });
 
    request.on("error", reject);
  });
};
 
// ============================================================
// PALETTE
// A slightly richer palette than before: the old version only had one
// "brand" blue/teal pair plus flat status colors, so every page looked
// the same regardless of section. Tints (primaryTint, secondaryTint,
// etc.) are now used for soft card/table backgrounds instead of pure
// white or flat gray, which gives the report visual rhythm without
// adding clutter.
// ============================================================
 
const COLORS = {
  primary: "#176B87",
  primaryTint: "#E8F3F6",
  secondary: "#0F9B93",
  secondaryTint: "#E4F7F5",
  dark: "#12343B",
  gray: "#64748B",
  lightGray: "#94A3B8",
  light: "#F8FAFC",
  border: "#E2E8F0",
  green: "#15803D",
  greenTint: "#EAF7EE",
  orange: "#C2620A",
  orangeTint: "#FDF1E4",
  red: "#DC2626",
  redTint: "#FDECEC",
  white: "#FFFFFF",
  zebra: "#F6F8FB",
};
 
// ============================================================
// DRAW HEADER
// FIX (ui/ux): flat single-color band -> a subtle two-tone header with
// a thin accent underline, and the badge is now a real rounded pill
// instead of loose text floating in the corner.
// ============================================================
 
const drawHeader = (doc) => {
  doc.rect(0, 0, doc.page.width, 72).fill(COLORS.primary);
  doc.rect(0, 72, doc.page.width, 3).fill(COLORS.secondary);
 
  doc
    .fillColor(COLORS.white)
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("JalDrishti", 45, 21);
 
  doc
    .fontSize(8.5)
    .font("Helvetica")
    .fillColor("#CFE9EC")
    .text("Watershed Impact Monitoring System", 45, 45);
 
  const badgeText = "SIH26015";
  const badgeWidth = doc.widthOfString(badgeText, { font: "Helvetica-Bold", fontSize: 8.5 }) + 20;
  const badgeX = doc.page.width - MARGIN - badgeWidth;
  doc.roundedRect(badgeX, 24, badgeWidth, 20, 10).fill(COLORS.secondary);
  doc
    .fillColor(COLORS.white)
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .text(badgeText, badgeX, 30, { width: badgeWidth, align: "center" });
};
 
// ============================================================
// SAFE PAGE CREATION
// ============================================================
 
const addPage = (doc) => {
  doc.addPage();
  drawHeader(doc);
  doc.y = 95;
  doc.x = MARGIN;
};
 
// ============================================================
// SECTION TITLE
// FIX (ui/ux): section numbers are now a filled circular badge instead
// of being baked into the heading text, and the divider is a short
// accent rule under the badge+title rather than a full-width line.
// ============================================================
 
const sectionTitle = (doc, number, title) => {
  if (doc.y > doc.page.height - 110) {
    addPage(doc);
  } else {
    doc.moveDown(0.7);
  }
 
  const badgeSize = 22;
  const startY = doc.y;
 
  doc.circle(MARGIN + badgeSize / 2, startY + badgeSize / 2, badgeSize / 2).fill(COLORS.primary);
  doc
    .fillColor(COLORS.white)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(String(number), MARGIN, startY + 6, { width: badgeSize, align: "center" });
 
  doc
    .fillColor(COLORS.dark)
    .font("Helvetica-Bold")
    .fontSize(14)
    .text(title, MARGIN + badgeSize + 10, startY + 3, {
      width: contentWidth(doc) - badgeSize - 10,
    });
 
  doc.y = startY + badgeSize + 6;
 
  doc
    .strokeColor(COLORS.secondary)
    .lineWidth(2.5)
    .moveTo(MARGIN, doc.y)
    .lineTo(MARGIN + 38, doc.y)
    .stroke();
 
  doc.moveDown(0.9);
  doc.x = MARGIN;
};
 
// ============================================================
// FIELD ROW
// FIX (ui/ux): added optional zebra striping so long fact lists (the
// most common element in the report) are easier to scan, matching the
// look of the new satellite table.
// ============================================================
 
let fieldRowIndex = 0;
const resetFieldRowStripe = () => {
  fieldRowIndex = 0;
};
 
const fieldRow = (doc, label, value, options = {}) => {
  const { stripe = false } = options;
  const labelWidth = 150;
  const valueWidth = doc.page.width - MARGIN * 2 - labelWidth - 10;
  const text = safe(value);
 
  const labelHeight = doc.heightOfString(safe(label, ""), { width: labelWidth });
  const valueHeight = doc.heightOfString(text, { width: valueWidth });
  const rowHeight = Math.max(labelHeight, valueHeight, 12) + 8;
 
  if (doc.y + rowHeight > doc.page.height - 60) {
    addPage(doc);
    fieldRowIndex = 0;
  }
 
  const startY = doc.y;
 
  if (stripe && fieldRowIndex % 2 === 1) {
    doc.rect(MARGIN, startY, contentWidth(doc), rowHeight).fill(COLORS.zebra);
  }
  fieldRowIndex += 1;
 
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(COLORS.dark)
    .text(safe(label, ""), MARGIN + 5, startY + 4, { width: labelWidth });
 
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#334155")
    .text(text, MARGIN + labelWidth + 10, startY + 4, { width: valueWidth });
 
  doc.y = startY + rowHeight;
  doc.x = MARGIN;
};
 
// ============================================================
// CARD
// FIX (ui/ux): added a colored left accent bar and an optional status
// color so the three cover-page cards read at a glance (e.g. "Status"
// now visually matches Good/Moderate/Poor/Critical) instead of being
// three identically-styled gray boxes.
// ============================================================
 
const card = (doc, x, y, width, height, title, value, accentColor = COLORS.primary) => {
  doc.roundedRect(x, y, width, height, 8).fillAndStroke(COLORS.light, COLORS.border);
  doc.roundedRect(x, y, 4, height, 2).fill(accentColor);
 
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.gray)
    .text(title.toUpperCase(), x + 16, y + 12, { width: width - 28, characterSpacing: 0.3 });
 
  doc
    .font("Helvetica-Bold")
    .fontSize(19)
    .fillColor(COLORS.dark)
    .text(value, x + 16, y + 30, { width: width - 28, ellipsis: true });
};
 
// ============================================================
// SCORE BAR
// FIX (ui/ux): score value is now a small rounded pill in the
// indicator's own color (instead of plain right-aligned text), and the
// track/fill are slightly taller with rounder ends for a cleaner look.
// ============================================================
 
const scoreColor = (n) =>
  n >= 75 ? COLORS.green : n >= 50 ? COLORS.secondary : n >= 25 ? COLORS.orange : COLORS.red;
 
const scoreBar = (doc, label, score) => {
  const n = numberOrNull(score);
 
  if (doc.y > doc.page.height - 90) {
    addPage(doc);
  }
 
  const rowY = doc.y;
 
  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(COLORS.dark)
    .text(label, MARGIN, rowY, { width: 340 });
 
  const pillColor = n === null ? COLORS.lightGray : scoreColor(n);
  const pillText = n === null ? "N/A" : `${n.toFixed(1)}`;
  const pillWidth = 54;
  doc
    .roundedRect(doc.page.width - MARGIN - pillWidth, rowY - 2, pillWidth, 16, 8)
    .fill(pillColor);
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor(COLORS.white)
    .text(pillText, doc.page.width - MARGIN - pillWidth, rowY + 1, {
      width: pillWidth,
      align: "center",
    });
 
  const barY = rowY + 19;
  const barWidth = contentWidth(doc);
  doc.roundedRect(MARGIN, barY, barWidth, 10, 5).fill(COLORS.border);
 
  if (n !== null) {
    const w = Math.max(4, Math.min(100, n) * (barWidth / 100));
    doc.roundedRect(MARGIN, barY, w, 10, 5).fill(pillColor);
  }
 
  doc.y = barY + 22;
  doc.x = MARGIN;
};
 
// ============================================================
// COMPARISON GRAPH
// FIX (ui/ux): the old version repeated the words "BEFORE"/"AFTER" as
// text next to every single metric (10 text labels total), which is
// what produced the cramped, repetitive look in the exported PDF. This
// version prints ONE legend at the top of the whole chart, and each
// metric row uses small colored swatches instead of repeating text.
// ============================================================
 
const drawComparisonGraph = (doc, before, after) => {
  const metrics = [
    { name: "Water Availability", before: getScore(before?.water, 5), after: getScore(after?.water, 5) },
    { name: "Water Retention", before: getScore(before?.retention, 5), after: getScore(after?.retention, 5) },
    { name: "Field Vegetation", before: numberOrNull(before?.vegetation), after: numberOrNull(after?.vegetation) },
    { name: "Structure Condition", before: getScore(before?.structure, 5), after: getScore(after?.structure, 5) },
    { name: "Maintenance", before: getScore(before?.maintenance, 5), after: getScore(after?.maintenance, 5) },
  ];
 
  const validMetrics = metrics.filter((m) => m.before !== null || m.after !== null);
 
  if (!validMetrics.length) {
    blockText(
      doc,
      "No BEFORE / AFTER survey data available for comparison. Record a BEFORE and an AFTER field survey for this project to unlock indicator-by-indicator comparison here."
    );
    doc.x = MARGIN;
    return;
  }
 
  // Legend (drawn once)
  const legendY = doc.y;
  doc.roundedRect(MARGIN, legendY, 10, 10, 2).fill(COLORS.primary);
  doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.gray).text("BEFORE", MARGIN + 15, legendY + 1);
  doc.roundedRect(MARGIN + 70, legendY, 10, 10, 2).fill(COLORS.secondary);
  doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.gray).text("AFTER", MARGIN + 85, legendY + 1);
  doc.y = legendY + 22;
  doc.x = MARGIN;
 
  const trackWidth = contentWidth(doc) - 90;
  const barHeight = 9;
 
  validMetrics.forEach((metric) => {
    if (doc.y > doc.page.height - 95) {
      addPage(doc);
    }
 
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(COLORS.dark)
      .text(metric.name, MARGIN, doc.y, { width: contentWidth(doc) });
 
    doc.moveDown(0.35);
 
    // BEFORE bar
    doc.roundedRect(MARGIN + 90, doc.y, trackWidth, barHeight, 4).fill(COLORS.border);
    if (metric.before !== null) {
      const w = Math.max(4, (trackWidth * Math.max(0, Math.min(100, metric.before))) / 100);
      doc.roundedRect(MARGIN + 90, doc.y, w, barHeight, 4).fill(COLORS.primary);
    }
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLORS.gray)
      .text(metric.before === null ? "N/A" : metric.before.toFixed(0), MARGIN, doc.y - 1, { width: 82, align: "right" });
    doc.y += barHeight + 4;
 
    // AFTER bar
    doc.roundedRect(MARGIN + 90, doc.y, trackWidth, barHeight, 4).fill(COLORS.border);
    if (metric.after !== null) {
      const w = Math.max(4, (trackWidth * Math.max(0, Math.min(100, metric.after))) / 100);
      doc.roundedRect(MARGIN + 90, doc.y, w, barHeight, 4).fill(COLORS.secondary);
    }
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLORS.gray)
      .text(metric.after === null ? "N/A" : metric.after.toFixed(0), MARGIN, doc.y - 1, { width: 82, align: "right" });
    doc.y += barHeight + 16;
  });
 
  const caption = "Field indicator comparison. Water, retention and structure are normalized from 1-5 to 0-100.";
  const captionHeight = doc.heightOfString(caption, { width: contentWidth(doc) });
 
  if (doc.y + captionHeight > doc.page.height - 60) {
    addPage(doc);
  }
 
  doc.font("Helvetica-Oblique").fontSize(8).fillColor(COLORS.gray).text(caption, MARGIN, doc.y, { width: contentWidth(doc) });
 
  doc.y += captionHeight + 10;
  doc.x = MARGIN;
};
 
// ============================================================
// TABLE
// NEW (ui/ux): generic table renderer, introduced specifically to fix
// the satellite section (see section 6 below), which previously spent
// ~6 full pages repeating the same 6 field labels for every one of the
// 27 satellite records. A compact table with a repeating header row
// fits the same data in a page or two and is far easier to scan.
// ============================================================
 
const drawTable = (doc, columns, rows, options = {}) => {
  const { rowHeight = 18, headerHeight = 20, zebra = true } = options;
  const tableX = MARGIN;
  const tableWidth = contentWidth(doc);
 
  const drawHeaderRow = () => {
    const headerY = doc.y;
    doc.roundedRect(tableX, headerY, tableWidth, headerHeight, 4).fill(COLORS.primary);
    let cx = tableX;
    columns.forEach((col) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(COLORS.white)
        .text(col.header, cx + 6, headerY + 6, { width: col.width - 8, align: col.align || "left" });
      cx += col.width;
    });
    doc.y = headerY + headerHeight;
    doc.x = tableX;
  };
 
  if (doc.y > doc.page.height - (headerHeight + rowHeight * 2 + 60)) {
    addPage(doc);
  }
  drawHeaderRow();
 
  rows.forEach((row, idx) => {
    if (doc.y + rowHeight > doc.page.height - 60) {
      addPage(doc);
      drawHeaderRow();
    }
 
    const rowY = doc.y;
    if (zebra && idx % 2 === 1) {
      doc.rect(tableX, rowY, tableWidth, rowHeight).fill(COLORS.zebra);
    }
 
    let cx = tableX;
    columns.forEach((col) => {
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(col.color ? col.color(row) : "#334155")
        .text(safe(col.value(row)), cx + 6, rowY + 5, {
          width: col.width - 8,
          align: col.align || "left",
          ellipsis: true,
        });
      cx += col.width;
    });
 
    doc
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .moveTo(tableX, rowY + rowHeight)
      .lineTo(tableX + tableWidth, rowY + rowHeight)
      .stroke();
 
    doc.y = rowY + rowHeight;
  });
 
  doc.x = MARGIN;
  doc.moveDown(0.6);
};
 
// ============================================================
// PHOTO
// ============================================================
 
const addPhoto = async (doc, photo, title) => {
  if (!photo?.url) return false;
 
  try {
    const buffer = await downloadImage(photo.url);
 
    if (doc.y > doc.page.height - 300) {
      addPage(doc);
    }
 
    const titleY = doc.y;
    doc
      .roundedRect(MARGIN, titleY, contentWidth(doc), 22, 4)
      .fill(COLORS.primaryTint);
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(COLORS.primary)
      .text(title, MARGIN + 8, titleY + 6, { width: contentWidth(doc) - 16 });
 
    doc.y = titleY + 32;
    doc.x = MARGIN;
 
    const boxY = doc.y;
    doc
      .roundedRect(MARGIN, boxY, contentWidth(doc), 254, 6)
      .fillAndStroke(COLORS.light, COLORS.border);
    doc.image(buffer, MARGIN + 12, boxY + 12, {
      fit: [contentWidth(doc) - 24, 230],
      align: "center",
      valign: "center",
    });
 
    doc.y = boxY + 264;
    doc.x = MARGIN;
 
    resetFieldRowStripe();
    fieldRow(doc, "Photo Type", photo.type, { stripe: true });
    fieldRow(doc, "Captured", formatDateTime(photo.timestamp), { stripe: true });
 
    if (photo.latitude !== null && photo.latitude !== undefined) {
      fieldRow(doc, "GPS", `${photo.latitude}, ${photo.longitude}`, { stripe: true });
    }
 
    if (photo.accuracy !== null && photo.accuracy !== undefined) {
      fieldRow(doc, "GPS Accuracy", formatMeters(photo.accuracy), { stripe: true });
    }
 
    doc.moveDown(0.4);
 
    return true;
  } catch (error) {
    console.log("Photo download failed:", error.message);
 
    if (doc.y > doc.page.height - 80) addPage(doc);
 
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(COLORS.dark)
      .text(title, MARGIN, doc.y, { width: contentWidth(doc) });
 
    doc.moveDown(0.3);
    const boxY = doc.y;
    doc
      .roundedRect(MARGIN, boxY, contentWidth(doc), 26, 4)
      .fill(COLORS.redTint);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.red)
      .text("Photo could not be loaded (image unavailable or unreachable).", MARGIN + 8, boxY + 8, {
        width: contentWidth(doc) - 16,
      });
 
    doc.y = boxY + 36;
    doc.x = MARGIN;
 
    return false;
  }
};
 
// ============================================================
// SATELLITE IMAGE
// ============================================================
 
const addSatelliteImage = async (doc, satellite, title) => {
  const url = satellite?.satelliteImageUrl || satellite?.thumbnailUrl;
 
  if (!url) return false;
 
  try {
    const buffer = await downloadImage(url);
 
    if (doc.y > doc.page.height - 330) {
      addPage(doc);
    }
 
    const titleY = doc.y;
    doc
      .roundedRect(MARGIN, titleY, contentWidth(doc), 24, 4)
      .fill(COLORS.secondaryTint);
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(COLORS.secondary)
      .text(title, MARGIN + 8, titleY + 6, { width: contentWidth(doc) - 16 });
 
    doc.y = titleY + 34;
    doc.x = MARGIN;
 
    const boxY = doc.y;
    doc
      .roundedRect(MARGIN, boxY, contentWidth(doc), 264, 6)
      .fillAndStroke(COLORS.light, COLORS.border);
    doc.image(buffer, MARGIN + 12, boxY + 12, {
      fit: [contentWidth(doc) - 24, 240],
      align: "center",
      valign: "center",
    });
 
    doc.y = boxY + 274;
    doc.x = MARGIN;
 
    resetFieldRowStripe();
    fieldRow(doc, "Satellite Date", formatDate(satellite.satelliteDate), { stripe: true });
    fieldRow(doc, "Source", satellite.source, { stripe: true });
    fieldRow(doc, "NDVI", formatNumber(satellite.ndvi, 3), { stripe: true });
    fieldRow(doc, "NDVI Classification", resolveNdviClass(satellite), { stripe: true });
    fieldRow(doc, "NDWI", formatNumber(satellite.ndwi, 3), { stripe: true });
    fieldRow(doc, "NDWI Classification", resolveNdwiClass(satellite), { stripe: true });
 
    doc.moveDown(0.4);
 
    return true;
  } catch (error) {
    console.log("Satellite image error:", error.message);
 
    if (doc.y > doc.page.height - 80) addPage(doc);
 
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor(COLORS.dark)
      .text(title, MARGIN, doc.y, { width: contentWidth(doc) });
 
    doc.moveDown(0.3);
    const boxY = doc.y;
    doc
      .roundedRect(MARGIN, boxY, contentWidth(doc), 26, 4)
      .fill(COLORS.redTint);
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.red)
      .text("Satellite image could not be loaded.", MARGIN + 8, boxY + 8, {
        width: contentWidth(doc) - 16,
      });
 
    doc.y = boxY + 36;
    doc.x = MARGIN;
 
    resetFieldRowStripe();
    fieldRow(doc, "Satellite Date", formatDate(satellite?.satelliteDate), { stripe: true });
    fieldRow(doc, "NDVI", formatNumber(satellite?.ndvi, 3), { stripe: true });
    fieldRow(doc, "NDVI Classification", resolveNdviClass(satellite), { stripe: true });
 
    return false;
  }
};
 
// ============================================================
// FOOTER
// FIX (ui/ux): thin top rule so the footer reads as a distinct band
// instead of floating text at the bottom edge of the content.
// ============================================================
 
const drawFooter = (doc, pageNumber, totalPages) => {
  const y = doc.page.height - 38;
 
  // FIX: drawing this close to the bottom edge sits inside PDFKit's
  // bottom margin, which silently triggers its auto page-break (a new
  // blank page gets appended every time a footer is drawn). Zeroing
  // the bottom margin for the duration of the footer draw disables
  // that auto-pagination without affecting layout, since nothing here
  // wraps to a second line.
  const originalBottomMargin = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;
 
  doc.strokeColor(COLORS.border).lineWidth(0.5).moveTo(MARGIN, y).lineTo(doc.page.width - MARGIN, y).stroke();
 
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(COLORS.gray)
    .text(
      `JalDrishti  |  SIH26015  |  Watershed Impact Monitoring  |  Page ${pageNumber} of ${totalPages}`,
      MARGIN,
      y + 8,
      { width: contentWidth(doc), align: "center", lineBreak: false }
    );
 
  doc.page.margins.bottom = originalBottomMargin;
};
 
// ============================================================
// DATA AVAILABILITY ROW (icon + label instead of a plain fieldRow)
// NEW (ui/ux): the summary now reads as a checklist with a colored
// dot per item rather than another undifferentiated label/value list.
// ============================================================
 
const availabilityRow = (doc, label, available, detail) => {
  const rowHeight = 20;
  if (doc.y + rowHeight > doc.page.height - 60) addPage(doc);
 
  const y = doc.y;
  const dotColor = available ? COLORS.green : COLORS.lightGray;
  doc.circle(MARGIN + 5, y + 8, 5).fill(dotColor);
 
  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(COLORS.dark)
    .text(label, MARGIN + 18, y + 3, { width: 220 });
 
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(available ? COLORS.green : COLORS.gray)
    .text(detail || (available ? "Available" : "Not available"), MARGIN + 250, y + 3, {
      width: contentWidth(doc) - 250,
      align: "right",
    });
 
  doc.y = y + rowHeight;
  doc.x = MARGIN;
};
 
// ============================================================
// MAIN REPORT
// ============================================================
 
// ============================================================
// MAIN REPORT  (replace ONLY this function in your file;
// all helpers above it stay exactly as they are)
//
// CHANGES:
//  1. Whole body wrapped in try/catch so any throw is logged with
//     its real message + stack instead of hanging the request.
//  2. `stage` variable records the last section reached, so the
//     log tells you exactly where it failed.
//  3. On failure: doc is unpiped, PDF headers are removed, and a
//     JSON 500 with the real message is returned (if nothing has
//     been sent yet), so the app sees a readable error, not [].
// ============================================================

const generateProjectReport = async ({
  project,
  beforeSurvey,
  afterSurvey,
  beforeSatellite,
  afterSatellite,
  satelliteAnalyses = [],
  recommendations = [],
  res,
}) => {
  if (!project) {
    throw new Error("Project data is required");
  }

  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    bufferPages: true,
    autoFirstPage: true,
  });

  const fileName = `${String(project.name || "JalDrishti_Project")
    .replace(/[^a-zA-Z0-9-_]/g, "_")
    .substring(0, 80)}_Report.pdf`;

  let stage = "init";
  let failed = false;

  const handleFailure = (err) => {
    if (failed) return;
    failed = true;

    console.error(`Report generation failed at stage "${stage}":`, err?.message || err);
    console.error(err?.stack);

    try {
      doc.unpipe(res);
    } catch (_) {}

    if (!res.headersSent) {
      res.removeHeader("Content-Type");
      res.removeHeader("Content-Disposition");
      res.status(500).json({
        success: false,
        message: err?.message || "Failed to generate report",
        stage,
      });
    } else {
      res.end();
    }

    try {
      doc.end();
    } catch (_) {}
  };

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  doc.on("error", handleFailure);

  doc.pipe(res);

  try {
    // ============================================================
    // COVER
    // ============================================================

    stage = "cover";

    drawHeader(doc);
    doc.y = 110;
    doc.x = MARGIN;

    doc
      .font("Helvetica-Bold")
      .fontSize(25)
      .fillColor(COLORS.dark)
      .text("Watershed Impact Report", MARGIN, doc.y, { width: contentWidth(doc), align: "center" });

    doc.moveDown(0.4);

    doc
      .font("Helvetica")
      .fontSize(11)
      .fillColor(COLORS.gray)
      .text(
        "SIH26015 - Application of Geospatial Techniques for Watershed Development Outcomes",
        MARGIN,
        doc.y,
        { width: contentWidth(doc), align: "center" }
      );

    doc.moveDown(1.6);

    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .fillColor(COLORS.primary)
      .text(safe(project.name), MARGIN, doc.y, { width: contentWidth(doc), align: "center" });

    doc.moveDown(0.35);

    const locationText = `${safe(project.village)}, ${safe(project.district)}, ${safe(project.state)}`;
    const locWidth = doc.widthOfString(locationText, { font: "Helvetica", fontSize: 10.5 }) + 24;
    doc
      .roundedRect((doc.page.width - locWidth) / 2, doc.y, locWidth, 20, 10)
      .fill(COLORS.primaryTint);
    doc
      .font("Helvetica")
      .fontSize(10.5)
      .fillColor(COLORS.primary)
      .text(locationText, (doc.page.width - locWidth) / 2, doc.y + 5, { width: locWidth, align: "center" });

    doc.y += 44;
    doc.x = MARGIN;

    const projectScore = numberOrNull(project.impactScore) ?? numberOrNull(afterSurvey?.impactScore);
    const status = getImpactStatus(projectScore);

    const cardWidth = (contentWidth(doc) - 20) / 3;
    const cardsY = doc.y;
    card(doc, MARGIN, cardsY, cardWidth, 78, "Impact Score", projectScore === null ? "N/A" : `${projectScore.toFixed(1)}`, COLORS.primary);
    card(doc, MARGIN + cardWidth + 10, cardsY, cardWidth, 78, "Status", status, statusColor(status));
    card(
      doc,
      MARGIN + (cardWidth + 10) * 2,
      cardsY,
      cardWidth,
      78,
      "Surveys",
      String((beforeSurvey ? 1 : 0) + (afterSurvey ? 1 : 0)),
      COLORS.secondary
    );

    doc.y = cardsY + 100;
    doc.x = MARGIN;

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.lightGray)
      .text(`Report generated: ${formatDateTime(new Date())}`, MARGIN, doc.y, {
        width: contentWidth(doc),
        align: "center",
      });

    // ============================================================
    // 1. PROJECT DETAILS
    // ============================================================

    stage = "1-project-info";

    addPage(doc);
    sectionTitle(doc, 1, "Project Information");
    resetFieldRowStripe();

    fieldRow(doc, "Project Name", project.name, { stripe: true });
    fieldRow(doc, "Village", project.village, { stripe: true });
    fieldRow(doc, "District", project.district, { stripe: true });
    fieldRow(doc, "State", project.state, { stripe: true });
    fieldRow(doc, "Project Type", project.type, { stripe: true });
    fieldRow(doc, "Description", project.description, { stripe: true });
    fieldRow(doc, "Implementation Date", formatDate(project.implementationDate), { stripe: true });
    fieldRow(doc, "Deadline", formatDate(project.deadline), { stripe: true });
    fieldRow(doc, "Latitude", project.latitude, { stripe: true });
    fieldRow(doc, "Longitude", project.longitude, { stripe: true });
    fieldRow(doc, "Assigned Officer", personName(project.assignedOfficer), { stripe: true });
    fieldRow(doc, "Assigned Field Worker", personName(project.assignedWorker), { stripe: true });

    // ============================================================
    // 2. IMPACT SCORE
    // ============================================================

    stage = "2-impact-score";

    sectionTitle(doc, 2, "Watershed Impact Assessment");

    scoreBar(doc, "Overall Impact Score", projectScore);

    doc.moveDown(0.3);
    blockText(doc, `Current status: ${status}`);
    doc.x = MARGIN;
    doc.moveDown(1);

    const current = afterSurvey || beforeSurvey;

    if (current) {
      scoreBar(doc, "Water Availability", getScore(current.water, 5));
      scoreBar(doc, "Water Retention", getScore(current.retention, 5));
      scoreBar(doc, "Field Vegetation", current.vegetation);
      scoreBar(doc, "Structure Condition", getScore(current.structure, 5));
      scoreBar(doc, "Maintenance", getScore(current.maintenance, 5));
    } else {
      blockText(doc, "No field survey has been recorded for this project yet.");
      doc.x = MARGIN;
    }

    // ============================================================
    // 3. BEFORE / AFTER GRAPH
    // ============================================================

    stage = "3-comparison-graph";

    sectionTitle(doc, 3, "Before vs After Comparison");
    drawComparisonGraph(doc, beforeSurvey, afterSurvey);

    // ============================================================
    // 4. SURVEY DETAILS
    // ============================================================

    stage = "4-survey-details";

    sectionTitle(doc, 4, "Field Survey Evidence");

    if (beforeSurvey) {
      const titleY = doc.y;
      doc
        .roundedRect(MARGIN, titleY, contentWidth(doc), 22, 4)
        .fill(COLORS.primaryTint);
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(COLORS.primary)
        .text("BEFORE Survey", MARGIN + 8, titleY + 5, { width: contentWidth(doc) - 16 });
      doc.y = titleY + 32;
      doc.x = MARGIN;

      resetFieldRowStripe();
      fieldRow(doc, "Survey Date", formatDateTime(beforeSurvey.createdAt), { stripe: true });
      fieldRow(doc, "GPS", `${safe(beforeSurvey.latitude)}, ${safe(beforeSurvey.longitude)}`, { stripe: true });
      fieldRow(doc, "GPS Accuracy", formatMeters(beforeSurvey.gpsAccuracy), { stripe: true });
      fieldRow(doc, "Impact Score", formatNumber(beforeSurvey.impactScore), { stripe: true });
      fieldRow(doc, "Notes", beforeSurvey.notes, { stripe: true });

      doc.moveDown(0.6);
    }

    if (afterSurvey) {
      const titleY = doc.y;
      doc
        .roundedRect(MARGIN, titleY, contentWidth(doc), 22, 4)
        .fill(COLORS.secondaryTint);
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(COLORS.secondary)
        .text("AFTER Survey", MARGIN + 8, titleY + 5, { width: contentWidth(doc) - 16 });
      doc.y = titleY + 32;
      doc.x = MARGIN;

      resetFieldRowStripe();
      fieldRow(doc, "Survey Date", formatDateTime(afterSurvey.createdAt), { stripe: true });
      fieldRow(doc, "GPS", `${safe(afterSurvey.latitude)}, ${safe(afterSurvey.longitude)}`, { stripe: true });
      fieldRow(doc, "GPS Accuracy", formatMeters(afterSurvey.gpsAccuracy), { stripe: true });
      fieldRow(doc, "Impact Score", formatNumber(afterSurvey.impactScore), { stripe: true });
      fieldRow(doc, "Notes", afterSurvey.notes, { stripe: true });
    }

    if (!beforeSurvey && !afterSurvey) {
      blockText(doc, "No field survey records are currently linked to this project.");
      doc.x = MARGIN;
    }

    // ============================================================
    // 5. FIELD PHOTOS
    // ============================================================

    stage = "5-field-photos";

    const photos = [];

    if (beforeSurvey?.photos?.length) {
      beforeSurvey.photos.forEach((photo) => photos.push({ ...(photo.toObject?.() || photo), surveyType: "BEFORE" }));
    }

    if (afterSurvey?.photos?.length) {
      afterSurvey.photos.forEach((photo) => photos.push({ ...(photo.toObject?.() || photo), surveyType: "AFTER" }));
    }

    if (photos.length) {
      sectionTitle(doc, 5, "Field Worker Photo Evidence");

      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        await addPhoto(doc, photo, `${photo.surveyType} Field Photo ${i + 1}`);
      }
    }

    // ============================================================
    // 6. SATELLITE SECTION
    // ============================================================

    stage = "6-satellite-section";

    sectionTitle(doc, 6, "Satellite / Geospatial Evidence");

    if (satelliteAnalyses && satelliteAnalyses.length) {
      resetFieldRowStripe();
      fieldRow(doc, "Satellite Records", satelliteAnalyses.length, { stripe: true });
      fieldRow(
        doc,
        "Source",
        beforeSatellite?.source || afterSatellite?.source || "Copernicus Sentinel-2 L2A",
        { stripe: true }
      );

      doc.moveDown(0.5);

      const columns = [
        { header: "#", value: (r) => r.idx, width: 24, align: "center" },
        {
          header: "Type",
          value: (r) => r.analysisType || "N/A",
          width: 62,
          color: (r) =>
            r.analysisType === "BEFORE" ? COLORS.primary : r.analysisType === "AFTER" ? COLORS.secondary : COLORS.gray,
        },
        { header: "Date", value: (r) => tableDate(r.satelliteDate), width: 68 },
        { header: "NDVI", value: (r) => tableNumber(r.ndvi, 3), width: 42, align: "right" },
        { header: "NDVI Class", value: (r) => resolveNdviClass(r), width: 118 },
        { header: "NDWI", value: (r) => tableNumber(r.ndwi, 3), width: 42, align: "right" },
        { header: "NDWI Class", value: (r) => resolveNdwiClass(r), width: contentWidth(doc) - (24 + 62 + 68 + 42 + 118 + 42) },
      ];

      // satelliteAnalyses entries are typically Mongoose documents;
      // .toObject() is needed so spreading keeps the schema fields.
      const rows = satelliteAnalyses.map((sat, idx) => ({
        ...(sat.toObject?.() || sat),
        idx: idx + 1,
      }));
      drawTable(doc, columns, rows);

      if (beforeSatellite) {
        await addSatelliteImage(doc, beforeSatellite, "BEFORE Satellite Capture");
      }

      if (afterSatellite) {
        if (doc.y > doc.page.height - 350) addPage(doc);
        await addSatelliteImage(doc, afterSatellite, "AFTER Satellite Capture");
      }

      if (!beforeSatellite && !afterSatellite) {
        blockText(doc, "Satellite records exist, but no satellite image URL was available for either.");
        doc.x = MARGIN;
      }
    } else {
      blockText(doc, "No satellite analysis is currently linked to this project.");
      doc.x = MARGIN;
      doc.moveDown(1);

      resetFieldRowStripe();
      fieldRow(doc, "Project Latitude", project.latitude, { stripe: true });
      fieldRow(doc, "Project Longitude", project.longitude, { stripe: true });
      fieldRow(doc, "Expected Source", "Copernicus Sentinel-2 L2A", { stripe: true });
    }

    // ============================================================
    // 7. SATELLITE COMPARISON
    // ============================================================

    stage = "7-satellite-comparison";

    const comparisonPair = getSatelliteComparisonPair(beforeSatellite, afterSatellite, satelliteAnalyses);

    if (comparisonPair.before || comparisonPair.after) {
      sectionTitle(doc, 7, "Satellite Indicator Comparison");
      resetFieldRowStripe();

      if (comparisonPair.singleOnly) {
        blockText(
          doc,
          "Only one satellite capture is on record, so a before/after change cannot be computed yet. Current reading:"
        );
        doc.x = MARGIN;
        doc.moveDown(0.6);

        fieldRow(doc, "Capture Date", formatDate(comparisonPair.after.satelliteDate), { stripe: true });
        fieldRow(doc, "NDVI", formatNumber(comparisonPair.after.ndvi, 3), { stripe: true });
        fieldRow(doc, "NDVI Classification", resolveNdviClass(comparisonPair.after), { stripe: true });
        fieldRow(doc, "NDWI", formatNumber(comparisonPair.after.ndwi, 3), { stripe: true });
        fieldRow(doc, "NDWI Classification", resolveNdwiClass(comparisonPair.after), { stripe: true });
      } else {
        if (comparisonPair.derived) {
          blockText(
            doc,
            "No records were explicitly tagged BEFORE/AFTER -- comparing the earliest and latest satellite captures on record instead."
          );
          doc.x = MARGIN;
          doc.moveDown(0.6);
        }

        fieldRow(doc, "BEFORE NDVI", formatNumber(comparisonPair.before?.ndvi, 3), { stripe: true });
        fieldRow(doc, "AFTER NDVI", formatNumber(comparisonPair.after?.ndvi, 3), { stripe: true });

        const ndviChange = getChange(comparisonPair.before?.ndvi, comparisonPair.after?.ndvi);
        fieldRow(doc, "NDVI Change", ndviChange === null ? "Not available" : ndviChange.toFixed(3), { stripe: true });

        fieldRow(doc, "BEFORE NDVI Class", resolveNdviClass(comparisonPair.before || {}), { stripe: true });
        fieldRow(doc, "AFTER NDVI Class", resolveNdviClass(comparisonPair.after || {}), { stripe: true });

        doc.moveDown(0.4);

        fieldRow(doc, "BEFORE NDWI", formatNumber(comparisonPair.before?.ndwi, 3), { stripe: true });
        fieldRow(doc, "AFTER NDWI", formatNumber(comparisonPair.after?.ndwi, 3), { stripe: true });

        const ndwiChange = getChange(comparisonPair.before?.ndwi, comparisonPair.after?.ndwi);
        fieldRow(doc, "NDWI Change", ndwiChange === null ? "Not available" : ndwiChange.toFixed(3), { stripe: true });
      }
    }

   

    
// ============================================================
// 8. RECOMMENDATIONS
// ============================================================

stage = "8-recommendations";

sectionTitle(doc, 8, "Recommendations");

if (recommendations && recommendations.length) {
  recommendations.forEach((recommendation, index) => {
    // --------------------------------------------------------
    // Normalize recommendation data
    // --------------------------------------------------------

    const isObject =
      recommendation &&
      typeof recommendation === "object" &&
      !Array.isArray(recommendation);

    const severity = isObject
      ? safe(recommendation.severity, "GENERAL").toUpperCase()
      : "GENERAL";

    const title = isObject
      ? safe(
          recommendation.title ||
            recommendation.recommendation ||
            recommendation.message ||
            recommendation.text,
          "Recommendation"
        )
      : "Recommendation";

    const reason = isObject
      ? recommendation.reason
      : null;

    const action = isObject
      ? recommendation.action
      : null;

    const category = isObject
      ? recommendation.category
      : null;

    // If recommendation is simply a string
    const simpleText =
      typeof recommendation === "string"
        ? recommendation
        : null;

    // --------------------------------------------------------
    // Severity styling
    // --------------------------------------------------------

    let severityColor = COLORS.primary;
    let severityTint = COLORS.primaryTint;

    if (severity === "HIGH" || severity === "CRITICAL") {
      severityColor = COLORS.red;
      severityTint = COLORS.redTint;
    } else if (severity === "MEDIUM" || severity === "MODERATE") {
      severityColor = COLORS.orange;
      severityTint = COLORS.orangeTint;
    } else if (severity === "LOW") {
      severityColor = COLORS.secondary;
      severityTint = COLORS.secondaryTint;
    }

    // --------------------------------------------------------
    // Calculate card height
    // --------------------------------------------------------

    const textWidth = contentWidth(doc) - 36;

    let calculatedHeight = 0;

    if (simpleText) {
      calculatedHeight = doc.heightOfString(simpleText, {
        width: textWidth,
        font: "Helvetica",
        fontSize: 9.5,
      }) + 24;
    } else {
      calculatedHeight += 32; // title/severity area

      if (reason) {
        calculatedHeight +=
          doc.heightOfString(String(reason), {
            width: textWidth,
            font: "Helvetica",
            fontSize: 9,
          }) + 18;
      }

      if (action) {
        calculatedHeight +=
          doc.heightOfString(String(action), {
            width: textWidth,
            font: "Helvetica",
            fontSize: 9,
          }) + 24;
      }

      if (category) {
        calculatedHeight += 22;
      }
    }

    const cardHeight = Math.max(calculatedHeight, 65);

    if (doc.y + cardHeight > doc.page.height - 60) {
      addPage(doc);
    }

    const cardY = doc.y;

    // --------------------------------------------------------
    // Main card
    // --------------------------------------------------------

    doc
      .roundedRect(
        MARGIN,
        cardY,
        contentWidth(doc),
        cardHeight,
        8
      )
      .fillAndStroke(COLORS.white, COLORS.border);

    // Left severity strip
    doc
      .roundedRect(
        MARGIN,
        cardY,
        5,
        cardHeight,
        3
      )
      .fill(severityColor);

    // --------------------------------------------------------
    // Number circle
    // --------------------------------------------------------

    doc
      .circle(
        MARGIN + 20,
        cardY + 20,
        10
      )
      .fill(COLORS.primary);

    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(COLORS.white)
      .text(
        String(index + 1),
        MARGIN + 10,
        cardY + 15,
        {
          width: 20,
          align: "center",
          lineBreak: false,
        }
      );

    // --------------------------------------------------------
    // Severity badge
    // --------------------------------------------------------

    const severityTextWidth =
      doc.widthOfString(severity, {
        font: "Helvetica-Bold",
        fontSize: 7.5,
      }) + 16;

    doc
      .roundedRect(
        MARGIN + 38,
        cardY + 9,
        severityTextWidth,
        18,
        9
      )
      .fill(severityTint);

    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor(severityColor)
      .text(
        severity,
        MARGIN + 38,
        cardY + 14,
        {
          width: severityTextWidth,
          align: "center",
          lineBreak: false,
        }
      );

    // --------------------------------------------------------
    // Title
    // --------------------------------------------------------

    if (title) {
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor(COLORS.dark)
        .text(
          title,
          MARGIN + 38 + severityTextWidth + 10,
          cardY + 12,
          {
            width:
              contentWidth(doc) -
              48 -
              severityTextWidth,
            lineBreak: false,
            ellipsis: true,
          }
        );
    }

    // --------------------------------------------------------
    // Simple string recommendation
    // --------------------------------------------------------

    if (simpleText) {
      doc
        .font("Helvetica")
        .fontSize(9.5)
        .fillColor("#334155")
        .text(
          simpleText,
          MARGIN + 36,
          cardY + 36,
          {
            width: textWidth,
          }
        );
    } else {
      let currentY = cardY + 38;

      // ------------------------------------------------------
      // Reason
      // ------------------------------------------------------

      if (reason) {
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(COLORS.gray)
          .text(
            "Why",
            MARGIN + 36,
            currentY,
            {
              width: 35,
              lineBreak: false,
            }
          );

        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#334155")
          .text(
            String(reason),
            MARGIN + 70,
            currentY,
            {
              width: contentWidth(doc) - 106,
            }
          );

        const reasonHeight = doc.heightOfString(
          String(reason),
          {
            width: contentWidth(doc) - 106,
            font: "Helvetica",
            fontSize: 9,
          }
        );

        currentY += reasonHeight + 10;
      }

      // ------------------------------------------------------
      // Action
      // ------------------------------------------------------

      if (action) {
        doc
          .font("Helvetica-Bold")
          .fontSize(8.5)
          .fillColor(severityColor)
          .text(
            "Action",
            MARGIN + 36,
            currentY,
            {
              width: 40,
              lineBreak: false,
            }
          );

        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#334155")
          .text(
            String(action),
            MARGIN + 76,
            currentY,
            {
              width: contentWidth(doc) - 112,
            }
          );

        const actionHeight = doc.heightOfString(
          String(action),
          {
            width: contentWidth(doc) - 112,
            font: "Helvetica",
            fontSize: 9,
          }
        );

        currentY += actionHeight + 10;
      }

      // ------------------------------------------------------
      // Category
      // ------------------------------------------------------

      if (category) {
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor(COLORS.lightGray)
          .text(
            `Category: ${String(category).replace(/_/g, " ")}`,
            MARGIN + 36,
            cardY + cardHeight - 16,
            {
              width: textWidth,
              lineBreak: false,
            }
          );
      }
    }

    doc.y = cardY + cardHeight + 10;
    doc.x = MARGIN;
  });
} else {
  // ----------------------------------------------------------
  // No recommendations
  // ----------------------------------------------------------

  const message =
    "No specific recommendations were generated because sufficient BEFORE/AFTER survey data is not currently available.";

  const messageHeight =
    doc.heightOfString(message, {
      width: contentWidth(doc) - 20,
      font: "Helvetica",
      fontSize: 9.5,
    }) + 20;

  doc
    .roundedRect(
      MARGIN,
      doc.y,
      contentWidth(doc),
      messageHeight,
      6
    )
    .fillAndStroke(COLORS.light, COLORS.border);

  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor(COLORS.gray)
    .text(
      message,
      MARGIN + 10,
      doc.y + 10,
      {
        width: contentWidth(doc) - 20,
      }
    );

  doc.y += messageHeight + 10;
  doc.x = MARGIN;
}
// ============================================================
    // 9. DATA AVAILABILITY
    // ============================================================

    stage = "9-data-availability";

    sectionTitle(doc, 9, "Data Availability Summary");

    availabilityRow(doc, "Project Information", true);
    availabilityRow(doc, "BEFORE Field Survey", Boolean(beforeSurvey));
    availabilityRow(doc, "AFTER Field Survey", Boolean(afterSurvey));
    availabilityRow(doc, "Field Worker Photos", photos.length > 0, photos.length ? `${photos.length} photo(s)` : null);
    availabilityRow(doc, "BEFORE Satellite", Boolean(beforeSatellite));
    availabilityRow(doc, "AFTER Satellite", Boolean(afterSatellite));
    availabilityRow(doc, "Satellite Records", satelliteAnalyses.length > 0, String(satelliteAnalyses.length));

    doc.moveDown(0.8);

    const noteText =
      "Note: 'Not available' means that the corresponding record has not been stored for this project. It does not indicate that the project itself is invalid.";
    const noteHeight = doc.heightOfString(noteText, { width: contentWidth(doc) - 16 }) + 16;
    if (doc.y + noteHeight > doc.page.height - 60) addPage(doc);

    doc.roundedRect(MARGIN, doc.y, contentWidth(doc), noteHeight, 4).fill(COLORS.zebra);
    doc
      .font("Helvetica-Oblique")
      .fontSize(8.5)
      .fillColor(COLORS.gray)
      .text(noteText, MARGIN + 8, doc.y + 8, { width: contentWidth(doc) - 16 });

    // ============================================================
    // FINALIZE FOOTERS WITH REAL PAGE NUMBERS
    // ============================================================

    stage = "footers";

    const range = doc.bufferedPageRange();
    const totalPages = range.count;

    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      drawFooter(doc, i + 1, totalPages);
    }

    stage = "finalize";
    doc.end();
    console.log("Report generated successfully:", fileName);
  } catch (err) {
    handleFailure(err);
  }
};

  
module.exports = generateProjectReport;