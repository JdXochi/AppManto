// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Encargados (solo Admin) — un registro por persona
// =========================================================
import { getEncargados, invalidateEncargados } from "../encargadosStore.js";
import { getEquipos, invalidateEquipos } from "../equiposStore.js";
import { addEncargado, updateEncargado, fusionarEncargados } from "../data.js";
import { esc, normalizarTexto, formatearNombre, buscarEncargadosParecidos } from "../shared.js";

export async function render(container) {
  container.innerHTML = `
    <div class="card">
      <h2>Agregar encargado</h2>
      <p class="sub">Registra a cada persona una sola vez; después se elige desde Inventario.</p>
      <div class="grid2">
        <div class="field">
          <label for="e-nombre">Nombre completo</label>
          <input type="text" id="e-nombre" placeholder="Nombre y apellido">
        </div>
        <div class="field">
          <label for="e-puesto">Puesto</label>
          <input type="text" id="e-puesto" placeholder="Puesto">
        </div>
      </div>
      <div class="btnrow">
        <button class="primary" id="btn-agregar-enc">Agregar encargado</button>
        <span class="hint" id="enc-msg"></span>
      </div>
    </div>

    <div class="card" id="card-duplicados" style="display:none">
      <h2>Posibles duplicados</h2>
      <p class="sub">Estos nombres se parecen. Si son la misma persona, usa "Fusionar" en la lista de abajo: todos sus equipos pasan al registro que conserves.</p>
      <div id="lista-duplicados"></div>
    </div>

    <div class="card">
      <h2>Encargados <span class="hint" id="enc-count"></span></h2>
      <p class="sub">Cambiar el nombre o el puesto aquí lo actualiza en todos los equipos de esa persona.</p>
      <div class="filters">
        <input type="text" id="filter-busqueda-enc" placeholder="Buscar por nombre o puesto..." style="flex:1; min-width:220px;">
      </div>
      <div style="overflow-x:auto">
        <table id="tabla-encargados" class="responsive-cards">
          <thead><tr><th>Nombre</th><th>Puesto</th><th>Equipos</th><th>Estado</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="empty" id="enc-empty" style="display:none">Aún no hay encargados registrados.</p>
    </div>
  `;

  // ---------------- Agregar ----------------
  container.querySelector("#btn-agregar-enc").addEventListener("click", async () => {
    const msg = container.querySelector("#enc-msg");
    const nombre = formatearNombre(container.querySelector("#e-nombre").value);
    const puesto = container.querySelector("#e-puesto").value.trim();

    if (!nombre) { msg.style.color = "#B42318"; msg.textContent = "Ingresa el nombre completo."; return; }

    try {
      const todos = await getEncargados(true);
      const { exactos, parecidos } = buscarEncargadosParecidos(nombre, todos);
      if (exactos.length) {
        msg.style.color = "#B42318";
        msg.textContent = `"${exactos[0].nombre}" ya existe${exactos[0].activo ? "" : " (inactivo: puedes reactivarlo en la lista)"}.`;
        return;
      }
      if (parecidos.length && !confirm(
        `Ya existe un encargado parecido: ${parecidos.map(x => x.nombre).join(", ")}.\n\n` +
        `¿Crear de todos modos como una persona distinta?`)) return;

      await addEncargado({ nombre, puesto: puesto || null });
      invalidateEncargados();
      container.querySelector("#e-nombre").value = "";
      container.querySelector("#e-puesto").value = "";
      msg.style.color = "#1E7B34"; msg.textContent = "Encargado agregado.";
      setTimeout(() => msg.textContent = "", 2500);
      await renderTodo();
    } catch (err) {
      msg.style.color = "#B42318";
      msg.textContent = err.message.includes("duplicate") ? "Ya existe un encargado con ese nombre." : ("Error: " + err.message);
    }
  });

  container.querySelector("#filter-busqueda-enc").addEventListener("input", () => renderTabla());

  // Datos de la última carga (la tabla filtra sobre esto sin volver a pedir a Supabase).
  let encargados = [];
  let conteoEquipos = {};

  async function cargar() {
    encargados = await getEncargados(true);
    const equipos = await getEquipos(true);
    conteoEquipos = {};
    equipos.forEach(eq => { if (eq.encargado_id) conteoEquipos[eq.encargado_id] = (conteoEquipos[eq.encargado_id] || 0) + 1; });
  }

  async function renderTodo() {
    await cargar();
    renderDuplicados();
    renderTabla();
  }

  // ---------------- Posibles duplicados ----------------
  function renderDuplicados() {
    const pares = [];
    encargados.forEach((p, i) => {
      const { exactos, parecidos } = buscarEncargadosParecidos(p.nombre, encargados.slice(i + 1));
      [...exactos, ...parecidos].forEach(q => pares.push([p, q]));
    });
    const card = container.querySelector("#card-duplicados");
    card.style.display = pares.length ? "block" : "none";
    container.querySelector("#lista-duplicados").innerHTML = pares.map(([a, b]) =>
      `<p style="margin:6px 0"><b>${esc(a.nombre)}</b> (${conteoEquipos[a.id] || 0} equipos) ≈ <b>${esc(b.nombre)}</b> (${conteoEquipos[b.id] || 0} equipos)</p>`
    ).join("");
  }

  // ---------------- Tabla ----------------
  function renderTabla() {
    const q = normalizarTexto(container.querySelector("#filter-busqueda-enc").value.trim());
    const filtrados = encargados.filter(p => !q || normalizarTexto(`${p.nombre} ${p.puesto || ""}`).includes(q));

    container.querySelector("#enc-count").textContent = `(${encargados.length} en total)`;
    container.querySelector("#enc-empty").style.display = filtrados.length ? "none" : "block";

    const tbody = container.querySelector("#tabla-encargados tbody");
    tbody.innerHTML = "";

    filtrados.forEach(p => {
      const nEquipos = conteoEquipos[p.id] || 0;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="Nombre">
          <span class="valor-nombre"><b>${esc(p.nombre)}</b></span>
          <input type="text" class="edit-nombre" value="${esc(p.nombre)}" style="display:none">
        </td>
        <td data-label="Puesto">
          <span class="valor-puesto">${esc(p.puesto)}</span>
          <input type="text" class="edit-puesto" value="${esc(p.puesto)}" style="display:none">
        </td>
        <td data-label="Equipos">${nEquipos}</td>
        <td data-label="Estado"><span class="badge ${p.activo ? "Vigente" : "Atrasado"}">${p.activo ? "Activo" : "Inactivo"}</span></td>
        <td data-label="Acciones">
          <button class="secondary btn-editar">Editar</button>
          <button class="primary btn-guardar" style="display:none">Guardar</button>
          <button class="ghost btn-cancelar" style="display:none">Cancelar</button>
          <button class="secondary btn-fusionar">Fusionar</button>
          <button class="${p.activo ? "ghost" : "secondary"} btn-toggle-activo">${p.activo ? "Desactivar" : "Reactivar"}</button>
          <span class="fusion-box" style="display:none">
            <select class="fusion-destino" style="width:auto; min-width:180px"></select>
            <button class="primary btn-confirmar-fusion">Fusionar</button>
            <button class="ghost btn-cancelar-fusion">Cancelar</button>
          </span>
        </td>`;

      const valorNombre = tr.querySelector(".valor-nombre");
      const valorPuesto = tr.querySelector(".valor-puesto");
      const editNombre = tr.querySelector(".edit-nombre");
      const editPuesto = tr.querySelector(".edit-puesto");
      const btnEditar = tr.querySelector(".btn-editar");
      const btnGuardar = tr.querySelector(".btn-guardar");
      const btnCancelar = tr.querySelector(".btn-cancelar");
      const btnFusionar = tr.querySelector(".btn-fusionar");
      const btnToggle = tr.querySelector(".btn-toggle-activo");
      const fusionBox = tr.querySelector(".fusion-box");
      const selDestino = tr.querySelector(".fusion-destino");

      function modoEdicion(activo) {
        valorNombre.style.display = activo ? "none" : "";
        valorPuesto.style.display = activo ? "none" : "";
        editNombre.style.display = activo ? "" : "none";
        editPuesto.style.display = activo ? "" : "none";
        btnEditar.style.display = activo ? "none" : "";
        btnFusionar.style.display = activo ? "none" : "";
        btnToggle.style.display = activo ? "none" : "";
        btnGuardar.style.display = activo ? "" : "none";
        btnCancelar.style.display = activo ? "" : "none";
      }

      btnEditar.addEventListener("click", () => modoEdicion(true));
      btnCancelar.addEventListener("click", () => {
        editNombre.value = p.nombre;
        editPuesto.value = p.puesto || "";
        modoEdicion(false);
      });
      btnGuardar.addEventListener("click", async () => {
        const nombre = formatearNombre(editNombre.value);
        const puesto = editPuesto.value.trim();
        if (!nombre) { alert("El nombre no puede quedar vacío."); return; }
        const { exactos } = buscarEncargadosParecidos(nombre, encargados, p.id);
        if (exactos.length) { alert(`Ya existe otro encargado llamado "${exactos[0].nombre}". Usa "Fusionar" si es la misma persona.`); return; }
        try {
          await updateEncargado(p.id, { nombre, puesto: puesto || null });
          invalidateEquipos();
          await renderTodo();
        } catch (err) {
          alert(err.message.includes("duplicate") ? "Ya existe un encargado con ese nombre." : ("No se pudo guardar: " + err.message));
        }
      });

      // ---- Fusionar ----
      btnFusionar.addEventListener("click", () => {
        const otros = encargados.filter(x => x.id !== p.id);
        if (!otros.length) { alert("No hay otro encargado con quien fusionar."); return; }
        selDestino.innerHTML = "";
        const o0 = document.createElement("option");
        o0.value = ""; o0.textContent = "Fusionar en...";
        selDestino.appendChild(o0);
        otros.forEach(x => {
          const o = document.createElement("option");
          o.value = x.id; o.textContent = x.nombre;
          selDestino.appendChild(o);
        });
        fusionBox.style.display = "inline";
        btnFusionar.style.display = "none";
      });
      tr.querySelector(".btn-cancelar-fusion").addEventListener("click", () => {
        fusionBox.style.display = "none";
        btnFusionar.style.display = "";
      });
      tr.querySelector(".btn-confirmar-fusion").addEventListener("click", async () => {
        const destino = encargados.find(x => x.id === selDestino.value);
        if (!destino) { alert("Elige con quién fusionar."); return; }
        if (!confirm(`Se unirá "${p.nombre}" con "${destino.nombre}": sus ${nEquipos} equipo(s) pasarán a "${destino.nombre}" y "${p.nombre}" se eliminará. ¿Continuar?`)) return;
        try {
          await fusionarEncargados(p.id, destino.id);
          invalidateEquipos();
          await renderTodo();
        } catch (err) {
          alert("No se pudo fusionar: " + err.message);
        }
      });

      // ---- Activar / desactivar ----
      btnToggle.addEventListener("click", async () => {
        const accion = p.activo ? "desactivar" : "reactivar";
        const aviso = p.activo && nEquipos ? ` Tiene ${nEquipos} equipo(s) asignado(s); seguirán a su nombre.` : "";
        if (!confirm(`¿Seguro que quieres ${accion} a "${p.nombre}"?${aviso}`)) return;
        try {
          await updateEncargado(p.id, { activo: !p.activo });
          await renderTodo();
        } catch (err) {
          alert("No se pudo actualizar: " + err.message);
        }
      });

      tbody.appendChild(tr);
    });
  }

  await renderTodo();
}
