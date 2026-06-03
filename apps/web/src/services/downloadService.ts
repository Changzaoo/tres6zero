function extensionFromContentType(contentType: string) {
  if (contentType.includes('mp4')) return '.mp4';
  if (contentType.includes('webm')) return '.webm';
  if (contentType.includes('quicktime')) return '.mov';
  return '';
}

function extensionFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const match = /\.(mp4|webm|mov)(?:$|\?)/i.exec(pathname);
    return match ? `.${match[1].toLowerCase()}` : '';
  } catch {
    return '';
  }
}

function safeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90)
    || 'six3-video';
}

function withExtension(fileName: string, extension: string) {
  return /\.[a-z0-9]{2,5}$/i.test(fileName) || !extension
    ? fileName
    : `${fileName}${extension}`;
}

function clickDownloadLink(url: string, fileName: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadUrlAsFile(url: string, suggestedName: string) {
  if (!url) throw new Error('DOWNLOAD_URL_REQUIRED');

  const response = await fetch(url, { mode: 'cors', cache: 'no-store' });
  if (!response.ok) throw new Error(`DOWNLOAD_FAILED_${response.status}`);

  const contentType = response.headers.get('content-type') || '';
  const extension = extensionFromUrl(url) || extensionFromContentType(contentType) || '.mp4';
  const fileName = withExtension(safeFileName(suggestedName), extension);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    clickDownloadLink(objectUrl, fileName);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  }
}
