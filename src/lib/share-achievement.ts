'use client';

export type AchievementCardPayload = {
  title: string;
  subtitle: string;
  primaryValue: string;
  primaryLabel: string;
  secondaryValue?: string;
  footer?: string;
  accentFrom?: string;
  accentTo?: string;
  badge?: string;
  avatarLabel?: string;
  filename?: string;
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [meta, base64] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] ?? 'image/png';
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new File([bytes], fileName, { type: mime });
}

export async function renderAchievementCard(payload: AchievementCardPayload) {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas no disponible.');
  }

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#020617');
  gradient.addColorStop(0.45, '#0f172a');
  gradient.addColorStop(1, '#111827');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const glow = ctx.createRadialGradient(780, 340, 40, 780, 340, 540);
  glow.addColorStop(0, `${payload.accentFrom ?? '#38bdf8'}55`);
  glow.addColorStop(1, '#00000000');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const panelX = 72;
  const panelY = 96;
  const panelW = canvas.width - 144;
  const panelH = canvas.height - 192;

  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  roundRect(ctx, panelX, panelY, panelW, panelH, 44);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const accent = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY + 220);
  accent.addColorStop(0, payload.accentFrom ?? '#38bdf8');
  accent.addColorStop(1, payload.accentTo ?? '#34d399');
  ctx.fillStyle = accent;
  roundRect(ctx, panelX + 28, panelY + 28, panelW - 56, 220, 34);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.96)';
  ctx.font = '700 34px Inter, Arial, sans-serif';
  ctx.fillText('BioAvatar', panelX + 64, panelY + 92);
  ctx.font = '600 20px Inter, Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.76)';
  ctx.fillText(payload.badge ?? 'Achievement Card', panelX + 64, panelY + 128);

  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.beginPath();
  ctx.arc(panelX + panelW - 112, panelY + 112, 58, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 44px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((payload.avatarLabel ?? 'B').slice(0, 1).toUpperCase(), panelX + panelW - 112, panelY + 112);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 72px Inter, Arial, sans-serif';
  const titleLines = wrapText(ctx, payload.title, panelW - 120);
  let cursorY = panelY + 380;
  titleLines.slice(0, 2).forEach((line) => {
    ctx.fillText(line, panelX + 60, cursorY);
    cursorY += 82;
  });

  ctx.fillStyle = 'rgba(226,232,240,0.86)';
  ctx.font = '600 32px Inter, Arial, sans-serif';
  const subtitleLines = wrapText(ctx, payload.subtitle, panelW - 120);
  subtitleLines.slice(0, 3).forEach((line) => {
    ctx.fillText(line, panelX + 60, cursorY + 12);
    cursorY += 48;
  });

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 184px Inter, Arial, sans-serif';
  ctx.fillText(payload.primaryValue, panelX + 60, panelY + 910);

  ctx.fillStyle = 'rgba(226,232,240,0.78)';
  ctx.font = '700 30px Inter, Arial, sans-serif';
  ctx.fillText(payload.primaryLabel.toUpperCase(), panelX + 66, panelY + 970);

  if (payload.secondaryValue) {
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    roundRect(ctx, panelX + 56, panelY + 1050, panelW - 112, 160, 30);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '700 42px Inter, Arial, sans-serif';
    const secondaryLines = wrapText(ctx, payload.secondaryValue, panelW - 180);
    secondaryLines.slice(0, 3).forEach((line, index) => {
      ctx.fillText(line, panelX + 84, panelY + 1120 + index * 48);
    });
  }

  ctx.fillStyle = 'rgba(226,232,240,0.7)';
  ctx.font = '600 28px Inter, Arial, sans-serif';
  const footer = payload.footer ?? 'Compartido desde BioAvatar';
  ctx.fillText(footer, panelX + 60, panelY + panelH - 82);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRect(ctx, panelX + panelW - 238, panelY + panelH - 132, 176, 64, 22);
  ctx.fill();
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 24px Inter, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('coach-mascota', panelX + panelW - 150, panelY + panelH - 92);

  const dataUrl = canvas.toDataURL('image/png');
  return {
    dataUrl,
    file: dataUrlToFile(dataUrl, payload.filename ?? 'bioavatar-achievement.png'),
  };
}

export async function shareAchievementCard(payload: AchievementCardPayload) {
  const rendered = await renderAchievementCard(payload);

  if (navigator.share && navigator.canShare?.({ files: [rendered.file] })) {
    await navigator.share({
      title: payload.title,
      text: payload.subtitle,
      files: [rendered.file],
    });
    return { mode: 'native-share' as const };
  }

  const link = document.createElement('a');
  link.href = rendered.dataUrl;
  link.download = payload.filename ?? 'bioavatar-achievement.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { mode: 'download' as const };
}
