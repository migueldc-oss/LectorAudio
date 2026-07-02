/* ============================================================
   player.js — Reproductor de audio MP3
   Expone window.Player con la API usada por app.js
   ============================================================ */
(function (global) {
  "use strict";

  const Player = {
    audio: new Audio(),
    playlist: [],     // [{ name, url }]
    index: -1,
    repeat: false,
    shuffle: false,
    onTrackChange: null,   // callback(track, index)
    onState: null,         // callback({playing, current, duration})
    onPlaylist: null,      // callback()

    init() {
      const st = Store.getAudioState();
      this.repeat = st.repeat;
      this.shuffle = st.shuffle;
      this.audio.playbackRate = st.speed || 1;
      this.audio.volume = st.volume != null ? st.volume : 1;

      this.audio.addEventListener("timeupdate", () => this._emitState());
      this.audio.addEventListener("loadedmetadata", () => this._emitState());
      this.audio.addEventListener("play", () => this._emitState());
      this.audio.addEventListener("pause", () => this._emitState());
      this.audio.addEventListener("ended", () => this._onEnded());
    },

    _persist() {
      Store.setAudioState({
        speed: this.audio.playbackRate,
        volume: this.audio.volume,
        repeat: this.repeat,
        shuffle: this.shuffle,
      });
    },

    /* -------- Lista de reproducción -------- */
    addFiles(fileList) {
      for (const f of fileList) {
        const url = URL.createObjectURL(f);
        this.playlist.push({ name: f.name, url });
      }
      if (this.onPlaylist) this.onPlaylist();
      if (this.index === -1 && this.playlist.length) this.load(0);
    },

    removeTrack(i) {
      if (i < 0 || i >= this.playlist.length) return;
      try { URL.revokeObjectURL(this.playlist[i].url); } catch (e) {}
      this.playlist.splice(i, 1);
      if (i === this.index) {
        this.audio.pause();
        if (this.playlist.length) this.load(Math.min(i, this.playlist.length - 1));
        else { this.index = -1; this.audio.src = ""; if (this.onTrackChange) this.onTrackChange(null, -1); }
      } else if (i < this.index) {
        this.index--;
      }
      if (this.onPlaylist) this.onPlaylist();
    },

    load(i, autoplay) {
      if (i < 0 || i >= this.playlist.length) return;
      this.index = i;
      this.audio.src = this.playlist[i].url;
      this.audio.load();
      if (autoplay) this.audio.play().catch(() => {});
      if (this.onTrackChange) this.onTrackChange(this.playlist[i], i);
      if (this.onPlaylist) this.onPlaylist();
    },

    /* -------- Controles de reproducción -------- */
    toggle() {
      if (!this.audio.src) {
        if (this.playlist.length) this.load(0, true);
        return;
      }
      if (this.audio.paused) this.audio.play().catch(() => {});
      else this.audio.pause();
    },
    next() {
      if (!this.playlist.length) return;
      let i;
      if (this.shuffle) i = Math.floor(Math.random() * this.playlist.length);
      else i = (this.index + 1) % this.playlist.length;
      this.load(i, true);
    },
    prev() {
      if (!this.playlist.length) return;
      // Si han pasado más de 3s, reinicia la pista actual
      if (this.audio.currentTime > 3) { this.audio.currentTime = 0; return; }
      let i = this.shuffle
        ? Math.floor(Math.random() * this.playlist.length)
        : (this.index - 1 + this.playlist.length) % this.playlist.length;
      this.load(i, true);
    },
    seek(seconds) {
      if (isFinite(this.audio.duration)) {
        this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration));
      }
    },
    seekRelative(delta) {
      if (isFinite(this.audio.duration)) this.seek(this.audio.currentTime + delta);
    },

    /* -------- Opciones -------- */
    setSpeed(rate) { this.audio.playbackRate = rate; this._persist(); },
    setVolume(v) { this.audio.volume = v; this.audio.muted = v === 0; this._persist(); },
    toggleMute() { this.audio.muted = !this.audio.muted; },
    toggleRepeat() { this.repeat = !this.repeat; this._persist(); return this.repeat; },
    toggleShuffle() { this.shuffle = !this.shuffle; this._persist(); return this.shuffle; },

    _onEnded() {
      if (this.repeat) { this.audio.currentTime = 0; this.audio.play().catch(() => {}); }
      else this.next();
    },

    _emitState() {
      if (this.onState) {
        this.onState({
          playing: !this.audio.paused,
          current: this.audio.currentTime || 0,
          duration: isFinite(this.audio.duration) ? this.audio.duration : 0,
          muted: this.audio.muted,
          volume: this.audio.volume,
        });
      }
    },
  };

  global.Player = Player;
})(window);
