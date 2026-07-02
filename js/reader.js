/* ============================================================
   reader.js — Lógica del lector EPUB (basado en epub.js)
   Expone window.Reader con la API usada por app.js
   ============================================================ */
(function (global) {
  "use strict";

  // Estilos CSS de cada tema que se inyectan dentro del iframe de epub.js
  const THEME_STYLES = {
    light: { body: { color: "#1f2328", background: "#ffffff" } },
    sepia: { body: { color: "#5b4636", background: "#f7efdd" } },
    dark:  { body: { color: "#d8dadf", background: "#1b1d23" } },
  };

  const Reader = {
    book: null,
    rendition: null,
    bookId: null,
    metadata: null,
    settings: null,
    onReady: null,        // callback(metadata)
    onRelocated: null,    // callback({percentage, cfi})

    /* -------- Carga de un libro desde ArrayBuffer -------- */
    async open(arrayBuffer, fileName) {
      this.destroy();

      // Identificador estable del libro (nombre + tamaño)
      this.bookId = (fileName || "libro") + ":" + arrayBuffer.byteLength;

      this.book = ePub(arrayBuffer);
      this.rendition = this.book.renderTo("viewer", {
        width: "100%",
        height: "100%",
        flow: "paginated",
        spread: "auto",
        allowScriptedContent: true,
      });

      this.applySettings(this.settings || Store.getSettings());

      // Posición previa guardada (si existe)
      const savedCfi = Store.getLocation(this.bookId);
      await this.rendition.display(savedCfi || undefined);

      // Metadatos + portada
      this.metadata = await this.book.loaded.metadata;
      let cover = null;
      try { cover = await this.book.coverUrl(); } catch (e) { /* sin portada */ }

      // Generar "locations" para porcentaje fiable (en segundo plano)
      this.book.ready
        .then(() => this.book.locations.generate(1200))
        .then(() => { if (this.onRelocated) this._emitRelocated(this.rendition.currentLocation()); })
        .catch((e) => console.warn("locations error", e));

      // Eventos
      this.rendition.on("relocated", (loc) => {
        Store.setLocation(this.bookId, loc.start.cfi);
        this._emitRelocated(loc);
      });

      // Navegación con teclado dentro del iframe
      this.rendition.on("keyup", (e) => this._handleKey(e));

      const meta = {
        id: this.bookId,
        title: this.metadata.title || fileName || "Sin título",
        author: this.metadata.creator || "",
        cover: cover,
      };

      Store.setLastBookId(this.bookId);
      Store.addRecent({ id: meta.id, title: meta.title, author: meta.author, cover: meta.cover });

      if (this.onReady) this.onReady(meta);
      return meta;
    },

    _emitRelocated(loc) {
      if (!loc || !this.onRelocated) return;
      let pct = 0;
      try {
        if (this.book.locations && this.book.locations.length()) {
          pct = this.book.locations.percentageFromCfi(loc.start.cfi) * 100;
        }
      } catch (e) { /* ignore */ }
      this.onRelocated({ percentage: pct, cfi: loc.start.cfi });
    },

    _handleKey(e) {
      if (e.key === "ArrowRight") this.next();
      if (e.key === "ArrowLeft") this.prev();
    },

    /* -------- Navegación -------- */
    next() { if (this.rendition) this.rendition.next(); },
    prev() { if (this.rendition) this.rendition.prev(); },
    goTo(target) { if (this.rendition) this.rendition.display(target); },
    goToPercentage(pct) {
      if (this.rendition && this.book.locations && this.book.locations.length()) {
        const cfi = this.book.locations.cfiFromPercentage(pct / 100);
        this.rendition.display(cfi);
      }
    },

    /* -------- Tabla de contenidos -------- */
    async getToc() {
      if (!this.book) return [];
      const nav = await this.book.loaded.navigation;
      return nav.toc || [];
    },

    /* -------- Búsqueda en todo el libro -------- */
    async search(query) {
      if (!this.book || !query) return [];
      const results = [];
      const spineItems = this.book.spine.spineItems;
      for (const item of spineItems) {
        try {
          await item.load(this.book.load.bind(this.book));
          const found = item.find(query);
          if (found && found.length) results.push(...found);
          item.unload();
        } catch (e) { /* saltar sección con error */ }
        if (results.length > 200) break;
      }
      return results;
    },

    /* -------- Marcador actual -------- */
    currentBookmark() {
      const loc = this.rendition && this.rendition.currentLocation();
      if (!loc) return null;
      return {
        cfi: loc.start.cfi,
        label: (this.metadata && this.metadata.title) || "Marcador",
        date: new Date().toISOString(),
      };
    },

    /* -------- Aplicar ajustes de lectura -------- */
    applySettings(s) {
      this.settings = s;
      if (!this.rendition) return;
      const themes = this.rendition.themes;
      const t = THEME_STYLES[s.theme] || THEME_STYLES.light;
      themes.override("color", t.body.color);
      themes.override("background", t.body.background);
      themes.font(s.fontFamily);
      themes.fontSize(s.fontSize + "%");
      themes.override("line-height", String(s.lineHeight));
      // Márgenes laterales mediante padding del cuerpo
      themes.override("padding-left", s.margin + "px");
      themes.override("padding-right", s.margin + "px");
    },

    /* -------- Limpieza -------- */
    destroy() {
      if (this.rendition) { try { this.rendition.destroy(); } catch (e) {} }
      if (this.book) { try { this.book.destroy(); } catch (e) {} }
      this.rendition = null;
      this.book = null;
      this.metadata = null;
    },
  };

  global.Reader = Reader;
})(window);
