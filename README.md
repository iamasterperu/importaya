# ImportaYa

Portal gratis para importadores de Perú. **Todo se actualiza solo:**

| Qué | Cada cuánto | De dónde sale |
|---|---|---|
| 📰 Noticias de Perú, China, EE. UU. y el mundo | Cada 30 minutos | Fuentes RSS (Google Noticias, Bing, Gestión, El Comercio, China Daily, PortalPortuario, gCaptain, Splash247…) |
| ✨ Resúmenes y traducciones de las noticias | Cada hora | IA gratis de Cloudflare (Workers AI). Gemini como respaldo opcional |
| 📺 Videos de noticias | Cada hora | Canales de YouTube (RPP, Latina, TV Perú, Gestión TV, DW, BBC Mundo, CNN en Español). El video grande de la portada cambia solo cuando el canal principal sube uno nuevo |
| 💵 Tipo de cambio | Cada hora | SUNAT (con respaldos) |
| 🔥 Lo más buscado | En vivo y cierre cada día 1 del mes | Lo que la gente escribe en la calculadora y en el buscador |
| 🧹 Limpieza | Cada día (3 a. m.) | Borra noticias de más de 6 meses y videos antiguos |

Además incluye: **calculadora de impuestos de importación** (ad valorem, IGV, IPM y percepción), **6 espacios de publicidad** con estadísticas de vistas y clics, una página **“Anúnciate”** con formulario para empresas y un **panel de administración** en `/admin`.

Funciona con el **plan gratis de Cloudflare**: no necesitas tarjeta ni pagar por la IA.

---

## Publicar la web paso a paso

Necesitas una cuenta de **GitHub** y una de **Cloudflare**. Las dos son gratis.

### 1. Subir el proyecto a tu GitHub

1. Entra a [github.com](https://github.com) con tu cuenta personal y pulsa **New repository** (botón verde o el **+** de arriba).
2. Nombre: `importaya`. Elige **Private** si no quieres que otros vean el código. **No marques** “Add a README”. Pulsa **Create repository**.
3. En la página que aparece, pulsa el enlace **uploading an existing file**.
4. Descomprime `importaya.zip` en tu computadora. Abre la carpeta `importaya` y **arrastra todo su contenido** (las carpetas `src`, `public`, `test` y los archivos `wrangler.toml`, `package.json`, etc.) a la página de GitHub.
   - Arrastra lo que está *dentro* de la carpeta, no la carpeta misma.
   - Si tu computadora oculta archivos que empiezan con punto (`.gitignore`), no pasa nada: no son necesarios para que funcione.
5. Pulsa **Commit changes**.

> Alternativa: con [GitHub Desktop](https://desktop.github.com) eliges la carpeta y pulsas **Publish repository**.

### 2. Crear la base de datos en Cloudflare

1. Entra a [dash.cloudflare.com](https://dash.cloudflare.com) (crea tu cuenta si no tienes).
2. Menú izquierdo: **Storage & Databases → D1 SQL Database → Create Database**.
3. Nombre: **`importaya-db`** → **Create**.
4. Copia el **Database ID** (un código parecido a `a1b2c3d4-5678-...`).

### 3. Pegar el ID en `wrangler.toml`

1. En GitHub, abre el archivo `wrangler.toml` y pulsa el lápiz ✏️.
2. Busca la línea `database_id = "PEGA-AQUI-EL-DATABASE-ID"` y reemplaza el texto entre comillas por tu Database ID.
3. Pulsa **Commit changes**.

### 4. Conectar GitHub con Cloudflare

1. En Cloudflare: **Workers & Pages → Create → Import a repository** (o “Connect to Git”).
2. Conecta tu cuenta de GitHub y elige el repositorio **importaya**.
3. Revisa que:
   - **Project name:** `importaya` (igual que `name` en `wrangler.toml`).
   - **Build command:** vacío.
   - **Deploy command:** `npx wrangler deploy`.
4. Pulsa **Deploy**. En 1 o 2 minutos tu web estará en una dirección gratis como `https://importaya.tu-usuario.workers.dev`.

Desde ahora, **cada cambio que guardes en GitHub se publica solo**.

### 5. Crear la contraseña del panel

1. En Cloudflare: **Workers & Pages → importaya → Settings → Variables and Secrets → Add**.
2. **Type:** `Secret` · **Name:** `ADMIN_PASSWORD` · **Value:** una contraseña segura de al menos 8 caracteres (solo tú la sabrás).
3. Pulsa **Deploy** (o **Save and deploy**).

### 6. Primer ingreso al panel

1. Abre `https://tu-direccion.workers.dev/admin` y entra con tu contraseña.
2. En **Resumen**, pulsa **Ejecutar ahora** en: *Noticias*, *Videos de YouTube*, *Tipo de cambio* y *Resúmenes con IA*. Así no esperas los primeros 15 minutos.
3. En **Ajustes**, escribe tu **WhatsApp** (ej. `51987654321`) y tu **correo** para anunciantes, y revisa los precios de publicidad.
4. Revisa **Fuentes de noticias** y **YouTube**: si alguna sale con *Error*, puedes editarla, desactivarla o borrarla.

¡Listo! A partir de aquí la web trabaja sola.

> Las tareas automáticas aparecen en **Workers & Pages → importaya → Settings → Trigger events** como `*/15 * * * *` (cada 15 minutos). Se crean solas al publicar.

---

## Cómo se usa el panel `/admin`

| Pestaña | Para qué |
|---|---|
| **Resumen** | Visitas de los últimos 30 días, estado de cada tarea automática y botón “Ejecutar ahora”. |
| **Publicidad** | Crear, editar, pausar o borrar anuncios. Subes la imagen (máx. 1 MB), pones el enlace de la empresa y las fechas. Muestra vistas, clics y CTR de cada anuncio. |
| **Noticias** | Ocultar una noticia que no tenga relación con el tema, destacar ⭐ una importante (sale primero) o rehacer su resumen con IA. |
| **Fuentes de noticias** | Agregar o quitar fuentes RSS. Botón “Probar” para ver si funciona. |
| **YouTube** | Agregar canales con su `@usuario` (ej. `@rppnoticias`), elegir el canal principal ⭐ y revisar si alguno falla. |
| **Lo más buscado** | Ver qué busca la gente este mes y ocultar palabras ofensivas o sin sentido. |
| **Anunciantes** | Empresas que llenaron el formulario de “Anúnciate”, con botón de WhatsApp. |
| **Ajustes** | WhatsApp, correo, precios de publicidad, tasas de la calculadora, palabras clave y activar o desactivar la IA. |

### Espacios de publicidad

| Espacio | Medida recomendada | Dónde aparece |
|---|---|---|
| Banner superior | 1200 × 150 px | Arriba de todas las páginas |
| Recuadro lateral | 600 × 500 px | Al costado de las noticias (en celular, entre secciones) |
| Entre noticias | 1200 × 300 px | Dentro de la lista de noticias y en cada noticia |
| Patrocinio de la calculadora | Logo 400 × 200 px | “Calculadora patrocinada por…” |
| Banner de videos | 1200 × 150 px | Debajo del video del día |
| Banner inferior | 1200 × 150 px | Al final de todas las páginas |

Si un espacio no tiene anuncio, se muestra **“Tu marca aquí”** con enlace a `/anunciate`. Puedes ocultarlo en **Ajustes**. Si pones varios anuncios en el mismo espacio, se turnan al azar.

### Agregar una fuente de noticias sobre un tema nuevo

Usa Google Noticias cambiando `TU+TEMA`:

```
https://news.google.com/rss/search?q=TU+TEMA+when:7d&hl=es-419&gl=PE&ceid=PE:es-419
```

Por ejemplo, `q=importar+celulares+when:7d`. Pégalo en **Fuentes de noticias → Agregar fuente**.

---

## Opcional: Gemini como respaldo de la IA

La IA de Cloudflare ya es gratis y alcanza para cientos de resúmenes al día. Si algún día se acaba el uso gratis del día, la web puede usar **Google Gemini** (también tiene plan gratis):

1. Entra a [aistudio.google.com](https://aistudio.google.com) con tu Gmail → **Get API key → Create API key**.
2. En Cloudflare agrega otro **Secret**: nombre `GEMINI_API_KEY`, valor la clave.

Si Google cambia el nombre del modelo, actualiza `GEMINI_MODEL` en `wrangler.toml`.

## Opcional: dominio propio (importaya.pe)

1. Compra el dominio en [punto.pe](https://punto.pe) o en un registrador autorizado (Cloudflare no vende `.pe`).
2. En Cloudflare: **Add a domain** → sigue los pasos y cambia los *nameservers* en tu registrador por los que te da Cloudflare.
3. **Workers & Pages → importaya → Settings → Domains & Routes → Add → Custom domain** → `importaya.pe`.
4. En `wrangler.toml`, pon `SITE_URL = "https://importaya.pe"`.

## Para aparecer en Google

1. Entra a [Google Search Console](https://search.google.com/search-console) y agrega tu dirección.
2. En **Sitemaps**, envía `sitemap.xml`. La web lo genera sola con todas las noticias.

---

## Límites del plan gratis de Cloudflare

| Recurso | Gratis | Uso de ImportaYa |
|---|---|---|
| Visitas al Worker | 100 000 al día | Cada página vista cuenta como 1 |
| Base de datos D1 | 5 GB, 5 millones de lecturas al día | Suficiente para miles de visitas diarias |
| Workers AI | 10 000 “neuronas” al día | Cada resumen gasta muy poco; alcanza para cientos al día |
| Tareas programadas | Incluidas | 1 tarea cada 15 minutos |

Si un día la web crece mucho (más de 100 000 visitas diarias), el plan **Workers Paid** cuesta US$ 5 al mes.

## Problemas comunes

| Problema | Solución |
|---|---|
| `binding DB of type d1 must have a valid database_id` | Falta pegar el Database ID en `wrangler.toml` (paso 3). |
| El nombre del Worker no coincide | `name` en `wrangler.toml` debe ser igual al nombre del proyecto en Cloudflare. |
| “Falta configurar el secreto ADMIN_PASSWORD” | Haz el paso 5. |
| Un canal de YouTube sale con error | Edítalo y pega el ID del canal (empieza con `UC`). Lo encuentras en YouTube → canal → **Más información → Compartir canal → Copiar ID del canal**. |
| Una fuente de noticias sale con error | Ese medio cambió o bloqueó su RSS. Desactívala o reemplázala. |
| No aparecen resúmenes con IA | En **Resumen** revisa “Workers AI”. Si dice “No disponible”, revisa que `wrangler.toml` tenga el bloque `[ai]`. |
| No aparece el tipo de cambio | Pulsa **Ejecutar ahora** en “Tipo de cambio” y revisa el mensaje. |
| Error 1102 (límite de CPU) | Pasa temporalmente menos fuentes o canales, o activa el plan Workers Paid. |

---

## Para programadores

```bash
npm install
cp .dev.vars.example .dev.vars   # contraseña de prueba del panel
npx wrangler login               # la IA de Cloudflare necesita tu cuenta
npm run dev                      # http://localhost:8787  (panel: /admin)
npm test                         # pruebas del lector RSS y de los resúmenes
```

Para probar las tareas automáticas en local: `curl "http://localhost:8787/__scheduled?cron=*/15+*+*+*+*"`.

```
├── wrangler.toml            Configuración: D1, Workers AI, cron cada 15 min
├── schema.sql               Tablas (se crean solas)
├── src/
│   ├── worker.js            Rutas de la web y tareas automáticas
│   ├── tareas/              noticias, videos, tipo de cambio, resúmenes IA, ranking y limpieza
│   ├── paginas/             Páginas públicas (HTML desde el servidor, bueno para Google)
│   ├── api/                 API pública (búsquedas, contacto, anuncios) y del panel
│   └── lib/                 RSS, IA, anuncios, sesión del panel, utilidades
├── public/                  Estilos, scripts, panel /admin e imágenes
└── test/                    Pruebas (node --test)
```

Las noticias se muestran con titular, extracto o resumen propio y **enlace a la fuente original**: nunca se copia el artículo completo.
