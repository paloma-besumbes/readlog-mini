// ReadLog Mini v3: localStorage + CRUD + Autocompletado + Cambio de estado

// --- Storage ---
const STORAGE_KEY = "readlog.books.v1";
const loadBooks = () => {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
};
const saveBooks = (list) => localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

// --- Datos iniciales ---
function seedBooks() {
    return [
        { id: 1, title: "1984", author: "George Orwell", status: "finished", cover: "https://covers.openlibrary.org/b/id/10521279-M.jpg" },
        { id: 2, title: "The Pragmatic Programmer", author: "Andrew Hunt, David Thomas", status: "reading", cover: "https://covers.openlibrary.org/b/id/12629965-M.jpg" },
        { id: 3, title: "El nombre de la rosa", author: "Umberto Eco", status: "toread", cover: "https://covers.openlibrary.org/b/id/8373226-M.jpg" },
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

// Form
const formAdd = document.getElementById("form-add");
const addTitle = document.getElementById("addTitle");
const addAuthor = document.getElementById("addAuthor");
const addStatus = document.getElementById("addStatus");
const addCover = document.getElementById("addCover");

// Autocompletado
const suggestionsEl = document.getElementById("suggestions");

// --- Utilidades ---
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

// --- Render ---
function render() {
    const visible = books.filter((b) => matches(b, filters));

    if (visible.length === 0) {
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
        <figure class="cover">
          <img src="${escapeHtml(coverUrl)}" alt="Portada de ${escapeHtml(b.title)}"
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

// --- Filtros ---
searchInput.addEventListener("input", (e) => { filters.q = e.target.value; render(); });
statusSelect.addEventListener("change", (e) => { filters.status = e.target.value; render(); });

// --- Añadir libro ---
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
    suggestionsEl.hidden = true; suggestionsEl.innerHTML = "";
    render();
});

// --- Eliminar y cambiar estado (delegación) ---
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

// --- Autocompletado con Open Library ---
let abortCtrl = null;
function debounce(fn, ms) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
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
    if (q.length < 3) { suggestionsEl.hidden = true; suggestionsEl.innerHTML = ""; return; }
    try {
        const items = await fetchSuggestions(q);
        if (!items.length) {
            suggestionsEl.innerHTML = `<div class="empty">Sin resultados</div>`;
            suggestionsEl.hidden = false; return;
        }
        suggestionsEl.innerHTML = items.map((it, i) => `
      <button type="button" class="item" role="option"
              data-title="${escapeHtml(it.title)}"
              data-author="${escapeHtml(it.author)}"
              data-cover="${escapeHtml(it.cover)}">
        <strong>${escapeHtml(it.title)}</strong>
        ${it.author ? `<span class="muted"> — ${escapeHtml(it.author)}</span>` : ""}
      </button>`).join("");
        suggestionsEl.hidden = false;
    } catch (e) {
        if (e.name !== "AbortError") {
            suggestionsEl.hidden = true; suggestionsEl.innerHTML = "";
        }
    }
}, 300);

addTitle.addEventListener("input", (e) => {
    updateSuggestions(e.target.value);
    addTitle.setAttribute("aria-expanded", "true");
});
addTitle.addEventListener("blur", () => {
    // esperar un poco para permitir clic en la sugerencia
    setTimeout(() => {
        suggestionsEl.hidden = true; addTitle.setAttribute("aria-expanded", "false");
    }, 150);
});
addTitle.addEventListener("focus", () => {
    if (suggestionsEl.innerHTML.trim()) suggestionsEl.hidden = false;
});

suggestionsEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".item");
    if (!btn) return;
    addTitle.value = btn.dataset.title || "";
    addAuthor.value = btn.dataset.author || "";
    if (btn.dataset.cover) addCover.value = btn.dataset.cover;
    suggestionsEl.hidden = true; suggestionsEl.innerHTML = "";
    addTitle.setAttribute("aria-expanded", "false");
});

// --- Primera pintura ---
render();
console.log("ReadLog Mini v3 ✅ (autocompletado + cambio de estado + portadas completas)");
