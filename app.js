// ReadLog Mini v5 — Ordenar + Edición inline (mantiene A11y, autocompletado y CRUD)

// ---------- Persistencia ----------
const STORAGE_KEY = "readlog.books.v1";
const SETTINGS_KEY = "readlog.settings.v1";

const load = (k, fallback = null) => {
    try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fallback; }
    catch { return fallback; }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

// ---------- Datos iniciales ----------
function seedBooks() {
    return [
        { id: 1, title: "1984", author: "George Orwell", status: "finished", cover: "https://covers.openlibrary.org/b/id/10521279-M.jpg" },
        { id: 2, title: "The Pragmatic Programmer", author: "Andrew Hunt, David Thomas", status: "reading", cover: "https://covers.openlibrary.org/b/id/12629965-M.jpg" },
        { id: 3, title: "El nombre de la rosa", author: "Umberto Eco", status: "toread", cover: "https://covers.openlibrary.org/b/id/8373226-M.jpg" },
    ];
}

let books = load(STORAGE_KEY) ?? seedBooks();
if (!load(STORAGE_KEY)) save(STORAGE_KEY, books);

// ---------- Estado de UI ----------
let filters = { q: "", status: "all" };
let settings = load(SETTINGS_KEY, { sort: "title-asc" });

const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
const statusOrder = { toread: 0, reading: 1, finished: 2 };

function statusLabel(s) { return s === "reading" ? "Leyendo" : s === "finished" ? "Terminado" : "Por leer"; }
function nextState(s) { return s === "toread" ? "reading" : s === "reading" ? "finished" : "toread"; }
function matches(book, { q, status }) {
    const qn = normalize(q);
    const inText = normalize(book.title).includes(qn) || normalize(book.author).includes(qn);
    const statusOk = status === "all" ? true : book.status === status;
    return inText && statusOk;
}
function nextId() { return books.length ? Math.max(...books.map(b => b.id)) + 1 : 1; }
function escapeHtml(str = "") { return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }

// ---------- DOM ----------
const grid = document.getElementById("grid-libros");
const searchInput = document.getElementById("buscador");
const statusSelect = document.getElementById("estado");
const orderSelect = document.getElementById("orden");

// Form añadir
const formAdd = document.getElementById("form-add");
const addTitle = document.getElementById("addTitle");
const addAuthor = document.getElementById("addAuthor");
const addStatus = document.getElementById("addStatus");
const addCover = document.getElementById("addCover");

// Autocompletado
const suggestionsEl = document.getElementById("suggestions");

// Toolbar (opcional)
const btnClear = document.getElementById("btn-clear");
const btnSeed = document.getElementById("btn-seed");

// Live region
const live = document.getElementById("live");
const announce = (msg) => { if (live) live.textContent = msg; };

// ---------- Ordenación ----------
function sortBooks(arr) {
    const [field, dir] = settings.sort.split("-");
    const sign = dir === "desc" ? -1 : 1;
    const byText = (a, b, key) => normalize(a[key]).localeCompare(normalize(b[key])) * sign;
    const byStatus = (a, b) => (statusOrder[a.status] - statusOrder[b.status]) * sign;

    if (field === "title") return [...arr].sort((a, b) => byText(a, b, "title"));
    if (field === "author") return [...arr].sort((a, b) => byText(a, b, "author"));
    if (field === "status") return [...arr].sort(byStatus);
    return arr;
}

// ---------- Render ----------
function render() {
    const visible = books.filter(b => matches(b, filters));
    const list = sortBooks(visible);

    if (!list.length) {
        grid.innerHTML = `
      <div class="card" role="status" aria-live="polite" style="grid-column:1/-1; text-align:center; padding:24px;">
        <p>No hay libros que coincidan con tu búsqueda.</p>
      </div>`;
        return;
    }

    grid.innerHTML = list.map(b => cardHtml(b)).join("");
    // deja seleccionado el orden actual por si la página recarga
    if (orderSelect) orderSelect.value = settings.sort;
}

function cardHtml(b) {
    const coverUrl = b.cover?.trim() || "https://placehold.co/400x600?text=Sin+portada";
    const next = nextState(b.status);
    return `
    <article class="card" data-id="${b.id}">
      <figure class="gr-cover">
        <img
          class="gr-cover__img"
          src="${escapeHtml(coverUrl)}"
          alt="Portada de ${escapeHtml(b.title)}"
          width="400" height="600"
          loading="lazy" decoding="async"
          onerror="this.src='https://placehold.co/400x600?text=Sin+portada'; this.onerror=null;">
      </figure>

      <div class="card-body">
        <h3>${escapeHtml(b.title)}</h3>
        <p class="author">${escapeHtml(b.author)}</p>

        <button
          type="button"
          class="status"
          data-id="${b.id}"
          data-status="${b.status}"
          aria-label="Estado: ${statusLabel(b.status)}. Pulsa para cambiar a ${statusLabel(next)}.">
          ${statusLabel(b.status)}
        </button>
      </div>

      <div class="actions">
        <button class="btn-edit" data-id="${b.id}">Editar</button>
        <button class="btn-delete" data-id="${b.id}" aria-label="Eliminar ${escapeHtml(b.title)}">Eliminar</button>
      </div>
    </article>`;
}

// ---------- Interacción: filtros y orden ----------
if (searchInput) searchInput.addEventListener("input", e => { filters.q = e.target.value; render(); });
if (statusSelect) statusSelect.addEventListener("change", e => { filters.status = e.target.value; render(); });
if (orderSelect) orderSelect.addEventListener("change", e => {
    settings.sort = e.target.value;
    save(SETTINGS_KEY, settings);
    render();
});

// ---------- Añadir libro ----------
if (formAdd) {
    formAdd.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = addTitle.value.trim();
        const author = addAuthor.value.trim();
        const status = addStatus.value;
        const cover = addCover.value.trim() || "https://placehold.co/400x600?text=Sin+portada";
        if (!title || !author) return;

        const newBook = { id: nextId(), title, author, status, cover };
        books.push(newBook); save(STORAGE_KEY, books);
        formAdd.reset();
        if (suggestionsEl) { suggestionsEl.hidden = true; suggestionsEl.innerHTML = ""; addTitle.setAttribute("aria-expanded", "false"); }
        render();
        announce(`Libro añadido: ${title}.`);
    });
}

// ---------- Delegación: eliminar, cambiar estado, editar ----------
grid.addEventListener("click", (e) => {
    const id = Number(e.target.dataset.id);

    if (e.target.closest(".btn-delete")) {
        const book = books.find(b => b.id === id);
        books = books.filter(b => b.id !== id);
        save(STORAGE_KEY, books); render();
        if (book) announce(`Eliminado: ${book.title}.`);
        return;
    }

    if (e.target.closest(".status")) {
        const book = books.find(b => b.id === id);
        if (!book) return;
        book.status = nextState(book.status);
        save(STORAGE_KEY, books); render();
        announce(`Estado actualizado: ${book.title}, ${statusLabel(book.status)}.`);
        return;
    }

    if (e.target.closest(".btn-edit")) {
        const card = e.target.closest(".card");
        openEditForm(card, id);
    }
});

// ---------- Edición inline ----------
function openEditForm(card, id) {
    const b = books.find(x => x.id === id);
    if (!b) return;

    const form = document.createElement("div");
    form.className = "edit-form";
    form.innerHTML = `
    <label>
      <span>Título</span>
      <input type="text" id="edit-title-${id}" value="${escapeHtml(b.title)}" />
    </label>
    <label>
      <span>Autor</span>
      <input type="text" id="edit-author-${id}" value="${escapeHtml(b.author)}" />
    </label>
    <label>
      <span>Estado</span>
      <select id="edit-status-${id}">
        <option value="toread"   ${b.status === "toread" ? "selected" : ""}>Por leer</option>
        <option value="reading"  ${b.status === "reading" ? "selected" : ""}>Leyendo</option>
        <option value="finished" ${b.status === "finished" ? "selected" : ""}>Terminado</option>
      </select>
    </label>
    <label>
      <span>Portada (URL)</span>
      <input type="url" id="edit-cover-${id}" value="${escapeHtml(b.cover)}" />
    </label>
    <div class="edit-actions">
      <button class="btn secondary" data-action="cancel">Cancelar</button>
      <button class="btn" data-action="save">Guardar</button>
    </div>
  `;

    const body = card.querySelector(".card-body");
    // Evitamos múltiples formularios: si ya hay, no añadimos otro
    if (card.querySelector(".edit-form")) return;

    body.appendChild(form);
    const first = form.querySelector(`#edit-title-${id}`);
    first?.focus();

    form.addEventListener("click", (e) => {
        const action = e.target.dataset.action;
        if (!action) return;

        if (action === "cancel") {
            form.remove();
        }
        if (action === "save") {
            const title = form.querySelector(`#edit-title-${id}`).value.trim();
            const author = form.querySelector(`#edit-author-${id}`).value.trim();
            const status = form.querySelector(`#edit-status-${id}`).value;
            const cover = form.querySelector(`#edit-cover-${id}`).value.trim() || "https://placehold.co/400x600?text=Sin+portada";
            if (!title || !author) { announce("Título y autor son obligatorios."); return; }

            // Actualiza libro
            b.title = title; b.author = author; b.status = status; b.cover = cover;
            save(STORAGE_KEY, books);
            render();
            announce(`Guardado: ${b.title}.`);
        }
    });
}

// ---------- Autocompletado (igual que antes, con debounce + abort) ----------
let abortCtrl = null;
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
async function fetchSuggestions(q) {
    if (abortCtrl) abortCtrl.abort();
    abortCtrl = new AbortController();
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=5`;
    const res = await fetch(url, { signal: abortCtrl.signal });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    const docs = Array.isArray(data.docs) ? data.docs.slice(0, 5) : [];
    return docs.map((d) => ({
        title: d.title || "",
        author: Array.isArray(d.author_name) ? d.author_name[0] : (d.author_name || ""),
        cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : "",
    }));
}

let activeIndex = -1;
function renderSuggestions(items) {
    if (!suggestionsEl) return;
    if (!items.length) {
        suggestionsEl.innerHTML = `<div class="empty">Sin resultados</div>`;
        suggestionsEl.hidden = false;
        addTitle.setAttribute("aria-expanded", "true");
        addTitle.setAttribute("aria-activedescendant", "");
        activeIndex = -1;
        return;
    }
    suggestionsEl.innerHTML = items.map((it, i) => `
    <button type="button" class="item" role="option"
            id="sugg-${i}" aria-selected="${i === activeIndex}"
            data-index="${i}"
            data-title="${escapeHtml(it.title)}"
            data-author="${escapeHtml(it.author)}"
            data-cover="${escapeHtml(it.cover)}">
      <strong>${escapeHtml(it.title)}</strong>
      ${it.author ? `<span class="muted"> — ${escapeHtml(it.author)}</span>` : ""}
    </button>`).join("");
    suggestionsEl.hidden = false;
    addTitle.setAttribute("aria-expanded", "true");
    addTitle.setAttribute("aria-activedescendant", activeIndex >= 0 ? `sugg-${activeIndex}` : "");
}

const updateSuggestions = debounce(async (q) => {
    if (!suggestionsEl) return;
    if (q.length < 3) {
        suggestionsEl.hidden = true; suggestionsEl.innerHTML = "";
        addTitle.setAttribute("aria-expanded", "false");
        addTitle.setAttribute("aria-activedescendant", "");
        activeIndex = -1;
        return;
    }
    try {
        const items = await fetchSuggestions(q);
        activeIndex = -1;
        renderSuggestions(items);
    } catch (e) {
        if (e.name !== "AbortError" && suggestionsEl) {
            suggestionsEl.hidden = true; suggestionsEl.innerHTML = "";
            addTitle.setAttribute("aria-expanded", "false");
            addTitle.setAttribute("aria-activedescendant", "");
            activeIndex = -1;
        }
    }
}, 300);

if (addTitle) {
    addTitle.addEventListener("input", (e) => updateSuggestions(e.target.value));

    addTitle.addEventListener("keydown", (e) => {
        if (suggestionsEl?.hidden) return;
        const items = Array.from(suggestionsEl.querySelectorAll(".item"));
        if (!items.length) return;

        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            activeIndex = e.key === "ArrowDown" ? Math.min(items.length - 1, activeIndex + 1) : Math.max(0, activeIndex - 1);
            items.forEach((el, i) => el.setAttribute("aria-selected", String(i === activeIndex)));
            addTitle.setAttribute("aria-activedescendant", `sugg-${activeIndex}`);
        }
        if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();
            pickSuggestion(items[activeIndex]);
        }
        if (e.key === "Escape") {
            suggestionsEl.hidden = true; suggestionsEl.innerHTML = "";
            addTitle.setAttribute("aria-expanded", "false");
            addTitle.setAttribute("aria-activedescendant", "");
            activeIndex = -1;
        }
    });

    addTitle.addEventListener("blur", () => {
        setTimeout(() => {
            if (!suggestionsEl) return;
            suggestionsEl.hidden = true; suggestionsEl.innerHTML = "";
            addTitle.setAttribute("aria-expanded", "false");
            addTitle.setAttribute("aria-activedescendant", "");
            activeIndex = -1;
        }, 150);
    });
}

if (suggestionsEl) {
    suggestionsEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".item");
        if (!btn) return;
        pickSuggestion(btn);
    });
}

function pickSuggestion(btn) {
    addTitle.value = btn.dataset.title || "";
    addAuthor.value = btn.dataset.author || "";
    if (btn.dataset.cover) addCover.value = btn.dataset.cover;
    if (suggestionsEl) { suggestionsEl.hidden = true; suggestionsEl.innerHTML = ""; }
    addTitle.setAttribute("aria-expanded", "false");
    addTitle.setAttribute("aria-activedescendant", "");
    activeIndex = -1;
    addAuthor.focus();
}

// ---------- Toolbar ----------
if (btnClear) {
    btnClear.addEventListener("click", () => {
        if (!confirm("¿Seguro que quieres vaciar toda la biblioteca?")) return;
        books = []; save(STORAGE_KEY, books); render(); announce("Biblioteca vaciada.");
    });
}
if (btnSeed) {
    btnSeed.addEventListener("click", () => {
        if (!confirm("Esto reemplazará tu biblioteca por los ejemplos. ¿Continuar?")) return;
        books = seedBooks(); save(STORAGE_KEY, books); render(); announce("Ejemplos restaurados.");
    });
}

// ---------- Primera pintura ----------
if (orderSelect) orderSelect.value = settings.sort;
render();
console.log("ReadLog Mini v5 ✅ (orden + edición inline)");
