// Thin wrappers over the page's host, so views never reach for window.claude themselves.
// Inside claude.ai the page runs in a sandboxed frame that blocks ordinary downloads;
// opened as a plain file it is an ordinary web page.

/** The host API when the page runs as a Claude artifact, else null. */
export function getClaude() {
  if (typeof window === 'undefined') return null;
  const c = window.claude;
  return c && typeof c.use === 'function' ? c : null;
}

/** True when the page is framed by another page (the artifact viewer). */
export function isEmbedded() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);
}

/**
 * Offer a generated text file to the user.
 * @param {{filename: string, text: string, mime?: string}} file
 * @returns {Promise<'saved'|'declined'|'unavailable'>} 'unavailable' means the caller
 *   should fall back to showing the text with a copy button.
 */
export async function saveFile({ filename, text, mime = 'application/octet-stream' }) {
  const claude = getClaude();
  if (claude) {
    let downloads = null;
    try {
      downloads = await withTimeout(claude.use('downloads'), 4000);
    } catch {
      downloads = null;
    }
    if (downloads) {
      try {
        await downloads.save({ filename, data: text });
        return 'saved';
      } catch (e) {
        return e && e.code === 'declined' ? 'declined' : 'unavailable';
      }
    }
  }
  if (isEmbedded()) return 'unavailable';
  try {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return 'saved';
  } catch {
    return 'unavailable';
  }
}

/** Read a user-chosen file as text. Rejects with a plain-sentence Error. */
export function readFileText(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file was chosen.'));
    if (file.size > 20 * 1024 * 1024) return reject(new Error('That file is too large to be a backup.'));
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('That file could not be read.'));
    reader.readAsText(file);
  });
}
