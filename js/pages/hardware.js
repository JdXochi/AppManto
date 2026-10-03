// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Cambios de hardware (piezas, baterías, tóner, reparaciones)
// =========================================================
import { getEquipos } from "../equiposStore.js";
import {
  listCambiosHardware, addCambioHardware, deleteCambioHardware,
  listCategoriasHardware, addCategoriaHardware,
} from "../data.js";
import { GARITAS, fillSelect, fillSelectPairs, tiposDisponibles, hoyLocalISO, normalizarTexto, esc } from "../shared.js";
import { fmtDate } from "../pdf.js";

const NUEVA_CATEGORIA = "__nueva__";
const ACCIONES = ["Cambio de pieza", "Reparación"];

function fmtQ(n) {
  return "Q " + Number(n).toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function render(container, { ROL, session, perfil }) {
  container.innerHTML = `
    <div class="card">
      <h2>Registrar cambio o reparación</h2>
      <p class="sub">Piezas cambiadas, baterías, tóner, reparaciones: todo lo que se le haga al hardware de un equipo.</p>

      <div class="grid3">
        <div class="field">
          <label for="h-garita">Garita</label>
          <select id="h-garita"><option value="">Todas</option></select>
        </div>
        <div class="field">
          <label for="h-tipo">Tipo de equipo</label>
          <select id="h-tipo"><option value="">Todos</option></select>
        </div>
        <div class="field">
          <label for="h-equipo">Equipo (serie / código)</label>
          <select id="h-equipo"></select>
        </div>
      </div>

      <div class="grid3">
        <div class="field">
          <label for="h-fecha">Fecha</label>
          <input type="date" id="h-fecha">
        </div>
        <div class="field">
          <label for="h-accion">Qué se hizo</label>
          <select id="h-accion"></select>
        </div>
        <div class="field">
          <label for="h-categoria">Pieza / categoría</label>
          <select id="h-categoria"></select>
        </div>
      </div>

      <div class="grid2" id="wrap-nueva-categoria" style="display:none">
        <div class="field">
          <label for="h-categoria-nueva">Nombre de la categoría nueva</label>
          <input type="text" id="h-categoria-nueva" placeholder="Ej. Cable de red">
        </div>
      </div>

      <div class="field">
        <label for="h-descripcion">Detalle</label>
        <textarea id="h-descripcion" placeholder="Ej. Batería original agotada, se instaló batería nueva de 6 celdas"></textarea>
      </div>

      <div class="grid2">
        <div class="field">
          <label for="h-costo">Costo (Q) — opcional</label>
          <input type="number" id="h-costo" min="0" step="0.01" placeholder="0.00">
        </div>
        <div class="field">
          <label for="h-tecnico">Técnico</label>
          <input type="text" id="h-tecnico" disabled>
        </div>
      </div>

      <div class="btnrow">
        <button class="primary" id="btn-guardar-hw">Guardar registro</button>
        <span class="hint" id="hw-msg"></span>
      </div>
    </div>

    <div class="card">
      <h2>Historial de cambios <span class="hint" id="hw-count"></span></h2>
      <div class="filters">
        <input type="text" id="fh-busqueda" placeholder="Buscar por serie, pieza, detalle o técnico..." style="flex:1; min-width:220px;">
        <select id="fh-garita"><option value="">Todas las garitas</option></select>
        <select id="fh-categoria"><option value="">Todas las categorías</option></select>
        <select id="fh-accion"><option value="">Cambio y reparación</option></select>
      </div>
      <div class="filters">
        <div class="field" style="margin-bottom:0">
          <label for="fh-desde" class="hint">Desde</label>
          <input type="date" id="fh-desde">
        </div>
        <div class="field" style="margin-bottom:0">
          <label for="fh-hasta" class="hint">Hasta</label>
          <input type="date" id="fh-hasta">
        </div>
        <div class="field" style="margin-bottom:0; align-self:flex-end;">
          <button class="secondary" id="fh-limpiar" type="button">Limpiar filtros</button>
        </div>
      </div>
      <p class="hint" id="hw-total" style="margin:0 0 10px"></p>
      <div style="overflow-x:auto">
        <table id="tabla-hardware" class="responsive-cards">
          <thead><tr><th>Fecha</th><th>Equipo</th><th>Garita / Tipo</th><th>Qué se hizo</th><th>Pieza</th><th>Detalle</th><th>Costo</th><th>Técnico</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="empty" id="hw-empty" style="display:none">Aún no hay cambios registrados.</p>
    </div>
  `;

  const $ = sel => container.querySelector(sel);
  const hGarita = $("#h-garita"), hTipo = $("#h-tipo"), hEquipo = $("#h-equipo");
  const hAccion = $("#h-accion"), hCategoria = $("#h-categoria");

  $("#h-fecha").value = hoyLocalISO();
  $("#h-tecnico").value = perfil ? perfil.nombre : "";
  fillSelect(hGarita, GARITAS, "Todas");
  fillSelect(hAccion, ACCIONES, null);

  // ---------------- Equipos (filtrables por garita y tipo) ----------------
  const equipos = await getEquipos();
  fillSelect(hTipo, tiposDisponibles(equipos), "Todos");

  function refreshEquipos() {
    const g = hGarita.value, t = hTipo.value;
    const opciones = equipos.filter(e => (!g || e.garita === g) && (!t || e.tipo === t));
    fillSelectPairs(
      hEquipo,
      opciones.map(e => ({ value: e.id, label: `${e.serie} — ${e.tipo} (${e.garita})` })),
      opciones.length ? "Selecciona un equipo..." : "— No hay equipos con ese filtro —"
    );
  }
  refreshEquipos();
  hGarita.addEventListener("change", refreshEquipos);
  hTipo.addEventListener("change", refreshEquipos);

  // ---------------- Categorías ----------------
  let categorias = [];
  async function refreshCategorias(seleccionarId) {
    categorias = await listCategoriasHardware();
    fillSelectPairs(hCategoria, categorias.map(c => ({ value: c.id, label: c.descripcion })), "Selecciona una categoría...");
    const oNueva = document.createElement("option");
    oNueva.value = NUEVA_CATEGORIA; oNueva.textContent = "+ Nueva categoría...";
    hCategoria.appendChild(oNueva);
    if (seleccionarId) hCategoria.value = seleccionarId;

    // filtros del historial
    const actual = $("#fh-categoria").value;
    fillSelectPairs($("#fh-categoria"), categorias.map(c => ({ value: c.descripcion, label: c.descripcion })), "Todas las categorías");
    if ([...$("#fh-categoria").options].some(o => o.value === actual)) $("#fh-categoria").value = actual;
    $("#wrap-nueva-categoria").style.display = hCategoria.value === NUEVA_CATEGORIA ? "grid" : "none";
  }
  await refreshCategorias();
  hCategoria.addEventListener("change", () => {
    $("#wrap-nueva-categoria").style.display = hCategoria.value === NUEVA_CATEGORIA ? "grid" : "none";
  });

  // ---------------- Guardar ----------------
  $("#btn-guardar-hw").addEventListener("click", async () => {
    const msg = $("#hw-msg");
    const error = t => { msg.style.color = "#B42318"; msg.textContent = t; };

    const equipoId = hEquipo.value;
    const fecha = $("#h-fecha").value;
    const accion = hAccion.value;
    const descripcion = $("#h-descripcion").value.trim();
    const costoTxt = $("#h-costo").value.trim();
    const costo = costoTxt === "" ? null : Number(costoTxt);

    if (!equipoId) return error("Selecciona un equipo.");
    if (!fecha) return error("Selecciona la fecha.");
    if (!hCategoria.value) return error("Selecciona la pieza o categoría.");
    if (costo !== null && (isNaN(costo) || costo < 0)) return error("El costo no es válido.");

    const btn = $("#btn-guardar-hw");
    btn.disabled = true; btn.textContent = "Guardando...";

    try {
      let categoriaId = hCategoria.value;

      if (categoriaId === NUEVA_CATEGORIA) {
        const nombre = $("#h-categoria-nueva").value.trim().replace(/\s+/g, " ");
        if (!nombre) { error("Ingresa el nombre de la categoría nueva."); return; }
        const existente = categorias.find(c => normalizarTexto(c.descripcion) === normalizarTexto(nombre));
        if (existente) {
          categoriaId = existente.id;     // ya existía: se usa esa en vez de duplicarla
        } else {
          const nueva = await addCategoriaHardware(nombre);
          categoriaId = nueva.id;
        }
        await refreshCategorias(categoriaId);
      }

      await addCambioHardware({
        equipo_id: equipoId,
        fecha,
        accion,
        categoria_id: categoriaId,
        descripcion: descripcion || null,
        costo,
        tecnico_id: session.user.id,
        tecnico_nombre: perfil.nombre,
      });

      // limpiar para el siguiente registro
      hGarita.value = ""; hTipo.value = "";
      refreshEquipos();
      $("#h-fecha").value = hoyLocalISO();
      hAccion.selectedIndex = 0;
      hCategoria.value = "";
      $("#wrap-nueva-categoria").style.display = "none";
      $("#h-categoria-nueva").value = "";
      $("#h-descripcion").value = "";
      $("#h-costo").value = "";

      msg.style.color = "#1E7B34"; msg.textContent = "Registro guardado.";
      setTimeout(() => msg.textContent = "", 3000);

      registros = await listCambiosHardware();
      renderTabla();
    } catch (err) {
      console.error(err);
      error(err.message.includes("duplicate") ? "Ya existe esa categoría." : ("Error al guardar: " + err.message));
    } finally {
      btn.disabled = false; btn.textContent = "Guardar registro";
    }
  });

  // ---------------- Historial ----------------
  fillSelect($("#fh-garita"), GARITAS, "Todas las garitas");
  fillSelect($("#fh-accion"), ACCIONES, "Cambio y reparación");

  let registros = await listCambiosHardware();

  const filtros = ["#fh-busqueda", "#fh-garita", "#fh-categoria", "#fh-accion", "#fh-desde", "#fh-hasta"].map($);
  filtros.forEach(el => el.addEventListener(el.type === "text" || el.type === "date" ? "input" : "change", renderTabla));
  $("#fh-limpiar").addEventListener("click", () => { filtros.forEach(el => el.value = ""); renderTabla(); });

  function renderTabla() {
    const fg = $("#fh-garita").value, fc = $("#fh-categoria").value, fa = $("#fh-accion").value;
    const desde = $("#fh-desde").value, hasta = $("#fh-hasta").value;
    const q = normalizarTexto($("#fh-busqueda").value.trim());

    const filtrados = registros.filter(r => {
      const eq = r.equipo || {};
      if (fg && eq.garita !== fg) return false;
      if (fc && r.categoria !== fc) return false;
      if (fa && r.accion !== fa) return false;
      if (desde && r.fecha < desde) return false;
      if (hasta && r.fecha > hasta) return false;
      if (q) {
        const texto = normalizarTexto([eq.serie, eq.tipo, r.categoria, r.accion, r.descripcion, r.tecnico_nombre].filter(Boolean).join(" "));
        if (!texto.includes(q)) return false;
      }
      return true;
    });

    $("#hw-count").textContent = `(${filtrados.length} de ${registros.length})`;
    $("#hw-empty").style.display = filtrados.length ? "none" : "block";

    const conCosto = filtrados.filter(r => r.costo !== null && r.costo !== undefined);
    $("#hw-total").textContent = conCosto.length
      ? `Costo total de los registros mostrados: ${fmtQ(conCosto.reduce((a, r) => a + Number(r.costo), 0))}`
      : "";

    const tbody = $("#tabla-hardware tbody");
    tbody.innerHTML = "";
    filtrados.forEach(r => {
      const eq = r.equipo || {};
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="Fecha">${fmtDate(r.fecha)}</td>
        <td data-label="Equipo"><b>${esc(eq.serie)}</b></td>
        <td data-label="Garita / Tipo">${esc(eq.garita)} / ${esc(eq.tipo)}</td>
        <td data-label="Qué se hizo">${esc(r.accion)}</td>
        <td data-label="Pieza">${esc(r.categoria)}</td>
        <td data-label="Detalle">${esc(r.descripcion)}</td>
        <td data-label="Costo">${r.costo !== null && r.costo !== undefined ? fmtQ(r.costo) : "—"}</td>
        <td data-label="Técnico">${esc(r.tecnico_nombre)}</td>
        <td data-label="Acciones">${ROL === "admin" ? `<button class="ghost" data-id="${esc(r.id)}">Eliminar</button>` : ""}</td>`;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("[data-id]").forEach(btn => btn.addEventListener("click", async () => {
      if (!confirm("¿Eliminar este registro? Esta acción no se puede deshacer.")) return;
      try {
        await deleteCambioHardware(btn.dataset.id);
        registros = await listCambiosHardware();
        renderTabla();
      } catch (err) { alert("No se pudo eliminar: " + err.message); }
    }));
  }

  renderTabla();
}
