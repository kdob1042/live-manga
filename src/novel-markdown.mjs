function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function inlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  html = html.replace(/\x60([^\x60]+)\x60/g, '<code>$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return html;
}

export function markdownToHtml(source) {
  const lines = String(source).replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let quote = [];
  const flushParagraph = () => { if (paragraph.length) { blocks.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`); paragraph = []; } };
  const flushQuote = () => { if (quote.length) { blocks.push(`<blockquote><p>${inlineMarkdown(quote.join(' '))}</p></blockquote>`); quote = []; } };
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (index === 0 && /^#\s+［[^］]+］/.test(trimmed)) { flushParagraph(); flushQuote(); return; }
    if (!trimmed) { flushParagraph(); flushQuote(); return; }
    if (/^>\s?/.test(trimmed)) { flushParagraph(); quote.push(trimmed.replace(/^>\s?/, '')); return; }
    if (/^#{2,3}\s+/.test(trimmed)) { flushParagraph(); flushQuote(); const match = trimmed.match(/^(#{2,3})\s+(.+)$/); const level = match[1].length; blocks.push(`<h${level}>${inlineMarkdown(match[2])}</h${level}>`); return; }
    if (/^---+$/.test(trimmed)) { flushParagraph(); flushQuote(); blocks.push('<hr>'); return; }
    paragraph.push(trimmed);
  });
  flushParagraph(); flushQuote();
  return blocks.join('\n');
}

export function titleFromSource(source, fallback) {
  const firstLine = String(source).replace(/\r\n/g, '\n').split('\n')[0].trim();
  const match = firstLine.match(/^#\s+［([^］]+)］(.+)$/u);
  return match ? {id: match[1], title: match[2].trim()} : {id: null, title: fallback};
}

export async function buildNovelEpisode({rootDir, workId, chapter, episode, readFile}) {
  if (!episode || !episode.id || !episode.title || !episode.path) throw new Error('話定義が不正です');
  if (typeof readFile !== 'function') throw new Error('buildNovelEpisode requires readFile');
  const source = await readFile(episode.path, rootDir);
  const metadata = titleFromSource(source, episode.title);
  if (metadata.id && metadata.id !== episode.id) throw new Error(`見出しIDとmanifestのIDが一致しません: ${episode.path}`);
  return {
    format: 'novel',
    workId,
    episodeId: episode.id,
    title: episode.title,
    chapterId: chapter?.id ?? null,
    chapterTitle: chapter?.title ?? null,
    html: markdownToHtml(source),
  };
}
