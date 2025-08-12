# ReadLog Mini

Pequeño catálogo personal de libros para practicar **HTML/CSS/JS** desde cero e ir construyendo portfolio.

- **Estado actual (v1):** maquetación responsive + buscador en vivo + filtro por estado.
- **Demo:** https://readlog-mini.vercel.app/

---

## 🎯 Objetivo del proyecto

Aprender paso a paso:
1) Maquetación semántica y responsive.  
2) DOM y eventos (render dinámico, búsqueda y filtros).  
3) Persistencia en `localStorage`.  
4) Consumo de API pública (autocompletar portadas/títulos).  

> El proyecto crecerá en iteraciones cortas para mostrar progreso real en el portfolio.

---

## ✨ Funcionalidades (v1)

- Rejilla de tarjetas de libros **responsive**.
- **Buscador** por título/autor (tolerante a tildes).
- **Filtro** por estado: *leyendo / terminado / por leer*.
- Render dinámico desde un array en `app.js`.

Próximas versiones:
- Guardado y carga desde `localStorage`.
- Autocompletar desde API (Open Library) con `fetch`.
- Pequeñas mejoras de accesibilidad y Lighthouse.

---

## 🧱 Estructura

readlog-mini/
├─ index.html # marcado semántico y estructura
├─ styles.css # estilos (flex/grid, theme oscuro)
└─ app.js # lógica: datos, filtros y render



---

## ▶️ Cómo ejecutar en local

**Opción rápida:** abre `index.html` con tu navegador.

**Recomendado (VS Code):**
1. Instala la extensión **Live Server**.
2. Abre la carpeta del proyecto en VS Code.
3. Click en “Go Live” (parte inferior derecha).

---

## 🚀 Despliegue

Usa **Vercel** conectando el repo de GitHub. Al hacer `git push`, se redepliega automáticamente:
```bash
git add .
git commit -m "feat: buscador y filtro por estado"
git push
