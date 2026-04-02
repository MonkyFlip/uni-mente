import { useEffect, useState, useLayoutEffect } from 'react';
import { X, ChevronRight, SkipForward } from 'lucide-react';
import { useTour } from './TourContext';
import styles from './Tour.module.css';

interface Rect { top: number; left: number; width: number; height: number; }

const PADDING = 10;

export function Tour() {
  const { active, current, stepIndex, total, next, skip } = useTour();
  const [rect, setRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });

  // Find target element and measure it
  useLayoutEffect(() => {
    if (!active || !current) { setRect(null); return; }

    const el = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
    if (!el) { setRect(null); return; }

    const r = el.getBoundingClientRect();
    setRect({
      top:    r.top    - PADDING,
      left:   r.left   - PADDING,
      width:  r.width  + PADDING * 2,
      height: r.height + PADDING * 2,
    });

    // Scroll element into view
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [active, current, stepIndex]);

  // Position tooltip near the highlighted element
  useEffect(() => {
    if (!rect || !current) return;
    const TW = 320;
    const TH = 180;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = 0, left = 0;
    switch (current.position) {
      case 'right':
        top  = rect.top  + rect.height / 2 - TH / 2;
        left = rect.left + rect.width + 16;
        break;
      case 'left':
        top  = rect.top  + rect.height / 2 - TH / 2;
        left = rect.left - TW - 16;
        break;
      case 'bottom':
        top  = rect.top  + rect.height + 16;
        left = rect.left + rect.width  / 2 - TW / 2;
        break;
      case 'top':
      default:
        top  = rect.top  - TH - 16;
        left = rect.left + rect.width  / 2 - TW / 2;
        break;
    }

    // Clamp to viewport
    top  = Math.max(12, Math.min(top,  vh - TH - 12));
    left = Math.max(12, Math.min(left, vw - TW - 12));
    setTooltipPos({ top, left });
  }, [rect, current]);

  if (!active || !current) return null;

  const isLast = stepIndex === total - 1;

  return (
    <div className={styles.root}>
      {/* Dark overlay with hole */}
      <svg className={styles.overlay} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.65)"
          mask="url(#tour-mask)"
        />
        {/* Highlight border around target */}
        {rect && (
          <rect
            x={rect.left}
            y={rect.top}
            width={rect.width}
            height={rect.height}
            rx="10"
            fill="none"
            stroke="var(--teal, #1A7A6E)"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Tooltip card */}
      <div
        className={styles.tooltip}
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        <div className={styles.header}>
          <span className={styles.counter}>{stepIndex + 1} / {total}</span>
          <button className={styles.closeBtn} onClick={skip} title="Cerrar guía">
            <X size={14} />
          </button>
        </div>

        <div className={styles.title}>{current.title}</div>
        <p className={styles.desc}>{current.description}</p>

        <div className={styles.progress}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              className={`${styles.dot} ${i === stepIndex ? styles.dotActive : i < stepIndex ? styles.dotDone : ''}`}
            />
          ))}
        </div>

        <div className={styles.actions}>
          <button className={styles.skipBtn} onClick={skip}>
            <SkipForward size={13} />
            Saltar guía
          </button>
          <button className={styles.nextBtn} onClick={next}>
            {isLast ? 'Finalizar' : 'Siguiente'}
            {!isLast && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
