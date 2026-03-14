import { useEffect, useState, useLayoutEffect } from 'react';
import { X, ChevronRight, SkipForward } from 'lucide-react';
import { useTour } from './TourContext';
import styles from './Tour.module.css';

interface Rect { top: number; left: number; width: number; height: number; }

const PADDING = 8;
const TW = 320;
const TH = 200;

export function Tour() {
  const { active, current, stepIndex, total, next, skip } = useTour();
  const [rect,       setRect]       = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [vp,         setVp]         = useState({ w: window.innerWidth, h: window.innerHeight });

  // Track viewport size
  useEffect(() => {
    const handler = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Measure target element
  useLayoutEffect(() => {
    if (!active || !current) { setRect(null); return; }

    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${current.target}"]`);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({
        top:    r.top    - PADDING,
        left:   r.left   - PADDING,
        width:  r.width  + PADDING * 2,
        height: r.height + PADDING * 2,
      });
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };

    measure();
    // Re-measure after potential scroll settle
    const t = setTimeout(measure, 350);
    return () => clearTimeout(t);
  }, [active, current, stepIndex]);

  // Position tooltip
  useEffect(() => {
    if (!rect || !current) return;

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

    // Fallback: if tooltip would go off screen, reposition to center
    if (left + TW > vp.w - 12) left = vp.w - TW - 16;
    if (left < 12)              left = 16;
    if (top  + TH > vp.h - 12) top  = vp.h - TH - 16;
    if (top  < 12)              top  = 16;

    setTooltipPos({ top, left });
  }, [rect, current, vp]);

  if (!active || !current) return null;

  const isLast = stepIndex === total - 1;

  // Build SVG hole coordinates
  const rx = rect ? Math.max(0, rect.left)  : 0;
  const ry = rect ? Math.max(0, rect.top)   : 0;
  const rw = rect ? rect.width  : 0;
  const rh = rect ? rect.height : 0;

  return (
    <div className={styles.root}>
      {/* Overlay with cutout */}
      <svg
        className={styles.overlay}
        xmlns="http://www.w3.org/2000/svg"
        width={vp.w}
        height={vp.h}
      >
        <defs>
          <mask id="tour-cutout">
            <rect width={vp.w} height={vp.h} fill="white" />
            {rect && (
              <rect x={rx} y={ry} width={rw} height={rh} rx="10" fill="black" />
            )}
          </mask>
        </defs>

        {/* Dark backdrop with hole */}
        <rect
          width={vp.w}
          height={vp.h}
          fill="rgba(0,0,0,0.62)"
          mask="url(#tour-cutout)"
        />

        {/* Teal border around highlighted element */}
        {rect && (
          <rect
            x={rx} y={ry} width={rw} height={rh}
            rx="10" fill="none"
            stroke="var(--teal, #1A7A6E)"
            strokeWidth="2"
          />
        )}
      </svg>

      {/* Tooltip */}
      <div
        className={styles.tooltip}
        style={{ top: tooltipPos.top, left: tooltipPos.left, width: TW }}
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
              className={`${styles.dot}
                ${i === stepIndex ? styles.dotActive  : ''}
                ${i  < stepIndex  ? styles.dotDone    : ''}`}
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
