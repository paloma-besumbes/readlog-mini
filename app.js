// Clase 2: buscador + filtro por estado

// 1) Datos base (por ahora en memoria)
const books = [
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

// 2) Referencias al DOM
const grid = document.getElementById("grid-libros");
const searchInput = document.getElementById("buscador");
const statusSelect = document.getElementById("estado");

// 3) Estado de filtros
let filters = { q: "", status: "all" };

// Utilidad para búsquedas sin tildes
const normalize = (s) =>
    s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

// 4) Lógica de filtrado
function matches(book, { q, status }) {
    const qn = normalize(q);
    const inText =
        normalize(book.title).includes(qn) ||
        normalize(book.author).includes(qn);

    const statusOk = status === "all" ? true : book.status === status;
    return inText && statusOk;
}

// 5) Render de tarjetas
function render() {
    const visible = books.filter((b) => matches(b, filters));
    if (visible.length === 0) {
        grid.innerHTML = `
      <div class="card" role="status" aria-live="polite" style="grid-column: 1 / -1; text-align:center; padding:24px;">
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
          <p class="status" data-status="${b.status}">
            ${b.status === "reading" ? "Leyendo" : b.status === "finished" ? "Terminado" : "Por leer"}
          </p>
        </div>
      </article>`
        )
        .join("");
}

// 6) Eventos
searchInput.addEventListener("input", (e) => {
    filters.q = e.target.value;
    render();
});

statusSelect.addEventListener("change", (e) => {
    filters.status = e.target.value;
    render();
});

// 7) Primera pintura
render();
console.log("ReadLog Mini v1 (filtros) ✅");
