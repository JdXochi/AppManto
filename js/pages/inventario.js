// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Inventario de equipos
// =========================================================
import { getEquipos, invalidateEquipos } from "../equiposStore.js";
import { getTiposEquipo, invalidateTiposEquipo } from "../tiposEquipoStore.js";
import { addEquipo, addTipoEquipo } from "../data.js";
import { GARITAS, fillSelect, tiposDisponibles, normalizarTexto } from "../shared.js";

const NUEVO_TIPO = "__nuevo__";

export async function render(container, { ROL }) {
  container.innerHTML = `
    <div class="card" id="card-agregar-equipo" style="display:none">
      <h2>Agregar equipo al inventario</h2>
      <p class="sub">Una fila por cada unidad física, identificada por su serie o código.</p>
      <div class="grid3">
        <div class="field">
          <label for="i-garita">Garita</label>
          <select id="i-garita"></select>
        </div>
        <div class="field">
          <label for="i-tipo">Tipo de equipo</label>
          <select id="i-tipo"><option value="">Selecciona un tipo...</option></select>
        </div>
        <div class="field">
          <label for="i-serie">Serie / Código de inventario</label>
          <input type="text" id="i-serie" placeholder="Ej. LAP-G1-002">
        </div>
      </div>

      <div class="grid2" id="wrap-nuevo-tipo" style="display:none">
        <div class="field">
          <label for="i-tipo-nuevo-desc">Nombre del tipo nuevo</label>
          <input type="text" id="i-tipo-nuevo-desc" placeholder="Ej. Monitor">
        </div>
        <div class="field">
          <label for="i-tipo-nuevo-frecuencia">Frecuencia para este tipo (meses)</label>
          <input type="number" id="i-tipo-nuevo-frecuencia" min="1" max="24">
        </div>
      </div>

      <div class="grid3">
        <div class="field">
          <label for="i-marca">Marca</label>
          <input type="text" id="i-marca" placeholder="Ej. Dell, APC, Hikvision">
        </div>
        <div class="field">
          <label for="i-modelo">Modelo</label>
          <input type="text" id="i-modelo" placeholder="Ej. Latitude 5420">
        </div>
      </div>
      <div class="grid2">
        <div class="field">
          <label for="i-encargado">Nombre del encargado</label>
          <input type="text" id="i-encargado" placeholder="Nombre y apellido">
        </div>
        <div class="field">
          <label for="i-puesto">Puesto del encargado</label>
          <input type="text" id="i-puesto" placeholder="Puesto">
        </div>
      </div>
      <div class="btnrow">
        <button class="primary" id="btn-agregar-inv">Agregar equipo</button>
        <span class="hint" id="inv-msg"></span>
      </div>
    </div>

    <div class="card">
      <h2>Equipos registrados <span class="hint" id="inv-count"></span></h2>
      <div class="filters">
        <input type="text" id="filter-busqueda-inv" placeholder="Buscar por tipo, serie, marca, modelo o encargado..." style="flex:1; min-width:220px;">
        <select id="filter-garita-inv"><option value="">Todas las garitas</option></select>
        <select id="filter-tipo-inv"><option value="">Todos los tipos</option></select>
      </div>
      <div style="overflow-x:auto">
        <table id="tabla-inventario" class="responsive-cards">
          <thead><tr><th>Garita</th><th>Tipo</th><th>Serie / Código</th><th>Marca</th><th>Modelo</th><th>Encargado</th><th>Puesto</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="empty" id="inv-empty" style="display:none">Aún no hay equipos en el inventario.</p>
    </div>
  `;

  if (ROL === "admin") {
    container.querySelector("#card-agregar-equipo").style.display = "block";

    const iGarita = container.querySelector("#i-garita");
    const iTipo = container.querySelector("#i-tipo");
    const wrapNuevoTipo = container.querySelector("#wrap-nuevo-tipo");
    const iTipoNuevoDesc = container.querySelector("#i-tipo-nuevo-desc");
    const iTipoNuevoFrecuencia = container.querySelector("#i-tipo-nuevo-frecuencia");
    const iSerie = container.querySelector("#i-serie");
    const iMarca = container.querySelector("#i-marca");
    const iModelo = container.querySelector("#i-modelo");
    const iEncargado = container.querySelector("#i-encargado");
    const iPuesto = container.querySelector("#i-puesto");

    fillSelect(iGarita, GARITAS, null);

    async function refreshTipoSelect() {
      const tipos = await getTiposEquipo();
      iTipo.innerHTML = "";
      const oVacio = document.createElement("option");
      oVacio.value = ""; oVacio.textContent = "Selecciona un tipo...";
      iTipo.appendChild(oVacio);
      tipos.forEach(t => {
        const o = document.createElement("option");
        o.value = t.id; o.textContent = `${t.descripcion} (cada ${t.frecuencia_meses} meses)`;
        iTipo.appendChild(o);
      });
      const oNuevo = document.createElement("option");
      oNuevo.value = NUEVO_TIPO; oNuevo.textContent = "+ Nuevo tipo de equipo...";
      iTipo.appendChild(oNuevo);
    }
    await refreshTipoSelect();

    iTipo.addEventListener("change", () => {
      wrapNuevoTipo.style.display = iTipo.value === NUEVO_TIPO ? "grid" : "none";
    });

    function limpiarFormulario() {
      iGarita.selectedIndex = 0;
      iTipo.selectedIndex = 0;
      wrapNuevoTipo.style.display = "none";
      iTipoNuevoDesc.value = "";
      iTipoNuevoFrecuencia.value = "";
      iSerie.value = "";
      iMarca.value = "";
      iModelo.value = "";
      iEncargado.value = "";
      iPuesto.value = "";
    }

    container.querySelector("#btn-agregar-inv").addEventListener("click", async () => {
      const msg = container.querySelector("#inv-msg");
      const garita = iGarita.value;
      const serie = iSerie.value.trim();
      const marca = iMarca.value.trim();
      const modelo = iModelo.value.trim();
      const encargado_nombre = iEncargado.value.trim();
      const encargado_puesto = iPuesto.value.trim();

      if (!serie) { msg.style.color = "#B42318"; msg.textContent = "Ingresa la serie/código del equipo."; return; }

      let tipo_id = iTipo.value;
      if (!tipo_id) { msg.style.color = "#B42318"; msg.textContent = "Selecciona el tipo de equipo."; return; }

      try {
        if (tipo_id === NUEVO_TIPO) {
          const descripcion = iTipoNuevoDesc.value.trim();
          const frecuencia_meses = Number(iTipoNuevoFrecuencia.value);
          if (!descripcion) { msg.style.color = "#B42318"; msg.textContent = "Ingresa el nombre del tipo nuevo."; return; }
          if (!frecuencia_meses) { msg.style.color = "#B42318"; msg.textContent = "Ingresa la frecuencia del tipo nuevo."; return; }
          const nuevoTipo = await addTipoEquipo({ descripcion, frecuencia_meses });
          tipo_id = nuevoTipo.id;
          invalidateTiposEquipo();
        }

        await addEquipo({ garita, tipo_id, serie, marca, modelo, encargado_nombre, encargado_puesto });
        limpiarFormulario();
        await refreshTipoSelect();
        msg.style.color = "#1E7B34"; msg.textContent = "Equipo agregado.";
        setTimeout(() => msg.textContent = "", 2500);
        invalidateEquipos();
        await refreshFiltroTipo();
        await renderTabla();
      } catch (err) {
        msg.style.color = "#B42318";
        msg.textContent = err.message.includes("duplicate") ? "Ya existe un equipo o tipo con ese nombre/serie." : ("Error: " + err.message);
      }
    });
  }

  fillSelect(container.querySelector("#filter-garita-inv"), GARITAS, "Todas las garitas");
  container.querySelector("#filter-garita-inv").addEventListener("change", renderTabla);
  container.querySelector("#filter-tipo-inv").addEventListener("change", renderTabla);
  container.querySelector("#filter-busqueda-inv").addEventListener("input", renderTabla);

  // El filtro de "Tipo" se llena una sola vez aquí (y se refresca solo si
  // aparece un tipo nuevo) -- si se reconstruyera dentro de renderTabla(),
  // cada vez que alguien lo cambiara se perdería la selección al instante.
  async function refreshFiltroTipo() {
    const equipos = await getEquipos();
    const filtroTipo = container.querySelector("#filter-tipo-inv");
    const valorActual = filtroTipo.value;
    fillSelect(filtroTipo, tiposDisponibles(equipos), "Todos los tipos");
    if ([...filtroTipo.options].some(o => o.value === valorActual)) {
      filtroTipo.value = valorActual;
    }
  }
  await refreshFiltroTipo();

  async function renderTabla() {
    const equipos = await getEquipos();
    const fg = container.querySelector("#filter-garita-inv").value;
    const ft = container.querySelector("#filter-tipo-inv").value;
    const q = normalizarTexto(container.querySelector("#filter-busqueda-inv").value.trim());

    const filtrados = equipos.filter(e => {
      if (fg && e.garita !== fg) return false;
      if (ft && e.tipo !== ft) return false;
      if (q) {
        const texto = normalizarTexto([e.tipo, e.serie, e.marca, e.modelo, e.encargado_nombre, e.encargado_puesto]
          .filter(Boolean).join(" "));
        if (!texto.includes(q)) return false;
      }
      return true;
    });

    container.querySelector("#inv-count").textContent = `(${equipos.length} en total)`;
    container.querySelector("#inv-empty").style.display = filtrados.length ? "none" : "block";

    const tbody = container.querySelector("#tabla-inventario tbody");
    tbody.innerHTML = "";
    filtrados.forEach(e => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td data-label="Garita">${e.garita}</td><td data-label="Tipo">${e.tipo}</td><td data-label="Serie / Código"><b>${e.serie}</b></td><td data-label="Marca">${e.marca||""}</td><td data-label="Modelo">${e.modelo||""}</td><td data-label="Encargado">${e.encargado_nombre||""}</td><td data-label="Puesto">${e.encargado_puesto||""}</td>`;
      tbody.appendChild(tr);
    });
  }

  await renderTabla();
}
