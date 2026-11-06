# ⚽ Piel Morena FC — App de estadísticas

Aplicación web **mobile-first** para que un equipo amateur de fútbol 7 lleve las estadísticas de sus partidos: goles, asistencias, figura del partido, ranking, "escabio" y comentarios. Pensada para usarse desde el celular, sin instalar nada y con datos **compartidos en tiempo real** entre todo el equipo.

- **Demo:** https://learmonelli.github.io/piel-morena-fc/
- **Repo:** https://github.com/Learmonelli/piel-morena-fc

---

## 📸 Capturas

| Jugadores | Partido | Ranking |
|---|---|---|
| ![Jugadores](capturas/jugadores.png) | ![Partido](capturas/partido.png) | ![Ranking](capturas/ranking.png) |

| Post-partido | Estadísticas | Ficha de jugador |
|---|---|---|
| ![Post-partido](capturas/postpartido.png) | ![Estadísticas](capturas/estadisticas.png) | ![Ficha](capturas/ficha.png) |

> Guardá las capturas en la carpeta **`capturas/`** con estos nombres:
> `jugadores.png`, `partido.png`, `ranking.png`, `postpartido.png`, `estadisticas.png`, `ficha.png`.

---

## ✨ Características

- **Jugadores** con **avatar pixel art generado por código** (sin imágenes), estilo *chibi*: cuerpo entero 24×32 en leve diagonal y **carnet de frente** (cabeza y hombros) en Estadísticas. Se elige piel, color y corte de pelo, expresión, barba, anteojos, gorra/vincha/gorro, y camiseta (color, segundo color y diseño).
- **Partidos** internos (7 vs 7) o contra un rival, con fecha y equipos.
- **Goles y asistencias por jugador**: cada uno suma lo suyo tocando **⚽** (gol) y **🤝** (asistencia) en la lista del partido, sin elegir a quién asistió. **No se pueden cargar más asistencias que goles** (el 🤝 se deshabilita cuando ya no quedan goles por asistir). El marcador se calcula solo; en los partidos contra un rival hay un botón **⚽ Gol del rival**.
- **Figura del partido** (MVP), **Mejor arquero** (separado del MVP), **🔥 Golazo Piel Morena** (premio estilo Puskas al mejor gol, inspirado en la canción de Talía) y **🧱 Muro** (mejor defensor), más hachazo y polémica. Se cargan en su propia sección **🏆 Premios**, separada de "Armar equipos".
- **Ranking con podio** con categorías: goles, asistencias, goles+asist., figuras, golazo Piel Morena, muro, mejor arquero, partidos jugados, victorias, derrotas, invictos, racha, hachazos, polémica y escabio.
- **Post-partido**: registro de "escabio" por cantidad (stepper −/+) y **comentarios** por partido.
- **Ficha de cada jugador**: totales + historial partido a partido.
- **Finalizar partido**: al cerrar un partido sus datos quedan bloqueados para todos (solo el admin puede reabrirlo), pero se pueden seguir agregando **comentarios**. Además, los partidos se finalizan **automáticamente al día siguiente** de su fecha.
- **Admin**: borrar partidos, borrar jugadores y reabrir partidos finalizados queda restringido al administrador (`leandroarmonelli@gmail.com`), que entra con Google. El resto del equipo sigue sin registrarse (puede crear y editar).
- **Datos en tiempo real**: todo se guarda en la nube (Supabase / Postgres + Realtime) y se sincroniza al instante entre dispositivos.
- **Tema "Cancha arcade"**: fondo de cancha pixelada, tipografías retro y paneles vinotinto.
- **Audio 8-bit generado con Web Audio API**: efectos (gol, figura) y un **himno original** en loop.
- **Copias de seguridad**: exportar/importar JSON y **backup automático semanal en la nube** (tabla `backups`, se conservan las últimas 8 semanas, con descargar/restaurar).

---

## 🧱 Stack

| Área | Tecnología |
|---|---|
| Frontend | HTML, CSS y JavaScript **vanilla** (un único `index.html`, sin build) |
| Base de datos | **Supabase** (Postgres + Realtime, `@supabase/supabase-js` v2) |
| Autenticación | **Supabase Auth** con Google (solo para el admin) |
| Audio | **Web Audio API** (síntesis de sonido y música por código) |
| Gráficos | SVG generado en runtime (avatares pixel art) |
| Hosting | **GitHub Pages** |
| Versionado | Git / GitHub |
| Cloud | Supabase |

No usa frameworks ni librerías de UI: todo el render es JavaScript del lado del cliente con manipulación del DOM.

---

## 🏗️ Arquitectura

SPA de un solo archivo. El estado de la app (`{ players, matches }`) vive en Supabase y se refleja en el DOM.

```
┌───────────────────────────┐
│   index.html (SPA)        │
│                           │
│  render() ──► DOM         │
│     ▲                     │
│     │ Realtime             │
│  ┌──┴─────────────┐       │
│  │  Supabase      │◄──────┼── persistPlayer / persistMatch
│  │  (players,     │       │
│  │   matches)     │       │
│  └────────────────┘       │
└───────────────────────────┘
```

- Al iniciar, la app se suscribe a los cambios de `players`, `matches` y `backups` con Supabase Realtime. Cada cambio (propio o de otro dispositivo) recarga la tabla y re-renderiza la vista.
- Cada edición muta el objeto local y hace un `upsert` por fila, evitando pisar datos de otros (una operación por jugador/partido).
- La nube es la **fuente de verdad**: al conectar, el estado local se reemplaza por el de Supabase.

### Modelo de datos (Supabase)

Cada tabla guarda el documento original de la app en una columna `jsonb` llamada `data` (así se conserva el modelo sin perder arrays/mapas), con `id` como clave primaria. El SQL completo, las políticas RLS, el trigger de partidos finalizados y las funciones RPC están en **`supabase/schema.sql`**.

**`players`** (una fila por jugador)
```json
{
  "id": "mue...",
  "name": "Juan Pérez",
  "nickname": "Tuti",
  "number": "10",
  "positions": ["MCD", "MC"],
  "face": { "skin": 3, "hair": 4, "shirt": 1, "style": 0, "eyes": 0, "facial": 1,
            "hat": 0, "hatColor": 0, "glasses": 0, "shirt2": 6, "jersey": 0 }
}
```

**`matches`** (una fila por partido, con goles / escabio / comentarios embebidos)
```json
{
  "id": "mue...",
  "date": "2026-09-23",
  "mode": "interno",
  "teamAName": "Equipo A",
  "teamBName": "Equipo B",
  "rivalName": "",
  "teamA": ["playerId1", "playerId2"],
  "teamB": ["playerId3"],
  "events": [{ "id": "e1", "side": "A", "scorerId": "playerId1" }],
  "assists": { "playerId2": 1 },
  "mvpId": "playerId1",
  "gkId": "playerId3",
  "golazoId": "playerId1",
  "muroId": "playerId3",
  "escabio": { "playerId1": 2 },
  "comments": [{ "id": "c1", "author": "Tuti", "text": "Buen partido", "ts": 1758600000000 }]
}
```

Políticas RLS equivalentes (en `supabase/schema.sql`): lectura, alta y edición abiertas por link; borrar jugadores/partidos queda restringido al admin (`leandroarmonelli@gmail.com` vía `auth.jwt()`). Un partido finalizado (`closed = true`) solo admite ediciones del admin o cambios en `comments` (trigger `enforce_closed_match`). La tabla `backups` mantiene lectura/escritura abierta para el backup automático semanal.

---

## 🚀 Puesta en marcha

1. Crear un proyecto en [supabase.com](https://supabase.com/) y esperar a que termine el aprovisionamiento.
2. Abrir **SQL Editor**, pegar el contenido de `supabase/schema.sql` y ejecutarlo (crea tablas, RLS, triggers, RPCs y publica las tablas en Realtime).
3. En **Authentication → Providers** habilitar **Google** con un Client ID/Secret de Google Cloud.
4. En **Authentication → URL Configuration** agregar la URL de GitHub Pages como Redirect URL.
5. En **Project Settings → API** copiar la **Project URL** y la **anon public key**.
6. Pegar ambas en la constante `DEFAULT_SB_CONFIG` de `index.html` (o conectarlas desde la sección **Nube** de la app) y publicar.

> La `anon key` es pública por diseño; la seguridad se controla con las políticas RLS. **Nunca** poner la `service_role key` en el frontend.

### Migrar datos desde Firebase

El script `scripts/migrate-firestore-to-supabase.mjs` exporta las colecciones `players`, `matches` y `backups` con Firebase Admin y las importa con la `service_role key` (solo en el script, nunca en la app):

```bash
npm install
$env:FIREBASE_SERVICE_ACCOUNT="ruta/al/service-account.json"
$env:SUPABASE_URL="https://xxxx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="..."
npm run migrate
```

Usar `npm run migrate:export` para solo exportar a `migration/firestore-export.json` (ignorado por git) y `npm run migrate:import` para importar ese archivo. El service account JSON no debe subirse al repositorio.

---

## 📁 Estructura

```
.
├── index.html                        # SPA completa: estilos, lógica, SVG y audio
├── supabase/schema.sql               # Tablas, RLS, triggers, RPCs y Realtime
└── scripts/migrate-firestore-to-supabase.mjs  # Export/import de datos
```

---

## 🧠 Aprendizajes / habilidades demostradas

- Desarrollo de una **SPA completa sin frameworks** (vanilla JS, DOM, event delegation, estado y render).
- **Tiempo real** con Supabase Realtime y modelo de datos con escrituras por fila.
- **Generación procedural de gráficos**: avatares pixel art 16-bit con sombreado y paletas derivadas por hash, renderizados como SVG.
- **Síntesis de audio** con Web Audio API: efectos chiptune y una composición musical original en loop (secuenciador con scheduling por tiempo absoluto).
- **Diseño UI/UX mobile-first** y sistema de temas (arcade, vinotinto), con tipografías y layouts responsive.
- **Migración Firebase → Supabase**: export/import de datos, esquema Postgres, RLS y Supabase Auth.
- **Deploy** en GitHub Pages, configuración de Supabase y control de versiones con Git.
- Resolución de problemas reales: manejo de caché del navegador/CDN, errores de inicialización y migración de datos.

---

## 👤 Autor

**Leandro Armonelli** — [@Learmonelli](https://github.com/Learmonelli)

Proyecto hecho para el equipo **Piel Morena FC**.
