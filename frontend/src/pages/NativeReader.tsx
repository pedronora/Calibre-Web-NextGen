import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { X } from 'lucide-react';
import { SpinnerCentered } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { useT } from '../lib/i18n';
import styles from './NativeReader.module.css';

const AUDIO = new Set(['mp3', 'm4a', 'm4b', 'flac', 'ogg', 'opus', 'wav', 'aac']);

/** Native in-browser reader for non-EPUB formats. PDF renders in the browser's
 *  built-in viewer (iframe), audiobooks in an <audio> player, plain text inline
 *  — all dependency-free. EPUB/KEPUB use the dedicated epub.js reader; comics
 *  and DjVu fall back to the server reader (image extraction needs server help). */
export function NativeReader({ id, format }: { id: string; format: string }) {
  const t = useT();
  const fmt = format.toLowerCase();
  const src = `/show/${id}/${fmt}`;
  const [text, setText] = useState<string | null>(null);
  const [textErr, setTextErr] = useState(false);

  useEffect(() => {
    if (fmt !== 'txt') return;
    let alive = true;
    fetch(src, { credentials: 'include' })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((tx) => { if (alive) setText(tx); })
      .catch(() => { if (alive) setTextErr(true); });
    return () => { alive = false; };
  }, [src, fmt]);

  return (
    <div className={styles.shell}>
      <div className={styles.bar}>
        <Link href={`/book/${id}`} className={styles.close} title={t('Close reader')} aria-label={t('Close reader')}>
          <X size={18} /> {t('Close')}
        </Link>
        <span className={styles.fmt}>{fmt.toUpperCase()}</span>
      </div>

      <div className={styles.body}>
        {fmt === 'pdf' && (
          <iframe className={styles.pdf} src={src} title={t('PDF reader')} />
        )}

        {AUDIO.has(fmt) && (
          <div className={styles.audioWrap}>
            <audio className={styles.audio} controls preload="metadata" src={src}>
              {t('Your browser cannot play this audio format.')}
            </audio>
          </div>
        )}

        {fmt === 'txt' && (
          textErr ? <EmptyState message={t('Could not load this text file.')} />
            : text === null ? <SpinnerCentered size={36} />
              : <pre className={styles.text}>{text}</pre>
        )}

        {!['pdf', 'txt'].includes(fmt) && !AUDIO.has(fmt) && (
          // comic / djvu / other — server reader handles image extraction
          <div className={styles.fallback}>
            <p>{t('This format opens in the full-screen reader.')}</p>
            <a className={styles.fallbackBtn} href={`/read/${id}/${fmt}`}>{t('Open reader')}</a>
          </div>
        )}
      </div>
    </div>
  );
}
