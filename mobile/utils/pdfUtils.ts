import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/**
 * Genera un PDF del historial clínico de un paciente y abre el menú
 * nativo de compartir / guardar. Usa expo-print (sin dependencias extra).
 *
 * Instalar si no están:
 *   npx expo install expo-print expo-sharing
 */
export async function exportarHistorialPDF(paciente: {
  nombre:   string;
  correo:   string;
  matricula?: string;
  carrera?:  string;
  citas:    Array<{
    fecha:       string;
    hora_inicio: string;
    estado:      string;
    sesion?: {
      numero_sesion:   number;
      notas:           string;
      recomendaciones: string;
      fecha_registro:  string;
    };
  }>;
}) {
  const ahora = new Date().toLocaleString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const filasHTML = paciente.citas
    .filter(c => c.sesion)
    .map(c => `
      <div class="sesion">
        <div class="sesion-header">
          <span class="sesion-num">Sesión #${c.sesion!.numero_sesion}</span>
          <span class="sesion-fecha">${c.fecha} — ${c.hora_inicio}</span>
        </div>
        ${c.sesion!.notas ? `<div class="sesion-block"><strong>Notas:</strong><p>${c.sesion!.notas}</p></div>` : ''}
        ${c.sesion!.recomendaciones ? `<div class="sesion-block"><strong>Recomendaciones:</strong><p>${c.sesion!.recomendaciones}</p></div>` : ''}
        <div class="sesion-reg">Registrada: ${c.sesion!.fecha_registro}</div>
      </div>
    `).join('');

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; padding: 32px; font-size: 13px; }
        h1   { font-size: 22px; color: #1A7A6E; margin: 0 0 4px; }
        .sub { color: #666; font-size: 12px; margin-bottom: 24px; }
        .info { background: #f0faf8; border-left: 4px solid #1A7A6E; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; }
        .info p { margin: 2px 0; font-size: 13px; }
        .sesion { border: 1px solid #e0e0e0; border-radius: 8px; padding: 14px; margin-bottom: 14px; }
        .sesion-header { display: flex; justify-content: space-between; margin-bottom: 10px; font-weight: 700; }
        .sesion-num  { color: #1A7A6E; }
        .sesion-fecha{ color: #888; font-size: 11px; font-weight: 400; }
        .sesion-block{ margin-bottom: 8px; }
        .sesion-block p { margin: 4px 0 0; color: #444; line-height: 1.5; }
        .sesion-reg  { font-size: 10px; color: #aaa; margin-top: 8px; }
        .footer { margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px; font-size: 10px; color: #aaa; }
      </style>
    </head>
    <body>
      <h1>UniMente — Historial Clínico</h1>
      <div class="sub">Generado el ${ahora}</div>

      <div class="info">
        <p><strong>Paciente:</strong> ${paciente.nombre}</p>
        <p><strong>Correo:</strong>   ${paciente.correo}</p>
        ${paciente.matricula ? `<p><strong>Matrícula:</strong> ${paciente.matricula}</p>` : ''}
        ${paciente.carrera   ? `<p><strong>Carrera:</strong>   ${paciente.carrera}</p>`   : ''}
      </div>

      <h2 style="font-size:15px; color:#333; margin-bottom:12px;">
        Sesiones clínicas (${paciente.citas.filter(c => c.sesion).length})
      </h2>

      ${filasHTML || '<p style="color:#888">Sin sesiones clínicas registradas.</p>'}

      <div class="footer">
        UniMente — Portal de Bienestar Universitario · Documento confidencial
      </div>
    </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: `Historial — ${paciente.nombre}`,
    UTI: 'com.adobe.pdf',
  });
}