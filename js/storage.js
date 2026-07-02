/* ============================================================
   storage.js — Persistencia con localStorage
   Encapsula lectura/escritura de configuración, marcadores,
   posiciones de lectura y estado del reproductor.
   ============================================================ */
(function (global) {
  "use strict";

  const PREFIX = "epubAudioApp:";

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      console.warn("Storage read error", key, e);
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.warn("Storage write error", key, e);
    }
  }

  const Store = {
    // --- Configuración de lectura ---
    getSettings() {
      return read("settings", {
        theme: "light",
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: 100,
        lineHeight: 1.5,
        margin: 20,
      });
    },
    setSettings(s) { write("settings", s); },

    // --- Última posición de lectura por libro (key = bookId) ---
    getLocation(bookId) { return read("loc:" + bookId, null); },
    setLocation(bookId, cfi) { write("loc:" + bookId, cfi); },

    // --- Último libro abierto ---
    getLastBookId() { return read("lastBook", null); },
    setLastBookId(id) { write("lastBook", id); },

    // --- Marcadores por libro ---
    getBookmarks(bookId) { return read("bm:" + bookId, []); },
    setBookmarks(bookId, list) { write("bm:" + bookId, list); },

    // --- Libros recientes (metadatos, no el binario) ---
    getRecent() { return read("recent", []); },
    setRecent(list) { write("recent", list); },
    addRecent(entry) {
      let list = Store.getRecent().filter((b) => b.id !== entry.id);
      list.unshift(entry);
      list = list.slice(0, 12);
      Store.setRecent(list);
    },

    // --- Estado del reproductor de audio ---
    getAudioState() {
      return read("audio", { speed: 1, volume: 1, repeat: false, shuffle: false });
    },
    setAudioState(s) { write("audio", s); },
  };

  global.Store = Store;
})(window);
