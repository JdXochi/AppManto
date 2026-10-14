// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Reportes (totales generales — visible para todos los roles)
// =========================================================
import { getEquipos } from "../equiposStore.js";
import { listReporteInventario, listMantenimientos, listCambiosHardware, listCategoriasHardware } from "../data.js";
import { GARITAS, fillSelect, tiposDisponibles, normalizarTexto } from "../shared.js";
import {
  exportarInventario, exportarMantenimientos,
  exportarPendientes, exportarHardware, exportarCumplimiento,
} from "../exportExcel.js";

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

    <div class="card">
      <h2>Exportar pendientes y atrasados a Excel</h2>
      <p class="sub">Los equipos que necesitan mantenimiento: primero los atrasados, luego los próximos a vencer y los que nunca han tenido.</p>
      <div class="grid3">
        <div class="field">
          <label for="xp-garita">Garita</label>
          <select id="xp-garita"></select>
        </div>
        <div class="field">
          <label for="xp-tipo">Tipo de equipo</label>
          <select id="xp-tipo"></select>
        </div>
        <div class="field">
          <label for="xp-estado">Estado</label>
          <select id="xp-estado">
            <option value="">Todos los pendientes</option>
            <option value="Atrasado">Atrasado</option>
            <option value="Próximo">Próximo</option>
            <option value="Sin registro">Sin registro</option>
          </select>
        </div>
      </div>
      <div class="btnrow">
        <button class="primary" id="btn-xp">Descargar Excel</button>
        <span class="hint" id="xp-msg"></span>
      </div>
    </div>

    <div class="card">
      <h2>Exportar cambios de hardware a Excel</h2>
      <p class="sub">Piezas cambiadas y reparaciones, con resumen de costos por pieza y por garita.</p>
      <div class="grid3">
        <div class="field">
          <label for="xh-desde">Desde</label>
          <input type="date" id="xh-desde">
        </div>
        <div class="field">
          <label for="xh-hasta">Hasta</label>
          <input type="date" id="xh-hasta">
        </div>
        <div class="field">
          <label for="xh-accion">Qué se hizo</label>
          <select id="xh-accion">
            <option value="">Cambio y reparación</option>
            <option value="Cambio de pieza">Cambio de pieza</option>
            <option value="Reparación">Reparación</option>
          </select>
        </div>
      </div>
      <div class="grid2">
        <div class="field">
          <label for="xh-garita">Garita</label>
          <select id="xh-garita"></select>
        </div>
        <div class="field">
          <label for="xh-categoria">Pieza / categoría</label>
          <select id="xh-categoria"></select>
        </div>
      </div>
      <div class="btnrow">
        <button class="primary" id="btn-xh">Descargar Excel</button>
        <span class="hint" id="xh-msg"></span>
      </div>
    </div>

    <div class="card">
      <h2>Exportar cumplimiento a Excel</h2>
      <p class="sub">Por garita y por tipo de equipo: cuántos están vigentes, próximos, atrasados o sin registro, y el porcentaje de cumplimiento.</p>
      <div class="btnrow">
        <button class="primary" id="btn-xc">Descargar Excel</button>
        <span class="hint" id="xc-msg"></span>
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
  fillSelect(container.querySelector("#xp-garita"), GARITAS, "Todas");
  fillSelect(container.querySelector("#xp-tipo"), tipos, "Todos");
  fillSelect(container.querySelector("#xh-garita"), GARITAS, "Todas");
  let categoriasHw = [];
  try { categoriasHw = (await listCategoriasHardware()).map(c => c.descripcion); } catch (e) { /* sin acceso: queda vacío */ }
  fillSelect(container.querySelector("#xh-categoria"), categoriasHw, "Todas");

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

  // ---- Pendientes y atrasados ----
  container.querySelector("#btn-xp").addEventListener("click", () => {
    const btn = container.querySelector("#btn-xp");
    const msg = container.querySelector("#xp-msg");
    ejecutar(btn, msg, "Descargar Excel", async () => {
      const g = container.querySelector("#xp-garita").value;
      const t = container.querySelector("#xp-tipo").value;
      const e = container.querySelector("#xp-estado").value;

      const todos = await listReporteInventario();
      const filas = todos.filter(f =>
        f.estado !== "Vigente" &&
        (!g || f.garita === g) && (!t || f.tipo === t) && (!e || f.estado === e));
      if (!filas.length) return 0;

      await exportarPendientes(filas, {
        usuario: perfil ? perfil.nombre : "",
        filtrosTexto: resumenFiltros([["Garita", g], ["Tipo", t], ["Estado", e]]),
      });
      return filas.length;
    });
  });

  // ---- Cambios de hardware ----
  container.querySelector("#btn-xh").addEventListener("click", () => {
    const btn = container.querySelector("#btn-xh");
    const msg = container.querySelector("#xh-msg");
    ejecutar(btn, msg, "Descargar Excel", async () => {
      const desde = container.querySelector("#xh-desde").value;
      const hasta = container.querySelector("#xh-hasta").value;
      const a = container.querySelector("#xh-accion").value;
      const g = container.querySelector("#xh-garita").value;
      const c = container.querySelector("#xh-categoria").value;

      if (desde && hasta && desde > hasta) throw new Error("La fecha \"Desde\" no puede ser mayor que \"Hasta\".");

      const todos = await listCambiosHardware();
      const filas = todos.filter(r => {
        if (desde && r.fecha < desde) return false;
        if (hasta && r.fecha > hasta) return false;
        if (a && r.accion !== a) return false;
        if (g && (r.equipo || {}).garita !== g) return false;
        if (c && r.categoria !== c) return false;
        return true;
      });
      if (!filas.length) return 0;

      await exportarHardware(filas, {
        usuario: perfil ? perfil.nombre : "",
        filtrosTexto: resumenFiltros([["Desde", desde], ["Hasta", hasta], ["Qué se hizo", a], ["Garita", g], ["Pieza", c]]),
      });
      return filas.length;
    });
  });

  // ---- Cumplimiento ----
  container.querySelector("#btn-xc").addEventListener("click", () => {
    const btn = container.querySelector("#btn-xc");
    const msg = container.querySelector("#xc-msg");
    ejecutar(btn, msg, "Descargar Excel", async () => {
      const todos = await listReporteInventario();
      if (!todos.length) return 0;
      await exportarCumplimiento(todos, { usuario: perfil ? perfil.nombre : "" });
      return todos.length;
    });
  });
}
