// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Ficha del equipo: panel lateral con datos, estado, historial de
// mantenimientos y cambios de hardware.
//
// Se abre desde cualquier elemento que tenga data-ficha="<id del equipo>"
// (o con window.abrirFicha(id) / con la dirección dashboard.html?equipo=<id>).
// =========================================================
import { getEquipoFicha, listMantenimientosDeEquipo, listCambiosHardwareDeEquipo, retirarEquipo, reactivarEquipo } from "./data.js";
import { invalidateEquipos } from "./equiposStore.js";
import { pedirRetiro } from "./retiro.js";
import { esc, hoyLocalISO, DIAS_ALERTA_REGISTRO, diasRegistroTardio, fmtFechaHoraGT } from "./shared.js";
import { fmtDate } from "./pdf.js";
import { verHoja } from "./verHoja.js";

// Misma paleta que Inicio y los Excel
const COLOR = {
  "Vigente": "#2E9E4F",
  "Próximo": "#F0A500",
  "Atrasado": "#D92D20",
  "Sin registro": "#98A2B3",
};

const CSS = `
[data-ficha]{ cursor:pointer; }
[data-ficha]:hover{ text-decoration:underline; text-decoration-color:var(--brand-blue,#1F97D4); text-underline-offset:3px; }
body.fi-lock{ overflow:hidden; }

.fi-overlay{ position:fixed; inset:0; background:rgba(10,20,35,.55); z-index:1000; opacity:0; pointer-events:none; transition:opacity .25s ease; }
.fi-overlay.open{ opacity:1; pointer-events:auto; }
.fi-panel{ position:fixed; top:0; right:0; height:100%; width:min(600px,100vw); background:var(--paper,#F3F6F9); z-index:1001;
  transform:translateX(102%); transition:transform .32s cubic-bezier(.22,.8,.3,1); display:flex; flex-direction:column;
  box-shadow:-14px 0 44px rgba(10,20,35,.28); }
.fi-panel.open{ transform:translateX(0); }
.fi-scroll{ flex:1; overflow-y:auto; overscroll-behavior:contain; }

/* ---------- Encabezado ---------- */
.fi-head{ position:relative; color:#fff; padding:22px 24px 20px; overflow:hidden;
  background:linear-gradient(135deg,var(--navy,#14406D),var(--navy-dark,#0F3357)); }
.fi-head::before{ content:""; position:absolute; top:0; left:0; right:0; height:5px;
  background:linear-gradient(90deg,var(--g1,#0B8F47) 25%,var(--g2,#DA1769) 25% 50%,var(--g3,#2A80C1) 50% 75%,var(--g4,#F06E21) 75%); }
.fi-head::after{ content:""; position:absolute; right:-70px; top:-70px; width:240px; height:240px; border-radius:50%;
  background:var(--est); opacity:.20; }
.fi-head > *{ position:relative; z-index:1; }
.fi-close{ position:absolute !important; top:16px; right:16px; width:34px; height:34px; border-radius:50%; border:none; cursor:pointer;
  background:rgba(255,255,255,.16); color:#fff; font-size:20px; line-height:1; padding:0; display:flex; align-items:center; justify-content:center; }
.fi-close:hover{ background:rgba(255,255,255,.28); }
.fi-tipo{ display:inline-block; font-size:11.5px; font-weight:700; letter-spacing:.06em; text-transform:uppercase;
  background:rgba(255,255,255,.16); padding:4px 11px; border-radius:20px; margin-top:6px; }
.fi-serie{ margin:10px 0 2px; font-size:27px; font-weight:800; color:#fff; word-break:break-all; padding-right:40px; }
.fi-ubic{ margin:0; font-size:13.5px; color:#C9DBEC; }
.fi-estado{ display:flex; align-items:center; gap:10px; margin-top:16px; flex-wrap:wrap; }
.fi-chip{ background:var(--est); color:#fff; font-weight:700; font-size:12.5px; padding:5px 13px; border-radius:20px; }
.fi-estado-txt{ font-size:13.5px; font-weight:600; }
.fi-prog{ margin-top:16px; }
.fi-track{ position:relative; height:8px; border-radius:6px; background:rgba(255,255,255,.2); }
.fi-fill{ height:100%; border-radius:6px; background:var(--est); }
.fi-marca{ position:absolute; top:50%; width:16px; height:16px; border-radius:50%; background:#fff; border:3px solid var(--est);
  transform:translate(-50%,-50%); box-shadow:0 1px 4px rgba(0,0,0,.35); }
.fi-fechas{ display:flex; justify-content:space-between; font-size:12px; color:#C9DBEC; margin-top:8px; gap:10px; }

/* ---------- Cuerpo ---------- */
.fi-body{ padding:18px 22px 24px; }
.fi-stats{ display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:16px; }
.fi-stat{ background:var(--card,#fff); border:1px solid var(--line,#E4E9EE); border-top:4px solid var(--c); border-radius:12px; padding:12px 14px; }
.fi-stat b{ display:block; font-size:22px; font-weight:800; color:var(--navy,#14406D); line-height:1.15; }
.fi-stat span{ font-size:12px; color:var(--muted,#66707C); }

.fi-datos{ background:var(--card,#fff); border:1px solid var(--line,#E4E9EE); border-radius:12px; padding:6px 16px; margin-bottom:18px;
  display:grid; grid-template-columns:1fr 1fr; column-gap:18px; }
.fi-dato{ padding:11px 0; border-bottom:1px solid var(--line,#E4E9EE); min-width:0; }
.fi-dato:nth-last-child(-n+2){ border-bottom:none; }
.fi-dato .k{ display:block; font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--muted,#66707C); margin-bottom:3px; }
.fi-dato .v{ font-size:14px; color:var(--ink,#14202E); word-break:break-word; }
.fi-dato .v small{ display:block; color:var(--muted,#66707C); font-size:12px; margin-top:1px; }

.fi-tabs{ display:flex; gap:6px; background:#E6ECF2; padding:4px; border-radius:12px; margin-bottom:16px; }
.fi-tabs button{ flex:1; border:none; background:transparent; padding:9px 10px; border-radius:9px; font-weight:700; font-size:13px;
  color:var(--muted,#66707C); cursor:pointer; font-family:inherit; }
.fi-tabs button.on{ background:var(--navy,#14406D); color:#fff; box-shadow:0 2px 6px rgba(20,64,109,.3); }
.fi-tabs button .n{ display:inline-block; min-width:20px; padding:1px 6px; margin-left:6px; border-radius:10px; font-size:11.5px; background:rgba(20,32,46,.1); }
.fi-tabs button.on .n{ background:rgba(255,255,255,.25); }

/* ---------- Línea de tiempo de mantenimientos ---------- */
.fi-tl{ position:relative; padding-left:26px; }
.fi-tl::before{ content:""; position:absolute; left:8px; top:8px; bottom:8px; width:2px; background:var(--line,#E4E9EE); }
.fi-tl-item{ position:relative; margin-bottom:14px; }
.fi-dot{ position:absolute; left:-26px; top:14px; width:18px; height:18px; border-radius:50%; background:var(--dot); border:4px solid var(--paper,#F3F6F9); box-sizing:border-box; }
.fi-card{ background:var(--card,#fff); border:1px solid var(--line,#E4E9EE); border-radius:12px; padding:13px 15px; }
.fi-card-top{ display:flex; justify-content:space-between; align-items:center; gap:10px; }
.fi-card-top b{ color:var(--navy,#14406D); font-size:14.5px; }
.fi-firma{ font-size:11.5px; font-weight:700; padding:3px 10px; border-radius:20px; white-space:nowrap; }
.fi-firma.dig{ background:#E4F5EB; color:#0B7A3E; }
.fi-firma.fis{ background:#EAF2FB; color:#1F5F9E; }
.fi-tec{ margin:2px 0 8px; font-size:12.5px; color:var(--muted,#66707C); }
.fi-reg{ margin:-4px 0 8px; font-size:12px; color:var(--muted,#66707C); }
.fi-reg.tarde{ color:#B8620A; font-weight:700; }
.fi-act{ margin:0 0 8px; font-size:13.5px; line-height:1.45; white-space:pre-line; }
.fi-hall{ margin:0; font-size:13px; padding:7px 10px; border-radius:8px; line-height:1.4; white-space:pre-line; }
.fi-hall.ok{ background:#EFF9F2; color:#0B7A3E; }
.fi-hall.alerta{ background:#FFF2DD; color:#9A5207; }
.fi-hall b{ font-weight:700; }
.fi-card-foot{ display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:10px; padding-top:10px; border-top:1px dashed var(--line,#E4E9EE); flex-wrap:wrap; }
.fi-card-foot span{ font-size:12px; color:var(--muted,#66707C); flex:1 1 150px; }
.fi-panel button.secondary.sm{ padding:6px 13px; font-size:12.5px; white-space:nowrap; }

/* ---------- Cambios de hardware ---------- */
.fi-hw{ background:var(--card,#fff); border:1px solid var(--line,#E4E9EE); border-left:5px solid var(--c); border-radius:12px; padding:12px 14px; margin-bottom:12px; }
.fi-hw-top{ display:flex; justify-content:space-between; align-items:flex-start; gap:10px; }
.fi-hw-top b{ color:var(--navy,#14406D); font-size:14.5px; }
.fi-hw-top .costo{ font-weight:800; font-size:14.5px; white-space:nowrap; }
.fi-pill{ display:inline-block; margin-left:8px; font-size:11.5px; font-weight:700; padding:2px 10px; border-radius:20px; background:color-mix(in srgb,var(--c) 15%,white); color:var(--c); }
.fi-hw p{ margin:6px 0 4px; font-size:13.5px; line-height:1.4; white-space:pre-line; }
.fi-hw small{ color:var(--muted,#66707C); font-size:12px; }
.fi-total{ text-align:right; font-weight:700; color:var(--navy,#14406D); font-size:13.5px; margin:2px 2px 0; }
.fi-vacio{ text-align:center; color:var(--muted,#66707C); padding:28px 12px; font-size:13.5px; background:var(--card,#fff); border:1px dashed var(--line,#E4E9EE); border-radius:12px; }

/* ---------- Pie con acciones ---------- */
.fi-foot{ display:flex; gap:10px; padding:14px 22px; background:var(--card,#fff); border-top:1px solid var(--line,#E4E9EE); flex-wrap:wrap; }
.fi-foot button{ flex:1 1 180px; }
.fi-foot button.fi-peligro{ background:#fff; color:#B42318; border:1.5px solid #F2B8B5; border-radius:9px; padding:11px 22px; font-weight:700; font-size:14px; cursor:pointer; font-family:inherit; }
.fi-foot button.fi-peligro:hover{ background:#FCE9E9; }
.fi-baja{ background:#F2F4F7; border-left:5px solid #667085; border-radius:10px; padding:12px 14px; margin-bottom:16px; font-size:13.5px; line-height:1.45; color:var(--ink,#14202E); }
.fi-baja b{ color:#344054; }

/* ---------- Cargando ---------- */
.fi-cargando{ padding:60px 24px; text-align:center; color:var(--muted,#66707C); }
.fi-spin{ width:34px; height:34px; border-radius:50%; border:4px solid var(--line,#E4E9EE); border-top-color:var(--brand-blue,#1F97D4);
  margin:0 auto 14px; animation:fi-giro .8s linear infinite; }
@keyframes fi-giro{ to{ transform:rotate(360deg); } }

@media (max-width:560px){
  .fi-datos{ grid-template-columns:1fr; }
  .fi-dato:nth-last-child(-n+2){ border-bottom:1px solid var(--line,#E4E9EE); }
  .fi-dato:last-child{ border-bottom:none; }
  .fi-stats{ gap:8px; }
  .fi-stat{ padding:10px; }
  .fi-body{ padding:16px 14px 22px; }
  .fi-foot{ padding:12px 14px; }
}
@media (prefers-reduced-motion:reduce){
  .fi-panel, .fi-overlay{ transition:none; }
  .fi-spin{ animation:none; }
}
`;

// ---------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------
function diasEntre(a, b) {
  const t = iso => Date.parse(String(iso).slice(0, 10) + "T00:00:00Z");
  return Math.round((t(a) - t(b)) / 86400000);
}
function pl(n, uno, varios) { return `${n} ${n === 1 ? uno : varios}`; }
function fmtQ(n) {
  return "Q " + Number(n).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Estado del equipo: color, texto y avance de la barra entre el último y el próximo mantenimiento
function infoEstado(eq, hoy) {
  const color = COLOR[eq.estado] || COLOR["Sin registro"];
  if (!eq.ultima_fecha || !eq.proxima_fecha) {
    return { color, texto: "Aún no tiene ningún mantenimiento", ratio: 0 };
  }
  const dif = diasEntre(hoy, eq.proxima_fecha);            // >0: la fecha ya pasó
  const texto = dif > 0 ? `${pl(dif, "día", "días")} de atraso`
              : dif === 0 ? "Vence hoy"
              : `Faltan ${pl(-dif, "día", "días")}`;
  const total = Math.max(1, diasEntre(eq.proxima_fecha, eq.ultima_fecha));
  const ratio = Math.min(1, Math.max(0, diasEntre(hoy, eq.ultima_fecha) / total));
  return { color, texto, ratio };
}

// ---------------------------------------------------------------
// Estructura del panel (se crea una sola vez)
// ---------------------------------------------------------------
let ctx = { ROL: "usuario" };
let overlay = null, panel = null, peticion = 0;

function asegurarEstructura() {
  if (panel) return;

  const style = document.createElement("style");
  style.id = "ficha-css";
  style.textContent = CSS;
  document.head.appendChild(style);

  overlay = document.createElement("div");
  overlay.className = "fi-overlay";
  overlay.addEventListener("click", cerrarFicha);

  panel = document.createElement("aside");
  panel.className = "fi-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Ficha del equipo");

  document.body.append(overlay, panel);
}

export function cerrarFicha() {
  if (!panel) return;
  panel.classList.remove("open");
  overlay.classList.remove("open");
  document.body.classList.remove("fi-lock");
  peticion++;   // descarta respuestas que lleguen tarde
}

export async function abrirFicha(equipoId) {
  if (!equipoId) return;
  asegurarEstructura();

  panel.innerHTML = `<div class="fi-scroll"><div class="fi-cargando"><div class="fi-spin"></div>Cargando ficha del equipo...</div></div>`;
  document.body.classList.add("fi-lock");
  overlay.classList.add("open");
  panel.classList.add("open");

  const mio = ++peticion;
  try {
    const [equipo, mantenimientos, cambios] = await Promise.all([
      getEquipoFicha(equipoId),
      listMantenimientosDeEquipo(equipoId),
      listCambiosHardwareDeEquipo(equipoId),
    ]);
    if (mio !== peticion) return;

    if (!equipo) {
      panel.innerHTML = `<div class="fi-scroll"><div class="fi-cargando">No se encontró este equipo (puede estar inactivo).
        <p><button class="secondary" data-cerrar>Cerrar</button></p></div></div>`;
      panel.querySelector("[data-cerrar]").addEventListener("click", cerrarFicha);
      return;
    }
    pintar(equipo, mantenimientos, cambios);
  } catch (err) {
    if (mio !== peticion) return;
    console.error(err);
    panel.innerHTML = `<div class="fi-scroll"><div class="fi-cargando" style="color:#B42318">No se pudo cargar la ficha: ${esc(err.message)}
      <p><button class="secondary" data-cerrar>Cerrar</button></p></div></div>`;
    panel.querySelector("[data-cerrar]").addEventListener("click", cerrarFicha);
  }
}

// ---------------------------------------------------------------
// Contenido
// ---------------------------------------------------------------
function pintar(eq, mantenimientos, cambios) {
  const hoy = hoyLocalISO();
  const fuera = !!eq.fuera_servicio;
  const est = fuera
    ? { color: "#667085", texto: `Fuera de servicio${eq.baja_fecha ? " desde " + fmtDate(eq.baja_fecha) : ""}`, ratio: 0 }
    : infoEstado(eq, hoy);
  const esAdmin = ctx.ROL === "admin";
  const puedeRegistrar = (esAdmin || ctx.ROL === "tecnico") && !fuera;
  const costoTotal = cambios.reduce((a, c) => a + (c.costo !== null && c.costo !== undefined ? Number(c.costo) : 0), 0);

  const ubic = [eq.garita, eq.ubicacion].filter(Boolean).join(" · ");
  const marcaModelo = [eq.marca, eq.modelo].filter(Boolean).join(" ");

  // ----- Mantenimientos (línea de tiempo) -----
  const mantHtml = mantenimientos.length ? `<div class="fi-tl">${mantenimientos.map((m, i) => {
    const v = (m.vistos_buenos && m.vistos_buenos[0]) || {};
    const h = (m.hallazgos || "").trim();
    const sinNovedad = !h || /^\s*sin\s+novedad/i.test(h);
    const firmaCls = v.tipo_firma === "Digital" ? "dig" : "fis";
    const tardio = diasRegistroTardio(m.fecha, m.created_at);
    return `
      <div class="fi-tl-item" style="--dot:${sinNovedad ? COLOR["Vigente"] : COLOR["Próximo"]}">
        <span class="fi-dot"></span>
        <div class="fi-card">
          <div class="fi-card-top">
            <b>${fmtDate(m.fecha)}</b>
            ${v.tipo_firma ? `<span class="fi-firma ${firmaCls}">Firma ${esc(v.tipo_firma.toLowerCase())}</span>` : ""}
          </div>
          <p class="fi-tec">Técnico: ${esc(m.tecnico_nombre)}</p>
          <p class="fi-reg ${tardio > DIAS_ALERTA_REGISTRO ? "tarde" : ""}">Registrado el ${fmtFechaHoraGT(m.created_at)}${tardio > DIAS_ALERTA_REGISTRO ? ` · ${tardio} días después de la fecha` : ""}</p>
          <p class="fi-act">${esc(m.actividades) || "<i>Sin actividades registradas</i>"}</p>
          <p class="fi-hall ${sinNovedad ? "ok" : "alerta"}"><b>${sinNovedad ? "Sin novedad" : "Hallazgos:"}</b> ${sinNovedad && !h ? "" : (sinNovedad ? esc(h.replace(/^\s*sin\s+novedad[.:,;\s-]*/i, "")) : esc(h))}</p>
          <div class="fi-card-foot">
            <span>${v.nombre ? `Confirmó: ${esc(v.nombre)}${v.puesto ? " · " + esc(v.puesto) : ""}` : "Sin confirmación registrada"}</span>
            <button class="secondary sm" data-ver="${i}">Ver hoja</button>
          </div>
        </div>
      </div>`;
  }).join("")}</div>`
  : `<div class="fi-vacio">Este equipo todavía no tiene mantenimientos registrados.</div>`;

  // ----- Cambios de hardware -----
  const hwHtml = cambios.length ? `
    ${cambios.map(c => {
      const color = c.accion === "Reparación" ? "#F0A500" : "#2A80C1";
      return `
      <div class="fi-hw" style="--c:${color}">
        <div class="fi-hw-top">
          <div><b>${esc(c.categoria) || "Sin categoría"}</b><span class="fi-pill">${esc(c.accion)}</span></div>
          <span class="costo">${c.costo !== null && c.costo !== undefined ? fmtQ(c.costo) : "—"}</span>
        </div>
        ${c.descripcion ? `<p>${esc(c.descripcion)}</p>` : ""}
        <small>${fmtDate(c.fecha)} · ${esc(c.tecnico_nombre)}</small>
      </div>`;
    }).join("")}
    <p class="fi-total">Total invertido en hardware: ${fmtQ(costoTotal)}</p>`
  : `<div class="fi-vacio">Este equipo no tiene cambios de hardware ni reparaciones registradas.</div>`;

  panel.innerHTML = `
    <div class="fi-scroll">
      <div class="fi-head" style="--est:${est.color}">
        <button class="fi-close" data-cerrar aria-label="Cerrar ficha">&times;</button>
        <span class="fi-tipo">${esc(eq.tipo)}</span>
        <h2 class="fi-serie">${esc(eq.serie)}</h2>
        <p class="fi-ubic">${esc(ubic) || "Sin ubicación registrada"}</p>
        <div class="fi-estado">
          <span class="fi-chip">${esc(eq.estado)}</span>
          <span class="fi-estado-txt">${esc(est.texto)}</span>
        </div>
        ${eq.ultima_fecha && eq.proxima_fecha ? `
        <div class="fi-prog">
          <div class="fi-track">
            <div class="fi-fill" style="width:${(est.ratio * 100).toFixed(1)}%"></div>
            <span class="fi-marca" style="left:${(est.ratio * 100).toFixed(1)}%"></span>
          </div>
          <div class="fi-fechas"><span>Último: ${fmtDate(eq.ultima_fecha)}</span><span>Próximo: ${fmtDate(eq.proxima_fecha)}</span></div>
        </div>` : ""}
      </div>

      <div class="fi-body">
        ${fuera ? `<div class="fi-baja"><b>${esc(eq.baja_tipo || "Fuera de servicio")}</b>${eq.baja_motivo ? " · " + esc(eq.baja_motivo) : ""}<br>Este equipo no cuenta en pendientes ni en el cumplimiento. Su historial se conserva.</div>` : ""}
        <div class="fi-stats">
          <div class="fi-stat" style="--c:#0B8F47"><b>${mantenimientos.length}</b><span>Mantenimientos</span></div>
          <div class="fi-stat" style="--c:#2A80C1"><b>${cambios.length}</b><span>Cambios de hardware</span></div>
          <div class="fi-stat" style="--c:#F06E21"><b>${fmtQ(costoTotal)}</b><span>Costo en hardware</span></div>
        </div>

        <div class="fi-datos">
          <div class="fi-dato"><span class="k">Marca y modelo</span><span class="v">${esc(marcaModelo) || "—"}</span></div>
          <div class="fi-dato"><span class="k">Dirección IP</span><span class="v">${esc(eq.ip) || "—"}</span></div>
          <div class="fi-dato"><span class="k">Encargado</span><span class="v">${esc(eq.encargado_nombre) || "—"}${eq.encargado_puesto ? `<small>${esc(eq.encargado_puesto)}</small>` : ""}</span></div>
          <div class="fi-dato"><span class="k">Frecuencia</span><span class="v">${eq.frecuencia_meses ? "Cada " + pl(eq.frecuencia_meses, "mes", "meses") : "—"}</span></div>
        </div>

        <div class="fi-tabs" role="tablist">
          <button class="on" data-tab="mant" role="tab">Mantenimientos<span class="n">${mantenimientos.length}</span></button>
          <button data-tab="hw" role="tab">Hardware<span class="n">${cambios.length}</span></button>
        </div>
        <div id="fi-pane-mant">${mantHtml}</div>
        <div id="fi-pane-hw" hidden>${hwHtml}</div>
      </div>
    </div>
    ${(puedeRegistrar || esAdmin) ? `
    <div class="fi-foot">
      ${puedeRegistrar ? `
      <button class="primary" data-reg="mant">Registrar mantenimiento</button>
      <button class="secondary" data-reg="hw">Registrar cambio de hardware</button>` : ""}
      ${esAdmin && !fuera ? `<button class="fi-peligro" data-retirar>Retirar de servicio</button>` : ""}
      ${esAdmin && fuera ? `<button class="primary" data-reactivar>Reactivar equipo</button>` : ""}
    </div>` : ""}`;

  // ----- Acciones -----
  panel.querySelector("[data-cerrar]").addEventListener("click", cerrarFicha);

  panel.querySelectorAll(".fi-tabs button").forEach(b => b.addEventListener("click", () => {
    panel.querySelectorAll(".fi-tabs button").forEach(x => x.classList.toggle("on", x === b));
    panel.querySelector("#fi-pane-mant").hidden = b.dataset.tab !== "mant";
    panel.querySelector("#fi-pane-hw").hidden = b.dataset.tab !== "hw";
  }));

  const equipoParaPdf = { serie: eq.serie, tipo: eq.tipo, garita: eq.garita, ubicacion: eq.ubicacion, frecuencia_meses: eq.frecuencia_meses };
  panel.querySelectorAll("[data-ver]").forEach(btn => btn.addEventListener("click", () => {
    const m = mantenimientos[Number(btn.dataset.ver)];
    if (!m) return;
    verHoja({ equipo: equipoParaPdf, registro: m, vobo: (m.vistos_buenos && m.vistos_buenos[0]) || {}, boton: btn });
  }));

  panel.querySelectorAll("[data-reg]").forEach(btn => btn.addEventListener("click", () => {
    const vista = btn.dataset.reg === "mant" ? "registrar" : "hardware";
    cerrarFicha();
    if (window.irAVista) window.irAVista(vista, { preseleccionarEquipoId: eq.id });
  }));

  const btnRetirar = panel.querySelector("[data-retirar]");
  if (btnRetirar) btnRetirar.addEventListener("click", async () => {
    const datos = await pedirRetiro({ serie: eq.serie, tipo: eq.tipo });
    if (!datos) return;
    btnRetirar.disabled = true;
    try {
      await retirarEquipo(eq.id, datos);
      invalidateEquipos();
      abrirFicha(eq.id);          // se vuelve a cargar la ficha, ya como "fuera de servicio"
    } catch (err) {
      alert("No se pudo retirar el equipo: " + err.message);
      btnRetirar.disabled = false;
    }
  });

  const btnReactivar = panel.querySelector("[data-reactivar]");
  if (btnReactivar) btnReactivar.addEventListener("click", async () => {
    if (!confirm(`¿Reactivar el equipo ${eq.serie}?\n\nVolverá a contar en los pendientes y en el cumplimiento.`)) return;
    btnReactivar.disabled = true;
    try {
      await reactivarEquipo(eq.id);
      invalidateEquipos();
      abrirFicha(eq.id);
    } catch (err) {
      alert("No se pudo reactivar el equipo: " + err.message);
      btnReactivar.disabled = false;
    }
  });

  const cerrar = panel.querySelector("[data-cerrar]");
  if (cerrar) cerrar.focus({ preventScroll: true });
}

// ---------------------------------------------------------------
// Arranque (se llama una vez desde dashboard.html)
// ---------------------------------------------------------------
export function iniciarFicha(authCtx) {
  ctx = authCtx || ctx;
  window.abrirFicha = abrirFicha;

  // Cualquier elemento con data-ficha="<id>" abre la ficha
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-ficha]");
    if (!el || !el.dataset.ficha) return;
    e.preventDefault();
    abrirFicha(el.dataset.ficha);
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && panel && panel.classList.contains("open")) cerrarFicha();
  });

  // Dirección directa: dashboard.html?equipo=<id>  (útil para códigos QR)
  const id = new URLSearchParams(location.search).get("equipo");
  if (id) abrirFicha(id);
}
