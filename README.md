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
- **Goles y asistencias** con selección de jugador por evento; el marcador se calcula solo.
- **Figura del partido** (MVP), **Mejor arquero** del partido (separado del MVP) y **registro de victorias / empates / derrotas** por jugador.
- **Ranking con podio** con categorías: goles, asistencias, goles+asist., figuras, partidos jugados, victorias, derrotas y escabio.
- **Post-partido**: registro de "escabio" por cantidad (stepper −/+) y **comentarios** por partido.
- **Ficha de cada jugador**: totales + historial partido a partido.
- **Datos en tiempo real**: todo se guarda en la nube (Firebase Firestore) y se sincroniza al instante entre dispositivos.
- **Tema "Cancha arcade"**: fondo de cancha pixelada, tipografías retro y paneles vinotinto.
- **Audio 8-bit generado con Web Audio API**: efectos (gol, figura) y un **himno original** en loop.
- **Copias de seguridad**: exportar/importar JSON y **backup automático semanal en la nube** (colección `backups`, se conservan las últimas 8 semanas, con descargar/restaurar).

---

## 🧱 Stack

| Área | Tecnología |
|---|---|
| Frontend | HTML, CSS y JavaScript **vanilla** (un único `index.html`, sin build) |
| Base de datos | **Firebase Firestore** (Firebase JS SDK v10, compat) en tiempo real |
| Audio | **Web Audio API** (síntesis de sonido y música por código) |
| Gráficos | SVG generado en runtime (avatares pixel art) |
| Hosting | **GitHub Pages** |
| Versionado | Git / GitHub |
| Cloud | Google Cloud Platform / Firebase |

No usa frameworks ni librerías de UI: todo el render es JavaScript del lado del cliente con manipulación del DOM.

---

## 🏗️ Arquitectura

SPA de un solo archivo. El estado de la app (`{ players, matches }`) vive en Firestore y se refleja en el DOM.

```
┌───────────────────────────┐
│   index.html (SPA)        │
│                           │
│  render() ──► DOM         │
│     ▲                     │
│     │ onSnapshot          │
│  ┌──┴─────────────┐       │
│  │  Firestore     │◄──────┼── persistPlayer / persistMatch
│  │  (players,     │       │
│  │   matches)     │       │
│  └────────────────┘       │
└───────────────────────────┘
```

- Al iniciar, la app abre listeners `onSnapshot` sobre las colecciones `players` y `matches`. Cada cambio (propio o de otro dispositivo) re-renderiza la vista.
- Cada edición muta el objeto local y dispara escrituras por documento (`set`/`delete`), evitando pisar datos de otros (una operación por jugador/partido).
- La nube es la **fuente de verdad**: al conectar, el estado local se reemplaza por el de Firestore.

### Modelo de datos (Firestore)

**`players`** (un documento por jugador)
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

**`matches`** (un documento por partido, con goles / escabio / comentarios embebidos)
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
  "events": [{ "id": "e1", "side": "A", "scorerId": "playerId1", "assistId": "playerId2" }],
  "mvpId": "playerId1",
  "escabio": { "playerId1": 2 },
  "comments": [{ "id": "c1", "author": "Tuti", "text": "Buen partido", "ts": 1758600000000 }]
}
```

Reglas de seguridad de Firestore usadas (acceso abierto por link):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /players/{id} { allow read, write: if true; }
    match /matches/{id} { allow read, write: if true; }
    match /backups/{id} { allow read, write: if true; }
  }
}
```

---

## 🚀 Puesta en marcha

1. Crear un proyecto en [firebase.google.com](https://console.firebase.google.com/) y habilitar **Firestore Database** (modo producción).
2. Publicar las reglas de arriba.
3. Registrar una **app Web** y copiar el objeto `firebaseConfig`.
4. Pegar ese `firebaseConfig` en la constante `DEFAULT_FB_CONFIG` de `index.html` (o conectarlo desde la sección **Nube** de la app).
5. Publicar `index.html` (por ejemplo con **GitHub Pages**).

> El `firebaseConfig` web es público por diseño; la seguridad se controla con las reglas de Firestore.

---

## 📁 Estructura

```
.
└── index.html   # SPA completa: estilos, lógica, generadores de SVG y audio
```

---

## 🧠 Aprendizajes / habilidades demostradas

- Desarrollo de una **SPA completa sin frameworks** (vanilla JS, DOM, event delegation, estado y render).
- **Tiempo real** con Firebase Firestore (`onSnapshot`) y modelo de datos con escrituras por documento.
- **Generación procedural de gráficos**: avatares pixel art 16-bit con sombreado y paletas derivadas por hash, renderizados como SVG.
- **Síntesis de audio** con Web Audio API: efectos chiptune y una composición musical original en loop (secuenciador con scheduling por tiempo absoluto).
- **Diseño UI/UX mobile-first** y sistema de temas (arcade, vinotinto), con tipografías y layouts responsive.
- **Deploy** en GitHub Pages, configuración de Firebase/GCP y control de versiones con Git.
- Resolución de problemas reales: manejo de caché del navegador/CDN, errores de inicialización y migración de datos.

---

## 👤 Autor

**Leandro Armonelli** — [@Learmonelli](https://github.com/Learmonelli)

Proyecto hecho para el equipo **Piel Morena FC**.
