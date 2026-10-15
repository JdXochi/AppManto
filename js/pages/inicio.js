// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Inicio (panorama general — visible para todos los roles)
// =========================================================
import { listReporteInventario, listActividadMantenimientos } from "../data.js";
import { esc, hoyLocalISO } from "../shared.js";
import { fmtDate } from "../pdf.js";

// Misma paleta que usan los Excel
const COLOR = {
  "Vigente": "#2E9E4F",
  "Próximo": "#F0A500",
  "Atrasado": "#D92D20",
  "Sin registro": "#98A2B3",
};
const ESTADOS = ["Vigente", "Próximo", "Atrasado", "Sin registro"];

const CSS = `
<style>
  .inicio .ini-hero{ background:linear-gradient(135deg,var(--navy),var(--navy-dark)); color:#fff; border-radius:14px;
    padding:22px 26px; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; gap:16px; flex-wrap:wrap; }
  .inicio .ini-hero h2{ margin:0; font-size:21px; font-weight:700; color:#fff; }
  .inicio .ini-hero .fecha{ margin:4px 0 0; font-size:13px; color:#BFD4E8; }
  .inicio .ini-hero .resumen{ margin:0; font-size:14px; max-width:430px; line-height:1.45; color:#fff; }

  .inicio .ini-top{ display:grid; grid-template-columns:minmax(300px,380px) 1fr; gap:18px; margin-bottom:18px; }
  .inicio .ini-top .card{ margin-bottom:0; }
  .inicio .ini-donut{ display:flex; align-items:center; gap:20px; flex-wrap:wrap; }
  .inicio .ini-donut svg{ flex:0 0 auto; }
  .inicio .ini-leyenda{ display:flex; flex-direction:column; gap:8px; font-size:13px; flex:1 1 130px; }
  .inicio .ini-leyenda div{ display:flex; align-items:center; gap:8px; }
  .inicio .dot{ width:10px; height:10px; border-radius:50%; flex:0 0 auto; }
  .inicio .ini-leyenda b{ margin-left:auto; padding-left:8px; }

  .inicio .ini-stats{ display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px; }
  .inicio .ini-stat{ background:var(--card); border:1px solid var(--line); border-left:5px solid var(--navy);
    border-radius:12px; padding:16px 18px; box-shadow:0 1px 3px rgba(20,32,46,.04); display:flex; flex-direction:column; justify-content:center; }
  .inicio .ini-stat .n{ font-size:32px; font-weight:800; color:var(--navy); line-height:1.1; }
  .inicio .ini-stat .l{ font-size:12.5px; color:var(--muted); margin-top:4px; }

  .inicio .ini-cols{ display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-bottom:18px; }
  .inicio .ini-cols .card{ margin-bottom:0; }
  .inicio .ini-head{ display:flex; justify-content:space-between; align-items:baseline; gap:10px; margin-bottom:14px; }
  .inicio .ini-head h2{ margin:0; }
  .inicio .ini-link{ background:none; border:none; color:var(--navy); font-weight:700; font-size:12.5px; cursor:pointer; font-family:inherit; padding:0; white-space:nowrap; }
  .inicio .ini-link:hover{ text-decoration:underline; }

  .inicio .garita-row{ margin-bottom:13px; }
  .inicio .garita-top{ display:flex; justify-content:space-between; font-size:13px; margin-bottom:5px; gap:10px; }
  .inicio .garita-top .nombre{ font-weight:700; color:var(--navy); }
  .inicio .garita-top .pct{ font-weight:700; }
  .inicio .garita-top .total{ color:var(--muted); font-weight:400; margin-left:6px; }
  .inicio .barra{ display:flex; height:12px; border-radius:7px; overflow:hidden; background:#EEF2F6; }
  .inicio .barra span{ display:block; height:100%; }
  .inicio .mini-leyenda{ display:flex; gap:14px; flex-wrap:wrap; font-size:12px; color:var(--muted); margin-top:14px; }
  .inicio .mini-leyenda span{ display:flex; align-items:center; gap:6px; }

  .inicio .meses{ display:flex; align-items:flex-end; gap:12px; height:190px; padding-top:6px; }
  .inicio .mes{ flex:1; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; height:100%; min-width:0; }
  .inicio .mes .val{ font-size:13px; font-weight:700; color:var(--navy); margin-bottom:5px; }
  .inicio .mes .col{ width:100%; max-width:56px; background:var(--brand-blue,#2F6FB5); border-radius:7px 7px 0 0; min-height:3px; }
  .inicio .mes .col.cero{ background:#E4EAF0; }
  .inicio .mes .nom{ font-size:12px; color:var(--muted); margin-top:8px; text-transform:capitalize; }
  .inicio .nota{ font-size:12px; color:var(--muted); margin:12px 0 0; }

  .inicio .item{ display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--line); flex-wrap:wrap; }
  .inicio .item:last-child{ border-bottom:none; }
  .inicio .item .info{ flex:1 1 180px; min-width:0; font-size:13.5px; }
  .inicio .item .info b{ color:var(--navy); }
  .inicio .item .sub2{ display:block; font-size:12px; color:var(--muted); margin-top:2px; }
  .inicio .item .der{ font-size:12.5px; color:var(--muted); text-align:right; }
  .inicio .pill{ display:inline-block; padding:3px 10px; border-radius:20px; font-size:11.5px; font-weight:700; white-space:nowrap; }
  .inicio button.secondary{ padding:6px 12px; font-size:12.5px; white-space:nowrap; }
  .inicio .todo-bien{ text-align:center; padding:26px 8px; color:var(--muted); font-size:14px; }
  .inicio .todo-bien b{ display:block; color:#2E9E4F; font-size:16px; margin-bottom:4px; }

  @media (max-width:900px){
    .inicio .ini-top, .inicio .ini-cols{ grid-template-columns:1fr; }
  }
</style>`;

function pl(n, uno, varios) { return `${n} ${n === 1 ? uno : varios}`; }

function diasEntre(a, b) {
  const t = iso => Date.parse(String(iso).slice(0, 10) + "T00:00:00Z");
  return Math.round((t(a) - t(b)) / 86400000);
}

function saludo() {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

// Anillo de cumplimiento (SVG)
function donut(counts, total, pct) {
  const R = 54, C = 2 * Math.PI * R;
  let offset = 0;
  const arcos = total ? ESTADOS.map(e => {
    const len = (counts[e] / total) * C;
    const arco = len > 0
      ? `<circle cx="70" cy="70" r="${R}" fill="none" stroke="${COLOR[e]}" stroke-width="16"
           stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 70 70)"/>`
      : "";
    offset += len;
    return arco;
  }).join("") : "";

  return `
    <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Cumplimiento general ${pct}%">
      <circle cx="70" cy="70" r="${R}" fill="none" stroke="#EEF2F6" stroke-width="16"/>
      ${arcos}
      <text x="70" y="68" text-anchor="middle" font-size="26" font-weight="800" fill="#14202E">${total ? pct + "%" : "—"}</text>
      <text x="70" y="88" text-anchor="middle" font-size="11" fill="#66707C">cumplimiento</text>
    </svg>`;
}

export async function render(container, { ROL, perfil } = {}) {
  container.innerHTML = `${CSS}<div class="inicio"><div class="card"><p class="empty">Cargando panorama general...</p></div></div>`;

  // ---------- Datos ----------
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
  const desde = `${meses[0].clave}-01`;

  const [inventario, actividad] = await Promise.all([
    listReporteInventario(),
    listActividadMantenimientos(desde),
  ]);

  // ---------- Conteos generales ----------
  const total = inventario.length;
  const counts = { "Vigente": 0, "Próximo": 0, "Atrasado": 0, "Sin registro": 0 };
  inventario.forEach(f => { if (counts[f.estado] !== undefined) counts[f.estado]++; });
  const cumplen = counts["Vigente"] + counts["Próximo"];
  const pct = total ? Math.round((cumplen / total) * 100) : 0;

  // ---------- Resumen en una frase ----------
  let resumen;
  if (!total) {
    resumen = "Aún no hay equipos registrados.";
  } else {
    const partes = [];
    if (counts["Atrasado"]) partes.push(`${pl(counts["Atrasado"], "equipo atrasado", "equipos atrasados")}`);
    if (counts["Próximo"]) partes.push(`${pl(counts["Próximo"], "equipo por vencer", "equipos por vencer")} en los próximos 15 días`);
    if (counts["Sin registro"]) partes.push(`${pl(counts["Sin registro"], "equipo", "equipos")} sin ningún mantenimiento`);
    resumen = partes.length
      ? `Hoy hay ${partes.join(", ").replace(/, ([^,]*)$/, " y $1")}.`
      : "Todos los equipos tienen su mantenimiento al día.";
  }

  // ---------- Cumplimiento por garita ----------
  const porGarita = new Map();
  inventario.forEach(f => {
    const g = f.garita || "(sin garita)";
    if (!porGarita.has(g)) porGarita.set(g, { total: 0, "Vigente": 0, "Próximo": 0, "Atrasado": 0, "Sin registro": 0 });
    const x = porGarita.get(g);
    x.total++;
    if (x[f.estado] !== undefined) x[f.estado]++;
  });
  const garitas = [...porGarita.entries()]
    .map(([nombre, x]) => ({ nombre, ...x, pct: x.total ? (x["Vigente"] + x["Próximo"]) / x.total : 0 }))
    .sort((a, b) => a.pct - b.pct || a.nombre.localeCompare(b.nombre, "es"));   // primero las que más atención necesitan

  // ---------- Mantenimientos por mes ----------
  const indiceMes = new Map(meses.map(m => [m.clave, m]));
  actividad.forEach(r => { const m = indiceMes.get(String(r.fecha).slice(0, 7)); if (m) m.n++; });
  const maxMes = Math.max(1, ...meses.map(m => m.n));
  const totalMeses = meses.reduce((a, m) => a + m.n, 0);

  // ---------- Requieren atención ----------
  const orden = { "Atrasado": 0, "Próximo": 1, "Sin registro": 2 };
  const atencion = inventario
    .filter(f => f.estado !== "Vigente")
    .map(f => ({ ...f, dif: f.proxima_fecha ? diasEntre(hoy, f.proxima_fecha) : null }))   // >0: ya pasó
    .sort((a, b) =>
      (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9) ||
      (b.dif ?? 0) - (a.dif ?? 0) ||
      String(a.serie).localeCompare(String(b.serie), "es"))
    .slice(0, 8);
  const hayMasPendientes = (counts["Atrasado"] + counts["Próximo"] + counts["Sin registro"]) > atencion.length;

  const puedeRegistrar = ROL === "admin" || ROL === "tecnico";

  function detalleAtencion(f) {
    if (f.estado === "Atrasado") return `${pl(f.dif, "día", "días")} de atraso`;
    if (f.estado === "Próximo") return f.dif === 0 ? "vence hoy" : `vence en ${pl(-f.dif, "día", "días")}`;
    return "sin mantenimiento";
  }

  // ---------- HTML ----------
  const nombre = perfil && perfil.nombre ? perfil.nombre.split(" ")[0] : "";
  const fechaLarga = new Date().toLocaleDateString("es-GT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const statsHtml = [
    { n: total, l: "Equipos activos", c: "var(--navy)" },
    { n: counts["Atrasado"], l: "Atrasados", c: COLOR["Atrasado"] },
    { n: counts["Próximo"], l: "Próximos (≤15 días)", c: COLOR["Próximo"] },
    { n: counts["Sin registro"], l: "Sin registro", c: COLOR["Sin registro"] },
  ].map(s => `<div class="ini-stat" style="border-left-color:${s.c}"><div class="n">${s.n}</div><div class="l">${s.l}</div></div>`).join("");

  const leyendaHtml = ESTADOS.map(e => `
    <div><span class="dot" style="background:${COLOR[e]}"></span>${e}<b>${counts[e]}</b></div>`).join("");

  const garitasHtml = garitas.length ? garitas.map(g => `
    <div class="garita-row">
      <div class="garita-top">
        <span class="nombre">${esc(g.nombre)}<span class="total">${pl(g.total, "equipo", "equipos")}</span></span>
        <span class="pct">${Math.round(g.pct * 100)}%</span>
      </div>
      <div class="barra" title="${esc(g.nombre)}">
        ${ESTADOS.filter(e => g[e] > 0).map(e =>
          `<span style="width:${(g[e] / g.total) * 100}%; background:${COLOR[e]}" title="${e}: ${g[e]}"></span>`).join("")}
      </div>
    </div>`).join("") : `<p class="empty">Aún no hay equipos registrados.</p>`;

  const mesesHtml = meses.map(m => `
    <div class="mes">
      <span class="val">${m.n}</span>
      <div class="col ${m.n ? "" : "cero"}" style="height:${m.n ? Math.max(4, (m.n / maxMes) * 100) : 2}%"></div>
      <span class="nom">${esc(m.nombre)}</span>
    </div>`).join("");

  const atencionHtml = atencion.length ? atencion.map(f => `
    <div class="item">
      <span class="pill" style="background:${COLOR[f.estado]}1F; color:${COLOR[f.estado]}">${f.estado}</span>
      <div class="info"><b data-ficha="${esc(f.id)}" title="Ver ficha del equipo">${esc(f.serie)}</b>
        <span class="sub2">${esc(f.tipo)} · ${esc(f.garita)}${f.ubicacion ? " · " + esc(f.ubicacion) : ""}</span></div>
      <span class="der">${detalleAtencion(f)}</span>
      ${puedeRegistrar ? `<button class="secondary" data-registrar="${esc(f.id)}">Registrar</button>` : ""}
    </div>`).join("")
    : `<div class="todo-bien"><b>Todo al día</b>No hay equipos pendientes de mantenimiento.</div>`;

  const recientes = actividad.slice(0, 6);
  const recientesHtml = recientes.length ? recientes.map(r => `
    <div class="item">
      <div class="info"><b data-ficha="${esc(r.equipo_id)}" title="Ver ficha del equipo">${esc(r.serie)}</b>
        <span class="sub2">${esc(r.tipo)} · ${esc(r.garita)}</span></div>
      <span class="der">${fmtDate(r.fecha)}<br>${esc(r.tecnico_nombre)}</span>
    </div>`).join("")
    : `<p class="empty">Aún no hay mantenimientos registrados en los últimos meses.</p>`;

  container.innerHTML = `${CSS}
  <div class="inicio">
    <div class="ini-hero">
      <div>
        <h2>${saludo()}${nombre ? ", " + esc(nombre) : ""}</h2>
        <p class="fecha">${esc(fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1))}</p>
      </div>
      <p class="resumen">${resumen}</p>
    </div>

    <div class="ini-top">
      <div class="card ini-donut">
        ${donut(counts, total, pct)}
        <div class="ini-leyenda">${leyendaHtml}</div>
      </div>
      <div class="ini-stats">${statsHtml}</div>
    </div>

    <div class="ini-cols">
      <div class="card">
        <div class="ini-head"><h2>Cumplimiento por garita</h2></div>
        ${garitasHtml}
        <div class="mini-leyenda">
          ${ESTADOS.map(e => `<span><i class="dot" style="background:${COLOR[e]}"></i>${e}</span>`).join("")}
        </div>
        <p class="nota">Cumplimiento = vigentes + próximos, sobre el total de equipos. Las garitas que necesitan más atención aparecen primero.</p>
      </div>
      <div class="card">
        <div class="ini-head"><h2>Mantenimientos por mes</h2></div>
        <div class="meses">${mesesHtml}</div>
        <p class="nota">${pl(totalMeses, "mantenimiento registrado", "mantenimientos registrados")} en los últimos 6 meses.</p>
      </div>
    </div>

    <div class="ini-cols">
      <div class="card">
        <div class="ini-head">
          <h2>Requieren atención</h2>
          ${hayMasPendientes ? `<button class="ini-link" data-ir="estado">Ver todos →</button>` : ""}
        </div>
        ${atencionHtml}
      </div>
      <div class="card">
        <div class="ini-head">
          <h2>Actividad reciente</h2>
          <button class="ini-link" data-ir="historial">Ver historial →</button>
        </div>
        ${recientesHtml}
      </div>
    </div>
  </div>`;

  // ---------- Acciones ----------
  container.querySelectorAll("[data-ir]").forEach(b =>
    b.addEventListener("click", () => window.irAVista && window.irAVista(b.dataset.ir)));
  container.querySelectorAll("[data-registrar]").forEach(b =>
    b.addEventListener("click", () =>
      window.irAVista && window.irAVista("registrar", { preseleccionarEquipoId: b.dataset.registrar })));
}
