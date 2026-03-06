import { useState, useRef, useEffect } from 'react';
import { Clock } from 'lucide-react';
import styles from './TimePicker.module.css';

interface Props {
  value: string;       // HH:MM
  onChange: (val: string) => void;
  placeholder?: string;
}

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

export function TimePicker({ value, onChange, placeholder = 'Seleccionar hora' }: Props) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const hourRef    = useRef<HTMLDivElement>(null);

  const [selH, selM] = value ? value.split(':') : ['', ''];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        panelRef.current   && !panelRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Scroll selected hour into view
  useEffect(() => {
    if (open && selH && hourRef.current) {
      const el = hourRef.current.querySelector(`[data-h="${selH}"]`) as HTMLElement;
      if (el) el.scrollIntoView({ block: 'center' });
    }
  }, [open, selH]);

  const openPanel = () => {
    if (!triggerRef.current) return;
    const rect    = triggerRef.current.getBoundingClientRect();
    const panelH  = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= panelH ? rect.bottom + 6 : rect.top - panelH - 6;
    setPanelStyle({ top, left: rect.left, width: Math.max(rect.width, 200) });
    setOpen(o => !o);
  };

  const select = (h: string, m: string) => {
    onChange(`${h}:${m}`);
    setOpen(false);
  };

  const display = value
    ? (() => {
        const [h, m] = value.split(':');
        const hNum = parseInt(h);
        const ampm = hNum >= 12 ? 'p.m.' : 'a.m.';
        const h12  = hNum % 12 === 0 ? 12 : hNum % 12;
        return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
      })()
    : '';

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        ref={triggerRef}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={openPanel}
      >
        <span className={display ? styles.triggerValue : styles.triggerPlaceholder}>
          {display || placeholder}
        </span>
        <Clock size={15} className={styles.triggerIcon} />
      </button>

      {open && (
        <div ref={panelRef} className={styles.panel} style={panelStyle}>
          <div className={styles.labels}>
            <span>Hora</span>
            <span>Minutos</span>
          </div>
          <div className={styles.cols}>
            <div className={styles.col} ref={hourRef}>
              {HOURS.map(h => (
                <button
                  key={h}
                  type="button"
                  data-h={h}
                  className={`${styles.item} ${selH === h ? styles.itemActive : ''}`}
                  onClick={() => select(h, selM || '00')}
                >
                  {h}
                </button>
              ))}
            </div>
            <div className={styles.divider} />
            <div className={styles.col}>
              {MINUTES.map(m => (
                <button
                  key={m}
                  type="button"
                  className={`${styles.item} ${selM === m ? styles.itemActive : ''}`}
                  onClick={() => select(selH || '08', m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          {value && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => { onChange(''); setOpen(false); }}
            >
              Borrar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
