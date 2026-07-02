# 📖 Lector EPUB + 🎵 Reproductor de Audio
Lector de libros EPUB con reproductor de audio

Aplicación web para **leer libros EPUB** con un **reproductor de audio MP3** integrado.
Funciona **en local** (abriendo el archivo directamente o con un servidor estático) y
**desplegada en un servidor**. Todo el procesamiento ocurre en el navegador; no se
envía ningún archivo a Internet.

---

## ✨ Funcionalidades

### Lector EPUB (zona principal)
- Abrir `.epub` con botón o **arrastrar y soltar**.
- Navegación: botones, **flechas del teclado** (← →) y barra de progreso con %.
- **Tabla de contenidos** navegable.
- **Marcadores**: añadir, listar (con fecha) y eliminar; persisten por libro.
- **Búsqueda** de texto en todo el libro con salto a resultados.
- **Ajustes de lectura**: tema (claro / sepia / oscuro), tipografía (incl. dislexia),
  tamaño de letra, interlineado y márgenes.
- **Reanudar lectura**: recuerda el último libro y la última posición.
- **Pantalla completa** y libros recientes.

### Reproductor de audio (zona secundaria)
- Cargar uno o varios `.mp3` (botón o arrastrar y soltar) → **lista de reproducción**.
- **Play / Pausa**, pista anterior / siguiente, **±10 s**.
- **Velocidad de reproducción de 0,5× a 1,0×** en incrementos de 0,1.
- Barra de búsqueda (seek), tiempos, **volumen** y silencio.
- **Repetir** y **aleatorio**.
- Recuerda velocidad, volumen y opciones.
- Panel colapsable.

### Atajos de teclado
| Tecla | Acción |
|-------|--------|
| ← / → | Página anterior / siguiente |
| Espacio | Play / Pausa del audio |
| B | Añadir marcador |
| F | Pantalla completa |

## Acceso a la web
https://migueldc-oss.github.io/LectorAudio
