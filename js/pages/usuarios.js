// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Usuarios (solo Admin) — editar y activar/desactivar
// =========================================================
import { listPerfiles, updatePerfil, crearUsuario } from "../data.js";

const ROLES = ["admin", "tecnico", "usuario"];

function generarPasswordSegura() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 10; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

export async function render(container, { perfil: perfilPropio }) {
  container.innerHTML = `
    <div class="card">
      <h2>Agregar usuario</h2>
      <p class="sub">La persona deberá cambiar esta contraseña la primera vez que ingrese.</p>
      <div class="grid3">
        <div class="field">
          <label for="u-username">Usuario</label>
          <input type="text" id="u-username" placeholder="ej. jdiaz">
          <p class="hint">Minúsculas, sin espacios ni acentos.</p>
        </div>
        <div class="field">
          <label for="u-nombre">Nombre completo</label>
          <input type="text" id="u-nombre" placeholder="Nombre y apellidos">
        </div>
        <div class="field">
          <label for="u-rol">Rol</label>
          <select id="u-rol">
            <option value="tecnico">Técnico</option>
            <option value="usuario">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label for="u-password">Contraseña inicial</label>
        <div style="display:flex; gap:10px;">
          <input type="text" id="u-password" placeholder="Al menos 8 caracteres" style="flex:1">
          <button type="button" class="secondary" id="btn-generar-password">Generar</button>
        </div>
      </div>
      <div class="btnrow">
        <button class="primary" id="btn-crear-usuario">Crear usuario</button>
        <span class="hint" id="crear-msg"></span>
      </div>
      <div class="card" id="resultado-creacion" style="display:none; margin-top:16px; background:#F8FAFB;">
        <p class="sub" style="margin-bottom:8px">Cuenta creada. Comparte estos datos de forma segura con la persona (no volverán a mostrarse aquí):</p>
        <p style="margin:4px 0"><b>Usuario:</b> <span id="res-username"></span></p>
        <p style="margin:4px 0"><b>Contraseña inicial:</b> <span id="res-password"></span></p>
      </div>
    </div>

    <div class="card">
      <h2>Usuarios del sistema</h2>
      <p class="sub">Editar nombre y rol, o desactivar el acceso de alguien sin borrar su historial.</p>
      <div style="overflow-x:auto">
        <table id="tabla-usuarios" class="responsive-cards">
          <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector("#btn-generar-password").addEventListener("click", () => {
    container.querySelector("#u-password").value = generarPasswordSegura();
  });

  container.querySelector("#btn-crear-usuario").addEventListener("click", async () => {
    const msg = container.querySelector("#crear-msg");
    const username = container.querySelector("#u-username").value.trim().toLowerCase();
    const nombre = container.querySelector("#u-nombre").value.trim();
    const rol = container.querySelector("#u-rol").value;
    const password = container.querySelector("#u-password").value;

    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      msg.style.color = "#B42318"; msg.textContent = "Usuario inválido: usa minúsculas, números, puntos o guiones (3 a 32 caracteres).";
      return;
    }
    if (!nombre) { msg.style.color = "#B42318"; msg.textContent = "Ingresa el nombre completo."; return; }
    if (password.length < 8) { msg.style.color = "#B42318"; msg.textContent = "La contraseña debe tener al menos 8 caracteres."; return; }

    const btn = container.querySelector("#btn-crear-usuario");
    btn.disabled = true; btn.textContent = "Creando...";

    try {
      await crearUsuario({ username, nombre, rol, password });

      container.querySelector("#u-username").value = "";
      container.querySelector("#u-nombre").value = "";
      container.querySelector("#u-rol").value = "tecnico";
      container.querySelector("#u-password").value = "";
      msg.textContent = "";

      container.querySelector("#res-username").textContent = username;
      container.querySelector("#res-password").textContent = password;
      container.querySelector("#resultado-creacion").style.display = "block";

      await renderTabla();
    } catch (err) {
      msg.style.color = "#B42318"; msg.textContent = "Error: " + err.message;
    } finally {
      btn.disabled = false; btn.textContent = "Crear usuario";
    }
  });

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
