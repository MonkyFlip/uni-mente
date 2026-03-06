import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import styles from './DatePicker.module.css';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];
const DIAS = ['Do','Lu','Ma','Mi','Ju','Vi','Sá'];

interface Props {
  value: string;
  onChange: (val: string) => void;
  min?: string;
  placeholder?: string;
  /** Si se indica, solo se pueden seleccionar fechas de ese día de la semana (0=domingo) */
  diaPermitido?: number;
}

export function DatePicker({
  value,
  onChange,
  min,
  placeholder = 'Seleccionar fecha',
  diaPermitido,
}: Props) {
  const [open, setOpen]   = useState(false);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const today    = new Date();
  const initDate = value ? new Date(value + 'T12:00:00') : today;
  const [viewYear,  setViewYear]  = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);

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

  const openPanel = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelH = 360;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= panelH ? rect.bottom + 6 : rect.top - panelH - 6;
    setPanelStyle({ top, left: rect.left, width: Math.max(rect.width, 300) });
    setOpen(o => !o);
  };

  const minDate = min ? new Date(min + 'T00:00:00') : null;

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const select = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
  };

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0, 0, 0, 0);
    if (minDate) {
      const m = new Date(minDate); m.setHours(0, 0, 0, 0);
      if (d < m) return true;
    }
    // Si hay día permitido, bloquear los demás días de la semana
    if (diaPermitido !== undefined && d.getDay() !== diaPermitido) return true;
    return false;
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const [y, m, d] = value.split('-').map(Number);
    return y === viewYear && m - 1 === viewMonth && d === day;
  };

  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  const isHighlighted = (day: number) =>
    diaPermitido !== undefined &&
    new Date(viewYear, viewMonth, day).getDay() === diaPermitido &&
    !isDisabled(day);

  const display = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '';

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

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
        <Calendar size={15} className={styles.triggerIcon} />
      </button>

      {open && (
        <div ref={panelRef} className={styles.panel} style={panelStyle}>
          <div className={styles.header}>
            <button type="button" className={styles.navBtn} onClick={prevMonth}>
              <ChevronLeft size={15} />
            </button>
            <span className={styles.monthLabel}>{MESES[viewMonth]} {viewYear}</span>
            <button type="button" className={styles.navBtn} onClick={nextMonth}>
              <ChevronRight size={15} />
            </button>
          </div>

          <div className={styles.grid}>
            {DIAS.map((d, i) => (
              <div
                key={d}
                className={`${styles.dayName} ${diaPermitido !== undefined && i === diaPermitido ? styles.dayNameHighlight : ''}`}
              >
                {d}
              </div>
            ))}
            {cells.map((day, i) =>
              day === null
                ? <div key={`e-${i}`} />
                : (
                  <button
                    key={day}
                    type="button"
                    className={`${styles.day}
                      ${isSelected(day)    ? styles.daySelected    : ''}
                      ${isToday(day) && !isSelected(day) ? styles.dayToday : ''}
                      ${isDisabled(day)    ? styles.dayDisabled    : ''}
                      ${isHighlighted(day) && !isSelected(day) ? styles.dayHighlight : ''}
                    `}
                    disabled={isDisabled(day)}
                    onClick={() => select(day)}
                  >
                    {day}
                  </button>
                )
            )}
          </div>

          {value && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => { onChange(''); setOpen(false); }}
            >
              Borrar selección
            </button>
          )}
        </div>
      )}
    </div>
  );
}
