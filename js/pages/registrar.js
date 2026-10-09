// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Registrar mantenimiento
// =========================================================
import { getEquipos } from "../equiposStore.js";
import { addMantenimiento, addVistoBueno, subirFirma } from "../data.js";
import { generarPDFConstancia, generarPDFConstanciaMultiple, fmtDate } from "../pdf.js";
import { GARITAS, fillSelect, tiposDisponibles, hoyLocalISO, esc } from "../shared.js";

// Limpieza de listeners de window entre re-renders (evita fugas de memoria
// si la persona entra y sale de esta pestaña varias veces).
let cleanupPrevio = null;

// Equipos agregados a la hoja actual. Vive a nivel de módulo para que no se
// pierdan si la persona cambia de pestaña y regresa antes de guardar.
// Cada item: { equipo, fecha, actividades, hallazgos, mantId, guardado }
let hoja = [];

export async function render(container, { session, perfil, preseleccionarEquipoId }) {
  if (cleanupPrevio) { cleanupPrevio(); cleanupPrevio = null; }

  container.innerHTML = `
    <div class="card">
      <h2>Nuevo mantenimiento realizado</h2>
      <p class="sub">Si el equipo no aparece en la lista, pide al Administrador que lo agregue en Inventario.</p>

      <div class="grid3">
        <div class="field">
          <label for="f-garita">Garita</label>
          <select id="f-garita"><option value="">Todas</option></select>
        </div>
        <div class="field">
          <label for="f-tipo">Tipo de equipo</label>
          <select id="f-tipo"><option value="">Todos</option></select>
        </div>
        <div class="field">
          <label for="f-serie">Equipo (serie / código)</label>
          <select id="f-serie"></select>
        </div>
      </div>

      <div class="grid3">
        <div class="field">
          <label for="f-fecha">Fecha de ejecución</label>
          <input type="date" id="f-fecha">
        </div>
        <div class="field">
          <label for="f-frecuencia">Frecuencia de este equipo</label>
          <input type="text" id="f-frecuencia" disabled>
        </div>
        <div class="field">
          <label for="f-tecnico">Técnico que realizó el mantenimiento</label>
          <input type="text" id="f-tecnico" disabled>
        </div>
      </div>

      <div class="field">
        <label for="f-actividades">Actividades realizadas (qué se le hizo)</label>
        <textarea id="f-actividades" placeholder="Ej. Limpieza de lentes, ajuste de enfoque, verificación de PoE"></textarea>
      </div>
      <div class="field">
        <label for="f-hallazgos">Hallazgos / Observaciones</label>
        <textarea id="f-hallazgos" placeholder="Ej. Sin novedad / Se detectó..."></textarea>
      </div>

      <div class="btnrow">
        <button class="secondary" id="btn-agregar-hoja" type="button">+ Agregar equipo a la hoja</button>
        <span class="hint" id="hoja-msg"></span>
      </div>

      <h2 style="margin:18px 0 2px">Equipos en esta hoja <span class="hint" id="hoja-count"></span></h2>
      <p class="sub">Agrega cada equipo que atendiste (por ejemplo CPU y monitor). Se firma una sola vez y se genera un solo PDF, pero cada equipo se registra por separado en el historial.</p>
      <div style="overflow-x:auto">
        <table id="tabla-hoja" class="responsive-cards">
          <thead><tr><th>#</th><th>Equipo</th><th>Tipo</th><th>Ubicación</th><th>Fecha</th><th>Actividades</th><th>Hallazgos</th><th></th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
      <p class="empty" id="hoja-empty">Aún no has agregado equipos a la hoja.</p>

      <hr style="border:none;border-top:1px solid var(--line);margin:18px 0">
      <h2 style="margin-bottom:2px">Conformidad del trabajo realizado</h2>
      <p class="sub">Quien confirma que el trabajo se realizó correctamente.</p>

      <div class="grid2">
        <div class="field">
          <label for="f-vobo-nombre">Nombre de quien confirma</label>
          <input type="text" id="f-vobo-nombre" placeholder="Se autocompleta con el encargado del equipo">
        </div>
        <div class="field">
          <label for="f-vobo-puesto">Puesto</label>
          <input type="text" id="f-vobo-puesto" placeholder="Puesto">
        </div>
      </div>

      <div class="field">
        <label>Tipo de firma</label>
        <div class="radio-group">
          <label><input type="radio" name="tipofirma" value="Digital" checked> Firma digital (en pantalla)</label>
          <label><input type="radio" name="tipofirma" value="Física"> Firma física (en papel)</label>
        </div>
      </div>

      <div class="field" id="wrap-firma-digital">
        <label>Firma</label>
        <div class="sigwrap">
          <canvas id="sigpad"></canvas>
          <div class="sigbar">
            <span class="hint">Dibuja la firma con el mouse o el dedo</span>
            <button type="button" class="secondary" id="btn-limpiar-firma">Limpiar</button>
          </div>
        </div>
      </div>
      <div class="field hint" id="wrap-firma-fisica" style="display:none">
        La firma se recabará en papel. Al generar el PDF se dejará una línea en blanco para firmar.
      </div>

      <div class="btnrow">
        <button class="primary" id="btn-guardar">Guardar y generar PDF</button>
        <span class="hint" id="save-msg"></span>
      </div>
    </div>
  `;

  const fGarita = container.querySelector("#f-garita");
  const fTipo = container.querySelector("#f-tipo");
  const fSerie = container.querySelector("#f-serie");
  const fFrecuencia = container.querySelector("#f-frecuencia");
  const fVoboNombre = container.querySelector("#f-vobo-nombre");
  const fVoboPuesto = container.querySelector("#f-vobo-puesto");

  container.querySelector("#f-tecnico").value = perfil ? perfil.nombre : "";
  container.querySelector("#f-fecha").value = hoyLocalISO();

  fillSelect(fGarita, GARITAS, "Todas");

  const equiposCache = await getEquipos();
  fillSelect(fTipo, tiposDisponibles(equiposCache).filter(t => equiposCache.some(e => e.tipo === t)), "Todos");

  function equipoSeleccionado() {
    return equiposCache.find(e => e.id === fSerie.value);
  }
  function onSerieChange() {
    const eq = equipoSeleccionado();
    fFrecuencia.value = eq ? `Cada ${eq.frecuencia_meses} meses` : "";
    // Con equipos ya en la hoja, quien firma es el de la hoja: no se sobreescribe.
    if (!hoja.length) {
      fVoboNombre.value = eq ? (eq.encargado_nombre || "") : "";
      fVoboPuesto.value = eq ? (eq.encargado_puesto || "") : "";
    }
  }
  function refreshSerieOptions() {
    const g = fGarita.value, t = fTipo.value;
    const opciones = equiposCache.filter(e =>
      (!g || e.garita === g) && (!t || e.tipo === t) && !hoja.some(i => i.equipo.id === e.id));
    fSerie.innerHTML = "";
    const oVacio = document.createElement("option");
    oVacio.value = "";
    oVacio.textContent = opciones.length ? "Selecciona un equipo..." : "— No hay equipos con ese filtro —";
    fSerie.appendChild(oVacio);
    opciones.forEach(e => {
      const o = document.createElement("option");
      o.value = e.id;
      o.textContent = `${e.serie} — ${e.tipo} (${e.garita}${e.ubicacion ? " · " + e.ubicacion : ""})`;
      fSerie.appendChild(o);
    });
    onSerieChange();
  }
  refreshSerieOptions();
  fGarita.addEventListener("change", refreshSerieOptions);
  fTipo.addEventListener("change", refreshSerieOptions);
  fSerie.addEventListener("change", onSerieChange);

  // Si venimos desde "Estado" con un equipo específico (botón "Registrar"
  // sobre un atrasado), lo preseleccionamos ya filtrado por su garita/tipo.
  if (preseleccionarEquipoId) {
    const eq = equiposCache.find(e => e.id === preseleccionarEquipoId);
    if (eq) {
      fGarita.value = eq.garita;
      fTipo.value = eq.tipo;
      refreshSerieOptions();
      fSerie.value = eq.id;
      onSerieChange();
    }
  }

  const radiosFirma = container.querySelectorAll('input[name="tipofirma"]');
  const wrapDigital = container.querySelector("#wrap-firma-digital");
  const wrapFisica = container.querySelector("#wrap-firma-fisica");
  radiosFirma.forEach(r => r.addEventListener("change", () => {
    const digital = container.querySelector('input[name="tipofirma"]:checked').value === "Digital";
    wrapDigital.style.display = digital ? "block" : "none";
    wrapFisica.style.display = digital ? "none" : "block";
  }));

  // ---- Firma digital (canvas) ----
  const canvas = container.querySelector("#sigpad");
  const ctx2d = canvas.getContext("2d");
  let drawing = false, hasSignature = false;

  function resizeCanvas() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = 150 * ratio;
    ctx2d.scale(ratio, ratio);
    ctx2d.lineWidth = 2; ctx2d.lineCap = "round"; ctx2d.strokeStyle = "#1C2430";
  }
  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const cy = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: cx, y: cy };
  }
  function onPointerDown(e) { drawing = true; hasSignature = true; const p = pos(e); ctx2d.beginPath(); ctx2d.moveTo(p.x, p.y); e.preventDefault(); }
  function onPointerMove(e) { if (!drawing) return; const p = pos(e); ctx2d.lineTo(p.x, p.y); ctx2d.stroke(); e.preventDefault(); }
  function onPointerUp() { drawing = false; }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("pointerup", onPointerUp);
  setTimeout(resizeCanvas, 50);

  cleanupPrevio = () => {
    window.removeEventListener("resize", resizeCanvas);
    window.removeEventListener("pointerup", onPointerUp);
  };

  container.querySelector("#btn-limpiar-firma").addEventListener("click", () => {
    try { ctx2d.clearRect(0, 0, canvas.width, canvas.height); } catch (e) {}
    hasSignature = false;
  });

  // ---- Hoja: agregar / quitar equipos ----
  function distintoEncargado(a, b) {
    return (a.encargado_id || a.encargado_nombre || "") !== (b.encargado_id || b.encargado_nombre || "");
  }

  // Devuelve true si el equipo quedó agregado. `msgEl` es donde se muestran los avisos.
  function agregarEquipoALaHoja(msgEl) {
    const eq = equipoSeleccionado();
    const fecha = container.querySelector("#f-fecha").value;
    const actividades = container.querySelector("#f-actividades").value.trim();
    const hallazgos = container.querySelector("#f-hallazgos").value.trim();
    const error = t => { msgEl.style.color = "#B42318"; msgEl.textContent = t; return false; };

    if (!eq) return error("Selecciona un equipo del inventario.");
    if (!fecha) return error("Selecciona la fecha.");
    if (hoja.some(i => i.equipo.id === eq.id)) return error("Ese equipo ya está en la hoja.");

    if (hoja.length && distintoEncargado(hoja[0].equipo, eq) && !confirm(
      `Este equipo está a cargo de "${eq.encargado_nombre || "sin encargado"}", pero la hoja la firma ` +
      `"${hoja[0].equipo.encargado_nombre || "sin encargado"}".\n\n¿Agregarlo de todos modos?`)) return false;

    hoja.push({ equipo: eq, fecha, actividades, hallazgos, mantId: null, guardado: false });

    // Preparar el siguiente equipo: se conservan garita, fecha y actividades
    // (suelen repetirse); se limpian el tipo, el equipo y los hallazgos.
    fTipo.value = "";
    refreshSerieOptions();
    container.querySelector("#f-hallazgos").value = "";
    container.querySelector("#f-actividades").value = "";
    renderHoja();

    msgEl.style.color = "#1E7B34";
    msgEl.textContent = `Agregado. La hoja tiene ${hoja.length} equipo(s).`;
    setTimeout(() => { if (msgEl.textContent.startsWith("Agregado")) msgEl.textContent = ""; }, 3000);
    return true;
  }

  function renderHoja() {
    const tbody = container.querySelector("#tabla-hoja tbody");
    tbody.innerHTML = "";
    container.querySelector("#hoja-count").textContent = hoja.length ? `(${hoja.length})` : "";
    container.querySelector("#hoja-empty").style.display = hoja.length ? "none" : "block";
    container.querySelector("#tabla-hoja").style.display = hoja.length ? "" : "none";

    hoja.forEach((item, idx) => {
      const e = item.equipo;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="#">${idx + 1}</td>
        <td data-label="Equipo"><b>${esc(e.serie)}</b></td>
        <td data-label="Tipo">${esc(e.tipo)}</td>
        <td data-label="Ubicación">${esc(e.garita)}${e.ubicacion ? " · " + esc(e.ubicacion) : ""}</td>
        <td data-label="Fecha">${fmtDate(item.fecha)}</td>
        <td data-label="Actividades">${esc(item.actividades)}</td>
        <td data-label="Hallazgos">${esc(item.hallazgos)}</td>
        <td data-label="Acciones">${item.guardado
          ? '<span class="hint">✓ Guardado</span>'
          : '<button class="ghost" type="button">Quitar</button>'}</td>`;
      const btnQuitar = tr.querySelector("button");
      if (btnQuitar) btnQuitar.addEventListener("click", () => {
        hoja.splice(idx, 1);
        refreshSerieOptions();   // el equipo vuelve a aparecer en la lista
        renderHoja();
      });
      tbody.appendChild(tr);
    });
  }
  renderHoja();

  container.querySelector("#btn-agregar-hoja").addEventListener("click", () =>
    agregarEquipoALaHoja(container.querySelector("#hoja-msg")));

  // ---- Guardar ----
  container.querySelector("#btn-guardar").addEventListener("click", async () => {
    const msg = container.querySelector("#save-msg");
    const error = t => { msg.style.color = "#B42318"; msg.textContent = t; };
    const tipoFirma = container.querySelector('input[name="tipofirma"]:checked').value;

    // Si hay un equipo elegido en el formulario que aún no está en la hoja,
    // se agrega solo (así sigue funcionando el flujo de un solo equipo).
    if (fSerie.value && !hoja.some(i => i.equipo.id === fSerie.value)) {
      if (!agregarEquipoALaHoja(msg)) return;
    }
    if (!hoja.length) return error("Agrega al menos un equipo a la hoja.");

    const voboNombre = fVoboNombre.value.trim();
    const voboPuesto = fVoboPuesto.value.trim();
    if (!voboNombre) return error("Ingresa el nombre de quien confirma el trabajo.");
    if (tipoFirma === "Digital" && !hasSignature) return error("Falta capturar la firma digital (o cambia a firma física).");

    const btn = container.querySelector("#btn-guardar");
    btn.disabled = true;

    const firmaDataUrl = tipoFirma === "Digital" ? canvas.toDataURL("image/png") : null;
    const pendientes = hoja.filter(i => !i.guardado);
    let hechos = 0;
    let actual = null;

    try {
      // Un mantenimiento por equipo, uno por uno, igual que antes.
      for (const item of pendientes) {
        actual = item;
        btn.textContent = `Guardando ${hechos + 1} de ${pendientes.length}...`;

        if (!item.mantId) {
          const mant = await addMantenimiento({
            equipo_id: item.equipo.id,
            fecha: item.fecha,
            tecnico_id: session.user.id,
            tecnico_nombre: perfil.nombre,
            actividades: item.actividades,
            hallazgos: item.hallazgos,
          });
          item.mantId = mant.id;   // si algo falla después, al reintentar no se duplica
        }

        // La misma firma se guarda para cada mantenimiento de la hoja.
        const firmaPath = firmaDataUrl ? await subirFirma(item.mantId, firmaDataUrl) : null;

        await addVistoBueno({
          mantenimiento_id: item.mantId,
          nombre: voboNombre,
          puesto: voboPuesto,
          tipo_firma: tipoFirma,
          firma_path: firmaPath,
        });

        item.guardado = true;
        hechos++;
        renderHoja();
      }

      btn.textContent = "Generando PDF...";
      const voboPdf = { nombre: voboNombre, puesto: voboPuesto, tipo_firma: tipoFirma, firmaDataUrl };
      if (hoja.length === 1) {
        const it = hoja[0];
        await generarPDFConstancia(it.equipo,
          { fecha: it.fecha, tecnico_nombre: perfil.nombre, actividades: it.actividades, hallazgos: it.hallazgos },
          voboPdf);
      } else {
        await generarPDFConstanciaMultiple(
          hoja.map(it => ({ equipo: it.equipo, registro: { fecha: it.fecha, actividades: it.actividades, hallazgos: it.hallazgos } })),
          perfil.nombre, voboPdf);
      }

      const total = hoja.length;
      hoja = [];
      renderHoja();
      limpiarFormularioCompleto();

      msg.style.color = "#1E7B34";
      msg.textContent = total === 1 ? "Registro guardado y PDF generado." : `${total} mantenimientos guardados y PDF generado.`;
      setTimeout(() => msg.textContent = "", 4000);
    } catch (err) {
      console.error(err);
      msg.style.color = "#B42318";
      msg.textContent = hechos || hoja.some(i => i.guardado)
        ? `Se guardaron ${hoja.filter(i => i.guardado).length} de ${hoja.length}. Falló ${actual ? `"${actual.equipo.serie}"` : "el PDF"}: ${err.message}. Vuelve a presionar Guardar: solo se guardarán los pendientes.`
        : "Error al guardar: " + err.message;
    } finally {
      btn.disabled = false; btn.textContent = "Guardar y generar PDF";
    }
  });

  function limpiarFormularioCompleto() {
    fGarita.value = "";
    fTipo.value = "";
    refreshSerieOptions(); // repuebla f-serie y limpia frecuencia + Vo.Bo. vía onSerieChange
    container.querySelector("#f-fecha").value = hoyLocalISO();
    container.querySelector("#f-actividades").value = "";
    container.querySelector("#f-hallazgos").value = "";

    const radioDigital = container.querySelector('input[name="tipofirma"][value="Digital"]');
    radioDigital.checked = true;
    container.querySelector("#wrap-firma-digital").style.display = "block";
    container.querySelector("#wrap-firma-fisica").style.display = "none";

    try { ctx2d.clearRect(0, 0, canvas.width, canvas.height); } catch (e) {}
    hasSignature = false;
  }
}
