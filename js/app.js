/* ============================================================
   app.js — Conecta la interfaz con Reader, Player y Store
   ============================================================ */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const body = document.body;

  // -------- Estado de UI --------
  let settings = Store.getSettings();

  /* ============================================================
     INICIALIZACIÓN
     ============================================================ */
  document.addEventListener("DOMContentLoaded", () => {
    applyThemeToBody(settings.theme);
    initSettingsUI();
    initReader();
    initPlayer();
    initSidebar();
    initKeyboard();
    renderRecent();
  });

  /* ============================================================
     TEMA GLOBAL
     ============================================================ */
  function applyThemeToBody(theme) {
    body.setAttribute("data-theme", theme);
    document.querySelectorAll(".theme-opt").forEach((b) =>
      b.classList.toggle("active", b.dataset.themeSet === theme)
    );
  }

  /* ============================================================
     LECTOR EPUB
     ============================================================ */
  function initReader() {
    Reader.settings = settings;

    Reader.onReady = (meta) => {
      $("welcome").style.display = "none";
      $("book-meta").textContent = meta.title + (meta.author ? " — " + meta.author : "");
      loadToc();
      renderBookmarks();
      renderRecent();
    };

    Reader.onRelocated = ({ percentage }) => {
      const pct = Math.round(percentage);
      $("progress-slider").value = percentage || 0;
      $("progress-label").textContent = pct + "%";
    };

    // Selección de archivo
    $("epub-input").addEventListener("change", (e) => {
      const f = e.target.files[0];
      if (f) openEpubFile(f);
    });

    // Navegación
    $("next-page").addEventListener("click", () => Reader.next());
    $("prev-page").addEventListener("click", () => Reader.prev());

    // Slider de progreso
    $("progress-slider").addEventListener("change", (e) => {
      Reader.goToPercentage(parseFloat(e.target.value));
    });

    // Drag & drop de EPUB sobre la zona de lectura
    const rz = document.querySelector(".reader-zone");
    ["dragenter", "dragover"].forEach((ev) =>
      rz.addEventListener(ev, (e) => { e.preventDefault(); rz.classList.add("dragover"); })
    );
    ["dragleave", "drop"].forEach((ev) =>
      rz.addEventListener(ev, (e) => { e.preventDefault(); rz.classList.remove("dragover"); })
    );
    rz.addEventListener("drop", (e) => {
      const f = e.dataTransfer.files[0];
      if (f && /\.epub$/i.test(f.name)) openEpubFile(f);
      else if (f) alert("El archivo no es un EPUB válido.");
    });
  }

  function openEpubFile(file) {
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await Reader.open(ev.target.result, file.name);
      } catch (err) {
        console.error(err);
        alert("No se pudo abrir el EPUB: " + err.message);
      }
    };
    reader.onerror = () => alert("Error al leer el archivo.");
    reader.readAsArrayBuffer(file);
  }

  async function loadToc() {
    const toc = await Reader.getToc();
    const ul = $("toc-list");
    ul.innerHTML = "";
    const addItems = (items, sub) => {
      items.forEach((it) => {
        const li = document.createElement("li");
        if (sub) li.className = "sub";
        const span = document.createElement("span");
        span.className = "toc-link";
        span.textContent = it.label.trim();
        li.appendChild(span);
        li.addEventListener("click", () => { Reader.goTo(it.href); });
        ul.appendChild(li);
        if (it.subitems && it.subitems.length) addItems(it.subitems, true);
      });
    };
    addItems(toc, false);
  }

  /* ============================================================
     MARCADORES
     ============================================================ */
  function renderBookmarks() {
    const ul = $("bookmark-list");
    const empty = $("bookmark-empty");
    ul.innerHTML = "";
    if (!Reader.bookId) { empty.hidden = false; return; }
    const list = Store.getBookmarks(Reader.bookId);
    empty.hidden = list.length > 0;
    list.forEach((bm, i) => {
      const li = document.createElement("li");
      const wrap = document.createElement("span");
      wrap.className = "toc-link";
      wrap.innerHTML = `${bm.label}<small>${new Date(bm.date).toLocaleString()}</small>`;
      wrap.addEventListener("click", () => Reader.goTo(bm.cfi));
      const del = document.createElement("button");
      del.className = "icon-btn del-btn";
      del.textContent = "🗑";
      del.title = "Eliminar marcador";
      del.addEventListener("click", (e) => {
        e.stopPropagation();
        const arr = Store.getBookmarks(Reader.bookId);
        arr.splice(i, 1);
        Store.setBookmarks(Reader.bookId, arr);
        renderBookmarks();
      });
      li.appendChild(wrap);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  function addBookmark() {
    if (!Reader.bookId) { alert("Abre un libro primero."); return; }
    const bm = Reader.currentBookmark();
    if (!bm) return;
    const list = Store.getBookmarks(Reader.bookId);
    if (list.some((x) => x.cfi === bm.cfi)) { alert("Ya existe un marcador en esta posición."); return; }
    list.push(bm);
    Store.setBookmarks(Reader.bookId, list);
    renderBookmarks();
    openSidebar("bookmarks");
  }

  /* ============================================================
     LIBROS RECIENTES
     ============================================================ */
  function renderRecent() {
    const ul = $("recent-list");
    ul.innerHTML = "";
    const list = Store.getRecent();
    list.forEach((b) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="toc-link">${b.title}<small>${b.author || ""}</small></span>`;
      li.title = "Vuelve a abrir este libro desde tu equipo";
      li.addEventListener("click", () => {
        alert("Por seguridad, el navegador no puede reabrir el archivo automáticamente.\n\nSelecciona de nuevo:\n" + b.title);
        $("epub-input").click();
      });
      ul.appendChild(li);
    });
  }

  /* ============================================================
     BÚSQUEDA
     ============================================================ */
  async function doSearch() {
    const q = $("search-input").value.trim();
    const ul = $("search-results");
    ul.innerHTML = "";
    if (!q) return;
    if (!Reader.bookId) { alert("Abre un libro primero."); return; }
    ul.innerHTML = "<li>Buscando…</li>";
    const results = await Reader.search(q);
    ul.innerHTML = "";
    if (!results.length) { ul.innerHTML = "<li>Sin resultados.</li>"; return; }
    results.forEach((r) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="toc-link">${escapeHtml(r.excerpt || "")}</span>`;
      li.addEventListener("click", () => Reader.goTo(r.cfi));
      ul.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ============================================================
     PANEL LATERAL
     ============================================================ */
  function openSidebar(which) {
    const sb = $("sidebar");
    sb.setAttribute("aria-hidden", "false");
    showPanel(which);
  }
  function showPanel(which) {
    const map = { toc: "panel-toc", bookmarks: "panel-bookmarks", search: "panel-search" };
    const titles = { toc: "Tabla de contenidos", bookmarks: "Marcadores", search: "Buscar en el libro" };
    Object.values(map).forEach((id) => { $(id).hidden = true; });
    if (map[which]) $(map[which]).hidden = false;
    $("sidebar-title").textContent = titles[which] || "";
  }
  function toggleSidebar(which) {
    const sb = $("sidebar");
    const isHidden = sb.getAttribute("aria-hidden") === "true";
    if (isHidden) openSidebar(which);
    else if ($("sidebar-title").textContent && which) showPanel(which);
    else sb.setAttribute("aria-hidden", "true");
  }

  function initSidebar() {
    $("btn-toc").addEventListener("click", () => toggleSidebar("toc"));
    $("btn-bookmarks").addEventListener("click", () => openSidebar("bookmarks"));
    $("btn-add-bookmark").addEventListener("click", addBookmark);
    $("btn-search").addEventListener("click", () => { openSidebar("search"); $("search-input").focus(); });
    $("btn-close-sidebar").addEventListener("click", () => $("sidebar").setAttribute("aria-hidden", "true"));
    $("btn-do-search").addEventListener("click", doSearch);
    $("search-input").addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
    $("btn-fullscreen").addEventListener("click", toggleFullscreen);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  }

  /* ============================================================
     AJUSTES DE LECTURA
     ============================================================ */
  function initSettingsUI() {
    // Sincronizar controles con settings guardados
    $("font-family").value = settings.fontFamily;
    $("font-size").value = settings.fontSize;
    $("font-size-val").textContent = settings.fontSize;
    $("line-height").value = settings.lineHeight;
    $("line-h-val").textContent = settings.lineHeight;
    $("margin-size").value = settings.margin;
    $("margin-val").textContent = settings.margin;

    $("btn-settings").addEventListener("click", () => { $("settings-modal").hidden = false; });
    $("btn-close-settings").addEventListener("click", () => { $("settings-modal").hidden = true; });
    $("settings-modal").addEventListener("click", (e) => {
      if (e.target.id === "settings-modal") $("settings-modal").hidden = true;
    });

    document.querySelectorAll(".theme-opt").forEach((btn) => {
      btn.addEventListener("click", () => {
        settings.theme = btn.dataset.themeSet;
        applyThemeToBody(settings.theme);
        commitSettings();
      });
    });

    $("font-family").addEventListener("change", (e) => { settings.fontFamily = e.target.value; commitSettings(); });
    $("font-size").addEventListener("input", (e) => {
      settings.fontSize = parseInt(e.target.value, 10);
      $("font-size-val").textContent = settings.fontSize;
      commitSettings();
    });
    $("font-inc").addEventListener("click", () => stepFont(5));
    $("font-dec").addEventListener("click", () => stepFont(-5));
    $("line-height").addEventListener("input", (e) => {
      settings.lineHeight = parseFloat(e.target.value);
      $("line-h-val").textContent = settings.lineHeight;
      commitSettings();
    });
    $("margin-size").addEventListener("input", (e) => {
      settings.margin = parseInt(e.target.value, 10);
      $("margin-val").textContent = settings.margin;
      commitSettings();
    });
  }

  function stepFont(delta) {
    settings.fontSize = Math.max(60, Math.min(220, settings.fontSize + delta));
    $("font-size").value = settings.fontSize;
    $("font-size-val").textContent = settings.fontSize;
    commitSettings();
  }

  function commitSettings() {
    Store.setSettings(settings);
    Reader.applySettings(settings);
  }

  /* ============================================================
     REPRODUCTOR DE AUDIO
     ============================================================ */
  function initPlayer() {
    Player.init();

    // Restaurar UI de estado guardado
    const st = Store.getAudioState();
    $("speed-select").value = String(st.speed || 1);
    $("volume-slider").value = st.volume != null ? st.volume : 1;
    $("a-repeat").setAttribute("aria-pressed", String(!!st.repeat));
    $("a-shuffle").setAttribute("aria-pressed", String(!!st.shuffle));

    Player.onTrackChange = (track) => {
      $("track-title").textContent = track ? track.name : "Sin pista cargada";
    };
    Player.onState = (s) => {
      $("a-play").textContent = s.playing ? "⏸" : "▶";
      $("cur-time").textContent = fmtTime(s.current);
      $("dur-time").textContent = fmtTime(s.duration);
      const slider = $("seek-slider");
      if (s.duration) { slider.max = s.duration; slider.value = s.current; }
      $("a-mute").textContent = s.muted || s.volume === 0 ? "🔇" : "🔊";
    };
    Player.onPlaylist = renderPlaylist;

    // Carga de archivos
    $("audio-input").addEventListener("change", (e) => {
      if (e.target.files.length) Player.addFiles(e.target.files);
      e.target.value = "";
    });

    // Drag & drop de audio
    const drop = $("audio-drop");
    ["dragenter", "dragover"].forEach((ev) =>
      drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("dragover"); })
    );
    ["dragleave", "drop"].forEach((ev) =>
      drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("dragover"); })
    );
    drop.addEventListener("drop", (e) => {
      const files = [...e.dataTransfer.files].filter((f) => /audio\//.test(f.type) || /\.mp3$/i.test(f.name));
      if (files.length) Player.addFiles(files);
    });

    // Controles
    $("a-play").addEventListener("click", () => Player.toggle());
    $("a-next").addEventListener("click", () => Player.next());
    $("a-prev").addEventListener("click", () => Player.prev());
    $("a-fwd").addEventListener("click", () => Player.seekRelative(10));
    $("a-back").addEventListener("click", () => Player.seekRelative(-10));

    $("seek-slider").addEventListener("input", (e) => Player.seek(parseFloat(e.target.value)));
    $("speed-select").addEventListener("change", (e) => Player.setSpeed(parseFloat(e.target.value)));
    $("volume-slider").addEventListener("input", (e) => Player.setVolume(parseFloat(e.target.value)));
    $("a-mute").addEventListener("click", () => Player.toggleMute());
    $("a-repeat").addEventListener("click", (e) => {
      e.currentTarget.setAttribute("aria-pressed", String(Player.toggleRepeat()));
    });
    $("a-shuffle").addEventListener("click", (e) => {
      e.currentTarget.setAttribute("aria-pressed", String(Player.toggleShuffle()));
    });

    // Colapsar panel de audio
    $("btn-collapse-audio").addEventListener("click", () => {
      const z = $("audio-panel");
      z.classList.toggle("collapsed");
      $("btn-collapse-audio").textContent = z.classList.contains("collapsed") ? "▸" : "▾";
    });
  }

  function renderPlaylist() {
    const ul = $("playlist");
    ul.innerHTML = "";
    Player.playlist.forEach((t, i) => {
      const li = document.createElement("li");
      if (i === Player.index) li.classList.add("active");
      const name = document.createElement("span");
      name.className = "pl-name";
      name.textContent = (i + 1) + ". " + t.name;
      name.addEventListener("click", () => Player.load(i, true));
      const del = document.createElement("button");
      del.className = "icon-btn del-btn";
      del.textContent = "🗑";
      del.title = "Quitar de la lista";
      del.addEventListener("click", (e) => { e.stopPropagation(); Player.removeTrack(i); });
      li.appendChild(name);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  function fmtTime(s) {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return m + ":" + sec;
  }

  /* ============================================================
     ATAJOS DE TECLADO GLOBALES
     ============================================================ */
  function initKeyboard() {
    document.addEventListener("keydown", (e) => {
      // Ignorar si se escribe en un input
      const tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      switch (e.key) {
        case "ArrowRight": Reader.next(); break;
        case "ArrowLeft": Reader.prev(); break;
        case " ": e.preventDefault(); Player.toggle(); break;   // Espacio = play/pausa
        case "b": case "B": addBookmark(); break;
        case "f": case "F": toggleFullscreen(); break;
      }
    });
  }
})();
