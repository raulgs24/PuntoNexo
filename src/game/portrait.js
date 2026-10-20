// Fotografía de carné en blanco y negro, dibujada a partir de los rasgos del huésped.

function shade(v) {
  const c = Math.round(Math.max(0, Math.min(1, v)) * 255);
  return `rgb(${c},${c},${c})`;
}

export function drawPortrait(canvas, t, seed = 1) {
  const w = (canvas.width = 240);
  const h = (canvas.height = 300);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createRadialGradient(w / 2, h * 0.4, 20, w / 2, h / 2, w);
  bg.addColorStop(0, '#9a968d');
  bg.addColorStop(1, '#3d3b37');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const cx = w / 2;
  const faceW = t.gender === 'f' ? 50 : 56;
  const faceH = 68;
  const faceY = 130;

  // Hombros y abrigo
  ctx.fillStyle = t.bellhop ? '#3a3a3a' : shade(t.coat * 0.9);
  ctx.beginPath();
  ctx.moveTo(cx - 105 * (t.build || 1), h);
  ctx.quadraticCurveTo(cx - 95, 225, cx - 30, 212);
  ctx.lineTo(cx + 30, 212);
  ctx.quadraticCurveTo(cx + 95, 225, cx + 105 * (t.build || 1), h);
  ctx.fill();
  // Camisa y corbata
  ctx.fillStyle = '#d8d4cc';
  ctx.beginPath();
  ctx.moveTo(cx - 22, 212);
  ctx.lineTo(cx, 265);
  ctx.lineTo(cx + 22, 212);
  ctx.fill();
  if (t.tie) {
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(cx - 5, 215, 10, 50);
  }
  // Cuello
  ctx.fillStyle = shade(t.skin * 0.85);
  ctx.fillRect(cx - 16, 185, 32, 32);

  // Melena trasera
  const hair = t.hairDark ? '#141414' : '#8a8780';
  if (t.gender === 'f' && t.hat !== 'cloche') {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(cx, faceY + 10, faceW + 14, faceH + 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cara
  ctx.fillStyle = shade(t.skin);
  ctx.beginPath();
  ctx.ellipse(cx, faceY, faceW, faceH, 0, 0, Math.PI * 2);
  ctx.fill();
  // Sombra lateral
  const fg = ctx.createLinearGradient(cx - faceW, 0, cx + faceW, 0);
  fg.addColorStop(0, 'rgba(0,0,0,0)');
  fg.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.ellipse(cx, faceY, faceW, faceH, 0, 0, Math.PI * 2);
  ctx.fill();

  // Pelo superior
  if (t.hat === 'none' || t.bellhop) {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(cx, faceY - 42, faceW + 4, 34, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - faceW - 4, faceY - 44, 12, 30);
    ctx.fillRect(cx + faceW - 8, faceY - 44, 12, 30);
  }

  // Ojos y cejas
  ctx.fillStyle = '#111';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + s * 21, faceY - 8, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx + s * 21 - 11, faceY - 23, 22, 3);
  }
  // Nariz y boca
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + 2, faceY - 4);
  ctx.lineTo(cx + 6, faceY + 18);
  ctx.lineTo(cx - 2, faceY + 20);
  ctx.stroke();
  ctx.fillStyle = '#3a2f2f';
  ctx.fillRect(cx - 14, faceY + 34, 28, 3);

  if (t.mustache) {
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.ellipse(cx, faceY + 27, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (t.glasses) {
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 3;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(cx + s * 21, faceY - 8, 14, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - 7, faceY - 9);
    ctx.lineTo(cx + 7, faceY - 9);
    ctx.stroke();
  }

  // Sombreros
  const hatC = t.bellhop ? '#3a3a3a' : shade(Math.max(0.04, t.coat - 0.08));
  ctx.fillStyle = hatC;
  if (t.bellhop) {
    ctx.fillRect(cx - 10, faceY - 96, 52, 26);
    ctx.fillStyle = '#b8b0a0';
    ctx.fillRect(cx - 10, faceY - 74, 52, 5);
  } else if (t.hat === 'fedora') {
    ctx.beginPath();
    ctx.ellipse(cx, faceY - 50, 92, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - 52, faceY - 50);
    ctx.lineTo(cx - 46, faceY - 108);
    ctx.quadraticCurveTo(cx, faceY - 92, cx + 46, faceY - 108);
    ctx.lineTo(cx + 52, faceY - 50);
    ctx.fill();
    ctx.fillStyle = '#080808';
    ctx.fillRect(cx - 52, faceY - 66, 104, 12);
  } else if (t.hat === 'bowler') {
    ctx.beginPath();
    ctx.ellipse(cx, faceY - 50, 74, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, faceY - 52, 54, 52, 0, Math.PI, 0);
    ctx.fill();
  } else if (t.hat === 'cloche') {
    ctx.beginPath();
    ctx.ellipse(cx, faceY - 34, faceW + 16, 58, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - faceW - 22, faceY - 30);
    ctx.quadraticCurveTo(cx, faceY - 16, cx + faceW + 22, faceY - 30);
    ctx.lineTo(cx + faceW + 14, faceY - 42);
    ctx.lineTo(cx - faceW - 14, faceY - 42);
    ctx.fill();
  }

  // Grano fotográfico y desgaste
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const img = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rnd() - 0.5) * 38;
    const l = img.data[i] * 0.3 + img.data[i + 1] * 0.59 + img.data[i + 2] * 0.11 + n;
    img.data[i] = l * 1.02;
    img.data[i + 1] = l * 0.98;
    img.data[i + 2] = l * 0.9;
  }
  ctx.putImageData(img, 0, 0);
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    const x = rnd() * w;
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (rnd() - 0.5) * 40, h);
    ctx.stroke();
  }
}
