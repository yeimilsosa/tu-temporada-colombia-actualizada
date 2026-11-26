/*
 * Contador global de visitas — Tu Temporada Colombia
 * Sitio configurado en GoatCounter:
 * https://tutemporadacolombia.goatcounter.com
 */

const GOATCOUNTER_SITE = "https://tutemporadacolombia.goatcounter.com";

const counter = document.querySelector("[data-visitor-counter]");
const output = document.querySelector("[data-visitor-count]");

function formatCount(value) {
  return new Intl.NumberFormat("es-CO").format(value);
}

async function initVisitorCounter() {
  if (!counter || !output) return;

  // Cargar el contador oficial para registrar las visitas de esta página.
  const tracker = document.createElement("script");
  tracker.async = true;
  tracker.setAttribute("data-goatcounter", `${GOATCOUNTER_SITE}/count`);
  tracker.src = "https://gc.zgo.at/count.js";
  document.head.appendChild(tracker);

  // Consultar el total público del sitio para mostrarlo en el pie de página.
  try {
    const response = await fetch(
      `${GOATCOUNTER_SITE}/counter/${encodeURIComponent("/")}.json`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store"
      }
    );

    if (!response.ok) throw new Error("No se pudo consultar el contador");

    const data = await response.json();
    const total = Number(data.count);

    if (Number.isFinite(total) && total >= 0) {
      output.textContent = formatCount(total);
      counter.title = `${formatCount(total)} visitas totales`;
    } else {
      throw new Error("Respuesta de contador no válida");
    }
  } catch {
    output.textContent = "—";
    counter.title = "Contador de visitas temporalmente no disponible";
  }
}

initVisitorCounter();
