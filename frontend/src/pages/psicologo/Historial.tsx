import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { GET_MIS_PACIENTES } from '../../graphql/operations';
import { Layout } from '../../components/Layout';
import { PageHeader, Spinner, EmptyState, Badge, Button, usePagination, Pagination } from '../../components/UI';
import styles from './Historial.module.css';

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
}

interface Sesion { id_sesion: number; numero_sesion: number; notas: string; recomendaciones: string; fecha_registro: string; }
interface Detalle { id_detalle: number; fecha_registro: string; sesion: Sesion; }
interface Historial {
  id_historial: number; fecha_apertura: string;
  estudiante: { id_estudiante: number; matricula: string; carrera: string; telefono: string;
    usuario: { nombre: string; correo: string; } };
  detalles: Detalle[];
}

function printExpediente(h: Historial) {
  const sesiones = [...h.detalles].sort((a, b) =>
    new Date(a.sesion.fecha_registro).getTime() - new Date(b.sesion.fecha_registro).getTime()
  );
  const html = `<html><head><meta charset="utf-8"/><title>Expediente — ${h.estudiante.usuario.nombre}</title>
  <style>body{font-family:Georgia,serif;color:#111;padding:20px}
  .header{display:flex;justify-content:space-between;border-bottom:2px solid #1a7a6e;padding-bottom:12px;margin-bottom:20px}
  .logo{font-size:22px;font-weight:700;color:#1a7a6e}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;background:#f8f8f8;padding:12px;border-radius:6px;margin-bottom:16px}
  .info-item label{font-size:10px;font-weight:700;text-transform:uppercase;color:#555;display:block}
  .info-item span{font-size:13px}
  h2{font-size:16px;color:#1a7a6e;border-bottom:1px solid #ddd;padding-bottom:6px;margin:16px 0 10px}
  .sesion{border:1px solid #e0e0e0;border-radius:6px;padding:12px;margin-bottom:10px;page-break-inside:avoid}
  .sesion-head{display:flex;justify-content:space-between;margin-bottom:8px}
  .sesion-num{font-weight:700;color:#1a7a6e;font-size:13px}
  .sesion-date{font-size:11px;color:#888}
  .lbl{font-size:10px;font-weight:700;text-transform:uppercase;color:#555;margin-bottom:3px}
  .txt{font-size:13px;line-height:1.6;white-space:pre-wrap}
  .footer{margin-top:24px;text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:8px}
  @media print{body{padding:0}}</style></head><body>
  <div class="header"><div class="logo">UniMente</div><div style="font-size:11px;color:#888;text-align:right">Expediente Clínico<br/>${new Date().toLocaleDateString('es-MX')}</div></div>
  <h2 style="margin-top:0">Datos del paciente</h2>
  <div class="info-grid">
    <div class="info-item"><label>Nombre</label><span>${h.estudiante.usuario.nombre}</span></div>
    <div class="info-item"><label>Correo</label><span>${h.estudiante.usuario.correo}</span></div>
    <div class="info-item"><label>Matrícula</label><span>${h.estudiante.matricula || '—'}</span></div>
    <div class="info-item"><label>Carrera</label><span>${h.estudiante.carrera || '—'}</span></div>
    <div class="info-item"><label>Teléfono</label><span>${h.estudiante.telefono || '—'}</span></div>
    <div class="info-item"><label>Apertura</label><span>${fmtDate(h.fecha_apertura)}</span></div>
  </div>
  <h2>Sesiones clínicas (${sesiones.length})</h2>
  ${sesiones.map(d => `
    <div class="sesion">
      <div class="sesion-head"><span class="sesion-num">Sesión ${d.sesion.numero_sesion}</span><span class="sesion-date">${fmtDate(d.sesion.fecha_registro)} ${fmtTime(d.sesion.fecha_registro)}</span></div>
      ${d.sesion.notas ? `<div class="lbl">Notas</div><div class="txt">${d.sesion.notas}</div>` : ''}
      ${d.sesion.recomendaciones ? `<div class="lbl" style="margin-top:8px">Recomendaciones</div><div class="txt">${d.sesion.recomendaciones}</div>` : ''}
    </div>`).join('')}
  <div class="footer">UniMente — Documento confidencial — ${new Date().toLocaleString('es-MX')}</div>
  </body></html>`;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

function printTodos(pacientes: Historial[]) {
  if (pacientes.length === 0) return;
  const sections = pacientes.map(h => {
    const sesiones = [...h.detalles].sort((a, b) =>
      new Date(a.sesion.fecha_registro).getTime() - new Date(b.sesion.fecha_registro).getTime()
    );
    return `<div style="margin-bottom:30px">
      <h2 style="font-size:17px;color:#1a7a6e;margin-bottom:6px">${h.estudiante.usuario.nombre}</h2>
      <div style="font-size:12px;color:#666;margin-bottom:10px">${h.estudiante.carrera || ''} ${h.estudiante.matricula ? '· ' + h.estudiante.matricula : ''}</div>
      ${sesiones.map(d => `
        <div style="border:1px solid #ddd;border-radius:6px;padding:10px;margin-bottom:6px;page-break-inside:avoid">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <strong style="color:#1a7a6e;font-size:13px">Sesión ${d.sesion.numero_sesion}</strong>
            <span style="font-size:11px;color:#888">${fmtDate(d.sesion.fecha_registro)}</span>
          </div>
          ${d.sesion.notas ? `<div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#555;margin-bottom:3px">Notas</div><div style="font-size:13px;line-height:1.6;white-space:pre-wrap">${d.sesion.notas}</div>` : ''}
          ${d.sesion.recomendaciones ? `<div style="font-size:10px;font-weight:700;text-transform:uppercase;color:#555;margin:6px 0 3px">Recomendaciones</div><div style="font-size:13px;line-height:1.6;white-space:pre-wrap">${d.sesion.recomendaciones}</div>` : ''}
        </div>`).join('')}
    </div><hr style="border:none;border-top:2px dashed #ddd;margin:20px 0"/>`;
  }).join('');

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<html><head><meta charset="utf-8"/><title>Expedientes UniMente</title>
    <style>body{font-family:Georgia,serif;padding:20px;color:#111}@media print{body{padding:0}}</style>
    </head><body>
    <div style="border-bottom:2px solid #1a7a6e;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between">
      <div style="font-size:20px;font-weight:700;color:#1a7a6e">UniMente — Expedientes Clínicos</div>
      <div style="font-size:11px;color:#888">Generado: ${new Date().toLocaleString('es-MX')}</div>
    </div>
    ${sections}
    <div style="text-align:center;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:10px">
      UniMente — ${pacientes.length} paciente(s)
    </div></body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

function PacienteRow({ h }: { h: Historial }) {
  const [open, setOpen] = useState(false);
  const sesiones = [...h.detalles].sort((a, b) =>
    new Date(b.sesion.fecha_registro).getTime() - new Date(a.sesion.fecha_registro).getTime()
  );

  return (
    <div className={styles.row}>
      <div className={styles.rowHeader} onClick={() => setOpen(v => !v)}>
        <div className={styles.avatar}>{h.estudiante.usuario.nombre.charAt(0).toUpperCase()}</div>
        <div className={styles.rowInfo}>
          <div className={styles.rowName}>
            {h.estudiante.usuario.nombre}
            <Badge label={`${sesiones.length} sesión${sesiones.length !== 1 ? 'es' : ''}`} variant="teal" />
          </div>
          <div className={styles.rowMeta}>
            {h.estudiante.carrera && <span>{h.estudiante.carrera}</span>}
            {h.estudiante.matricula && <span>{h.estudiante.matricula}</span>}
            <span className={styles.since}>Desde {fmtDate(h.fecha_apertura)}</span>
          </div>
        </div>
        <div className={styles.rowActions} onClick={e => e.stopPropagation()}>
          <Button variant="secondary" size="sm" onClick={() => printExpediente(h)}>
            🖨 PDF
          </Button>
        </div>
        <span className={styles.chevron}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </div>

      {open && (
        <div className={styles.sessions}>
          {sesiones.length === 0 ? (
            <p className={styles.noSessions}>Sin sesiones registradas.</p>
          ) : sesiones.map((d) => (
            <div key={d.id_detalle} className={styles.session}>
              <div className={styles.sessionHead}>
                <span className={styles.sessionNum}>Sesión {d.sesion.numero_sesion}</span>
                <span className={styles.sessionDate}>
                  📅 {fmtDate(d.sesion.fecha_registro)} {fmtTime(d.sesion.fecha_registro)}
                </span>
              </div>
              {d.sesion.notas && (
                <div className={styles.sessionBlock}>
                  <div className={styles.sessionLabel}>Notas</div>
                  <div className={styles.sessionText}>{d.sesion.notas}</div>
                </div>
              )}
              {d.sesion.recomendaciones && (
                <div className={styles.sessionBlock}>
                  <div className={styles.sessionLabel}>Recomendaciones</div>
                  <div className={styles.sessionText}>{d.sesion.recomendaciones}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Historial() {
  const [search, setSearch] = useState('');
  const { data, loading } = useQuery(GET_MIS_PACIENTES);
  const pacientes: Historial[] = data?.misPacientes ?? [];

  const filtered = pacientes.filter(h => {
    const q = search.toLowerCase();
    return !q ||
      h.estudiante.usuario.nombre.toLowerCase().includes(q) ||
      (h.estudiante.carrera ?? '').toLowerCase().includes(q) ||
      (h.estudiante.matricula ?? '').toLowerCase().includes(q);
  });

  const { page, setPage, slice, total, pageSize } = usePagination(filtered, 8);

  return (
    <Layout>
      <PageHeader
        title="Mis Pacientes"
        subtitle={`${pacientes.length} paciente${pacientes.length !== 1 ? 's' : ''} en total`}
        action={
          <Button variant="secondary" size="sm" onClick={() => printTodos(filtered)}>
            🖨 Exportar todos
          </Button>
        }
      />

      <div className={styles.searchBar}>
        <Search size={15} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          placeholder="Buscar por nombre, matrícula o carrera..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <Spinner size={36} />
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <EmptyState icon="📋" title="Sin pacientes"
          description="No tienes pacientes registrados todavía. Aparecerán aquí cuando registres sesiones." />
      )}

      {!loading && slice.map((h) => (
        <PacienteRow key={h.id_historial} h={h} />
      ))}

      <Pagination total={total} page={page} pageSize={pageSize} onChange={setPage} />
    </Layout>
  );
}