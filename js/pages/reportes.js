// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Reportes (totales generales — visible para todos los roles)
// =========================================================
import { getEquipos } from "../equiposStore.js";
import { listReporteInventario, listMantenimientos } from "../data.js";
import { GARITAS, fillSelect, tiposDisponibles, normalizarTexto } from "../shared.js";
import { exportarInventario, exportarMantenimientos } from "../exportExcel.js";

export async function render(container, { ROL, perfil } = {}) {
  // Todos los roles pueden descargar (el rol "usuario" es de solo lectura).
  const puedeExportar = ["admin", "tecnico", "usuario"].includes(ROL);

  const tarjetasExcel = puedeExportar ? `
    <div class="card">
      <h2>Exportar inventario a Excel</h2>
      <p class="sub">Todos los equipos con su ubicación, encargado, último mantenimiento, próxima fecha y estado.</p>
      <div class="grid3">
        <div class="field">
          <label for="xi-garita">Garita</label>
          <select id="xi-garita"></select>
        </div>
        <div class="field">
          <label for="xi-tipo">Tipo de equipo</label>
          <select id="xi-tipo"></select>
        </div>
        <div class="field">
          <label for="xi-estado">Estado</label>
          <select id="xi-estado">
            <option value="">Todos</option>
            <option value="Atrasado">Atrasado</option>
            <option value="Próximo">Próximo</option>
            <option value="Sin registro">Sin registro</option>
            <option value="Vigente">Vigente</option>
          </select>
        </div>
      </div>
      <div class="btnrow">
        <button class="primary" id="btn-xi">Descargar Excel</button>
        <span class="hint" id="xi-msg"></span>
      </div>
    </div>

    <div class="card">
      <h2>Exportar mantenimientos a Excel</h2>
      <p class="sub">Cada mantenimiento realizado, con lo que se le hizo al equipo, hallazgos y quién confirmó.</p>
      <div class="grid3">
        <div class="field">
          <label for="xm-desde">Desde</label>
          <input type="date" id="xm-desde">
        </div>
        <div class="field">
          <label for="xm-hasta">Hasta</label>
          <input type="date" id="xm-hasta">
        </div>
        <div class="field">
          <label for="xm-tecnico">Técnico (contiene)</label>
          <input type="text" id="xm-tecnico" placeholder="Todos">
        </div>
      </div>
      <div class="grid2">
        <div class="field">
          <label for="xm-garita">Garita</label>
          <select id="xm-garita"></select>
        </div>
        <div class="field">
          <label for="xm-tipo">Tipo de equipo</label>
          <select id="xm-tipo"></select>
        </div>
      </div>
      <div class="btnrow">
        <button class="primary" id="btn-xm">Descargar Excel</button>
        <span class="hint" id="xm-msg"></span>
      </div>
    </div>
  ` : "";

  container.innerHTML = `
    <div class="summary" id="reportes-stats"></div>
    ${tarjetasExcel}
    <div class="card">
      <h2>Equipos por garita</h2>
      <div style="overflow-x:auto">
        <table id="tabla-reportes-garita">
          <thead><tr><th>Garita</th><th>Cantidad de equipos</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
    <div class="card">
      <h2>Equipos por tipo</h2>
      <div style="overflow-x:auto">
        <table id="tabla-reportes-tipo">
          <thead><tr><th>Tipo de equipo</th><th>Cantidad</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  const equipos = await getEquipos();

  container.querySelector("#reportes-stats").innerHTML = `
    <div class="stat"><div class="n">${equipos.length}</div><div class="l">Equipos monitoreados</div></div>
    <div class="stat"><div class="n">${new Set(equipos.map(e=>e.garita)).size}</div><div class="l">Garitas / sitios</div></div>
    <div class="stat"><div class="n">${new Set(equipos.map(e=>e.tipo)).size}</div><div class="l">Tipos de equipo</div></div>`;

  const porGarita = {};
  const porTipo = {};
  equipos.forEach(e => {
    porGarita[e.garita] = (porGarita[e.garita]||0) + 1;
    porTipo[e.tipo] = (porTipo[e.tipo]||0) + 1;
  });

  const tbG = container.querySelector("#tabla-reportes-garita tbody");
  Object.entries(porGarita).forEach(([g, n]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${g}</td><td>${n}</td>`;
    tbG.appendChild(tr);
  });

  const tbT = container.querySelector("#tabla-reportes-tipo tbody");
  Object.entries(porTipo).forEach(([t, n]) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${t}</td><td>${n}</td>`;
    tbT.appendChild(tr);
  });

  if (!puedeExportar) return;

  // ---------------- Exportación a Excel ----------------
  const tipos = tiposDisponibles(equipos);
  fillSelect(container.querySelector("#xi-garita"), GARITAS, "Todas");
  fillSelect(container.querySelector("#xi-tipo"), tipos, "Todos");
  fillSelect(container.querySelector("#xm-garita"), GARITAS, "Todas");
  fillSelect(container.querySelector("#xm-tipo"), tipos, "Todos");

  // Ejecuta una exportación con el botón bloqueado y mensajes claros.
  async function ejecutar(btn, msg, textoBtn, tarea) {
    btn.disabled = true;
    btn.textContent = "Generando...";
    msg.style.color = ""; msg.textContent = "";
    try {
      const resultado = await tarea();
      if (resultado === 0) {
        msg.style.color = "#B42318";
        msg.textContent = "No hay registros con esos filtros.";
      } else {
        msg.style.color = "#1E7B34";
        msg.textContent = `Listo: ${resultado} registro(s) exportados.`;
        setTimeout(() => msg.textContent = "", 5000);
      }
    } catch (err) {
      console.error(err);
      msg.style.color = "#B42318";
      msg.textContent = "No se pudo generar el Excel: " + err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = textoBtn;
    }
  }

  const resumenFiltros = pares => pares.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" · ");

  // ---- Inventario ----
  container.querySelector("#btn-xi").addEventListener("click", () => {
    const btn = container.querySelector("#btn-xi");
    const msg = container.querySelector("#xi-msg");
    ejecutar(btn, msg, "Descargar Excel", async () => {
      const g = container.querySelector("#xi-garita").value;
      const t = container.querySelector("#xi-tipo").value;
      const e = container.querySelector("#xi-estado").value;

      const todos = await listReporteInventario();
      const filas = todos.filter(f => (!g || f.garita === g) && (!t || f.tipo === t) && (!e || f.estado === e));
      if (!filas.length) return 0;

      await exportarInventario(filas, {
        usuario: perfil ? perfil.nombre : "",
        filtrosTexto: resumenFiltros([["Garita", g], ["Tipo", t], ["Estado", e]]),
      });
      return filas.length;
    });
  });

  // ---- Mantenimientos ----
  container.querySelector("#btn-xm").addEventListener("click", () => {
    const btn = container.querySelector("#btn-xm");
    const msg = container.querySelector("#xm-msg");
    ejecutar(btn, msg, "Descargar Excel", async () => {
      const desde = container.querySelector("#xm-desde").value;
      const hasta = container.querySelector("#xm-hasta").value;
      const g = container.querySelector("#xm-garita").value;
      const t = container.querySelector("#xm-tipo").value;
      const tec = container.querySelector("#xm-tecnico").value.trim();

      if (desde && hasta && desde > hasta) throw new Error("La fecha \"Desde\" no puede ser mayor que \"Hasta\".");

      const todos = await listMantenimientos({ desde, hasta });
      const q = normalizarTexto(tec);
      const filas = todos.filter(r => {
        const eq = r.equipos || {};
        if (g && eq.garita !== g) return false;
        if (t && eq.tipo !== t) return false;
        if (q && !normalizarTexto(r.tecnico_nombre || "").includes(q)) return false;
        return true;
      });
      if (!filas.length) return 0;

      await exportarMantenimientos(filas, {
        usuario: perfil ? perfil.nombre : "",
        filtrosTexto: resumenFiltros([["Desde", desde], ["Hasta", hasta], ["Garita", g], ["Tipo", t], ["Técnico", tec]]),
      });
      return filas.length;
    });
  });
}
