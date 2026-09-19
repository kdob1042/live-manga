import React from 'react';
import type {PublicationCatalog, PublicationFormat, PublicationWork} from './publication-client';
import {formatLabel} from './publication-client';

type Props = {
  catalog: PublicationCatalog;
  currentWorkId?: string;
  currentFormat?: PublicationFormat;
  currentEpisodeId?: string;
  compact?: boolean;
};

function workHref(workId: string) {
  return `/works/${encodeURIComponent(workId)}/`;
}

function episodeHref(workId: string, format: PublicationFormat, episodeId: string) {
  return `/works/${encodeURIComponent(workId)}/${format}/${encodeURIComponent(episodeId)}`;
}

function WorkNavigation({work, currentWorkId, currentFormat, currentEpisodeId}: {
  work: PublicationWork;
  currentWorkId?: string;
  currentFormat?: PublicationFormat;
  currentEpisodeId?: string;
}) {
  return <section className="publication-work" aria-labelledby={`publication-work-${work.workId}`}>
    <a id={`publication-work-${work.workId}`} className={`publication-work-link${work.workId === currentWorkId ? ' is-current' : ''}`} href={workHref(work.workId)} aria-current={work.workId === currentWorkId ? 'page' : undefined}>{work.title}</a>
    {work.novelUrl && <a className="publication-episode" href={work.novelUrl} rel="noreferrer">小説版を読む ↗</a>}
    {work.formats.map(format => <div className="publication-format" key={format.format}>
      <p className="publication-format-label">{formatLabel(format.format)}</p>
      <ol className="publication-episodes">
        {format.episodes.map(episode => {
          const current = work.workId === currentWorkId && format.format === currentFormat && episode.episodeId === currentEpisodeId;
          if (episode.locked) {
            return <li className="publication-episode is-locked" key={episode.episodeId}><span className="publication-lock" aria-hidden="true">🔒</span><span>{episode.title}</span><small>{episode.releaseAt ? new Date(episode.releaseAt).toLocaleString('ja-JP') + ' 公開' : '公開予定'}</small></li>;
          }
          return <li key={episode.episodeId}><a className={`publication-episode${current ? ' is-current' : ''}`} href={episodeHref(work.workId, format.format, episode.episodeId)} aria-current={current ? 'page' : undefined}><span className="publication-episode-number">{String(format.episodes.indexOf(episode) + 1).padStart(2, '0')}</span><span>{episode.title}</span></a></li>;
        })}
      </ol>
    </div>)}
  </section>;
}

export default function PublicationNav({catalog, currentWorkId, currentFormat, currentEpisodeId, compact = false}: Props) {
  return <nav className={`publication-nav${compact ? ' is-compact' : ''}`} aria-label="作品・版・話の一覧">
    {catalog.works.map(work => <WorkNavigation key={work.workId} work={work} currentWorkId={currentWorkId} currentFormat={currentFormat} currentEpisodeId={currentEpisodeId}/>) }
  </nav>;
}
