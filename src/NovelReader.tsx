import React, {useEffect, useMemo, useState} from 'react';
import type {PublicationCatalog, PublicationEpisode, PublicationFormat} from './publication-client';
import {findWork, formatLabel} from './publication-client';
import PublicationNav from './PublicationNav';

type NovelContent = {
  format: 'novel';
  workId: string;
  episodeId: string;
  title: string;
  chapterId: string | null;
  chapterTitle: string | null;
  html: string;
};

function safeHtml(html: string) {
  const host = document.createElement('div');
  host.innerHTML = html;
  host.querySelectorAll('script,style,iframe,object,embed,form').forEach(node => node.remove());
  host.querySelectorAll('*').forEach(node => {
    [...node.attributes].forEach(attribute => {
      if (/^on/i.test(attribute.name) || (attribute.name === 'href' && /^javascript:/i.test(attribute.value))) node.removeAttribute(attribute.name);
    });
  });
  return host.innerHTML;
}

function episodeHref(workId: string, format: PublicationFormat, episodeId: string) {
  return `/works/${encodeURIComponent(workId)}/${format}/${encodeURIComponent(episodeId)}`;
}

export default function NovelReader({catalog, workId, episode}: {catalog: PublicationCatalog; workId: string; episode: PublicationEpisode}) {
  const work = findWork(catalog, workId);
  const [content, setContent] = useState<NovelContent | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setContent(null);
    fetch(`${episodeHref(workId, 'novel', episode.episodeId)}/content.json`, {headers: {Accept: 'application/json'}, cache: 'no-cache', signal: AbortSignal.timeout(15000)})
      .then(async response => { if (!response.ok) throw new Error(response.status === 404 ? 'この話は現在公開されていません' : '本文を取得できません'); const text = await response.text(); if (text.length > 4 * 1024 * 1024) throw new Error('本文データが大きすぎます'); return JSON.parse(text) as NovelContent; })
      .then(next => { if (!cancelled) { if (next.format !== 'novel' || next.workId !== workId || next.episodeId !== episode.episodeId || typeof next.html !== 'string') throw new Error('本文データの対応が不正です'); setContent(next); } })
      .catch(next => { if (!cancelled) setError(next instanceof Error ? next.message : String(next)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [episode.episodeId, workId]);

  const publication = useMemo(() => ({...catalog, works: work ? [work] : []}), [catalog, work]);
  const novelEpisodes = work?.formats.find(format => format.format === 'novel')?.episodes ?? [];
  const index = novelEpisodes.findIndex(item => item.episodeId === episode.episodeId);
  const previous = index > 0 ? novelEpisodes[index - 1] : null;
  const next = index >= 0 && index + 1 < novelEpisodes.length ? novelEpisodes[index + 1] : null;

  return <div className="novel-shell">
    <aside className="novel-sidebar"><a href="/" className="novel-brand">LIVE MANGA</a><p className="novel-context">{work?.title ?? '小説'} · {formatLabel('novel')}</p><PublicationNav catalog={publication} currentWorkId={workId} currentFormat="novel" currentEpisodeId={episode.episodeId}/></aside>
    <main className="novel-main"><header className="novel-header"><a href={`/works/${encodeURIComponent(workId)}/`}>{work?.title ?? workId}</a><span>{episode.title}</span></header>
      <div className="novel-reading-frame"><p className="novel-kicker">{episode.chapterTitle ?? 'NOVEL'} · {episode.chapterId ?? ''}</p><h1>{episode.title}</h1>{loading && <p role="status">本文を読み込み中…</p>}{error && <p className="novel-error" role="alert">{error}</p>}{content && <article className="novel-body" dangerouslySetInnerHTML={{__html: safeHtml(content.html)}}/>}<nav className="novel-episode-nav" aria-label="小説の話の移動">{previous ? <a href={episodeHref(workId, 'novel', previous.episodeId)}>← {previous.title}</a> : <span/>}{next ? <a href={episodeHref(workId, 'novel', next.episodeId)}>{next.title} →</a> : <a href={`/works/${encodeURIComponent(workId)}/`}>目次へ戻る</a>}</nav></div>
    </main>
  </div>;
}
