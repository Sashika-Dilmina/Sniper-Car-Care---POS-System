import QRCode from 'qrcode';

function drawRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }
}

export async function downloadBathaqueCardImage(customer) {
  if (!customer || !customer.bathaque_id) {
    throw new Error('Customer does not have a Bathaque ID');
  }

  const bathaqueId = customer.bathaque_id;
  const customerName = customer.name || 'Valued Customer';
  const vehiclePlate = customer.vehicle_plate || '';
  const vehicleType = customer.vehicle_type || '';
  const washStamps = Number(customer.wash_stamps || customer.bathaque_loyalty?.wash_stamps) || 0;

  // 1. Generate QR Data URL
  const qrDataUrl = await QRCode.toDataURL(bathaqueId, {
    width: 400,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'H'
  });

  // 2. Create Canvas (600 x 780 px)
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 780;
  const ctx = canvas.getContext('2d');

  // Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 600, 780);
  bgGrad.addColorStop(0, '#0a0f1d');
  bgGrad.addColorStop(0.5, '#131b2e');
  bgGrad.addColorStop(1, '#020617');
  ctx.fillStyle = bgGrad;
  drawRoundRect(ctx, 0, 0, 600, 780, 28);
  ctx.fill();

  // Red Accent Border
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#dc2626';
  drawRoundRect(ctx, 10, 10, 580, 760, 22);
  ctx.stroke();

  // Top Header Ribbon
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ef4444';
  ctx.font = '900 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('SNIPER CAR CARE · VIP LOYALTY CLUB', 300, 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 24px system-ui, -apple-system, sans-serif';
  ctx.fillText('BATHAQUE LOYALTY PASS', 300, 80);

  // Customer Name & Vehicle Plate
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('PASS HOLDER', 300, 110);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
  ctx.fillText(customerName, 300, 136);

  if (vehiclePlate) {
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`${vehiclePlate}${vehicleType ? ' · ' + vehicleType : ''}`, 300, 160);
  }

  // Draw QR Image inside a crisp white card
  const qrImg = new Image();
  await new Promise((resolve, reject) => {
    qrImg.onload = resolve;
    qrImg.onerror = reject;
    qrImg.src = qrDataUrl;
  });

  ctx.fillStyle = '#ffffff';
  drawRoundRect(ctx, 160, 185, 280, 280, 20);
  ctx.fill();
  ctx.drawImage(qrImg, 172, 197, 256, 256);

  // Bathaque ID Pill
  ctx.fillStyle = '#dc2626';
  drawRoundRect(ctx, 140, 482, 320, 44, 14);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 19px monospace';
  ctx.fillText(bathaqueId, 300, 511);

  // 5 Stamp Circles + Free Wash Row
  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(`PUNCH CARD: ${washStamps >= 5 ? 5 : washStamps} / 5 STAMPS EARNED`, 300, 560);

  const startX = 85;
  const slotW = 70;
  for (let i = 1; i <= 5; i++) {
    const cx = startX + (i - 1) * slotW + 25;
    const cy = 605;
    const earned = washStamps >= i;

    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.fillStyle = earned ? '#10b981' : '#1e293b';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = earned ? '#059669' : '#475569';
    ctx.stroke();

    ctx.fillStyle = earned ? '#ffffff' : '#64748b';
    ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
    ctx.fillText(earned ? '✓' : `${i}`, cx, cy + 5);
  }

  // 6th Free Wash Slot
  const freeCx = startX + 5 * slotW + 25;
  const freeCy = 605;
  const isFree = washStamps >= 5;

  ctx.beginPath();
  ctx.arc(freeCx, freeCy, 24, 0, Math.PI * 2);
  ctx.fillStyle = isFree ? '#f59e0b' : '#334155';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = isFree ? '#d97706' : '#64748b';
  ctx.stroke();

  ctx.fillStyle = isFree ? '#ffffff' : '#94a3b8';
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.fillText('🎁', freeCx, freeCy + 6);

  // Instructions Footer
  ctx.fillStyle = '#64748b';
  ctx.font = '11px system-ui, -apple-system, sans-serif';
  ctx.fillText('Present this QR code at Sniper Car Care to record your wash.', 300, 680);
  ctx.fillText('Earn 1 stamp per wash · 6th wash is 100% FREE', 300, 700);

  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  ctx.fillText('snipercarcare.com', 300, 735);

  // 3. Trigger Browser Download
  const link = document.createElement('a');
  const cleanName = (customerName || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `Sniper_Loyalty_Card_${bathaqueId}_${cleanName}.png`;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
