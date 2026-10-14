-- Tablas de ImportaYa (Cloudflare D1). Se crean solas la primera vez que se usa la web.

-- Fuentes de noticias (RSS). Se administran desde /admin.
CREATE TABLE IF NOT EXISTS fuentes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  pais TEXT NOT NULL DEFAULT 'PE',          -- PE, CN, US, MUNDO
  idioma TEXT NOT NULL DEFAULT 'es',        -- es / en (en = se traduce con IA)
  filtrar INTEGER NOT NULL DEFAULT 0,       -- 1 = solo noticias con palabras clave del rubro
  activa INTEGER NOT NULL DEFAULT 1,
  ultimo_intento TEXT,
  ultimo_ok TEXT,
  ultimo_error TEXT,
  items_ultimo INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS noticias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL UNIQUE,
  titulo_norm TEXT NOT NULL UNIQUE,         -- evita la misma noticia repetida en varias fuentes
  titulo TEXT NOT NULL,
  titulo_original TEXT,
  descripcion TEXT,                          -- extracto que entrega la fuente
  resumen TEXT,                              -- resumen propio hecho con IA
  resumen_ia INTEGER NOT NULL DEFAULT 0,     -- 1 = ya tiene resumen de IA
  ia_intentos INTEGER NOT NULL DEFAULT 0,
  imagen TEXT,
  fuente_id INTEGER,
  fuente_nombre TEXT,
  pais TEXT NOT NULL DEFAULT 'PE',
  idioma TEXT NOT NULL DEFAULT 'es',
  publicado TEXT NOT NULL,
  creado TEXT NOT NULL,
  visitas INTEGER NOT NULL DEFAULT 0,
  oculta INTEGER NOT NULL DEFAULT 0,
  destacada INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_noticias_publicado ON noticias (oculta, publicado DESC);
CREATE INDEX IF NOT EXISTS idx_noticias_pais ON noticias (pais, oculta, publicado DESC);
CREATE INDEX IF NOT EXISTS idx_noticias_ia ON noticias (resumen_ia, ia_intentos);

-- Canales de YouTube. "entrada" es lo que escribiste (@usuario, enlace o ID).
CREATE TABLE IF NOT EXISTS canales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  entrada TEXT NOT NULL UNIQUE,
  channel_id TEXT,
  categoria TEXT NOT NULL DEFAULT 'PE',
  principal INTEGER NOT NULL DEFAULT 0,      -- su último video sale en grande en la portada
  activo INTEGER NOT NULL DEFAULT 1,
  ultimo_intento TEXT,
  ultimo_ok TEXT,
  ultimo_error TEXT
);

CREATE TABLE IF NOT EXISTS videos (
  video_id TEXT PRIMARY KEY,
  canal_id INTEGER NOT NULL,
  canal_nombre TEXT NOT NULL,
  titulo TEXT NOT NULL,
  publicado TEXT NOT NULL,
  es_short INTEGER NOT NULL DEFAULT 0,
  oculto INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_videos_publicado ON videos (oculto, publicado DESC);
CREATE INDEX IF NOT EXISTS idx_videos_canal ON videos (canal_id, publicado DESC);

CREATE TABLE IF NOT EXISTS tipo_cambio (
  fecha TEXT PRIMARY KEY,                    -- YYYY-MM-DD (hora de Lima)
  compra REAL NOT NULL,
  venta REAL NOT NULL,
  fuente TEXT NOT NULL,
  actualizado TEXT NOT NULL
);

-- Lo que la gente busca y calcula (para el ranking mensual).
CREATE TABLE IF NOT EXISTS busquedas_mes (
  mes TEXT NOT NULL,                         -- YYYY-MM
  termino TEXT NOT NULL,
  tipo TEXT NOT NULL,                        -- calculadora / buscador
  cantidad INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (mes, termino, tipo)
);

CREATE TABLE IF NOT EXISTS ranking_mensual (
  mes TEXT NOT NULL,
  posicion INTEGER NOT NULL,
  termino TEXT NOT NULL,
  cantidad INTEGER NOT NULL,
  PRIMARY KEY (mes, posicion)
);

-- Publicidad de empresas.
CREATE TABLE IF NOT EXISTS anuncios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  espacio TEXT NOT NULL,
  empresa TEXT NOT NULL,
  imagen_url TEXT NOT NULL,
  enlace TEXT NOT NULL,
  texto TEXT,
  inicio TEXT,                               -- YYYY-MM-DD (vacío = desde ya)
  fin TEXT,                                  -- YYYY-MM-DD (vacío = sin fecha de fin)
  activo INTEGER NOT NULL DEFAULT 1,
  creado TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS anuncio_stats (
  anuncio_id INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  impresiones INTEGER NOT NULL DEFAULT 0,
  clics INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (anuncio_id, fecha)
);

-- Imágenes de anuncios subidas desde el panel.
CREATE TABLE IF NOT EXISTS imagenes (
  id TEXT PRIMARY KEY,
  tipo TEXT NOT NULL,
  datos BLOB NOT NULL,
  creado TEXT NOT NULL
);

-- Empresas que escriben desde "Anúnciate aquí".
CREATE TABLE IF NOT EXISTS contactos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  empresa TEXT,
  email TEXT,
  telefono TEXT,
  espacio TEXT,
  mensaje TEXT,
  creado TEXT NOT NULL,
  leido INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS visitas_dia (
  fecha TEXT NOT NULL,
  seccion TEXT NOT NULL,
  visitas INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (fecha, seccion)
);

CREATE TABLE IF NOT EXISTS config (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tareas_log (
  tarea TEXT PRIMARY KEY,
  ultima TEXT NOT NULL,
  resultado TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
  token_hash TEXT PRIMARY KEY,
  expira TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  clave TEXT PRIMARY KEY,
  contador INTEGER NOT NULL,
  expira INTEGER NOT NULL
);
