// Clase 3: persistencia con localStorage + añadir/eliminar

// --- Configuración de almacenamiento ---
const STORAGE_KEY = "readlog.books.v1";

function loadBooks() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : null;
    } catch {
        return null;
    }
}
function saveBooks(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// --- Datos iniciales (semilla si no hay nada guardado) ---
function seedBooks() {
    return [
        {
            id: 1,
            title: "1984",
            author: "George Orwell",
            status: "finished",
            cover: "https://covers.openlibrary.org/b/id/10521279-M.jpg",
        },
        {
            id: 2,
            title: "The Pragmatic Programmer",
            author: "Andrew Hunt, David Thomas",
            status: "reading",
            cover: "https://covers.openlibrary.org/b/id/12629965-M.jpg",
        },
        {
            id: 3,
            title: "El nombre de la rosa",
            author: "Umberto Eco",
            status: "toread",
            cover: "https://covers.openlibrary.org/b/id/8373226-M.jpg",
        },
    ];
}

// --- Estado en memoria ---
let books = loadBooks() ?? seedBooks();
if (!loadBooks()) saveBooks(books); // guarda la semilla la primera vez

// --- Referencias al DOM ---
const grid = document.getElementById("grid-libros");
const searchInput = document.getElementById("buscador");
const statusSelect = document.getElementById("estado");

// Form añadir
const formAdd = document.getElementById("form-add");
const addTitle = document.getElementById("addTitle");
const addAuthor = document.getElementById("addAuthor");
const addStatus = document.getElementById("addStatus");
const addCover = document.getElementById("addCover");

// --- Referencias a los botones de la barra ---
const btnClear = document.getElementById("btn-clear");
const btnSeed = document.getElementById("btn-seed");

// --- Filtros ---
let filters = { q: "", status: "all" };

// Utilidad para búsquedas sin tildes
const normalize = (s) =>
    s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

// Texto legible de estado
function statusLabel(s) {
    if (s === "reading") return "Leyendo";
    if (s === "finished") return "Terminado";
    return "Por leer";
}

// Coincidencia por filtros
function matches(book, { q, status }) {
    const qn = normalize(q);
    const inText =
        normalize(book.title).includes(qn) ||
        normalize(book.author).includes(qn);
    const statusOk = status === "all" ? true : book.status === status;
    return inText && statusOk;
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

    grid.innerHTML = visible
        .map(
            (b) => `
      <article class="card">
        <img src="${b.cover}" alt="Portada de ${b.title}" />
        <div class="card-body">
          <h3>${b.title}</h3>
          <p class="author">${b.author}</p>
          <p class="status" data-status="${b.status}">${statusLabel(b.status)}</p>
        </div>
        <div class="actions">
          <button class="btn-delete" data-id="${b.id}" aria-label="Eliminar ${b.title}">
            Eliminar
          </button>
        </div>
      </article>`
        )
        .join("");
}

// --- Helpers ---
function nextId() {
    return books.length ? Math.max(...books.map((b) => b.id)) + 1 : 1;
}

// --- Eventos de filtros ---
searchInput.addEventListener("input", (e) => {
    filters.q = e.target.value;
    render();
});
statusSelect.addEventListener("change", (e) => {
    filters.status = e.target.value;
    render();
});

// --- Evento añadir libro ---
formAdd.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = addTitle.value.trim();
    const author = addAuthor.value.trim();
    const status = addStatus.value;
    const cover =
        addCover.value.trim() ||
        "https://placehold.co/400x600?text=Sin+portada";

    if (!title || !author) return; // ya están required, pero por si acaso

    const newBook = { id: nextId(), title, author, status, cover };
    books.push(newBook);
    saveBooks(books);
    formAdd.reset();
    render();
});

// --- Delegación de eventos para eliminar ---
grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-delete");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    books = books.filter((b) => b.id !== id);
    saveBooks(books);
    render();
});


// Vaciar biblioteca
btnClear.addEventListener("click", () => {
    if (!confirm("¿Seguro que quieres vaciar toda la biblioteca?")) return;
    books = [];
    saveBooks(books);
    render();
});

// Restaurar ejemplos
btnSeed.addEventListener("click", () => {
    if (!confirm("Esto reemplazará tu biblioteca por los ejemplos. ¿Continuar?")) return;
    books = seedBooks();
    saveBooks(books);
    render();
});

// --- Primera pintura ---
render();
console.log("ReadLog Mini v2 (localStorage + CRUD básico) ✅");

// --- Tip: para borrar todos los datos y volver a la semilla ---
// localStorage.removeItem(STORAGE_KEY);
