import React from 'react';
import type {Manifest, Page} from '../contracts/types';
import type {Preview} from '../contracts/preview-types';
import PreviewControls from './PreviewControls';

type Props = {
  manifest: Manifest;
  preview?: Preview;
  pages: Page[];
  visiblePageIds: Set<string>;
  selectedTags: string[];
  tagMode: 'any'|'all';
  open: boolean;
  refreshing?: boolean;
  onClose: () => void;
  onTagsChange: (tags: string[], mode: 'any'|'all') => void;
  onRefresh?: () => void;
};

const pageLabel = (page: Page, index: number) => `${String(index + 1).padStart(2, '0')}ページ`;

function pageNotes(preview: Preview, page: Page) {
  return page.panels.flatMap(panel => {
    const state = preview.panels.find(item => item.id === panel.id);
    if (!state) return [];
    const notes = [
      state.art === 'pending' ? '作画待ち' : '',
      state.lettering === 'pending' ? '文字配置待ち' : '',
      state.motion === 'stale' ? '動画旧版' : state.motion === 'pending' ? '動画待ち' : '',
    ].filter(Boolean);
    return notes;
  });
}

export default function ReaderSidebar({
  manifest, preview, pages, visiblePageIds, selectedTags, tagMode, open,
  refreshing, onClose, onTagsChange, onRefresh,
}: Props) {
  const tocPages = pages
    .map((page, index) => ({page, index}))
    .filter(({page}) => visiblePageIds.has(page.id));
  const currentHref = typeof window === 'undefined' ? '#' : window.location.href;
  const workHref = currentHref.includes('?preview=') ? currentHref : `/?release=${encodeURIComponent(manifest.releaseId)}`;

  return <>
    {open && <div className="sidebar-backdrop" role="presentation" onClick={onClose}/>} 
    <aside id="reader-sidebar" className={`reader-sidebar${open ? ' is-open' : ''}`} aria-label="読書メニュー" aria-hidden={!open}>
      <div className="sidebar-head">
        <div>
          <p className="sidebar-kicker">LIVE MANGA</p>
          <p className="sidebar-context">読書メニュー</p>
        </div>
      </div>

      <div className="sidebar-content">
        <section className="sidebar-work-section" aria-labelledby="reader-work-heading">
          <h1 className="sidebar-title">{manifest.title}</h1>
          <p id="reader-work-heading" className="sidebar-section-label">作品</p>
          <nav className="work-list" aria-label="作品一覧">
            <a className="work-option" href={workHref} aria-current="page">
            <span className="work-option-mark" aria-hidden="true">●</span>
            <span><strong>{manifest.title}</strong><small>{preview ? '制作途中プレビュー' : `第${manifest.episodeId}話 · ${manifest.releaseId}`}</small></span>
            </a>
          </nav>
          {preview && <div className="preview-summary"><span>保存時点 {new Date(preview.savedAt).toLocaleString('ja-JP')}</span>{onRefresh && <button type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? '確認中…' : '最新版を開く'}</button>}</div>}
          <a className="sidebar-home-link" href={currentHref.includes('?preview=') ? '/' : '#reader-sidebar'} onClick={event => { if (!currentHref.includes('?preview=')) { event.preventDefault(); onClose(); } }}>作品トップ</a>
        </section>

        <section className="sidebar-toc-section" aria-labelledby="reader-toc-heading">
          <p id="reader-toc-heading" className="sidebar-section-label">目次</p>
          <nav aria-label="ページ一覧" className="toc-list">
            {tocPages.map(({page, index}) => {
              const notes = preview ? pageNotes(preview, page) : [];
              return <a key={page.id} href={`#page-${page.id}`} onClick={onClose}>
                <span>{pageLabel(page, index)}</span>
                <small>{page.panels.length}コマ{notes.length ? ` · ${[...new Set(notes)].join('・')}` : ''}</small>
              </a>;
            })}
          </nav>
          {!tocPages.length && <p className="sidebar-empty">表示対象のページがありません。</p>}
        </section>

        {preview && <section className="sidebar-tags-section" aria-labelledby="reader-tags-heading">
          <p id="reader-tags-heading" className="sidebar-section-label">タグで絞り込む</p>
          <PreviewControls preview={preview} selected={selectedTags} mode={tagMode} count={visiblePageIds.size} onChange={onTagsChange}/>
        </section>}
      </div>
    </aside>
  </>;
}
