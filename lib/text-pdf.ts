function escapePdf(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export function textPdf(lines: string[]): Buffer {
  const ops = ["BT", "/F1 11 Tf", "50 800 Td", "15 TL"];
  for (const line of lines) {
    ops.push(`(${escapePdf(line)}) Tj`, "T*");
  }
  ops.push("ET");
  const stream = ops.join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];
  let offset = "%PDF-1.4\n".length;
  const offsets = [0];
  let body = "%PDF-1.4\n";
  for (const object of objects) {
    offsets.push(offset);
    body += object;
    offset += Buffer.byteLength(object);
  }
  const xrefStart = offset;
  let xref = `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(body + xref + trailer, "latin1");
}
