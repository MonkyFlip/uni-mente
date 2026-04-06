import { useState, useEffect } from 'react';
import {
  ShieldAlert, RotateCcw, Eye, EyeOff, CheckCircle2,
  Database, RefreshCw, Layers, GitBranch, GitCommit,
} from 'lucide-react';

interface BackupInfo {
  id_backup: number | null; nombre_archivo: string; tipo: string;
  formato: string; tamanio_kb: number; modo: string; created_at: string;
}

const TIPO_ICON: Record<string, React.ReactNode> = {
  COMPLETO:    <Layers size={16} />,
  DIFERENCIAL: <GitBranch size={16} />,
  INCREMENTAL: <GitCommit size={16} />,
};
const TIPO_COLOR: Record<string, string> = {
  COMPLETO: 'var(--teal-light)', DIFERENCIAL: '#f59e0b', INCREMENTAL: '#60a5fa',
};

function fmtDate(d: string | Date) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', { hour:'2-digit', minute:'2-digit', hour12:true, day:'2-digit', month:'2-digit', year:'numeric' });
}
function fmtKb(kb: number) {
  if (!kb) return '—';
  return kb < 1024 ? `${kb} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

export default function EmergencyRestore() {
  const [backups,   setBackups]   = useState<BackupInfo[]>([]);
  const [loadingBk, setLoadingBk] = useState(true);
  const [selected,  setSelected]  = useState<BackupInfo | null>(null);
  const [secret,    setSecret]    = useState('');
  const [showSec,   setShowSec]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const loadBackups = async () => {
    setLoadingBk(true);
    try {
      const res  = await fetch('https://unimente.duckdns.org/api/emergency-backups');
      const data = await res.json();
      setBackups(data.backups ?? []);
    } catch { setBackups([]); } finally { setLoadingBk(false); }
  };

  useEffect(() => { loadBackups(); }, []);

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secret.trim()) { setError('La clave secreta es obligatoria.'); return; }
    if (!selected)      { setError('Selecciona un backup de la lista.'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const body: Record<string, any> = selected.id_backup
        ? { id_backup: selected.id_backup }
        : { backup_filename: selected.nombre_archivo };
      const res  = await fetch('https://unimente.duckdns.org/api/emergency-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Restore-Secret': secret },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? 'Error en la restauración.');
      } else {
        setSuccess((data.mensaje ?? 'Base de datos restaurada correctamente.') + ' Redirigiendo al login...');
        setTimeout(() => { window.location.href = '/login'; }, 2500);
      }
    } catch { setError('No se pudo conectar con el servidor.'); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'var(--navy)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ width:'100%', maxWidth:580, display:'flex', flexDirection:'column', gap:20 }}>

        {/* Header */}
        <div className="anim-fade-down" style={{ display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:54, height:54, borderRadius:14, background:'rgba(245,158,11,0.12)', color:'#f59e0b', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ShieldAlert size={26} strokeWidth={1.5} />
          </div>
          <div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:'var(--white)', margin:'0 0 4px' }}>
              Restauración de Emergencia
            </h1>
            <p style={{ fontSize:12, color:'var(--cream-dim)', margin:0 }}>UniMente — Solo cuando la base de datos está vacía</p>
          </div>
        </div>

        {/* Warning */}
        <div className="anim-fade-up" style={{ display:'flex', gap:10, alignItems:'flex-start', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.22)', borderRadius:10, padding:'12px 14px', fontSize:12.5, color:'var(--cream-dim)', lineHeight:1.6 }}>
          <ShieldAlert size={14} style={{ flexShrink:0, color:'#f59e0b', marginTop:1 }} />
          <p style={{ margin:0 }}>
            Este panel solo funciona cuando no hay usuarios en la BD.
            Requiere la clave <code style={{ background:'rgba(255,255,255,0.08)', padding:'1px 5px', borderRadius:4, fontSize:11 }}>RESTORE_SECRET</code> del <code style={{ background:'rgba(255,255,255,0.08)', padding:'1px 5px', borderRadius:4, fontSize:11 }}>.env</code> del servidor.
            Una vez restaurada, usa <strong style={{ color:'var(--cream)' }}>/login</strong>.
          </p>
        </div>

        {/* Backups */}
        <div className="anim-fade-up delay-2" style={{ background:'var(--navy-card)', border:'1px solid var(--border)', borderRadius:14, padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, fontWeight:600, fontSize:13.5, color:'var(--white)' }}>
            <Database size={15} style={{ color:'var(--teal-light)' }} />
            Respaldos disponibles
            <button onClick={loadBackups} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--cream-dim)', cursor:'pointer', padding:4, borderRadius:6, display:'flex', alignItems:'center', transition:'color 0.15s' }}>
              <RefreshCw size={13} />
            </button>
          </div>

          {loadingBk && <p style={{ fontSize:13, color:'var(--cream-dim)', textAlign:'center', padding:'12px 0' }}>Buscando respaldos...</p>}

          {!loadingBk && backups.length === 0 && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:'24px 0', fontSize:13, color:'var(--cream-dim)', textAlign:'center' }}>
              <Database size={28} style={{ opacity:.3 }} />
              <p style={{ margin:0 }}>No se encontraron archivos en <code style={{ fontSize:12, background:'rgba(255,255,255,0.06)', padding:'2px 6px', borderRadius:4 }}>backend/Backup/</code></p>
            </div>
          )}

          {!loadingBk && backups.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {backups.map((b, i) => (
                <button key={b.nombre_archivo} type="button"
                  className={`anim-fade-up delay-${i+1}`}
                  onClick={() => { setSelected(b); setError(''); }}
                  style={{ display:'flex', alignItems:'center', gap:12, background:'var(--navy)', border:`1px solid ${selected?.nombre_archivo === b.nombre_archivo ? 'var(--teal-light)' : 'var(--border)'}`, borderRadius:10, padding:'12px 14px', cursor:'pointer', textAlign:'left', width:'100%', transition:'border-color 0.15s, background 0.15s', backgroundColor: selected?.nombre_archivo === b.nombre_archivo ? 'rgba(26,122,110,0.08)' : undefined }}>
                  <div style={{ fontWeight:700, fontSize:10, color:'var(--cream-dim)', minWidth:20, textAlign:'center' }}>#{i+1}</div>
                  <div style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color: TIPO_COLOR[b.tipo] ?? 'var(--teal-light)' }}>
                    {TIPO_ICON[b.tipo] ?? <Database size={16} />}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'var(--cream)', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{b.nombre_archivo}</div>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap', marginTop:4 }}>
                      <span style={{ fontSize:10, fontWeight:600, background:'rgba(255,255,255,0.07)', color: TIPO_COLOR[b.tipo] ?? 'var(--teal-light)', padding:'2px 7px', borderRadius:20 }}>{b.tipo}</span>
                      <span style={{ fontSize:10, fontWeight:600, background:'rgba(255,255,255,0.07)', color:'var(--cream-dim)', padding:'2px 7px', borderRadius:20 }}>{b.formato}</span>
                      <span style={{ fontSize:10, color:'var(--cream-dim)', marginLeft:'auto' }}>{fmtKb(b.tamanio_kb)}</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--cream-dim)', marginTop:3 }}>{fmtDate(b.created_at)}</div>
                  </div>
                  {selected?.nombre_archivo === b.nombre_archivo && <CheckCircle2 size={18} style={{ color:'var(--teal-light)', flexShrink:0 }} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Form */}
        <div className="anim-fade-up delay-3" style={{ background:'var(--navy-card)', border:'1px solid var(--border)', borderRadius:14, padding:'20px 22px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14, fontWeight:600, fontSize:13.5, color:'var(--white)' }}>
            <RotateCcw size={15} style={{ color:'var(--teal-light)' }} />
            Confirmar restauración
          </div>

          {error   && <div style={{ display:'flex', gap:8, alignItems:'center', background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:9, padding:'10px 14px', fontSize:13, color:'#f87171', marginBottom:12 }}><ShieldAlert size={14} />{error}</div>}
          {success && <div style={{ display:'flex', gap:8, alignItems:'center', background:'rgba(62,207,142,0.1)', border:'1px solid rgba(62,207,142,0.2)', borderRadius:9, padding:'10px 14px', fontSize:13, color:'#3ecf8e', marginBottom:12 }}><CheckCircle2 size={14} />{success}</div>}

          <form onSubmit={handleRestore} style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {selected ? (
              <div style={{ background:'var(--navy)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:12.5 }}>
                  <span style={{ fontSize:10, color:'var(--cream-dim)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Archivo</span>
                  <code style={{ fontFamily:'monospace', fontSize:11, color:'var(--cream)', wordBreak:'break-all' }}>{selected.nombre_archivo}</code>
                </div>
                {selected.tipo === 'COMPLETO' && (
                  <div style={{ fontSize:11, color:'#f87171', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', borderRadius:6, padding:'7px 10px' }}>
                    Esta restauración reemplazará TODOS los datos actuales.
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize:13, color:'var(--cream-dim)', textAlign:'center', padding:10, background:'rgba(255,255,255,0.03)', border:'1px dashed var(--border)', borderRadius:8, margin:0 }}>
                Selecciona un respaldo de la lista de arriba.
              </p>
            )}

            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:500, color:'var(--cream-dim)' }}>
                <ShieldAlert size={13} /> Clave secreta (RESTORE_SECRET del .env)
              </label>
              <div style={{ position:'relative' }}>
                <input type={showSec ? 'text' : 'password'} placeholder="Clave del archivo .env del servidor"
                  value={secret} onChange={e => setSecret(e.target.value)} required style={{ paddingRight:38 }} />
                <button type="button" onClick={() => setShowSec(v => !v)}
                  style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'var(--cream-dim)', cursor:'pointer', display:'flex', alignItems:'center', transition:'color 0.15s' }}>
                  {showSec ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading || !selected || !secret.trim()}
              style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, width:'100%', padding:13, background:'#f59e0b', color:'#0d1117', fontSize:14, fontWeight:700, border:'none', borderRadius:10, cursor:'pointer', transition:'background 0.15s, transform 0.1s', opacity: (loading || !selected || !secret.trim()) ? 0.45 : 1 }}>
              <RotateCcw size={16} />
              {loading ? 'Restaurando...' : 'Restaurar base de datos'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
