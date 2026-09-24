import React from 'react';
import type {PublicationCatalog} from './publication-client';
import PublicationNav from './PublicationNav';

export default function WorkLibrary({catalog, focusWorkId}: {catalog: PublicationCatalog; focusWorkId?: string}) {
  const works = focusWorkId ? catalog.works.filter(work => work.workId === focusWorkId) : catalog.works;
  return <main className="library-page">
    <header className="library-header"><a href="/" className="library-brand">LIVE MANGA</a><span>作品ライブラリ</span></header>
    <div className="library-frame">
      <p className="library-kicker">WORKS / CATALOG</p>
      <h1>{focusWorkId && works.length ? works[0].title : '作品一覧'}</h1>
      <p className="library-lede">公開中の漫画を選んでお読みいただけます。</p>
      {focusWorkId && <p><a href="/" className="library-back">← 作品一覧へ戻る</a></p>}
      {works.length ? <div className="library-grid">{works.map(work => <article className="library-card" key={work.workId}>
        {!focusWorkId && <h2><a href={`/works/${encodeURIComponent(work.workId)}/`}>{work.title}</a></h2>}
        {work.description && <p>{work.description}</p>}
        <PublicationNav catalog={{...catalog, works: [work]}} currentWorkId={work.workId} showWorkTitle={false}/>
      </article>)}</div> : <p role="status">公開中の作品がありません。</p>}
    </div>
  </main>;
}
