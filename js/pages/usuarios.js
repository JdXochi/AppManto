// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Usuarios (solo Admin) — editar y activar/desactivar
// =========================================================
import { listPerfiles, updatePerfil } from "../data.js";

const ROLES = ["admin", "tecnico", "usuario"];

export async function render(container, { perfil: perfilPropio }) {
  container.innerHTML = `
    <div class="card">
      <h2>Usuarios del sistema</h2>
      <p class="sub">Editar nombre y rol, o desactivar el acceso de alguien sin borrar su historial. Para crear cuentas nuevas, por ahora pide que se den de alta desde Supabase — pronto se podrá hacer aquí mismo.</p>
      <div style="overflow-x:auto">
        <table id="tabla-usuarios" class="responsive-cards">
          <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  async function renderTabla() {
    const perfiles = await listPerfiles();
    const tbody = container.querySelector("#tabla-usuarios tbody");
    tbody.innerHTML = "";

    perfiles.forEach(p => {
      const esUnoMismo = p.id === perfilPropio.id;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="Usuario"><b>@${p.username || "—"}</b></td>
        <td data-label="Nombre">
          <span class="valor-nombre">${p.nombre}</span>
          <input type="text" class="edit-nombre" value="${p.nombre}" style="display:none">
        </td>
        <td data-label="Rol">
          <span class="valor-rol" style="text-transform:capitalize">${p.rol}</span>
          <select class="edit-rol" style="display:none">
            ${ROLES.map(r => `<option value="${r}" ${r === p.rol ? "selected" : ""}>${r}</option>`).join("")}
          </select>
        </td>
        <td data-label="Estado"><span class="badge ${p.activo ? "Vigente" : "Atrasado"}">${p.activo ? "Activo" : "Inactivo"}</span></td>
        <td data-label="Acciones">
          <button class="secondary btn-editar">Editar</button>
          <button class="primary btn-guardar" style="display:none">Guardar</button>
          <button class="ghost btn-cancelar" style="display:none">Cancelar</button>
          ${esUnoMismo
            ? `<span class="hint">Esta es tu cuenta</span>`
            : `<button class="${p.activo ? "ghost" : "secondary"} btn-toggle-activo">${p.activo ? "Desactivar" : "Reactivar"}</button>`}
        </td>`;

      const valorNombre = tr.querySelector(".valor-nombre");
      const valorRol = tr.querySelector(".valor-rol");
      const editNombre = tr.querySelector(".edit-nombre");
      const editRol = tr.querySelector(".edit-rol");
      const btnEditar = tr.querySelector(".btn-editar");
      const btnGuardar = tr.querySelector(".btn-guardar");
      const btnCancelar = tr.querySelector(".btn-cancelar");

      function modoEdicion(activo) {
        valorNombre.style.display = activo ? "none" : "";
        valorRol.style.display = activo ? "none" : "";
        editNombre.style.display = activo ? "" : "none";
        editRol.style.display = activo ? "" : "none";
        btnEditar.style.display = activo ? "none" : "";
        btnGuardar.style.display = activo ? "" : "none";
        btnCancelar.style.display = activo ? "" : "none";
      }

      btnEditar.addEventListener("click", () => modoEdicion(true));
      btnCancelar.addEventListener("click", () => {
        editNombre.value = p.nombre;
        editRol.value = p.rol;
        modoEdicion(false);
      });
      btnGuardar.addEventListener("click", async () => {
        const nuevoNombre = editNombre.value.trim();
        const nuevoRol = editRol.value;
        if (!nuevoNombre) { alert("El nombre no puede quedar vacío."); return; }
        if (esUnoMismo && nuevoRol !== "admin") {
          alert("No puedes quitarte a ti mismo el rol de Administrador desde aquí -- pide a otro Admin que lo haga.");
          return;
        }
        try {
          await updatePerfil(p.id, { nombre: nuevoNombre, rol: nuevoRol });
          await renderTabla();
        } catch (err) {
          alert("No se pudo guardar: " + err.message);
        }
      });

      const btnToggle = tr.querySelector(".btn-toggle-activo");
      if (btnToggle) {
        btnToggle.addEventListener("click", async () => {
          const accion = p.activo ? "desactivar" : "reactivar";
          if (!confirm(`¿Seguro que quieres ${accion} a "${p.nombre}" (@${p.username})?`)) return;
          try {
            await updatePerfil(p.id, { activo: !p.activo });
            await renderTabla();
          } catch (err) {
            alert("No se pudo actualizar: " + err.message);
          }
        });
      }

      tbody.appendChild(tr);
    });
  }

  await renderTabla();
}
