// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Inventario de equipos
// =========================================================
import { getEquipos, invalidateEquipos } from "../equiposStore.js";
import { getTiposEquipo, invalidateTiposEquipo } from "../tiposEquipoStore.js";
import { getEncargados, invalidateEncargados } from "../encargadosStore.js";
import { addEquipo, addTipoEquipo, updateEquipo, addEncargado } from "../data.js";
import { GARITAS, fillSelect, fillSelectPairs, tiposDisponibles, normalizarTexto, esc, formatearNombre, buscarEncargadosParecidos } from "../shared.js";

const NUEVO_TIPO = "__nuevo__";
const NUEVO_ENCARGADO = "__nuevo_encargado__";

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
        <div class="field">
          <label for="i-ip">Dirección IP</label>
          <input type="text" id="i-ip" placeholder="Ej. 192.168.1.20">
        </div>
      </div>
      <div class="grid2">
        <div class="field">
          <label for="i-encargado">Encargado</label>
          <select id="i-encargado"></select>
          <p class="hint">Elige de la lista para no repetir nombres. Si no está, usa "+ Nuevo encargado".</p>
        </div>
        <div class="field">
          <label for="i-puesto">Puesto del encargado</label>
          <input type="text" id="i-puesto" disabled placeholder="Se llena al elegir al encargado">
        </div>
      </div>
      <div class="grid2" id="wrap-nuevo-encargado" style="display:none">
        <div class="field">
          <label for="i-enc-nuevo-nombre">Nombre completo del encargado nuevo</label>
          <input type="text" id="i-enc-nuevo-nombre" placeholder="Nombre y apellido">
        </div>
        <div class="field">
          <label for="i-enc-nuevo-puesto">Puesto</label>
          <input type="text" id="i-enc-nuevo-puesto" placeholder="Puesto">
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
          <thead><tr><th>Garita</th><th>Tipo</th><th>Serie / Código</th><th>Marca</th><th>Modelo</th><th>IP</th><th>Encargado</th><th>Puesto</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="empty" id="inv-empty" style="display:none">Aún no hay equipos en el inventario.</p>
    </div>
  `;

  if (ROL === "admin" || ROL === "tecnico") {
    container.querySelector("#card-agregar-equipo").style.display = "block";

    const iGarita = container.querySelector("#i-garita");
    const iTipo = container.querySelector("#i-tipo");
    const wrapNuevoTipo = container.querySelector("#wrap-nuevo-tipo");
    const iTipoNuevoDesc = container.querySelector("#i-tipo-nuevo-desc");
    const iTipoNuevoFrecuencia = container.querySelector("#i-tipo-nuevo-frecuencia");
    const iSerie = container.querySelector("#i-serie");
    const iMarca = container.querySelector("#i-marca");
    const iModelo = container.querySelector("#i-modelo");
    const iIp = container.querySelector("#i-ip");
    const iEncargado = container.querySelector("#i-encargado");
    const iPuesto = container.querySelector("#i-puesto");
    const wrapNuevoEncargado = container.querySelector("#wrap-nuevo-encargado");
    const iEncNuevoNombre = container.querySelector("#i-enc-nuevo-nombre");
    const iEncNuevoPuesto = container.querySelector("#i-enc-nuevo-puesto");

    let encargadosActivos = [];

    // Muestra el puesto del encargado elegido y abre/cierra los campos de "nuevo".
    function actualizarVistaEncargado() {
      wrapNuevoEncargado.style.display = iEncargado.value === NUEVO_ENCARGADO ? "grid" : "none";
      const enc = encargadosActivos.find(x => x.id === iEncargado.value);
      iPuesto.value = enc ? (enc.puesto || "") : "";
    }

    async function refreshEncargadoSelect() {
      encargadosActivos = (await getEncargados()).filter(x => x.activo);
      fillSelectPairs(iEncargado, encargadosActivos.map(x => ({ value: x.id, label: x.nombre })), "Sin encargado");
      const oNuevo = document.createElement("option");
      oNuevo.value = NUEVO_ENCARGADO; oNuevo.textContent = "+ Nuevo encargado...";
      iEncargado.appendChild(oNuevo);
      actualizarVistaEncargado();
    }
    await refreshEncargadoSelect();
    iEncargado.addEventListener("change", actualizarVistaEncargado);

    // Crea al encargado nuevo evitando duplicados ("Jose Diaz" vs "jose diaz").
    // Devuelve su id, o null si el usuario canceló / hubo un problema.
    async function crearEncargadoDesdeFormulario(msg) {
      const nombre = formatearNombre(iEncNuevoNombre.value);
      const puesto = iEncNuevoPuesto.value.trim();
      if (!nombre) { msg.style.color = "#B42318"; msg.textContent = "Ingresa el nombre del encargado nuevo."; return null; }

      const todos = await getEncargados(true);
      const { exactos, parecidos } = buscarEncargadosParecidos(nombre, todos);
      if (exactos.length) {
        msg.style.color = "#B42318";
        msg.textContent = exactos[0].activo
          ? `"${exactos[0].nombre}" ya existe: selecciónalo en la lista.`
          : `"${exactos[0].nombre}" ya existe pero está inactivo: pide al Administrador que lo reactive.`;
        return null;
      }
      if (parecidos.length && !confirm(
        `Ya existe un encargado parecido: ${parecidos.map(x => x.nombre).join(", ")}.\n\n` +
        `Si es la misma persona, cancela y selecciónala en la lista.\n` +
        `¿Crear de todos modos como una persona distinta?`)) return null;

      const nuevo = await addEncargado({ nombre, puesto: puesto || null });
      invalidateEncargados();
      return nuevo.id;
    }

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
      iIp.value = "";
      iEncargado.value = "";
      iEncNuevoNombre.value = "";
      iEncNuevoPuesto.value = "";
      actualizarVistaEncargado();
    }

    container.querySelector("#btn-agregar-inv").addEventListener("click", async () => {
      const msg = container.querySelector("#inv-msg");
      const garita = iGarita.value;
      const serie = iSerie.value.trim();
      const marca = iMarca.value.trim();
      const modelo = iModelo.value.trim();
      const ip = iIp.value.trim();
      let encargado_id = iEncargado.value || null;

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

        if (encargado_id === NUEVO_ENCARGADO) {
          encargado_id = await crearEncargadoDesdeFormulario(msg);
          if (!encargado_id) return;
        }

        await addEquipo({ garita, tipo_id, serie, marca, modelo, ip, encargado_id });
        limpiarFormulario();
        await refreshTipoSelect();
        await refreshEncargadoSelect();
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
    const encargadosLista = await getEncargados();
    const fg = container.querySelector("#filter-garita-inv").value;
    const ft = container.querySelector("#filter-tipo-inv").value;
    const q = normalizarTexto(container.querySelector("#filter-busqueda-inv").value.trim());

    const filtrados = equipos.filter(e => {
      if (fg && e.garita !== fg) return false;
      if (ft && e.tipo !== ft) return false;
      if (q) {
        const texto = normalizarTexto([e.tipo, e.serie, e.marca, e.modelo, e.ip, e.encargado_nombre, e.encargado_puesto]
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
      tr.innerHTML = `
        <td data-label="Garita">
          <span class="valor-garita">${e.garita}</span>
          <select class="edit-garita" style="display:none"></select>
        </td>
        <td data-label="Tipo">${e.tipo}</td>
        <td data-label="Serie / Código">
          <span class="valor-serie"><b>${e.serie}</b></span>
          <input type="text" class="edit-serie" value="${e.serie}" style="display:none">
        </td>
        <td data-label="Marca">
          <span class="valor-marca">${e.marca||""}</span>
          <input type="text" class="edit-marca" value="${e.marca||""}" style="display:none">
        </td>
        <td data-label="Modelo">
          <span class="valor-modelo">${e.modelo||""}</span>
          <input type="text" class="edit-modelo" value="${e.modelo||""}" style="display:none">
        </td>
        <td data-label="IP">
          <span class="valor-ip">${e.ip||""}</span>
          <input type="text" class="edit-ip" value="${e.ip||""}" style="display:none">
        </td>
        <td data-label="Encargado">
          <span class="valor-encargado">${esc(e.encargado_nombre)}</span>
          <select class="edit-encargado" style="display:none"></select>
        </td>
        <td data-label="Puesto">${esc(e.encargado_puesto)}</td>
        <td data-label="Acciones">
          ${(ROL === "admin" || ROL === "tecnico")? `
            <button class="secondary btn-editar">Editar</button>
            <button class="primary btn-guardar" style="display:none">Guardar</button>
            <button class="ghost btn-cancelar" style="display:none">Cancelar</button>
          ` : ""}
        </td>`;

      if (ROL === "admin" || ROL === "tecnico") {
        const editGarita = tr.querySelector(".edit-garita");
        fillSelect(editGarita, GARITAS, null);
        editGarita.value = e.garita;

        // Solo encargados activos (más el actual, aunque esté inactivo).
        const editEncargado = tr.querySelector(".edit-encargado");
        fillSelectPairs(
          editEncargado,
          encargadosLista.filter(x => x.activo || x.id === e.encargado_id).map(x => ({ value: x.id, label: x.nombre })),
          "Sin encargado"
        );
        editEncargado.value = e.encargado_id || "";

        const campos = ["garita", "serie", "marca", "modelo", "ip", "encargado"];
        const valores = {};
        const edits = {};
        campos.forEach(c => {
          valores[c] = tr.querySelector(`.valor-${c}`);
          edits[c] = tr.querySelector(`.edit-${c}`);
        });

        const btnEditar = tr.querySelector(".btn-editar");
        const btnGuardar = tr.querySelector(".btn-guardar");
        const btnCancelar = tr.querySelector(".btn-cancelar");

        function modoEdicion(activo) {
          campos.forEach(c => {
            valores[c].style.display = activo ? "none" : "";
            edits[c].style.display = activo ? "" : "none";
          });
          btnEditar.style.display = activo ? "none" : "";
          btnGuardar.style.display = activo ? "" : "none";
          btnCancelar.style.display = activo ? "" : "none";
        }

        btnEditar.addEventListener("click", () => modoEdicion(true));
        btnCancelar.addEventListener("click", () => {
          editGarita.value = e.garita;
          edits.serie.value = e.serie;
          edits.marca.value = e.marca || "";
          edits.modelo.value = e.modelo || "";
          edits.ip.value = e.ip || "";
          edits.encargado.value = e.encargado_id || "";
          modoEdicion(false);
        });
        btnGuardar.addEventListener("click", async () => {
          const nuevaSerie = edits.serie.value.trim();
          if (!nuevaSerie) { alert("La serie/código no puede quedar vacía."); return; }
          try {
            await updateEquipo(e.id, {
              garita: editGarita.value,
              serie: nuevaSerie,
              marca: edits.marca.value.trim(),
              modelo: edits.modelo.value.trim(),
              ip: edits.ip.value.trim(),
              encargado_id: edits.encargado.value || null,
            });
            invalidateEquipos();
            await renderTabla();
          } catch (err) {
            alert(err.message.includes("duplicate") ? "Ya existe otro equipo con esa serie." : ("No se pudo guardar: " + err.message));
          }
        });
      }

      tbody.appendChild(tr);
    });
  }

  await renderTabla();
}
