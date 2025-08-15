// ReadLog Mini v3 — Estilo Goodreads: <img> 2:3 sin recortes + CRUD + filtros + autocompletado

// --- Storage ---
const STORAGE_KEY = "readlog.books.v1";
const loadBooks = () => {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
};
const saveBooks = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

// --- Semilla de datos ---
function seedBooks() {
    return [
        { id: 1, title: "High fidelity ", author: "Nick Hornby", status: "finished", cover: "https://wemadethis.co.uk/wp-content/uploads/2011/08/high_fidelity.jpg" },
        { id: 2, title: "One hundred years of solitude", author: "Gabriel García Márquez", status: "reading", cover: "https://m.media-amazon.com/images/I/51rg0tvuFvL._SY445_SX342_ControlCacheEqualizer_.jpg" },
        { id: 3, title: "The secret history", author: "Donna Tartt", status: "toread", cover: "https://m.media-amazon.com/images/I/416lUyEwujL._SY445_SX342_ControlCacheEqualizer_.jpg" },
    ];
}

// --- Estado ---
let books = loadBooks() ?? seedBooks();
if (!loadBooks()) saveBooks(books);

let filters = { q: "", status: "all" };
const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

// --- DOM ---
const grid = document.getElementById("grid-libros");
const searchInput = document.getElementById("buscador");
const statusSelect = document.getElementById("estado");
// Formulario añadir
const formAdd = document.getElementById("form-add");
const addTitle = document.getElementById("addTitle");
const addAuthor = document.getElementById("addAuthor");
const addStatus = document.getElementById("addStatus");
const addCover = document.getElementById("addCover");
// Sugerencias
const suggestionsEl = document.getElementById("suggestions");
// Toolbar (si existe en tu HTML)
const btnClear = document.getElementById("btn-clear");
const btnSeed = document.getElementById("btn-seed");

// --- Utils ---
function statusLabel(s) {
    if (s === "reading") return "Leyendo";
    if (s === "finished") return "Terminado";
    return "Por leer";
}
function matches(book, { q, status }) {
    const qn = normalize(q);
    const inText = normalize(book.title).includes(qn) || normalize(book.author).includes(qn);
    const statusOk = status === "all" ? true : book.status === status;
    return inText && statusOk;
}
function nextId() { return books.length ? Math.max(...books.map((b) => b.id)) + 1 : 1; }
function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

// --- Render (portadas estilo Goodreads) ---
function render() {
    const visible = books.filter((b) => matches(b, filters));

    if (!visible.length) {
        grid.innerHTML = `
      <div class="card" role="status" aria-live="polite" style="grid-column:1/-1; text-align:center; padding:24px;">
        <p>No hay libros que coincidan con tu búsqueda.</p>
      </div>`;
        return;
    }

    grid.innerHTML = visible.map((b) => {
        const coverUrl = b.cover?.trim() || "https://placehold.co/400x600?text=Sin+portada";
        return `
      <article class="card">
        <figure class="gr-cover">
          <img
            class="gr-cover__img"
            src="${escapeHtml(coverUrl)}"
            alt="Portada de ${escapeHtml(b.title)}"
            width="400" height="600"                /* fija 2:3 para evitar saltos */
            loading="lazy" decoding="async"
            onerror="this.src='https://placehold.co/400x600?text=Sin+portada'; this.onerror=null;">
        </figure>

        <div class="card-body">
          <h3>${escapeHtml(b.title)}</h3>
          <p class="author">${escapeHtml(b.author)}</p>
          <p class="status" data-id="${b.id}" data-status="${b.status}" title="Haz clic para cambiar el estado">
            ${statusLabel(b.status)}
          </p>
        </div>

        <div class="actions">
          <button class="btn-delete" data-id="${b.id}" aria-label="Eliminar ${escapeHtml(b.title)}">Eliminar</button>
        </div>
      </article>`;
    }).join("");
}

// --- Eventos: filtros ---
if (searchInput) {
    searchInput.addEventListener("input", (e) => { filters.q = e.target.value; render(); });
}
if (statusSelect) {
    statusSelect.addEventListener("change", (e) => { filters.status = e.target.value; render(); });
}

// --- Evento: añadir libro ---
if (formAdd) {
    formAdd.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = addTitle.value.trim();
        const author = addAuthor.value.trim();
        const status = addStatus.value;
        const cover = addCover.value.trim() || "https://placehold.co/400x600?text=Sin+portada";
        if (!title || !author) return;

        const newBook = { id: nextId(), title, author, status, cover };
        books.push(newBook);
        saveBooks(books);
        formAdd.reset();
        if (suggestionsEl) { suggestionsEl.hidden = true; suggestionsEl.innerHTML = ""; }
        render();
    });
}

// --- Delegación: eliminar y cambiar estado ---
const cycle = { toread: "reading", reading: "finished", finished: "toread" };
grid.addEventListener("click", (e) => {
    const delBtn = e.target.closest(".btn-delete");
    if (delBtn) {
        const id = Number(delBtn.dataset.id);
        books = books.filter((b) => b.id !== id);
        saveBooks(books); render(); return;
    }
    const statusEl = e.target.closest(".status");
    if (statusEl) {
        const id = Number(statusEl.dataset.id);
        const book = books.find((b) => b.id === id);
        if (book) {
            book.status = cycle[book.status] || "toread";
            saveBooks(books); render();
        }
    }
});

// --- Autocompletado (Open Library) ---
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

const updateSuggestions = debounce(async (q) => {
    if (!suggestionsEl) return;
    if (q.length < 3) { suggestionsEl.hidden = true; suggestionsEl.innerHTML = ""; return; }
    try {
        const items = await fetchSuggestions(q);
        if (!items.length) {
            suggestionsEl.innerHTML = `<div class="empty">Sin resultados</div>`;
            suggestionsEl.hidden = false; return;
        }
        suggestionsEl.innerHTML = items.map((it) => `
      <button type="button" class="item" role="option"
              data-title="${escapeHtml(it.title)}"
              data-author="${escapeHtml(it.author)}"
              data-cover="${escapeHtml(it.cover)}">
        <strong>${escapeHtml(it.title)}</strong>
        ${it.author ? `<span class="muted"> — ${escapeHtml(it.author)}</span>` : ""}
      </button>`).join("");
        suggestionsEl.hidden = false;
    } catch (e) {
        if (e.name !== "AbortError" && suggestionsEl) {
            suggestionsEl.hidden = true; suggestionsEl.innerHTML = "";
        }
    }
}, 300);

if (addTitle) {
    addTitle.addEventListener("input", (e) => {
        updateSuggestions(e.target.value);
        addTitle.setAttribute("aria-expanded", "true");
    });
    addTitle.addEventListener("blur", () => {
        setTimeout(() => { if (suggestionsEl) { suggestionsEl.hidden = true; addTitle.setAttribute("aria-expanded", "false"); } }, 150);
    });
    addTitle.addEventListener("focus", () => {
        if (suggestionsEl && suggestionsEl.innerHTML.trim()) suggestionsEl.hidden = false;
    });
}

if (suggestionsEl) {
    suggestionsEl.addEventListener("click", (e) => {
        const btn = e.target.closest(".item");
        if (!btn) return;
        addTitle.value = btn.dataset.title || "";
        addAuthor.value = btn.dataset.author || "";
        if (btn.dataset.cover) addCover.value = btn.dataset.cover;
        suggestionsEl.hidden = true; suggestionsEl.innerHTML = "";
        addTitle.setAttribute("aria-expanded", "false");
    });
}

// --- Toolbar: vaciar/restaurar (si existen) ---
if (btnClear) {
    btnClear.addEventListener("click", () => {
        if (!confirm("¿Seguro que quieres vaciar toda la biblioteca?")) return;
        books = [];
        saveBooks(books); render();
    });
}
if (btnSeed) {
    btnSeed.addEventListener("click", () => {
        if (!confirm("Esto reemplazará tu biblioteca por los ejemplos. ¿Continuar?")) return;
        books = seedBooks();
        saveBooks(books); render();
    });
}

// --- Primera pintura ---
render();
console.log("ReadLog Mini v3 ✅ (estilo Goodreads: <img> 2:3, sin recortes)");
