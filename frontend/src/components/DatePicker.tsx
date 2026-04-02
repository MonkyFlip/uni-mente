import styles from './DatePicker.module.css';

const DAYS: Record<string, number> = {
  Lunes: 1, Martes: 2, Miércoles: 3, Jueves: 4,
  Viernes: 5, Sábado: 6, Domingo: 0,
};

interface Props {
  label:       string;
  value:       string;
  onChange:    (v: string) => void;
  allowedDay?: string;
}

export default function DatePicker({ label, value, onChange, allowedDay }: Props) {
  const dayNum = allowedDay ? DAYS[allowedDay] : undefined;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = new Date(e.target.value + 'T12:00:00');
    if (dayNum !== undefined && d.getDay() !== dayNum) {
      return; // día no permitido
    }
    onChange(e.target.value);
  };

  // Generar fechas permitidas (solo del día de semana correcto)
  const today  = new Date();
  const minStr = today.toISOString().split('T')[0];

  const hintDay = allowedDay ? `Solo días ${allowedDay}` : '';

  return (
    <div className={styles.wrap}>
      <label className={styles.label}>{label}</label>
      <input
        type="date"
        className={styles.input}
        value={value}
        min={minStr}
        onChange={handleChange}
      />
      {hintDay && <span className={styles.hint}>{hintDay}</span>}
    </div>
  );
}
