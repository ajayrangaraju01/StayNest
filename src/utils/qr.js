/**
 * Authentic ISO/IEC 18004 Compliant Vector QR Code Engine (Adopted from YouPI-PG).
 * Zero external dependencies. Generates crisp, mathematically precise SVGs for all UPI apps.
 */
import qrcode from './qr-lib.js';

export class QrCode {
  /**
   * Generates a 2D binary matrix for the input text.
   * @param {string} text
   * @param {'L'|'M'|'Q'|'H'} [errorCorrection='M']
   * @returns {number[][]} 2D matrix (1 = dark, 0 = light)
   */
  static encode(text, errorCorrection = 'M') {
    const qr = qrcode(0, errorCorrection);
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const matrix = [];
    for (let r = 0; r < count; r++) {
      const row = [];
      for (let c = 0; c < count; c++) {
        row.push(qr.isDark(r, c) ? 1 : 0);
      }
      matrix.push(row);
    }
    return matrix;
  }
}

/**
 * Generates valid, crisp SVG markup for an authentic QR Code.
 * @param {string} text
 * @param {number} [boxSize=240]
 * @param {'L'|'M'|'Q'|'H'} [errorCorrection='M']
 * @returns {string} SVG markup string
 */
export function generateQrSvg(text, boxSize = 240, errorCorrection = 'M') {
  const matrix = QrCode.encode(text, errorCorrection);
  const numModules = matrix.length;
  const moduleSize = boxSize / numModules;

  let rects = '';
  for (let r = 0; r < numModules; r++) {
    for (let c = 0; c < numModules; c++) {
      if (matrix[r][c] === 1) {
        const x = (c * moduleSize).toFixed(2);
        const y = (r * moduleSize).toFixed(2);
        const s = (moduleSize + 0.05).toFixed(2);
        rects += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#1c1917" />\n`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${boxSize} ${boxSize}" width="100%" height="100%" shape-rendering="crispEdges">
  <rect width="${boxSize}" height="${boxSize}" fill="#ffffff" rx="8" />
  ${rects}
</svg>`;
}

/**
 * Generates an SVG DataURL for easy use in <img src="..." />
 * Returns a Promise for compatibility with async caller chains.
 */
export function generateQrDataUrl(text, options = {}) {
  try {
    const boxSize = options.width || 240;
    const svg = generateQrSvg(text, boxSize, options.errorCorrectionLevel || 'M');
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    return Promise.resolve(dataUrl);
  } catch (err) {
    return Promise.reject(err);
  }
}

export default {
  QrCode,
  generateQrSvg,
  generateQrDataUrl,
};
