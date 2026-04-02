import styles from './TimePicker.module.css';

interface Props {
  label:    string;
  value:    string;
  onChange: (v: string) => void;
}

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

export default function TimePicker({ label, value, onChange }: Props) {
  const [hh, mm] = (value || '08:00').split(':');

  const update = (h: string, m: string) => onChange(`${h}:${m}`);

  return (
    <div className={styles.wrap}>
      <label className={styles.label}>{label}</label>
      <div className={styles.row}>
        <select value={hh} onChange={e => update(e.target.value, mm)}>
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
        <span className={styles.sep}>:</span>
        <select value={mm} onChange={e => update(hh, e.target.value)}>
          {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </div>
  );
}
