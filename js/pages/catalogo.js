// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Catálogo de tipos de equipo (solo Admin)
// =========================================================
import { getTiposEquipo, invalidateTiposEquipo } from "../tiposEquipoStore.js";
import { addTipoEquipo, updateTipoEquipo } from "../data.js";
import { invalidateEquipos } from "../equiposStore.js";

export async function render(container) {
  container.innerHTML = `
    <div class="card">
      <h2>Agregar tipo de equipo</h2>
      <p class="sub">Ej. "Monitor", "UPS". La frecuencia aplicará a todos los equipos de este tipo.</p>
      <div class="grid2">
        <div class="field">
          <label for="t-descripcion">Descripción</label>
          <input type="text" id="t-descripcion" placeholder="Ej. Monitor">
        </div>
        <div class="field">
          <label for="t-frecuencia">Frecuencia (meses)</label>
          <input type="number" id="t-frecuencia" min="1" max="24">
        </div>
      </div>
      <div class="btnrow">
        <button class="primary" id="btn-agregar-tipo">Agregar tipo</button>
        <span class="hint" id="tipo-msg"></span>
      </div>
    </div>

    <div class="card">
      <h2>Catálogo actual</h2>
      <p class="sub">Cambiar la frecuencia aquí aplica de inmediato a todos los equipos de ese tipo.</p>
      <div style="overflow-x:auto">
        <table id="tabla-tipos" class="responsive-cards">
          <thead><tr><th>Descripción</th><th>Frecuencia (meses)</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector("#btn-agregar-tipo").addEventListener("click", async () => {
    const msg = container.querySelector("#tipo-msg");
    const descripcion = container.querySelector("#t-descripcion").value.trim();
    const frecuencia_meses = Number(container.querySelector("#t-frecuencia").value);

    if (!descripcion) { msg.style.color = "#B42318"; msg.textContent = "Ingresa una descripción."; return; }
    if (!frecuencia_meses) { msg.style.color = "#B42318"; msg.textContent = "Ingresa la frecuencia en meses."; return; }

    try {
      await addTipoEquipo({ descripcion, frecuencia_meses });
      container.querySelector("#t-descripcion").value = "";
      container.querySelector("#t-frecuencia").value = "";
      msg.style.color = "#1E7B34"; msg.textContent = "Tipo agregado.";
      setTimeout(() => msg.textContent = "", 2500);
      invalidateTiposEquipo();
      await renderTabla();
    } catch (err) {
      msg.style.color = "#B42318";
      msg.textContent = err.message.includes("duplicate") ? "Ya existe un tipo con esa descripción." : ("Error: " + err.message);
    }
  });

  async function renderTabla() {
    const tipos = await getTiposEquipo(true);
    const tbody = container.querySelector("#tabla-tipos tbody");
    tbody.innerHTML = "";

    tipos.forEach(t => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="Descripción">
          <span class="valor-desc">${t.descripcion}</span>
          <input type="text" class="edit-desc" value="${t.descripcion}" style="display:none">
        </td>
        <td data-label="Frecuencia (meses)">
          <span class="valor-freq">${t.frecuencia_meses}</span>
          <input type="number" class="edit-freq" min="1" max="24" value="${t.frecuencia_meses}" style="display:none; width:90px">
        </td>
        <td data-label="Acciones">
          <button class="secondary btn-editar">Editar</button>
          <button class="primary btn-guardar" style="display:none">Guardar</button>
          <button class="ghost btn-cancelar" style="display:none">Cancelar</button>
        </td>`;

      const valorDesc = tr.querySelector(".valor-desc");
      const valorFreq = tr.querySelector(".valor-freq");
      const editDesc = tr.querySelector(".edit-desc");
      const editFreq = tr.querySelector(".edit-freq");
      const btnEditar = tr.querySelector(".btn-editar");
      const btnGuardar = tr.querySelector(".btn-guardar");
      const btnCancelar = tr.querySelector(".btn-cancelar");

      function modoEdicion(activo) {
        valorDesc.style.display = activo ? "none" : "";
        valorFreq.style.display = activo ? "none" : "";
        editDesc.style.display = activo ? "" : "none";
        editFreq.style.display = activo ? "" : "none";
        btnEditar.style.display = activo ? "none" : "";
        btnGuardar.style.display = activo ? "" : "none";
        btnCancelar.style.display = activo ? "" : "none";
      }

      btnEditar.addEventListener("click", () => modoEdicion(true));
      btnCancelar.addEventListener("click", () => {
        editDesc.value = t.descripcion;
        editFreq.value = t.frecuencia_meses;
        modoEdicion(false);
      });
      btnGuardar.addEventListener("click", async () => {
        const nuevaDesc = editDesc.value.trim();
        const nuevaFreq = Number(editFreq.value);
        if (!nuevaDesc || !nuevaFreq) { alert("Descripción y frecuencia son obligatorias."); return; }
        try {
          await updateTipoEquipo(t.id, { descripcion: nuevaDesc, frecuencia_meses: nuevaFreq });
          invalidateTiposEquipo();
          invalidateEquipos();
          await renderTabla();
        } catch (err) {
          alert("No se pudo guardar: " + err.message);
        }
      });

      tbody.appendChild(tr);
    });
  }

  await renderTabla();
}
