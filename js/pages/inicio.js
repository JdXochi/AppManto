// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Inicio (panorama general — visible para todos los roles)
// =========================================================
import {
  listReporteInventario, listActividadMantenimientos,
  listCambiosHardwareReciente, contarEquiposRetirados,
} from "../data.js";
import { esc, hoyLocalISO, DIAS_ALERTA_REGISTRO, diasRegistroTardio } from "../shared.js";
import { fmtDate } from "../pdf.js";

// Meta: porcentaje de equipos con el mantenimiento al día
const META = 90;

// Colores de la marca Xochi
const C = { verde: "#0B8F47", magenta: "#DA1769", azul: "#2A80C1", naranja: "#F06E21", marino: "#14406D", gris: "#667085", amarillo: "#F6C015" };
const COLOR_ESTADO = { "Vigente": C.verde, "Próximo": C.naranja, "Atrasado": C.magenta, "Sin registro": "#98A2B3" };
const ESTADOS = ["Vigente", "Próximo", "Atrasado", "Sin registro"];

const ICONOS = {
  equipo: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  alerta: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17.5v.01"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  vacio: '<circle cx="12" cy="12" r="9" stroke-dasharray="3 3"/>',
  tablero: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v3H9zM9 14l2 2 4-4"/>',
  llave: '<path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5"/>',
  bajar: '<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 11l5 5 5-5M12 4v12"/>',
  lista: '<path d="M9 6h11M9 12h11M9 18h11M5 6h.01M5 12h.01M5 18h.01"/>',
  caja: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
};
const icono = (n, tam = 20) =>
  `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[n] || ""}</svg>`;

const CSS = `
<style>
  .inicio{ --ease:cubic-bezier(.22,.8,.3,1); }
  .inicio .fx{ opacity:0; transform:translateY(10px); animation:ini-in .55s var(--ease) forwards; animation-delay:calc(var(--i,0) * 55ms); }
  @keyframes ini-in{ to{ opacity:1; transform:none; } }
  .inicio .ini-card{ background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px 20px; box-shadow:0 1px 3px rgba(20,32,46,.04); transition:transform .25s var(--ease), box-shadow .25s var(--ease); }
  .inicio .ini-card:hover{ transform:translateY(-2px); box-shadow:0 8px 22px rgba(20,32,46,.09); }
  .inicio h3{ margin:0 0 3px; font-size:15px; font-weight:700; color:var(--navy); }
  .inicio .sub{ margin:0 0 14px; font-size:12.5px; color:var(--muted); }
  .inicio .ini-grid{ display:grid; gap:16px; margin-bottom:16px; }
  .inicio .g2{ grid-template-columns:repeat(auto-fit,minmax(310px,1fr)); }
  .inicio .vacio{ text-align:center; color:var(--muted); font-size:13.5px; padding:22px 8px; }

  .inicio .hero{ position:relative; overflow:hidden; background:var(--navy); color:#fff; border-radius:16px; padding:26px 28px 24px; margin-bottom:16px; }
  .inicio .hero .franja{ position:absolute; top:0; left:0; right:0; height:6px; display:flex; }
  .inicio .hero .franja span{ flex:1; }
  .inicio .hero svg.deco{ position:absolute; right:0; top:6px; width:260px; height:150px; pointer-events:none; }
  .inicio .hero > .txt{ position:relative; max-width:460px; }
  .inicio .hero h2{ margin:0; font-size:25px; font-weight:800; color:#fff; }
  .inicio .hero .fecha{ margin:3px 0 14px; font-size:13px; color:#C9DBEC; }
  .inicio .hero .msg{ margin:0 0 16px; font-size:15.5px; line-height:1.5; }
  .inicio .meta-bar{ position:relative; height:12px; border-radius:8px; background:rgba(255,255,255,.22); }
  .inicio .meta-bar .fill{ height:100%; border-radius:8px; background:${C.amarillo}; width:0; transition:width 1.1s var(--ease); }
  .inicio .meta-bar .marca{ position:absolute; top:-5px; width:3px; height:22px; background:#fff; border-radius:2px; }
  .inicio .meta-txt{ display:flex; justify-content:space-between; margin-top:7px; font-size:12.5px; color:#C9DBEC; }

  .inicio .acciones{ display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:12px; margin-bottom:16px; }
  .inicio .acc{ display:flex; align-items:center; gap:10px; padding:13px 14px; border-radius:12px; border:1px solid var(--line); background:var(--card);
    font-family:inherit; font-size:13.5px; font-weight:700; color:var(--ink); cursor:pointer; text-align:left; transition:transform .2s var(--ease), box-shadow .2s var(--ease), border-color .2s; }
  .inicio .acc:hover{ transform:translateY(-2px); box-shadow:0 6px 16px rgba(20,32,46,.1); border-color:var(--c); }
  .inicio .acc .ic{ width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:var(--c); color:#fff; flex:0 0 auto; }

  .inicio .tiles{ display:grid; grid-template-columns:repeat(auto-fit,minmax(165px,1fr)); gap:14px; margin-bottom:16px; }
  .inicio .tile{ position:relative; overflow:hidden; border-radius:14px; padding:16px 16px 12px; color:#fff; background:var(--c); transition:transform .25s var(--ease), box-shadow .25s var(--ease); }
  .inicio .tile:hover{ transform:translateY(-3px); box-shadow:0 10px 24px rgba(20,32,46,.18); }
  .inicio .tile .top{ display:flex; justify-content:space-between; align-items:center; opacity:.95; }
  .inicio .tile .n{ font-size:34px; font-weight:800; line-height:1.1; margin-top:8px; }
  .inicio .tile .l{ font-size:13px; font-weight:700; margin-top:1px; }
  .inicio .tile .s{ font-size:12px; opacity:.9; margin-top:2px; min-height:16px; }
  .inicio .tile svg.spark{ display:block; margin-top:6px; }

  .inicio .gauge{ text-align:center; }
  .inicio .gauge svg{ max-width:300px; width:100%; }
  .inicio .leyenda{ display:grid; grid-template-columns:1fr 1fr; gap:8px 16px; margin-top:6px; font-size:13px; text-align:left; }
  .inicio .leyenda div{ display:flex; align-items:center; gap:8px; }
  .inicio .dot{ width:10px; height:10px; border-radius:50%; flex:0 0 auto; }
  .inicio .leyenda b{ margin-left:auto; }
  .inicio .faltan{ margin:12px 0 0; padding:9px 12px; border-radius:10px; font-size:13px; font-weight:600; background:#EEF2F6; color:var(--navy); }

  .inicio .garitas{ display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; }
  .inicio .gar{ display:flex; align-items:center; gap:13px; padding:13px; border:1px solid var(--line); border-radius:12px; transition:transform .2s var(--ease), box-shadow .2s var(--ease); }
  .inicio .gar:hover{ transform:translateY(-2px); box-shadow:0 6px 16px rgba(20,32,46,.09); }
  .inicio .gar b{ display:block; font-size:14px; color:var(--navy); }
  .inicio .gar small{ display:block; color:var(--muted); font-size:12px; margin-top:1px; }
  .inicio .chip{ display:inline-block; margin-top:5px; font-size:11.5px; font-weight:700; padding:2px 9px; border-radius:20px; }
  .inicio .ring-fg{ transition:stroke-dasharray 1s var(--ease); }

  .inicio .agenda{ display:grid; grid-template-columns:repeat(15,1fr); gap:5px; align-items:end; height:160px; }
  .inicio .ag{ display:flex; flex-direction:column; justify-content:flex-end; align-items:center; height:100%; min-width:0; }
  .inicio .ag .v{ font-size:11.5px; font-weight:700; color:var(--navy); height:16px; }
  .inicio .ag .b{ width:100%; border-radius:6px 6px 0 0; background:${C.naranja}; height:0; transition:height .9s var(--ease); }
  .inicio .ag .b.cero{ background:#E4EAF0; }
  .inicio .ag .d{ font-size:11px; color:var(--muted); margin-top:5px; line-height:1.2; text-align:center; }
  .inicio .ag.hoy .d{ color:var(--navy); font-weight:800; }
  .inicio .ag.atr .b{ background:${C.magenta}; }
  .inicio .ag.atr .b.cero{ background:#E4EAF0; }

  .inicio .fila{ display:grid; grid-template-columns:minmax(80px,1.1fr) 2fr 44px; gap:10px; align-items:center; font-size:13px; margin-bottom:10px; }
  .inicio .fila .nom{ font-weight:700; color:var(--navy); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .inicio .pila{ display:flex; height:11px; border-radius:7px; overflow:hidden; background:#EEF2F6; }
  .inicio .pila span{ display:block; height:100%; width:0; transition:width 1s var(--ease); }
  .inicio .fila .pc{ text-align:right; font-weight:700; }

  .inicio .calend{ display:grid; grid-template-columns:18px repeat(8,1fr); gap:4px; max-width:400px; margin:0 auto; }
  .inicio .calend .et{ font-size:11px; color:var(--muted); display:flex; align-items:center; }
  .inicio .calend .cel{ aspect-ratio:1; border-radius:5px; background:#EEF2F6; min-width:0; }
  .inicio .calend .cel.fut{ background:transparent; border:1px dashed #E4E9EE; }
  .inicio .calend .cel.hoy{ outline:2px solid ${C.marino}; outline-offset:1px; }
  .inicio .calend .sem{ font-size:10.5px; color:var(--muted); text-align:center; }
  .inicio .esc{ display:flex; align-items:center; gap:5px; margin-top:10px; font-size:12px; color:var(--muted); }
  .inicio .esc i{ width:13px; height:13px; border-radius:3px; display:block; }

  .inicio .mes-svg{ width:100%; height:auto; }
  .inicio .mes-svg .linea{ stroke-dasharray:420; stroke-dashoffset:420; animation:ini-linea 1.3s var(--ease) .3s forwards; }
  @keyframes ini-linea{ to{ stroke-dashoffset:0; } }

  .inicio .item{ display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--line); flex-wrap:wrap; }
  .inicio .item:last-child{ border-bottom:none; }
  .inicio .item .info{ flex:1 1 180px; min-width:0; font-size:13.5px; }
  .inicio .item .info b{ color:var(--navy); }
  .inicio .item .sub2{ display:block; font-size:12px; color:var(--muted); margin-top:1px; }
  .inicio .item .der{ font-size:12.5px; color:var(--muted); text-align:right; white-space:nowrap; }
  .inicio .pill{ display:inline-block; padding:3px 10px; border-radius:20px; font-size:11.5px; font-weight:700; white-space:nowrap; }
  .inicio .avatar{ width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; flex:0 0 auto; }
  .inicio button.secondary{ padding:6px 12px; font-size:12.5px; white-space:nowrap; }
  .inicio .ini-link{ background:none; border:none; color:var(--navy); font-weight:700; font-size:12.5px; cursor:pointer; font-family:inherit; padding:0; white-space:nowrap; }
  .inicio .ini-link:hover{ text-decoration:underline; }
  .inicio .cab{ display:flex; justify-content:space-between; align-items:baseline; gap:10px; }
  .inicio .todo-bien{ text-align:center; padding:26px 8px; color:var(--muted); font-size:14px; }
  .inicio .todo-bien b{ display:block; color:${C.verde}; font-size:17px; margin-bottom:4px; }

  .inicio .mini-stats{ display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
  .inicio .mini-stats div{ background:#F5F8FB; border-radius:10px; padding:11px 13px; }
  .inicio .mini-stats b{ display:block; font-size:21px; color:var(--navy); line-height:1.15; }
  .inicio .mini-stats span{ font-size:12px; color:var(--muted); }
  .inicio .delta{ font-size:12px; font-weight:700; }
  .inicio .up{ color:${C.verde}; }
  .inicio .down{ color:${C.magenta}; }
  .inicio .ctl{ display:flex; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid var(--line); font-size:13.5px; }
  .inicio .ctl:last-child{ border-bottom:none; }
  .inicio .ctl .ic{ width:34px; height:34px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex:0 0 auto; }
  .inicio .ctl small{ display:block; color:var(--muted); font-size:12px; }

  @media (max-width:640px){
    .inicio .hero{ padding:22px 20px; }
    .inicio .hero svg.deco{ opacity:.35; }
    .inicio .agenda{ gap:3px; }
    .inicio .fila{ grid-template-columns:minmax(70px,1fr) 1.6fr 40px; }
  }
  @media (prefers-reduced-motion:reduce){
    .inicio .fx{ animation:none; opacity:1; transform:none; }
    .inicio .mes-svg .linea{ animation:none; stroke-dashoffset:0; }
    .inicio *{ transition:none !important; }
  }
</style>`;

// ---------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------
const pl = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const t0 = iso => Date.parse(String(iso).slice(0, 10) + "T00:00:00Z");
const diasEntre = (a, b) => Math.round((t0(a) - t0(b)) / 86400000);
const addDias = (iso, n) => new Date(t0(iso) + n * 86400000).toISOString().slice(0, 10);
const diaSemana = iso => (new Date(t0(iso)).getUTCDay() + 6) % 7;          // 0 = lunes … 6 = domingo
const fmtQ = n => "Q " + Number(n).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const primerNombre = s => (s || "").trim().split(/\s+/)[0] || "";
const iniciales = s => (s || "?").trim().split(/\s+/).slice(0, 2).map(p => p[0]).join("").toUpperCase();

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

function hace(iso) {
  if (!iso) return "";
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ayer";
  if (d < 30) return `hace ${d} días`;
  return fmtDate(String(iso).slice(0, 10));
}

const AVATARES = [["#E4F5EB", "#0B7A3E"], ["#E6F1FB", "#0C447C"], ["#FCE9E9", "#A5134E"], ["#FFF2DD", "#9A5207"], ["#EEEDFE", "#3C3489"]];
function avatar(nombre) {
  const suma = [...(nombre || "?")].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const [bg, fg] = AVATARES[suma % AVATARES.length];
  return `<span class="avatar" style="background:${bg}; color:${fg}">${esc(iniciales(nombre))}</span>`;
}

// Anillo de progreso (SVG)
function anillo(pct, color, tam = 54) {
  const r = tam / 2 - 6, c = 2 * Math.PI * r, mid = tam / 2;
  return `<svg width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}" role="img" aria-label="${pct}%">
    <circle cx="${mid}" cy="${mid}" r="${r}" fill="none" stroke="#E4EAF0" stroke-width="6"/>
    <circle class="ring-fg" cx="${mid}" cy="${mid}" r="${r}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="0 ${c}" data-dash="${(pct / 100) * c} ${c}" transform="rotate(-90 ${mid} ${mid})"/>
    <text x="${mid}" y="${mid + 4}" text-anchor="middle" font-size="12" font-weight="800" fill="#14202E">${pct}%</text></svg>`;
}

// Línea pequeña para las tarjetas de color
function chispa(valores) {
  const max = Math.max(1, ...valores);
  const pts = valores.map((v, i) => `${(i / Math.max(1, valores.length - 1)) * 100},${24 - (v / max) * 20}`).join(" ");
  return `<svg class="spark" width="100%" height="26" viewBox="0 0 100 26" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${pts}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}

// ---------------------------------------------------------------
// Página
// ---------------------------------------------------------------
export async function render(container, { ROL, perfil } = {}) {
  container.innerHTML = `${CSS}<div class="inicio"><div class="ini-card"><p class="vacio">Preparando tu panorama general...</p></div></div>`;

  const hoy = hoyLocalISO();
  const [anio, mes] = hoy.split("-").map(Number);

  // Últimos 6 meses (incluye el actual)
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(anio, mes - 1 - i, 1));
    meses.push({
      clave: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      nombre: d.toLocaleDateString("es-GT", { month: "short", timeZone: "UTC" }).replace(".", ""),
      n: 0,
    });
  }
  const claveMes = meses[5].clave, clavePrev = meses[4].clave;

  const [inventario, actividad, hardware, retirados] = await Promise.all([
    listReporteInventario(),
    listActividadMantenimientos(`${meses[0].clave}-01`),
    listCambiosHardwareReciente(`${clavePrev}-01`).catch(() => []),
    contarEquiposRetirados().catch(() => 0),
  ]);

  const esAdmin = ROL === "admin", esTecnico = ROL === "tecnico", esUsuario = ROL === "usuario";
  const puedeRegistrar = esAdmin || esTecnico;

  // ---------- Estado general ----------
  const total = inventario.length;
  const counts = { "Vigente": 0, "Próximo": 0, "Atrasado": 0, "Sin registro": 0 };
  inventario.forEach(f => { if (counts[f.estado] !== undefined) counts[f.estado]++; });
  const cumplen = counts["Vigente"] + counts["Próximo"];
  const pct = total ? Math.round((cumplen / total) * 100) : 0;
  const faltan = total ? Math.max(0, Math.ceil((total * META) / 100) - cumplen) : 0;
  const deTotal = n => (total ? `${Math.round((n / total) * 100)}% del total` : "—");

  let mensaje;
  if (!total) mensaje = "Aún no hay equipos registrados. Empieza agregándolos desde Inventario.";
  else if (pct >= META) mensaje = `¡Meta alcanzada! ${pct}% de los equipos tienen su mantenimiento al día. A mantener el ritmo.`;
  else if (pct >= 70) mensaje = `Vas bien: ${pct}% de los equipos están al día. Faltan ${pl(faltan, "equipo", "equipos")} para llegar a la meta del ${META}%.`;
  else mensaje = `Hay trabajo por hacer: ${pct}% de los equipos están al día. Faltan ${pl(faltan, "equipo", "equipos")} para llegar a la meta del ${META}%.`;

  // ---------- Mantenimientos por mes y por semana ----------
  const indiceMes = new Map(meses.map(m => [m.clave, m]));
  const porDia = new Map();
  actividad.forEach(r => {
    const m = indiceMes.get(String(r.fecha).slice(0, 7));
    if (m) m.n++;
    porDia.set(r.fecha, (porDia.get(r.fecha) || 0) + 1);
  });
  const mantMes = meses[5].n, mantPrev = meses[4].n;
  const deltaMant = mantMes - mantPrev;

  const lunesActual = addDias(hoy, -diaSemana(hoy));
  const inicioCal = addDias(lunesActual, -49);                     // 8 semanas
  const semanas = Array.from({ length: 8 }, () => 0);
  actividad.forEach(r => {
    const i = Math.floor(diasEntre(r.fecha, inicioCal) / 7);
    if (i >= 0 && i < 8) semanas[i]++;
  });

  // ---------- Por garita y por tipo ----------
  function agrupar(clave) {
    const mapa = new Map();
    inventario.forEach(f => {
      const k = f[clave] || "(sin dato)";
      if (!mapa.has(k)) mapa.set(k, { total: 0, "Vigente": 0, "Próximo": 0, "Atrasado": 0, "Sin registro": 0 });
      const x = mapa.get(k);
      x.total++;
      if (x[f.estado] !== undefined) x[f.estado]++;
    });
    return [...mapa.entries()].map(([nombre, x]) => ({ nombre, ...x, pct: x.total ? (x["Vigente"] + x["Próximo"]) / x.total : 0 }));
  }
  const garitas = agrupar("garita").sort((a, b) => a.pct - b.pct || a.nombre.localeCompare(b.nombre, "es"));
  const tipos = agrupar("tipo").sort((a, b) => b.total - a.total).slice(0, 6);

  // ---------- Agenda de los próximos 14 días ----------
  const dias = Array.from({ length: 14 }, (_, i) => addDias(hoy, i));
  const conteoDia = new Map(dias.map(d => [d, 0]));
  inventario.forEach(f => { if (f.proxima_fecha && conteoDia.has(f.proxima_fecha)) conteoDia.set(f.proxima_fecha, conteoDia.get(f.proxima_fecha) + 1); });
  const maxAgenda = Math.max(1, counts["Atrasado"], ...conteoDia.values());
  const vencen14 = [...conteoDia.values()].reduce((a, b) => a + b, 0);

  // ---------- Requieren atención ----------
  const orden = { "Atrasado": 0, "Próximo": 1, "Sin registro": 2 };
  const atencion = inventario
    .filter(f => f.estado !== "Vigente")
    .map(f => ({ ...f, dif: f.proxima_fecha ? diasEntre(hoy, f.proxima_fecha) : null }))
    .sort((a, b) => (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9) || (b.dif ?? 0) - (a.dif ?? 0) || String(a.serie).localeCompare(String(b.serie), "es"))
    .slice(0, 6);
  const hayMas = (counts["Atrasado"] + counts["Próximo"] + counts["Sin registro"]) > atencion.length;
  const detalleAtencion = f =>
    f.estado === "Atrasado" ? `${pl(f.dif, "día", "días")} de atraso`
    : f.estado === "Próximo" ? (f.dif === 0 ? "vence hoy" : `vence en ${pl(-f.dif, "día", "días")}`)
    : "sin mantenimiento";

  // ---------- Hardware del mes ----------
  const hwMes = hardware.filter(h => String(h.fecha).startsWith(claveMes));
  const hwPrev = hardware.filter(h => String(h.fecha).startsWith(clavePrev));
  const costo = lista => lista.reduce((a, h) => a + (h.costo || 0), 0);
  const porPieza = new Map();
  hwMes.forEach(h => { const k = h.categoria || "Sin categoría"; porPieza.set(k, (porPieza.get(k) || 0) + 1); });
  const topPiezas = [...porPieza.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  // ---------- Actividad reciente (mantenimientos + hardware) ----------
  const feed = [
    ...actividad.slice(0, 25).map(r => ({ tipo: "mant", creado: r.created_at, tecnico: r.tecnico_nombre, serie: r.serie, equipo_id: r.equipo_id, detalle: `${r.tipo} · ${r.garita}` })),
    ...hardware.slice(0, 25).map(h => ({ tipo: "hw", creado: h.created_at, tecnico: h.tecnico_nombre, serie: h.serie, equipo_id: h.equipo_id, detalle: `${h.categoria || "Hardware"} · ${h.accion}` })),
  ].sort((a, b) => String(b.creado).localeCompare(String(a.creado))).slice(0, 6);

  // ---------- Técnicos del mes y control ----------
  const porTecnico = new Map();
  actividad.filter(r => String(r.fecha).startsWith(claveMes)).forEach(r => {
    const k = r.tecnico_nombre || "(sin nombre)";
    porTecnico.set(k, (porTecnico.get(k) || 0) + 1);
  });
  const tecnicos = [...porTecnico.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxTec = Math.max(1, ...tecnicos.map(t => t[1]));

  const tardios = actividad.filter(r => String(r.fecha).startsWith(claveMes) && diasRegistroTardio(r.fecha, r.created_at) > DIAS_ALERTA_REGISTRO).length;
  const sinUbic = inventario.filter(f => !f.ubicacion).length;
  const sinEnc = inventario.filter(f => !f.encargado_nombre).length;
  const incompletos = inventario.filter(f => !f.ubicacion || !f.encargado_nombre).length;
  const completos = total ? Math.round(((total - incompletos) / total) * 100) : 100;

  // =========================================================
  // HTML
  // =========================================================
  let n = 0;
  // Escalona la entrada de cada bloque (cierra el atributo class y agrega el style)
  const fx = (extra = "") => `fx" style="--i:${n++};${extra}`;

  const nombre = perfil && perfil.nombre ? primerNombre(perfil.nombre) : "";
  const fechaLarga = new Date().toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const colorPct = pct >= META ? C.verde : pct >= 70 ? C.naranja : C.magenta;

  // --- Héroe ---
  const hero = `
    <div class="hero ${fx()}">
      <div class="franja"><span style="background:${C.verde}"></span><span style="background:${C.magenta}"></span><span style="background:${C.azul}"></span><span style="background:${C.naranja}"></span></div>
      <svg class="deco" viewBox="0 0 260 150" aria-hidden="true">
        <polygon points="260,0 260,95 178,0" fill="${C.naranja}" opacity=".92"/>
        <polygon points="178,0 260,95 205,150 137,55" fill="${C.magenta}" opacity=".85"/>
        <polygon points="137,55 205,150 96,150" fill="${C.azul}" opacity=".9"/>
        <polygon points="260,95 260,150 205,150" fill="${C.verde}" opacity=".95"/>
        <polygon points="96,150 137,55 55,150" fill="${C.amarillo}" opacity=".9"/>
      </svg>
      <div class="txt">
        <h2>${saludo()}${nombre ? ", " + esc(nombre) : ""}</h2>
        <p class="fecha">${esc(fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1))}</p>
        <p class="msg">${esc(mensaje)}</p>
        <div class="meta-bar"><div class="fill" data-w="${pct}"></div><div class="marca" style="left:calc(${META}% - 1px)"></div></div>
        <div class="meta-txt"><span>${total ? pct + "% al día" : ""}</span><span>Meta ${META}%</span></div>
      </div>
    </div>`;

  // --- Accesos rápidos ---
  const accesos = [
    puedeRegistrar && { ir: "registrar", ic: "tablero", c: C.verde, t: "Registrar mantenimiento" },
    puedeRegistrar && { ir: "hardware", ic: "llave", c: C.azul, t: "Cambio de hardware" },
    { ir: "estado", ic: "alerta", c: C.magenta, t: "Ver pendientes" },
    !puedeRegistrar && { ir: "historial", ic: "lista", c: C.azul, t: "Ver historial" },
    !puedeRegistrar && { ir: "inventario", ic: "caja", c: C.verde, t: "Inventario" },
    { ir: "reportes", ic: "bajar", c: C.naranja, t: "Descargar reportes" },
  ].filter(Boolean);
  const accionesHtml = `<div class="acciones ${fx()}">${accesos.map(a =>
    `<button class="acc" style="--c:${a.c}" data-ir="${a.ir}"><span class="ic">${icono(a.ic)}</span>${esc(a.t)}</button>`).join("")}</div>`;

  // --- Indicadores ---
  const signo = deltaMant > 0 ? "+" : "";
  const tiles = [
    { ic: "equipo", c: C.azul, n: total, l: "Equipos activos", s: retirados ? `${pl(retirados, "equipo", "equipos")} fuera de servicio` : "Todos en operación" },
    { ic: "alerta", c: C.magenta, n: counts["Atrasado"], l: "Atrasados", s: deTotal(counts["Atrasado"]) },
    { ic: "reloj", c: C.naranja, n: counts["Próximo"], l: "Por vencer (15 días)", s: deTotal(counts["Próximo"]) },
    { ic: "check", c: C.verde, n: counts["Vigente"], l: "Al día", s: deTotal(counts["Vigente"]) },
    { ic: "vacio", c: C.gris, n: counts["Sin registro"], l: "Sin registro", s: "nunca han tenido mantenimiento" },
    { ic: "tablero", c: C.marino, n: mantMes, l: "Mantenimientos este mes", s: `${signo}${deltaMant} vs mes pasado`, spark: semanas },
  ];
  const tilesHtml = `<div class="tiles ${fx()}">${tiles.map(t => `
    <div class="tile" style="--c:${t.c}">
      <div class="top">${icono(t.ic, 22)}</div>
      <div class="n" data-count="${t.n}">${t.n}</div>
      <div class="l">${esc(t.l)}</div>
      <div class="s">${esc(t.s)}</div>
      ${t.spark ? chispa(t.spark) : ""}
    </div>`).join("")}</div>`;

  // --- Medidor de cumplimiento ---
  const L = Math.PI * 90;
  const aM = Math.PI - Math.PI * (META / 100);
  const mx = r => (140 + r * Math.cos(aM)).toFixed(1), my = r => (110 - r * Math.sin(aM)).toFixed(1);
  const medidor = `
    <div class="ini-card gauge ${fx()}">
      <h3>Cumplimiento general</h3>
      <p class="sub">Equipos con el mantenimiento al día</p>
      <svg viewBox="0 0 280 135" role="img" aria-label="Cumplimiento ${pct}%, meta ${META}%">
        <path d="M50 110 A90 90 0 0 1 230 110" fill="none" stroke="#E4EAF0" stroke-width="16" stroke-linecap="round"/>
        <path class="ring-fg" d="M50 110 A90 90 0 0 1 230 110" fill="none" stroke="${colorPct}" stroke-width="16" stroke-linecap="round"
          stroke-dasharray="0 ${L}" data-dash="${(pct / 100) * L} ${L}"/>
        <line x1="${mx(76)}" y1="${my(76)}" x2="${mx(104)}" y2="${my(104)}" stroke="#14202E" stroke-width="2.5"/>
        <text x="${mx(116)}" y="${my(116)}" font-size="11" font-weight="700" fill="#14202E" text-anchor="middle">Meta ${META}%</text>
        <text x="140" y="100" text-anchor="middle" font-size="38" font-weight="800" fill="#14202E">${total ? pct + "%" : "—"}</text>
        <text x="140" y="120" text-anchor="middle" font-size="12" fill="#66707C">al día</text>
      </svg>
      <div class="leyenda">${ESTADOS.map(e => `<div><span class="dot" style="background:${COLOR_ESTADO[e]}"></span>${e}<b>${counts[e]}</b></div>`).join("")}</div>
      ${total ? `<p class="faltan">${pct >= META ? "Meta alcanzada. ¡Buen trabajo!" : `Faltan ${pl(faltan, "equipo", "equipos")} al día para llegar al ${META}%`}</p>` : ""}
    </div>`;

  // --- Mantenimientos por mes ---
  const maxM = Math.max(1, ...meses.map(m => m.n));
  const px = i => 24 + i * 50, py = v => 96 - (v / maxM) * 62;
  const puntos = meses.map((m, i) => `${px(i)},${py(m.n)}`).join(" ");
  const grafMes = `
    <div class="ini-card ${fx()}">
      <h3>Mantenimientos por mes</h3>
      <p class="sub">${pl(mantMes, "mantenimiento", "mantenimientos")} este mes · <span class="delta ${deltaMant >= 0 ? "up" : "down"}">${signo}${deltaMant} vs mes pasado</span></p>
      <svg class="mes-svg" viewBox="0 0 300 130" role="img" aria-label="Mantenimientos de los últimos 6 meses">
        <line x1="10" y1="100" x2="292" y2="100" stroke="#DDE3EA"/>
        <polygon points="${px(0)},100 ${puntos} ${px(5)},100" fill="${C.azul}" opacity=".13"/>
        <polyline class="linea" points="${puntos}" fill="none" stroke="${C.azul}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        ${meses.map((m, i) => `
          <circle cx="${px(i)}" cy="${py(m.n)}" r="${i === 5 ? 6 : 4}" fill="${C.azul}" stroke="#fff" stroke-width="2"/>
          <text x="${px(i)}" y="${py(m.n) - 11}" text-anchor="middle" font-size="12" font-weight="700" fill="${C.marino}">${m.n}</text>
          <text x="${px(i)}" y="118" text-anchor="middle" font-size="11" fill="#66707C" style="text-transform:capitalize">${esc(m.nombre)}</text>`).join("")}
      </svg>
    </div>`;

  // --- Garitas ---
  const garitasHtml = `
    <div class="ini-card ${fx("margin-bottom:16px")}">
      <div class="cab"><h3>Cómo va cada garita</h3></div>
      <p class="sub">Las que más atención necesitan aparecen primero</p>
      ${garitas.length ? `<div class="garitas">${garitas.map(g => {
        const p = Math.round(g.pct * 100);
        const color = p >= META ? C.verde : p >= 70 ? C.azul : p >= 50 ? C.naranja : C.magenta;
        const chip = g["Atrasado"] ? [pl(g["Atrasado"], "atrasado", "atrasados"), "#FCE9E9", "#A5134E"]
          : g["Próximo"] ? [`${g["Próximo"]} por vencer`, "#FFF2DD", "#9A5207"]
          : g["Sin registro"] ? [`${g["Sin registro"]} sin registro`, "#EEF0F2", "#475467"]
          : ["Todo al día", "#E4F5EB", "#0B7A3E"];
        return `<div class="gar">${anillo(p, color)}<div><b>${esc(g.nombre)}</b><small>${pl(g.total, "equipo", "equipos")}</small>
          <span class="chip" style="background:${chip[1]}; color:${chip[2]}">${esc(chip[0])}</span></div></div>`;
      }).join("")}</div>` : `<p class="vacio">Aún no hay equipos registrados.</p>`}
    </div>`;

  // --- Agenda ---
  const nomDia = ["L", "M", "M", "J", "V", "S", "D"];
  const agendaHtml = `
    <div class="ini-card ${fx()}">
      <h3>Agenda de los próximos 14 días</h3>
      <p class="sub">${vencen14 ? `${pl(vencen14, "equipo vence", "equipos vencen")} en las próximas dos semanas` : "Ningún equipo vence en las próximas dos semanas"}</p>
      <div class="agenda">
        <div class="ag atr"><span class="v">${counts["Atrasado"] || ""}</span><div class="b ${counts["Atrasado"] ? "" : "cero"}" data-h="${counts["Atrasado"] ? Math.max(6, (counts["Atrasado"] / maxAgenda) * 100) : 4}"></div><span class="d">Atras.</span></div>
        ${dias.map((d, i) => {
          const c = conteoDia.get(d);
          return `<div class="ag ${i === 0 ? "hoy" : ""}"><span class="v">${c || ""}</span><div class="b ${c ? "" : "cero"}" data-h="${c ? Math.max(6, (c / maxAgenda) * 100) : 4}" title="${fmtDate(d)}: ${pl(c, "equipo", "equipos")}"></div><span class="d">${d.slice(8)}<br>${nomDia[diaSemana(d)]}</span></div>`;
        }).join("")}
      </div>
    </div>`;

  // --- Por tipo de equipo ---
  const tiposHtml = `
    <div class="ini-card ${fx()}">
      <h3>Cumplimiento por tipo de equipo</h3>
      <p class="sub">Los 6 tipos con más equipos</p>
      ${tipos.length ? tipos.map(t => `
        <div class="fila"><span class="nom" title="${esc(t.nombre)}">${esc(t.nombre)}</span>
          <div class="pila" title="${t.total} equipos">${ESTADOS.filter(e => t[e] > 0).map(e => `<span style="background:${COLOR_ESTADO[e]}" data-w="${(t[e] / t.total) * 100}"></span>`).join("")}</div>
          <span class="pc">${Math.round(t.pct * 100)}%</span></div>`).join("") : `<p class="vacio">Sin datos todavía.</p>`}
    </div>`;

  // --- Requieren atención ---
  const atencionHtml = `
    <div class="ini-card ${fx()}">
      <div class="cab"><h3>Requieren atención</h3>${hayMas ? `<button class="ini-link" data-ir="estado">Ver todos →</button>` : ""}</div>
      <p class="sub">Primero lo más atrasado</p>
      ${atencion.length ? atencion.map(f => `
        <div class="item">
          <span class="pill" style="background:${COLOR_ESTADO[f.estado]}1F; color:${COLOR_ESTADO[f.estado]}">${f.estado}</span>
          <div class="info"><b data-ficha="${esc(f.id)}" title="Ver ficha del equipo">${esc(f.serie)}</b>
            <span class="sub2">${esc(f.tipo)} · ${esc(f.garita)}${f.ubicacion ? " · " + esc(f.ubicacion) : ""}</span></div>
          <span class="der">${detalleAtencion(f)}</span>
          ${puedeRegistrar ? `<button class="secondary" data-registrar="${esc(f.id)}">Registrar</button>` : ""}
        </div>`).join("")
      : `<div class="todo-bien"><b>Todo al día</b>No hay equipos pendientes de mantenimiento.</div>`}
    </div>`;

  // --- Actividad reciente ---
  const feedHtml = `
    <div class="ini-card ${fx()}">
      <div class="cab"><h3>Lo último que pasó</h3><button class="ini-link" data-ir="historial">Ver historial →</button></div>
      <p class="sub">Mantenimientos y cambios de hardware</p>
      ${feed.length ? feed.map(f => `
        <div class="item">
          ${avatar(f.tecnico)}
          <div class="info"><b>${esc(primerNombre(f.tecnico))}</b> ${f.tipo === "mant" ? "registró un mantenimiento en" : "registró un cambio en"}
            <b data-ficha="${esc(f.equipo_id)}" title="Ver ficha del equipo">${esc(f.serie)}</b>
            <span class="sub2">${esc(f.detalle)}</span></div>
          <span class="der">${hace(f.creado)}</span>
        </div>`).join("") : `<p class="vacio">Aún no hay movimientos recientes.</p>`}
    </div>`;

  // --- Calendario de actividad ---
  const maxDia = Math.max(1, ...porDia.values());
  const nivelColor = c => c === 0 ? "#EEF2F6" : `rgba(11,143,71,${[0.22, 0.4, 0.65, 0.95][Math.min(3, Math.ceil((c / maxDia) * 4) - 1)]})`;
  const etiquetasSem = Array.from({ length: 8 }, (_, w) => addDias(inicioCal, w * 7).slice(5).split("-").reverse().join("/"));
  let celdas = "";
  for (let d = 0; d < 7; d++) {
    celdas += `<span class="et">${nomDia[d]}</span>`;
    for (let w = 0; w < 8; w++) {
      const fecha = addDias(inicioCal, w * 7 + d);
      const futuro = fecha > hoy;
      const c = porDia.get(fecha) || 0;
      celdas += `<span class="cel ${futuro ? "fut" : ""} ${fecha === hoy ? "hoy" : ""}" style="${futuro ? "" : `background:${nivelColor(c)}`}" title="${fmtDate(fecha)}: ${pl(c, "mantenimiento", "mantenimientos")}"></span>`;
    }
  }
  const calendHtml = `
    <div class="ini-card ${fx()}">
      <h3>Actividad de las últimas 8 semanas</h3>
      <p class="sub">${pl(semanas.reduce((a, b) => a + b, 0), "mantenimiento", "mantenimientos")} · cada cuadro es un día</p>
      <div class="calend">${celdas}<span></span>${etiquetasSem.map(e => `<span class="sem">${e}</span>`).join("")}</div>
      <div class="esc">Menos ${[0.22, 0.4, 0.65, 0.95].map(a => `<i style="background:rgba(11,143,71,${a})"></i>`).join("")} Más</div>
    </div>`;

  // --- Hardware ---
  const cMes = costo(hwMes), cPrev = costo(hwPrev);
  const dCosto = cMes - cPrev;
  const hardwareHtml = `
    <div class="ini-card ${fx()}">
      <div class="cab"><h3>Hardware este mes</h3>${puedeRegistrar ? `<button class="ini-link" data-ir="hardware">Ir a hardware →</button>` : ""}</div>
      <p class="sub">Cambios de piezas y reparaciones</p>
      <div class="mini-stats">
        <div><b>${hwMes.length}</b><span>cambios y reparaciones</span></div>
        <div><b>${fmtQ(cMes)}</b><span>invertidos${hwPrev.length ? ` · <span class="delta ${dCosto <= 0 ? "up" : "down"}">${dCosto > 0 ? "+" : dCosto < 0 ? "-" : ""}${fmtQ(Math.abs(dCosto))} vs mes pasado</span>` : ""}</span></div>
      </div>
      ${topPiezas.length ? `<p class="sub" style="margin-bottom:6px">Lo que más se cambió</p>${topPiezas.map(([p, c]) =>
        `<div class="fila" style="grid-template-columns:1fr auto"><span class="nom">${esc(p)}</span><span class="pc">${c}</span></div>`).join("")}`
        : `<p class="vacio" style="padding:10px 0">Sin cambios de hardware este mes.</p>`}
    </div>`;

  // --- Técnicos (admin y jefes) ---
  const tecnicosHtml = (esAdmin || esUsuario) ? `
    <div class="ini-card ${fx()}">
      <h3>Actividad por técnico</h3>
      <p class="sub">Mantenimientos registrados este mes</p>
      ${tecnicos.length ? tecnicos.map(([t, c]) => `
        <div class="fila"><span class="nom" title="${esc(t)}">${esc(t)}</span>
          <div class="pila"><span style="background:${C.azul}" data-w="${(c / maxTec) * 100}"></span></div>
          <span class="pc">${c}</span></div>`).join("") : `<p class="vacio">Aún no hay mantenimientos este mes.</p>`}
    </div>` : "";

  // --- Calidad y control ---
  const controles = [];
  if (esAdmin || esTecnico) {
    const ok = completos >= 95;
    controles.push(`<div class="ctl"><span class="ic" style="background:${ok ? "#E4F5EB" : "#FFF2DD"}; color:${ok ? "#0B7A3E" : "#9A5207"}">${icono("caja")}</span>
      <div><b>Inventario completo al ${completos}%</b><small>${sinUbic || sinEnc ? `${pl(sinUbic, "equipo", "equipos")} sin ubicación · ${pl(sinEnc, "equipo", "equipos")} sin encargado` : "Todos tienen ubicación y encargado"}</small></div></div>`);
  }
  if (esAdmin || esUsuario) {
    controles.push(`<div class="ctl"><span class="ic" style="background:${tardios ? "#FFF2DD" : "#E4F5EB"}; color:${tardios ? "#9A5207" : "#0B7A3E"}">${icono(tardios ? "reloj" : "check")}</span>
      <div><b>${tardios ? `${pl(tardios, "registro tardío", "registros tardíos")} este mes` : "Registros al día"}</b><small>${tardios ? `Mantenimientos registrados con más de ${DIAS_ALERTA_REGISTRO} días de retraso` : `Ningún mantenimiento se registró con más de ${DIAS_ALERTA_REGISTRO} días de retraso`}</small></div></div>`);
  }
  const controlHtml = controles.length ? `
    <div class="ini-card ${fx()}">
      <h3>Calidad y control</h3>
      <p class="sub">Para que los datos sigan siendo confiables</p>
      ${controles.join("")}
    </div>` : "";

  const filaFinal = [tecnicosHtml, controlHtml].filter(Boolean);

  container.innerHTML = `${CSS}
  <div class="inicio">
    ${hero}
    ${accionesHtml}
    ${tilesHtml}
    <div class="ini-grid g2">${medidor}${grafMes}</div>
    ${garitasHtml}
    <div class="ini-grid g2">${agendaHtml}${tiposHtml}</div>
    <div class="ini-grid g2">${atencionHtml}${feedHtml}</div>
    <div class="ini-grid g2">${calendHtml}${hardwareHtml}</div>
    ${filaFinal.length ? `<div class="ini-grid g2">${filaFinal.join("")}</div>` : ""}
  </div>`;

  // =========================================================
  // Movimiento y acciones
  // =========================================================
  const reducir = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Barras, anillos y alturas crecen hasta su valor final
  requestAnimationFrame(() => requestAnimationFrame(() => {
    container.querySelectorAll("[data-w]").forEach(el => { el.style.width = el.dataset.w + "%"; });
    container.querySelectorAll("[data-h]").forEach(el => { el.style.height = el.dataset.h + "%"; });
    container.querySelectorAll("[data-dash]").forEach(el => el.setAttribute("stroke-dasharray", el.dataset.dash));
  }));

  // Los números suben hasta su valor
  container.querySelectorAll("[data-count]").forEach(el => {
    const meta = Number(el.dataset.count);
    if (reducir || !meta) return;
    const ini = performance.now(), dur = 900;
    el.textContent = "0";
    const paso = ahora => {
      const t = Math.min(1, (ahora - ini) / dur);
      el.textContent = String(Math.round(meta * (1 - Math.pow(1 - t, 3))));
      if (t < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });

  container.querySelectorAll("[data-ir]").forEach(b =>
    b.addEventListener("click", () => window.irAVista && window.irAVista(b.dataset.ir)));
  container.querySelectorAll("[data-registrar]").forEach(b =>
    b.addEventListener("click", () => window.irAVista && window.irAVista("registrar", { preseleccionarEquipoId: b.dataset.registrar })));
}
