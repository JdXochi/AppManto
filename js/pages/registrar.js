// =========================================================
// Xochi · Control de Mantenimiento de Equipos
// Página: Registrar mantenimiento
// =========================================================
import { getEquipos } from "../equiposStore.js";
import { addMantenimiento, addVistoBueno, subirFirma } from "../data.js";
import { generarPDFConstancia } from "../pdf.js";
import { TIPOS_FRECUENCIA, GARITAS, fillSelect } from "../shared.js";

// Limpieza de listeners de window entre re-renders (evita fugas de memoria
// si la persona entra y sale de esta pestaña varias veces).
let cleanupPrevio = null;

export async function render(container, { session, perfil }) {
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

      <hr style="border:none;border-top:1px solid var(--line);margin:18px 0">
      <h2 style="margin-bottom:2px">Visto bueno</h2>
      <p class="sub">Quien confirma que el trabajo se realizó correctamente.</p>

      <div class="grid2">
        <div class="field">
          <label for="f-vobo-nombre">Nombre de quien da el Vo.Bo.</label>
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
  container.querySelector("#f-fecha").valueAsDate = new Date();

  fillSelect(fGarita, GARITAS, "Todas");
  fillSelect(fTipo, Object.keys(TIPOS_FRECUENCIA), "Todos");

  const equiposCache = await getEquipos();

  function equipoSeleccionado() {
    return equiposCache.find(e => e.id === fSerie.value);
  }
  function onSerieChange() {
    const eq = equipoSeleccionado();
    fFrecuencia.value = eq ? `Cada ${eq.frecuencia_meses} meses` : "";
    fVoboNombre.value = eq ? (eq.encargado_nombre || "") : "";
    fVoboPuesto.value = eq ? (eq.encargado_puesto || "") : "";
  }
  function refreshSerieOptions() {
    const g = fGarita.value, t = fTipo.value;
    const opciones = equiposCache.filter(e => (!g || e.garita === g) && (!t || e.tipo === t));
    fSerie.innerHTML = "";
    if (!opciones.length) {
      const o = document.createElement("option");
      o.value = ""; o.textContent = "— No hay equipos con ese filtro —";
      fSerie.appendChild(o);
    } else {
      opciones.forEach(e => {
        const o = document.createElement("option");
        o.value = e.id;
        o.textContent = `${e.serie} — ${e.tipo} (${e.garita})`;
        fSerie.appendChild(o);
      });
    }
    onSerieChange();
  }
  refreshSerieOptions();
  fGarita.addEventListener("change", refreshSerieOptions);
  fTipo.addEventListener("change", refreshSerieOptions);
  fSerie.addEventListener("change", onSerieChange);

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

  // ---- Guardar ----
  container.querySelector("#btn-guardar").addEventListener("click", async () => {
    const msg = container.querySelector("#save-msg");
    const eq = equipoSeleccionado();
    const fecha = container.querySelector("#f-fecha").value;
    const tipoFirma = container.querySelector('input[name="tipofirma"]:checked').value;
    const voboNombre = fVoboNombre.value.trim();
    const voboPuesto = fVoboPuesto.value.trim();
    const actividades = container.querySelector("#f-actividades").value.trim();
    const hallazgos = container.querySelector("#f-hallazgos").value.trim();

    if (!eq) { msg.style.color = "#B42318"; msg.textContent = "Selecciona un equipo del inventario."; return; }
    if (!fecha) { msg.style.color = "#B42318"; msg.textContent = "Selecciona la fecha."; return; }
    if (!voboNombre) { msg.style.color = "#B42318"; msg.textContent = "Ingresa el nombre de quien da el Vo.Bo."; return; }
    if (tipoFirma === "Digital" && !hasSignature) {
      msg.style.color = "#B42318"; msg.textContent = "Falta capturar la firma digital (o cambia a firma física)."; return;
    }

    const btn = container.querySelector("#btn-guardar");
    btn.disabled = true; btn.textContent = "Guardando...";

    try {
      const mant = await addMantenimiento({
        equipo_id: eq.id,
        fecha,
        tecnico_id: session.user.id,
        tecnico_nombre: perfil.nombre,
        actividades,
        hallazgos,
      });

      let firmaPath = null;
      let firmaDataUrl = null;
      if (tipoFirma === "Digital") {
        firmaDataUrl = canvas.toDataURL("image/png");
        firmaPath = await subirFirma(mant.id, firmaDataUrl);
      }

      await addVistoBueno({
        mantenimiento_id: mant.id,
        nombre: voboNombre,
        puesto: voboPuesto,
        tipo_firma: tipoFirma,
        firma_path: firmaPath,
      });

      generarPDFConstancia(eq, { fecha, tecnico_nombre: perfil.nombre, actividades, hallazgos },
        { nombre: voboNombre, puesto: voboPuesto, tipo_firma: tipoFirma, firmaDataUrl });

      container.querySelector("#f-actividades").value = "";
      container.querySelector("#f-hallazgos").value = "";
      try { ctx2d.clearRect(0, 0, canvas.width, canvas.height); } catch (e) {}
      hasSignature = false;

      msg.style.color = "#1E7B34"; msg.textContent = "Registro guardado y PDF generado.";
      setTimeout(() => msg.textContent = "", 3000);
    } catch (err) {
      console.error(err);
      msg.style.color = "#B42318"; msg.textContent = "Error al guardar: " + err.message;
    } finally {
      btn.disabled = false; btn.textContent = "Guardar y generar PDF";
    }
  });
}
