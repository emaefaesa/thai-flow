const DATA = window.TRIP_DATA;
const APP_VERSION = "4.1.0";


// ============================================================
// STORAGE
// ============================================================

// Favoritos: queremos conservarlos aunque cierres el navegador.
const STORAGE_KEY = "thaiFlowSaved";

// Estado de navegación: solo necesitamos conservarlo durante
// la sesión actual (por ejemplo cuando Live Server recarga).
const SESSION_KEY = "thaiFlowSession";

const PAGE_SIZE = 30;


// ============================================================
// SELECTORES RÁPIDOS
// ============================================================

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];


// ============================================================
// FAVORITOS
// ============================================================

let saved = new Set(
  JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
);


// ============================================================
// ESTADO DE LA INTERFAZ
// ============================================================

// Recuperamos dónde estabas antes del último refresh.
// Así, si Live Server recarga al guardar una imagen,
// no vuelves siempre al inicio.
function getSessionState() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "{}");
  } catch (error) {
    console.warn("No se pudo recuperar el estado de Thai Flow:", error);
    return {};
  }
}

const initialState = getSessionState();

let selectedCity =
  initialState.selectedCity || suggestedCityForToday();

let selectedCategory =
  initialState.selectedCategory || "all";

let searchTerm =
  initialState.searchTerm || "";

let visibleLimit =
  initialState.visibleLimit || PAGE_SIZE;

let selectedMood =
  initialState.selectedMood || null;

let currentView =
  initialState.currentView || "explore";

let activeDialogPlace = null;


// ============================================================
// ETIQUETAS
// ============================================================

const cityLabels = {
  all: "Todos",
  bangkok: "Bangkok",
  chiangmai: "Chiang Mai",
  pai: "Pai",
  kohtao: "Koh Tao",
  ayutthaya: "Ayutthaya",
};

const categoryLabels = Object.fromEntries(DATA.categories);


// ============================================================
// GUARDAR ESTADO DE NAVEGACIÓN
// ============================================================

function saveSessionState() {
  const state = {
    selectedCity,
    selectedCategory,
    searchTerm,
    visibleLimit,
    selectedMood,
    currentView,
  };

  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify(state)
  );
}


// ============================================================
// NORMALIZAR TEXTO PARA EL BUSCADOR
// ============================================================

// Permite que "cafe" encuentre también "café",
// y evita diferencias entre mayúsculas/minúsculas.
function normalizeText(value = "") {
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}


// ============================================================
// CIUDAD SUGERIDA SEGÚN LA FECHA DEL VIAJE
// ============================================================

function suggestedCityForToday() {
  const now = new Date();

  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();

  // Fuera del viaje mostramos todos los destinos.
  if (y !== 2026) return "all";

  if (m === 8 && d <= 19) {
    return "bangkok";
  }

  if (m === 8 && d >= 20 && d <= 25) {
    return "chiangmai";
  }

  if (m === 8 && d >= 26 && d <= 28) {
    return "kohtao";
  }

  if (
    (m === 8 && d >= 29) ||
    (m === 9 && d <= 1)
  ) {
    return "bangkok";
  }

  return "all";
}


// ============================================================
// TEXTO DEL HERO SEGÚN EL MOMENTO DEL VIAJE
// ============================================================

function tripStageForToday() {
  const now = new Date();

  const key = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  if (key < "2026-08-19") {
    return {
      stage: "Cuenta atrás",
      base: "Bangkok · primera parada",
    };
  }

  if (key === "2026-08-19") {
    return {
      stage: "Llegada a Tailandia",
      base: "Bangkok",
    };
  }

  if (
    key >= "2026-08-20" &&
    key <= "2026-08-25"
  ) {
    return {
      stage: "Norte salvaje",
      base: "Chiang Mai",
    };
  }

  if (
    key >= "2026-08-26" &&
    key <= "2026-08-28"
  ) {
    return {
      stage: "Modo isla",
      base: "Koh Tao",
    };
  }

  if (key === "2026-08-29") {
    return {
      stage: "Vuelta + Muay Thai",
      base: "Bangkok",
    };
  }

  if (
    key >= "2026-08-30" &&
    key <= "2026-09-01"
  ) {
    return {
      stage: "Bangkok + Ayutthaya",
      base: "Bangkok",
    };
  }

  if (key === "2026-09-02") {
    return {
      stage: "Vuelta a casa",
      base: "Aeropuerto",
    };
  }

  return {
    stage: "Thai Flow",
    base: "Todos los destinos",
  };
}


// ============================================================
// PRIORIDAD DE LOS LUGARES
// ============================================================

// Aunque ahora enseñamos TODOS los resultados,
// seguimos utilizando la prioridad para ordenar:
//
// MUY ALTO
// ALTO
// MEDIO-ALTO
// MEDIO
// BONUS
//
// De este modo no ocultamos nada, pero lo mejor sale primero.
function priorityScore(place) {
  const p = (place.priority || "").toUpperCase();

  let score = 0;

  if (p.includes("MUY ALTO")) {
    score += 100;
  } else if (p.startsWith("ALTO")) {
    score += 75;
  } else if (p.includes("MEDIO-ALTO")) {
    score += 58;
  } else if (p.includes("MEDIO")) {
    score += 45;
  } else if (p.includes("ÚTIL")) {
    score += 65;
  } else if (p.includes("CANDIDATO")) {
    score += 42;
  } else if (p.includes("BONUS")) {
    score += 28;
  }

  if ((place.tags || []).includes("must")) {
    score += 35;
  }

  if (p.includes("NO RESERVAR")) {
    score -= 80;
  }

  if (p.includes("REVALIDAR")) {
    score -= 8;
  }

  return score;
}


// Esta función ya NO se utiliza para esconder sitios en Explorar.
// Solo la usamos en "¿Qué hacemos?" para enseñar una selección rápida.
function isTop(place) {
  return (
    priorityScore(place) >= 98 ||
    (place.tags || []).includes("must")
  );
}


// ============================================================
// FAVORITOS
// ============================================================

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify([...saved])
  );

  updateSavedCounters();
}


function toggleSaved(place) {
  if (saved.has(place.id)) {
    saved.delete(place.id);
  } else {
    saved.add(place.id);
  }

  saveState();
  renderSaved();

  // Si estamos viendo ese sitio dentro del modal,
  // actualizamos también el botón del modal.
  if (activeDialogPlace?.id === place.id) {
    syncDialogSave(place);
  }
}


function updateSavedCounters() {
  const n = saved.size;

  const topCount = $("#savedTopCount");
  const navCount = $("#savedNavCount");

  if (topCount) {
    topCount.textContent = n;
  }

  if (navCount) {
    navCount.textContent = n;
  }
}


// ============================================================
// CATEGORÍAS
// ============================================================

function categoryIcon(place) {
  const label =
    categoryLabels[place.category] ||
    place.icon ||
    "✦";

  return (
    place.icon ||
    label.trim().split(" ")[0]
  );
}


function categoryName(place) {
  return (
    categoryLabels[place.category] ||
    place.category
  ).replace(/^\S+\s*/, "");
}


// ============================================================
// METADATOS DE LAS CARDS
// ============================================================

function metaChips(place) {
  const chips = [...(place.badges || [])];

  if (place.duration) {
    chips.push(`⏱ ${place.duration}`);
  }

  if (place.bestTime) {
    chips.push(`◷ ${place.bestTime}`);
  }

  if (place.foodConfidence) {
    chips.push(`🍽 ${place.foodConfidence}`);
  }

  if (place.ethicsStatus) {
    chips.push(`🐘 ${place.ethicsStatus}`);
  }

  return chips
    .filter(Boolean)
    .slice(0, 8);
}


function tagClass(text) {
  const t = normalizeText(text);

  if (
    t.includes("no reservar") ||
    t.includes("revalidar") ||
    t.includes("pendiente")
  ) {
    return "tag alert";
  }

  if (
    t.includes("alta") ||
    t.includes("muy alto") ||
    t.includes("must")
  ) {
    return "tag good";
  }

  return "tag";
}


// ============================================================
// FILTROS DE CIUDAD
// ============================================================

function buildCityFilters() {
  const wrap = $("#cityFilters");

  if (!wrap) return;

  wrap.innerHTML = "";

  Object.entries(cityLabels).forEach(
    ([id, label]) => {
      const count =
        id === "all"
          ? DATA.places.length
          : DATA.places.filter(
              (p) => p.city === id
            ).length;

      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        `chip${
          selectedCity === id
            ? " active"
            : ""
        }`;

      button.dataset.city = id;

      button.textContent =
        `${label} · ${count}`;

      button.addEventListener(
        "click",
        () => {
          selectedCity = id;

          // Al cambiar ciudad empezamos otra vez
          // desde los primeros resultados.
          visibleLimit = PAGE_SIZE;

          saveSessionState();

          buildCityFilters();
          renderExplore();
          syncNowCity();
        }
      );

      wrap.appendChild(button);
    }
  );
}


// ============================================================
// FILTROS DE CATEGORÍA
// ============================================================

function buildCategoryFilters() {
  const wrap = $("#categoryFilters");

  if (!wrap) return;

  wrap.innerHTML = "";

  DATA.categories.forEach(
    ([id, label]) => {
      const button =
        document.createElement("button");

      button.type = "button";

      button.className =
        `chip${
          selectedCategory === id
            ? " active"
            : ""
        }`;

      button.dataset.category = id;
      button.textContent = label;

      button.addEventListener(
        "click",
        () => {
          selectedCategory = id;
          visibleLimit = PAGE_SIZE;

          saveSessionState();

          buildCategoryFilters();
          renderExplore();
        }
      );

      wrap.appendChild(button);
    }
  );
}


// ============================================================
// FILTRADO PRINCIPAL
// ============================================================
//
// IMPORTANTE:
// Ya NO existe selectedScope.
//
// Si seleccionamos Chiang Mai:
// → salen TODOS los sitios de Chiang Mai.
//
// Chiang Mai + Café:
// → salen TODOS los cafés de Chiang Mai.
//
// Después los ordenamos por prioridad.
//
function filteredPlaces() {
  const q = normalizeText(searchTerm);

  return DATA.places
    .filter(
      (place) =>
        selectedCity === "all" ||
        place.city === selectedCity
    )

    .filter(
      (place) =>
        selectedCategory === "all" ||
        place.category ===
          selectedCategory ||
        (place.tags || []).includes(
          selectedCategory
        )
    )

    .filter((place) => {
      if (!q) return true;

      const searchableText =
        normalizeText(
          [
            place.name,
            place.cityLabel,
            place.summary,
            place.why,
            (place.tags || []).join(" "),
            (place.badges || []).join(" "),
          ].join(" ")
        );

      return searchableText.includes(q);
    })

    .sort(
      (a, b) =>
        priorityScore(b) -
          priorityScore(a) ||
        a.name.localeCompare(
          b.name,
          "es"
        )
    );
}


// ============================================================
// CREAR UNA CARD
// ============================================================

function createCard(place) {
  const template =
    $("#placeCardTemplate");

  const node =
    template.content.firstElementChild.cloneNode(
      true
    );

  const media =
    node.querySelector(".card-media");

  const photo =
    node.querySelector(".card-photo");


  // ----------------------------------------------------------
  // FOTO
  // ----------------------------------------------------------

  if (place.image) {
    photo.src = place.image;
    photo.alt = place.name;
    photo.loading = "lazy";

    photo.addEventListener(
      "error",
      () => {
        media.classList.add(
          "no-image"
        );
      }
    );
  } else {
    media.classList.add("no-image");

    // Si no hay imagen, eliminamos el <img>
    // para evitar que quede un elemento roto.
    photo.remove();
  }


  // Ya NO utilizamos .fallback-icon.
  // Puedes eliminarlo tranquilamente del HTML.


  // ----------------------------------------------------------
  // INFORMACIÓN PRINCIPAL
  // ----------------------------------------------------------

  node.querySelector(
    ".priority"
  ).textContent =
    place.priority || "GUARDADO";

  node.querySelector(
    ".card-city"
  ).textContent =
    place.cityLabel;

  node.querySelector(
    ".card-icon"
  ).textContent =
    categoryIcon(place);

  node.querySelector(
    ".card-category"
  ).textContent =
    categoryName(place);

  node.querySelector(
    ".card-title"
  ).textContent =
    place.name;

  node.querySelector(
    ".card-summary"
  ).textContent =
    place.summary;


  // ----------------------------------------------------------
  // TAGS / METADATOS
  // ----------------------------------------------------------

  const tags =
    node.querySelector(".tags");

  metaChips(place)
    .slice(0, 4)
    .forEach((text) => {
      const span =
        document.createElement(
          "span"
        );

      span.className =
        tagClass(text);

      span.textContent = text;

      tags.appendChild(span);
    });


  // ----------------------------------------------------------
  // FAVORITO
  // ----------------------------------------------------------

  const save =
    node.querySelector(".save-btn");

  function syncSaveButton() {
    const isSaved =
      saved.has(place.id);

    save.classList.toggle(
      "saved",
      isSaved
    );

    save.textContent =
      isSaved
        ? "♥ Guardado"
        : "♡ Guardar";
  }

  syncSaveButton();

  save.addEventListener(
    "click",
    () => {
      toggleSaved(place);
      syncSaveButton();
    }
  );


  // ----------------------------------------------------------
  // MAPA
  // ----------------------------------------------------------

  const mapButton =
    node.querySelector(".map-btn");

  mapButton.href = place.maps;


  // ----------------------------------------------------------
  // MODAL
  // ----------------------------------------------------------

  node
    .querySelector(".detail-btn")
    .addEventListener(
      "click",
      () => openDialog(place)
    );

  node
    .querySelector(".card-open")
    .addEventListener(
      "click",
      () => openDialog(place)
    );

  return node;
}


// ============================================================
// RENDERIZAR LISTADO DE CARDS
// ============================================================

function renderCards(
  target,
  places
) {
  const wrap = $(target);

  if (!wrap) return;

  wrap.innerHTML = "";

  if (!places.length) {
    wrap.innerHTML = `
      <div class="empty">
        No hay resultados con esta combinación.
        Prueba otra ciudad, categoría o búsqueda.
      </div>
    `;

    return;
  }

  places.forEach((place) => {
    wrap.appendChild(
      createCard(place)
    );
  });
}


// ============================================================
// EXPLORAR
// ============================================================

function renderExplore() {
  const places =
    filteredPlaces();

  renderCards(
    "#placeGrid",
    places.slice(
      0,
      visibleLimit
    )
  );

  const city =
    cityLabels[selectedCity];

  const resultsMeta =
    $("#resultsMeta");

  const resultsHint =
    $("#resultsHint");


  // Ejemplo:
  // 53 lugares · Chiang Mai
  if (resultsMeta) {
    resultsMeta.textContent =
      `${places.length} lugares · ${city}`;
  }


  // Texto secundario dependiendo
  // de cómo estemos filtrando.
  if (resultsHint) {
    if (searchTerm) {
      resultsHint.textContent =
        `Buscando “${searchTerm}”`;
    } else if (
      selectedCategory !== "all"
    ) {
      resultsHint.textContent =
        "Todos los resultados de esta categoría, ordenados por prioridad.";
    } else {
      resultsHint.textContent =
        "Todo lo que tenemos guardado, ordenado por prioridad.";
    }
  }


  // Botón "Ver más"
  const loadMore =
    $("#loadMoreBtn");

  if (loadMore) {
    loadMore.hidden =
      places.length <=
      visibleLimit;
  }
}


// ============================================================
// MOODS / ¿QUÉ HACEMOS?
// ============================================================

function buildMoods() {
  const wrap =
    $("#moodGrid");

  if (!wrap) return;

  wrap.innerHTML = "";

  DATA.moods.forEach(
    (mood) => {
      const button =
        document.createElement(
          "button"
        );

      button.type = "button";

      button.className =
        `mood${
          selectedMood === mood.id
            ? " active"
            : ""
        }`;

      button.dataset.mood =
        mood.id;

      button.innerHTML =
        `<span>${mood.icon}</span>${mood.label}`;

      button.addEventListener(
        "click",
        () => {
          selectedMood =
            selectedMood === mood.id
              ? null
              : mood.id;

          saveSessionState();

          buildMoods();
          renderNow();
        }
      );

      wrap.appendChild(button);
    }
  );
}


// ============================================================
// SELECT DE CIUDAD EN "¿QUÉ HACEMOS?"
// ============================================================

function buildNowCity() {
  const select =
    $("#nowCitySelect");

  if (!select) return;

  select.innerHTML = "";

  Object.entries(cityLabels).forEach(
    ([id, label]) => {
      const option =
        document.createElement(
          "option"
        );

      option.value = id;
      option.textContent = label;

      select.appendChild(option);
    }
  );

  select.value =
    selectedCity;

  select.addEventListener(
    "change",
    () => {
      selectedCity =
        select.value;

      visibleLimit =
        PAGE_SIZE;

      saveSessionState();

      buildCityFilters();
      renderExplore();
      renderNow();
    }
  );
}


function syncNowCity() {
  const select =
    $("#nowCitySelect");

  if (select) {
    select.value =
      selectedCity;
  }

  renderNow();
}


// ============================================================
// RESULTADOS DE "¿QUÉ HACEMOS?"
// ============================================================

function renderNow() {
  let places =
    DATA.places.filter(
      (place) =>
        selectedCity === "all" ||
        place.city === selectedCity
    );


  // Si se ha seleccionado un mood,
  // filtramos según sus tags.
  if (selectedMood) {
    const mood =
      DATA.moods.find(
        (m) =>
          m.id === selectedMood
      );

    if (mood) {
      places =
        places.filter(
          (place) =>
            mood.tags.some(
              (tag) =>
                (
                  place.tags || []
                ).includes(tag) ||
                place.category === tag
            )
        );
    }
  } else {
    // Aquí SÍ tiene sentido hacer selección:
    // si no has indicado qué te apetece,
    // mostramos solo recomendaciones fuertes.
    places =
      places.filter(isTop);
  }


  places = places
    .sort(
      (a, b) =>
        priorityScore(b) -
        priorityScore(a)
    )
    .slice(0, 18);

  renderCards(
    "#nowResults",
    places
  );
}


// ============================================================
// GUARDADOS
// ============================================================

function renderSaved() {
  const places =
    DATA.places
      .filter((place) =>
        saved.has(place.id)
      )
      .sort(
        (a, b) =>
          priorityScore(b) -
          priorityScore(a)
      );

  renderCards(
    "#savedGrid",
    places
  );

  updateSavedCounters();
}


// ============================================================
// RUTA
// ============================================================

function renderTrip() {
  const wrap =
    $("#tripTimeline");

  if (wrap) {
    wrap.innerHTML = "";

    DATA.trip.forEach(
      (item) => {
        const article =
          document.createElement(
            "article"
          );

        article.className =
          "trip-item";

        article.innerHTML = `
          <div class="trip-date">
            ${item.date}
          </div>

          <div>
            <h3>${item.title}</h3>
            <p>${item.note}</p>
          </div>
        `;

        wrap.appendChild(
          article
        );
      }
    );
  }


  // ----------------------------------------------------------
  // CRÉDITOS DE IMÁGENES
  // ----------------------------------------------------------

  const credits =
    $("#creditsList");

  if (!credits) return;

  credits.innerHTML = "";

  DATA.places
    .filter(
      (place) =>
        place.credit
    )
    .forEach((place) => {
      const element =
        document.createElement(
          "div"
        );

      element.className =
        "credit-item";

      element.innerHTML = `
        <strong>${place.name}</strong>
        —
        ${place.credit.author},
        ${place.credit.license}.
        <a
          href="${place.credit.source}"
          target="_blank"
          rel="noopener"
        >
          Fuente ↗
        </a>
      `;

      credits.appendChild(
        element
      );
    });
}


// ============================================================
// NAVEGACIÓN ENTRE SECCIONES
// ============================================================

function setView(
  view,
  scroll = true
) {
  currentView = view;

  saveSessionState();


  // Mostramos la vista correcta.
  $$(".view").forEach(
    (element) => {
      element.classList.toggle(
        "active",
        element.id ===
          `${view}View`
      );
    }
  );


  // Marcamos navegación activa.
  $$("[data-view]").forEach(
    (button) => {
      button.classList.toggle(
        "active",
        button.dataset.view ===
          view
      );
    }
  );


  if (view === "saved") {
    renderSaved();
  }

  if (view === "now") {
    renderNow();
  }


  // Cuando restauramos la vista después
  // de un refresh NO queremos hacer scroll.
  if (scroll) {
    window.scrollTo({
      top:
        window.innerWidth < 820
          ? 430
          : 470,

      behavior: "smooth",
    });
  }
}


// ============================================================
// MODAL / DETALLE DEL LUGAR
// ============================================================

function openDialog(place) {
  activeDialogPlace =
    place;

  const media =
    $("#dialogMedia");

  media.innerHTML = "";

  media.classList.toggle(
    "fallback",
    !place.image
  );


  // ----------------------------------------------------------
  // FOTO DEL MODAL
  // ----------------------------------------------------------

  if (place.image) {
    const img =
      document.createElement(
        "img"
      );

    img.src = place.image;
    img.alt = place.name;

    img.addEventListener(
      "error",
      () => {
        media.innerHTML =
          categoryIcon(place);

        media.classList.add(
          "fallback"
        );
      }
    );

    media.appendChild(img);
  } else {
    media.textContent =
      categoryIcon(place);
  }


  // ----------------------------------------------------------
  // TEXTOS
  // ----------------------------------------------------------

  $("#dialogKicker").textContent =
    `${place.cityLabel} · ${categoryName(place)} · ${place.priority}`;

  $("#dialogTitle").textContent =
    place.name;

  $("#dialogSummary").textContent =
    place.summary;

  $("#dialogWhy").textContent =
    place.why;


  // ----------------------------------------------------------
  // METADATOS
  // ----------------------------------------------------------

  const tags =
    $("#dialogTags");

  tags.innerHTML = "";

  metaChips(place).forEach(
    (text) => {
      const span =
        document.createElement(
          "span"
        );

      span.className =
        tagClass(text);

      span.textContent =
        text;

      tags.appendChild(span);
    }
  );


  // ----------------------------------------------------------
  // MAPA
  // ----------------------------------------------------------

  $("#dialogMap").href =
    place.maps;


  // ----------------------------------------------------------
  // WEB / INFO
  // ----------------------------------------------------------

  const info =
    $("#dialogInfo");

  info.href =
    place.info ||
    place.maps;

  info.style.display =
    place.info
      ? "grid"
      : "none";


  // ----------------------------------------------------------
  // FAVORITO
  // ----------------------------------------------------------

  syncDialogSave(place);


  // ----------------------------------------------------------
  // ABRIR
  // ----------------------------------------------------------

  const dialog =
    $("#placeDialog");

  dialog.showModal();

  document.body.classList.add(
    "dialog-open"
  );
}


// ============================================================
// BOTÓN FAVORITO DEL MODAL
// ============================================================

function syncDialogSave(place) {
  const button =
    $("#dialogSave");

  const isSaved =
    saved.has(place.id);

  button.classList.toggle(
    "saved",
    isSaved
  );

  button.textContent =
    isSaved
      ? "♥ Guardado"
      : "♡ Guardar";
}


// ============================================================
// CERRAR MODAL
// ============================================================

function closeDialog() {
  const dialog =
    $("#placeDialog");

  if (dialog.open) {
    dialog.close();
  }

  document.body.classList.remove(
    "dialog-open"
  );

  activeDialogPlace = null;
}


// ============================================================
// SORPRÉNDEME
// ============================================================

function randomCurrentPlace() {
  const pool =
    filteredPlaces();

  if (!pool.length) return;

  const randomIndex =
    Math.floor(
      Math.random() *
        pool.length
    );

  openDialog(
    pool[randomIndex]
  );
}


// ============================================================
// LIMPIAR FILTROS
// ============================================================
//
// IMPORTANTE:
// NO reseteamos la ciudad.
//
// Si estás en Chiang Mai y pulsas limpiar,
// vuelves a:
//
// Chiang Mai → Todo
//
// y no a "Todos los destinos".
//
function clearFilters() {
  selectedCategory = "all";
  searchTerm = "";
  visibleLimit = PAGE_SIZE;

  const searchInput =
    $("#searchInput");

  if (searchInput) {
    searchInput.value = "";
  }

  saveSessionState();

  buildCategoryFilters();
  renderExplore();
}


// ============================================================
// ESTADO ONLINE / OFFLINE
// ============================================================

function updateOnlineState() {
  const badge =
    $("#offlineBadge");

  if (!badge) return;

  if (navigator.onLine) {
    badge.textContent =
      "● ONLINE · OFFLINE READY";

    badge.style.color =
      "var(--acid)";
  } else {
    badge.textContent =
      "● SIN INTERNET · TODO OK";

    badge.style.color =
      "#ffd5c2";
  }
}





// ============================================================
// EVENTOS GENERALES
// ============================================================

function initEvents() {
  // ----------------------------------------------------------
  // NAVEGACIÓN
  // ----------------------------------------------------------

  $$("[data-view]").forEach(
    (button) =>
      button.addEventListener(
        "click",
        () =>
          setView(
            button.dataset.view
          )
      )
  );


  // ----------------------------------------------------------
  // BUSCADOR
  // ----------------------------------------------------------

  const searchInput =
    $("#searchInput");

  if (searchInput) {
    // Restauramos búsqueda después de reload.
    searchInput.value =
      searchTerm;

    searchInput.addEventListener(
      "input",
      (event) => {
        searchTerm =
          event.target.value.trim();

        visibleLimit =
          PAGE_SIZE;

        saveSessionState();
        renderExplore();
      }
    );
  }


  // ----------------------------------------------------------
  // VER MÁS
  // ----------------------------------------------------------

  const loadMore =
    $("#loadMoreBtn");

  if (loadMore) {
    loadMore.addEventListener(
      "click",
      () => {
        visibleLimit +=
          PAGE_SIZE;

        saveSessionState();
        renderExplore();
      }
    );
  }


  // ----------------------------------------------------------
  // LIMPIAR FILTROS
  // ----------------------------------------------------------

  const clearButton =
    $("#clearFilters");

  if (clearButton) {
    clearButton.addEventListener(
      "click",
      clearFilters
    );
  }


  // ----------------------------------------------------------
  // SORPRÉNDEME
  // ----------------------------------------------------------

  const surpriseButton =
    $("#surpriseBtn");

  if (surpriseButton) {
    surpriseButton.addEventListener(
      "click",
      randomCurrentPlace
    );
  }


  // ----------------------------------------------------------
  // GUARDADOS DEL HEADER
  // ----------------------------------------------------------

  const savedTopButton =
    $("#savedTopButton");

  if (savedTopButton) {
    savedTopButton.addEventListener(
      "click",
      () =>
        setView("saved")
    );
  }


  // ----------------------------------------------------------
  // CERRAR MODAL
  // ----------------------------------------------------------

  const dialogClose =
    $("#dialogClose");

  if (dialogClose) {
    dialogClose.addEventListener(
      "click",
      closeDialog
    );
  }


  // Si pulsas sobre el fondo oscuro del dialog,
  // también se cierra.
  const dialog =
    $("#placeDialog");

  if (dialog) {
    dialog.addEventListener(
      "click",
      (event) => {
        if (
          event.target === dialog
        ) {
          closeDialog();
        }
      }
    );
  }


  // ----------------------------------------------------------
  // FAVORITO DESDE EL MODAL
  // ----------------------------------------------------------

  const dialogSave =
    $("#dialogSave");

  if (dialogSave) {
    dialogSave.addEventListener(
      "click",
      () => {
        if (
          activeDialogPlace
        ) {
          toggleSaved(
            activeDialogPlace
          );
        }
      }
    );
  }


  // ----------------------------------------------------------
  // ESTADO DE INTERNET
  // ----------------------------------------------------------

  addEventListener(
    "online",
    updateOnlineState
  );

  addEventListener(
    "offline",
    updateOnlineState
  );
}


// ============================================================
// SERVICE WORKER / PWA
// ============================================================

function registerSW() {
  if (
    "serviceWorker" in
    navigator
  ) {
    addEventListener(
      "load",
      () => {
        navigator.serviceWorker
          .register(
            "./sw.js",
            {
              updateViaCache:
                "none",
            }
          )
          .catch(
            console.warn
          );
      }
    );
  }
}


// ============================================================
// INICIALIZACIÓN
// ============================================================


buildCityFilters();
buildCategoryFilters();
buildMoods();
buildNowCity();

renderExplore();
renderNow();
renderSaved();
renderTrip();

initEvents();

updateOnlineState();
updateSavedCounters();

registerSW();


// Restauramos la sección en la que estabas
// antes de que Live Server recargase.
//
// false = no hacer scroll automático.
setView(
  currentView,
  false
);


console.info(
  `Thai Flow v${APP_VERSION} · ${DATA.places.length} lugares`
);