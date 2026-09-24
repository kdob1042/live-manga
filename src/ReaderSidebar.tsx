import React, {useMemo} from 'react';
import type {Manifest, Page} from '../contracts/types';
import type {Preview} from '../contracts/preview-types';
import PreviewControls from './PreviewControls';
import PublicationNav, {workHref} from './PublicationNav';
import type {PublicationCatalog, PublicationFormat} from './publication-client';

type Props = {
  manifest: Manifest;
  preview?: Preview;
  pages: Page[];
  visiblePageIds: Set<string>;
  selectedTags: string[];
  tagMode: 'any'|'all';
  open: boolean;
  hideOverlayDuringMotion: boolean;
  refreshing?: boolean;
  onClose: () => void;
  onHideOverlayDuringMotionChange: (value: boolean) => void;
  onTagsChange: (tags: string[], mode: 'any'|'all') => void;
  onRefresh?: () => void;
  catalog?: PublicationCatalog;
  currentWorkId?: string;
  currentFormat?: PublicationFormat;
  currentEpisodeId?: string;
};

const pageLabel = (page: Page, index: number) => `${String(index + 1).padStart(2, '0')}ページ`;

function pageNotes(panels: Map<string, Preview['panels'][number]>, page: Page) {
  return page.panels.flatMap(panel => {
    const state = panels.get(panel.id);
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
  hideOverlayDuringMotion, refreshing, onClose, onHideOverlayDuringMotionChange, onTagsChange, onRefresh,
  catalog, currentWorkId, currentFormat, currentEpisodeId,
}: Props) {
  const previewPanels = useMemo(() => new Map(preview?.panels.map(p => [p.id, p]) ?? []), [preview]);
  const tocPages = pages
    .map((page, index) => ({page, index}))
    .filter(({page}) => visiblePageIds.has(page.id));
  const textPages = tocPages.filter(({page}) => page.panels.some(panel => panel.text));
  const currentWork = catalog?.works.find(work => work.workId === currentWorkId);

  return <>
    {open && <div className="sidebar-backdrop" role="presentation" onClick={onClose}/>} 
    <aside id="reader-sidebar" className={`reader-sidebar${open ? ' is-open' : ''}`} aria-label="読書メニュー" aria-hidden={!open} inert={!open}>
      <div className="sidebar-head">
        <div>
          <p className="sidebar-kicker">LIVE MANGA</p>
          <p className="sidebar-context">読書メニュー</p>
        </div>
      </div>

      <div className="sidebar-content">
        <section className="sidebar-work-section" aria-labelledby="reader-work-heading">
          <h1 id="reader-work-heading" className="sidebar-title">{manifest.title}</h1>
          {catalog && <PublicationNav catalog={currentWork ? {...catalog, works: [currentWork]} : catalog} currentWorkId={currentWorkId} currentFormat={currentFormat} currentEpisodeId={currentEpisodeId} compact showWorkTitle={!currentWork}/>}
          {preview && <p className="sidebar-context">制作途中プレビュー</p>}
          {preview && <div className="preview-summary"><span>保存時点 {new Date(preview.savedAt).toLocaleString('ja-JP')}</span>{onRefresh && <button type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? '確認中…' : '最新版を開く'}</button>}</div>}
          <div className="sidebar-home-links">
            {currentWork && <a className="sidebar-home-link" href={workHref(currentWork.workId)}>作品トップ</a>}
            <a className="sidebar-home-link" href="/">作品一覧</a>
          </div>
        </section>

        <section className="sidebar-toc-section" aria-labelledby="reader-toc-heading">
          <p id="reader-toc-heading" className="sidebar-section-label">目次</p>
          <nav aria-label="ページ一覧" className="toc-list">
            {tocPages.map(({page, index}) => {
              const notes = preview ? pageNotes(previewPanels, page) : [];
              return <a key={page.id} href={`#page-${page.id}`} onClick={onClose}>
                <span>{pageLabel(page, index)}</span>
                <small>{page.panels.length}コマ{notes.length ? ` · ${[...new Set(notes)].join('・')}` : ''}</small>
              </a>;
            })}
          </nav>
          {!tocPages.length && <p className="sidebar-empty">表示対象のページがありません。</p>}
        </section>

        <section className="sidebar-text-section" aria-labelledby="reader-text-heading">
          <details className="sidebar-text-reader">
            <summary id="reader-text-heading">テキストで読む</summary>
            <div className="sidebar-text-list">
              {textPages.map(({page, index}) => <article key={page.id} className="sidebar-text-page">
                <h3 className="sidebar-text-page-title"><span>{pageLabel(page, index)}</span><small>{page.panels.filter(panel => panel.text).length}件</small></h3>
                <div className="sidebar-text-body">
                  {page.panels.map(panel => panel.text ? <p key={panel.id}>{panel.text}</p> : null)}
                </div>
              </article>)}
            </div>
            {!textPages.length && <p className="sidebar-empty">本文はありません。</p>}
          </details>
        </section>
        <section className="sidebar-settings-section" aria-labelledby="reader-settings-heading">
          <p id="reader-settings-heading" className="sidebar-section-label">読書設定</p>
          <label className="reader-setting-toggle">
            <input
              type="checkbox"
              checked={hideOverlayDuringMotion}
              onChange={event => onHideOverlayDuringMotionChange(event.target.checked)}
            />
            <span>動画再生中はコマ内の吹き出し・文字を隠す</span>
          </label>
          <p className="reader-setting-help">再生中のコマだけに適用します。停止すると元に戻ります。</p>
        </section>
        {preview && <section className="sidebar-tags-section" aria-labelledby="reader-tags-heading">
          <p id="reader-tags-heading" className="sidebar-section-label">タグで絞り込む</p>
          <PreviewControls preview={preview} selected={selectedTags} mode={tagMode} count={visiblePageIds.size} onChange={onTagsChange}/>
        </section>}
      </div>
    </aside>
  </>;
}
