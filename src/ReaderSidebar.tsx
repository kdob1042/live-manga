import React from 'react';
import type {Manifest, Page} from '../contracts/types';
import type {Preview} from '../contracts/preview-types';
import PreviewControls from './PreviewControls';

export type ReaderTab = 'work'|'toc'|'tags';

type Props = {
  manifest: Manifest;
  preview?: Preview;
  pages: Page[];
  visiblePageIds: Set<string>;
  selectedTags: string[];
  tagMode: 'any'|'all';
  tab: ReaderTab;
  open: boolean;
  still: boolean;
  refreshing?: boolean;
  onTabChange: (tab: ReaderTab) => void;
  onClose: () => void;
  onStillChange: (still: boolean) => void;
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
  manifest, preview, pages, visiblePageIds, selectedTags, tagMode, tab, open, still,
  refreshing, onTabChange, onClose, onStillChange, onTagsChange, onRefresh,
}: Props) {
  const tocPages = pages
    .map((page, index) => ({page, index}))
    .filter(({page}) => visiblePageIds.has(page.id));
  const currentHref = typeof window === 'undefined' ? '#' : window.location.href;

  return <>
    {open && <button className="sidebar-backdrop" aria-label="メニューを閉じる" onClick={onClose}/>} 
    <aside id="reader-sidebar" className={`reader-sidebar${open ? ' is-open' : ''}`} aria-label="読書メニュー" aria-hidden={!open}>
      <div className="sidebar-head">
        <div>
          <p className="sidebar-kicker">LIVE MANGA</p>
          <p className="sidebar-context">読書メニュー</p>
        </div>
        <button className="sidebar-close" type="button" onClick={onClose} aria-label="メニューを閉じる">×</button>
      </div>

      <div className="reader-tabs" role="tablist" aria-label="読書メニューの種類">
        <button id="reader-tab-work" type="button" role="tab" aria-selected={tab === 'work'} aria-controls="reader-panel-work" onClick={() => onTabChange('work')}>作品</button>
        <button id="reader-tab-toc" type="button" role="tab" aria-selected={tab === 'toc'} aria-controls="reader-panel-toc" onClick={() => onTabChange('toc')}>目次</button>
        {preview && <button id="reader-tab-tags" type="button" role="tab" aria-selected={tab === 'tags'} aria-controls="reader-panel-tags" onClick={() => onTabChange('tags')}>タグ</button>}
      </div>

      <div className="sidebar-content">
        {tab === 'work' && <section id="reader-panel-work" role="tabpanel" aria-labelledby="reader-tab-work" tabIndex={-1}>
          <h1 className="sidebar-title">{manifest.title}</h1>
          <p className="sidebar-section-label">作品を選択</p>
          <div className="work-option" aria-current="page">
            <span className="work-option-mark" aria-hidden="true">●</span>
            <span><strong>{manifest.title}</strong><small>{preview ? '制作途中プレビュー' : `第${manifest.episodeId}話 · ${manifest.releaseId}`}</small></span>
          </div>
          {preview && <div className="preview-summary"><span>保存時点 {new Date(preview.savedAt).toLocaleString('ja-JP')}</span>{onRefresh && <button type="button" onClick={onRefresh} disabled={refreshing}>{refreshing ? '確認中…' : '最新版を開く'}</button>}</div>}
          <label className="still-toggle"><input type="checkbox" checked={still} onChange={event => onStillChange(event.target.checked)}/>静止漫画として読む</label>
          <a className="sidebar-home-link" href={currentHref.includes('?preview=') ? '/' : '#reader-sidebar'} onClick={event => { if (!currentHref.includes('?preview=')) { event.preventDefault(); onClose(); } }}>作品トップ</a>
        </section>}

        {tab === 'toc' && <section id="reader-panel-toc" role="tabpanel" aria-labelledby="reader-tab-toc" tabIndex={-1}>
          <p className="sidebar-section-label">目次</p>
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
        </section>}

        {tab === 'tags' && preview && <section id="reader-panel-tags" role="tabpanel" aria-labelledby="reader-tab-tags" tabIndex={-1}>
          <PreviewControls preview={preview} selected={selectedTags} mode={tagMode} count={visiblePageIds.size} onChange={onTagsChange}/>
        </section>}
      </div>
    </aside>
  </>;
}
