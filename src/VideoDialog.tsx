import React, { useEffect, useRef, useState } from 'react';
import type { Panel } from '../contracts/types';
const formatTime = (seconds: number) => {
  const whole = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
};
type Props = {
  panel: Panel | null;
  video: HTMLVideoElement | null;
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  hostRef: React.RefObject<HTMLDivElement | null>;
  onClose: () => void;
};

// Playback ticks belong to the dialog, not to every page and the reader sidebar.
export default function VideoDialog({
  panel,
  video,
  dialogRef,
  hostRef,
  onClose
}: Props) {
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const label = panel?.text || '画像のみのコマ';
  function show(persist = false) {
    setVisible(true);
    clearTimeout(timer.current);
    if (!persist && video && !video.paused) {
      timer.current = setTimeout(() => setVisible(false), 2200);
    }
  }
  function toggle() {
    if (!video || !dialogRef.current?.open) return;
    show();
    if (video.paused) void video.play().catch(() => {});else video.pause();
  }
  useEffect(() => {
    clearTimeout(timer.current);
    setVisible(false);
    setPlaying(false);
    setMuted(true);
    setPosition(0);
    setDuration(0);
    if (!panel || !video) return;
    const time = () => setPosition(video.currentTime);
    const metadata = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      time();
    };
    const volume = () => setMuted(video.muted);
    const play = () => setPlaying(true);
    const pause = () => setPlaying(false);
    const click = () => toggle();
    const events = {
      timeupdate: time,
      loadedmetadata: metadata,
      volumechange: volume,
      playing: play,
      pause,
      click
    };
    for (const [name, handler] of Object.entries(events)) video.addEventListener(name, handler);
    metadata();
    volume();
    setPlaying(!video.paused);
    return () => {
      clearTimeout(timer.current);
      for (const [name, handler] of Object.entries(events)) video.removeEventListener(name, handler);
    };
  }, [video, panel]);
  return <dialog ref={dialogRef} className="video-dialog" aria-label={panel ? `${label}の拡大動画` : '拡大動画'} onCancel={event => {
    event.preventDefault();
    onClose();
  }} onClick={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <div className="video-dialog-shell" onPointerMove={() => show()}>
      <h2 className="sr-only">{panel ? label : '拡大動画'}</h2>
      <button className="dialog-close" aria-label="拡大動画を閉じる" onClick={onClose}>×</button>
      <div className="modal-motion"><div ref={hostRef} className="modal-media" /></div>
      <div className={`modal-ui${visible ? ' is-visible' : ''}`}>
        <div className="modal-ui-scrim" />
        <div className="modal-controls" aria-label="動画操作">
          <button className="modal-play" type="button" aria-label={playing ? '一時停止' : '再生'} onClick={toggle}>{playing ? 'Ⅱ' : '▶'}</button>
          <label className="modal-seek-label"><span className="sr-only">再生位置</span>
            <input type="range" min="0" max={duration || 1} step="0.01" value={Math.min(position, duration || 1)} aria-label="再生位置" aria-valuetext={`${formatTime(position)} / ${formatTime(duration)}`} onChange={event => {
              if (video) {
                video.currentTime = Number(event.target.value);
                setPosition(video.currentTime);
                show(true);
              }
            }} />
          </label>
          <span className="modal-time" aria-live="off">{formatTime(position)} / {formatTime(duration)}</span>
          <button className="modal-mute" type="button" aria-label={muted ? '音声をオン' : 'ミュート'} onClick={() => {
            if (video) {
              video.muted = !video.muted;
              setMuted(video.muted);
              show(true);
            }
          }}>{muted ? '音声をオン' : 'ミュート'}</button>
        </div>
      </div>
    </div>
  </dialog>;
}
