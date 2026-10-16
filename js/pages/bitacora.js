// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Bitácora de movimientos (solo Admin)
// =========================================================
import { listBitacora } from "../data.js";
import { esc, fmtFechaHoraGT } from "../shared.js";

const PAGINA = 100;

const ACCIONES = {
  INSERT: { texto: "Creó", color: "#2E9E4F" },
  UPDATE: { texto: "Modificó", color: "#F0A500" },
  DELETE: { texto: "Eliminó", color: "#D92D20" },
};

const TABLAS = {
  mantenimientos: "Mantenimiento",
  cambios_hardware: "Hardware",
  equipos: "Equipo",
  encargados: "Encargado",
  perfiles: "Usuario",
};

// Nombres legibles de los campos (los que no estén aquí se muestran tal cual)
const ETIQUETAS = {
  garita: "Garita", ubicacion: "Ubicación", serie: "Serie", modelo: "Modelo", marca: "Marca", ip: "IP",
  encargado_nombre: "Encargado", encargado_puesto: "Puesto del encargado", activo: "Activo",
  nombre: "Nombre", puesto: "Puesto", rol: "Rol", username: "Usuario",
  fecha: "Fecha", actividades: "Actividades", hallazgos: "Hallazgos", accion: "Acción",
  descripcion: "Detalle", costo: "Costo", tecnico_nombre: "Técnico", equipo_serie: "Equipo",
  debe_cambiar_password: "Debe cambiar contraseña",
};

// Campos que no aportan al detalle (identificadores internos y fechas técnicas)
const OCULTAR = new Set(["id", "created_at", "equipo_id", "tipo_id", "categoria_id", "encargado_id", "tecnico_id", "usuario_id"]);

function valorLegible(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (v === true) return "Sí";
  if (v === false) return "No";
  // Fechas "2026-10-12" -> "12/10/2026"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v));
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return String(v);
}

// Filas del detalle: en una edición, solo lo que cambió (antes -> después)
function detalleHtml(r) {
  const antes = r.antes || {};
  const despues = r.despues || {};
  const claves = [...new Set([...Object.keys(antes), ...Object.keys(despues)])].filter(k => !OCULTAR.has(k));

  let filas;
  if (r.accion === "UPDATE") {
    filas = claves
      .filter(k => JSON.stringify(antes[k]) !== JSON.stringify(despues[k]))
      .map(k => `<tr><td class="k">${esc(ETIQUETAS[k] || k)}</td><td class="a">${esc(valorLegible(antes[k]))}</td><td class="d">${esc(valorLegible(despues[k]))}</td></tr>`);
    return filas.length
      ? `<table class="bt-det"><thead><tr><th>Campo</th><th>Antes</th><th>Después</th></tr></thead><tbody>${filas.join("")}</tbody></table>`
      : `<p class="hint">Sin diferencias visibles.</p>`;
  }

  const fuente = r.accion === "DELETE" ? antes : despues;
  filas = claves.map(k => `<tr><td class="k">${esc(ETIQUETAS[k] || k)}</td><td class="v" colspan="2">${esc(valorLegible(fuente[k]))}</td></tr>`);
  return `<p class="hint">${r.accion === "DELETE" ? "Así era el registro antes de eliminarse:" : "Datos con los que se creó:"}</p>
    <table class="bt-det"><tbody>${filas.join("")}</tbody></table>`;
}

const CSS = `
<style>
  .bt-item{ border-bottom:1px solid var(--line); padding:13px 0; }
  .bt-item:last-child{ border-bottom:none; }
  .bt-top{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
  .bt-pill{ display:inline-block; padding:3px 11px; border-radius:20px; font-size:11.5px; font-weight:700; white-space:nowrap; }
  .bt-tabla{ font-size:11.5px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.05em; }
  .bt-cuando{ margin-left:auto; font-size:12.5px; color:var(--muted); white-space:nowrap; }
  .bt-desc{ margin:7px 0 4px; font-size:14px; line-height:1.45; }
  .bt-quien{ font-size:12.5px; color:var(--muted); }
  .bt-quien b{ color:var(--navy); }
  .bt-ver{ background:none; border:none; padding:0; margin-left:10px; color:var(--navy); font-weight:700; font-size:12.5px; cursor:pointer; font-family:inherit; }
  .bt-ver:hover{ text-decoration:underline; }
  .bt-det{ width:100%; margin-top:10px; border-collapse:collapse; font-size:13px; background:#F7F9FB; border-radius:8px; overflow:hidden; }
  .bt-det th{ text-align:left; font-size:11.5px; padding:7px 12px; color:var(--muted); background:#EEF2F6; }
  .bt-det td{ padding:7px 12px; border-top:1px solid var(--line); vertical-align:top; word-break:break-word; }
  .bt-det td.k{ font-weight:700; color:var(--navy); width:28%; }
  .bt-det td.a{ color:#B42318; }
  .bt-det td.d{ color:#0B7A3E; }
  @media (max-width:640px){ .bt-cuando{ margin-left:0; width:100%; } .bt-det td.k{ width:auto; white-space:nowrap; } }
</style>`;

export async function render(container) {
  container.innerHTML = `${CSS}
    <div class="card">
      <h2>Bitácora de movimientos</h2>
      <p class="sub">Registro automático de quién eliminó, modificó o creó equipos, mantenimientos, cambios de hardware, encargados y usuarios. No se puede editar ni borrar.</p>
      <div class="grid3">
        <div class="field">
          <label for="b-desde">Desde</label>
          <input type="date" id="b-desde">
        </div>
        <div class="field">
          <label for="b-hasta">Hasta</label>
          <input type="date" id="b-hasta">
        </div>
        <div class="field">
          <label for="b-tabla">Tipo de registro</label>
          <select id="b-tabla"><option value="">Todos</option>
            ${Object.entries(TABLAS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="grid3">
        <div class="field">
          <label for="b-accion">Qué pasó</label>
          <select id="b-accion"><option value="">Todo</option>
            <option value="DELETE">Eliminó</option><option value="UPDATE">Modificó</option><option value="INSERT">Creó</option>
          </select>
        </div>
        <div class="field">
          <label for="b-usuario">Quién (nombre)</label>
          <input type="text" id="b-usuario" placeholder="Todos">
        </div>
        <div class="field">
          <label for="b-texto">Buscar en la descripción</label>
          <input type="text" id="b-texto" placeholder="Ej. una serie o un nombre">
        </div>
      </div>
      <div class="btnrow">
        <button class="primary" id="b-buscar">Buscar</button>
        <button class="secondary" id="b-limpiar" type="button">Limpiar filtros</button>
      </div>
    </div>

    <div class="card">
      <h2>Movimientos <span class="hint" id="b-count"></span></h2>
      <div id="b-lista"></div>
      <p class="empty" id="b-vacio" style="display:none">No hay movimientos con esos filtros.</p>
      <div class="btnrow" id="b-mas-wrap" style="display:none; justify-content:center; margin-top:14px">
        <button class="secondary" id="b-mas">Cargar más</button>
      </div>
    </div>`;

  const $ = s => container.querySelector(s);
  let offset = 0;
  let total = 0;

  function filtros() {
    return {
      desde: $("#b-desde").value || undefined,
      hasta: $("#b-hasta").value || undefined,
      tabla: $("#b-tabla").value || undefined,
      accion: $("#b-accion").value || undefined,
      usuario: $("#b-usuario").value.trim() || undefined,
      texto: $("#b-texto").value.trim() || undefined,
    };
  }

  function agregarFilas(filas) {
    const lista = $("#b-lista");
    filas.forEach(r => {
      const a = ACCIONES[r.accion] || { texto: r.accion, color: "#98A2B3" };
      const div = document.createElement("div");
      div.className = "bt-item";
      div.innerHTML = `
        <div class="bt-top">
          <span class="bt-pill" style="background:${a.color}1F; color:${a.color}">${esc(a.texto)}</span>
          <span class="bt-tabla">${esc(TABLAS[r.tabla] || r.tabla)}</span>
          <span class="bt-cuando">${fmtFechaHoraGT(r.created_at)}</span>
        </div>
        <p class="bt-desc">${esc(r.descripcion)}</p>
        <div class="bt-quien">Por <b>${esc(r.usuario_nombre)}</b><button class="bt-ver" type="button">Ver detalle</button></div>
        <div class="bt-detalle" hidden>${detalleHtml(r)}</div>`;
      const btn = div.querySelector(".bt-ver");
      const det = div.querySelector(".bt-detalle");
      btn.addEventListener("click", () => {
        det.hidden = !det.hidden;
        btn.textContent = det.hidden ? "Ver detalle" : "Ocultar detalle";
      });
      lista.appendChild(div);
    });
  }

  async function cargar(reiniciar) {
    const btnBuscar = $("#b-buscar"), btnMas = $("#b-mas");
    btnBuscar.disabled = true; btnMas.disabled = true;
    try {
      if (reiniciar) { offset = 0; total = 0; $("#b-lista").innerHTML = ""; }
      const filas = await listBitacora({ ...filtros(), limite: PAGINA, offset });
      agregarFilas(filas);
      offset += filas.length;
      total += filas.length;

      $("#b-count").textContent = total ? `(${total} mostrados)` : "";
      $("#b-vacio").style.display = total ? "none" : "block";
      $("#b-mas-wrap").style.display = filas.length === PAGINA ? "flex" : "none";
    } catch (err) {
      console.error(err);
      $("#b-lista").insertAdjacentHTML("beforeend",
        `<p class="empty" style="color:#B42318">No se pudo cargar la bitácora: ${esc(err.message)}</p>`);
    } finally {
      btnBuscar.disabled = false; btnMas.disabled = false;
    }
  }

  $("#b-buscar").addEventListener("click", () => cargar(true));
  $("#b-mas").addEventListener("click", () => cargar(false));
  $("#b-limpiar").addEventListener("click", () => {
    ["#b-desde", "#b-hasta", "#b-tabla", "#b-accion", "#b-usuario", "#b-texto"].forEach(s => { $(s).value = ""; });
    cargar(true);
  });
  ["#b-usuario", "#b-texto"].forEach(s => $(s).addEventListener("keydown", e => { if (e.key === "Enter") cargar(true); }));

  await cargar(true);
}
