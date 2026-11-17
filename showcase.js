// Showcase effects — the "I want a site like this" layer.
// Interactive hero dot field, scroll-velocity word band, live style playground,
// 3D tilt on project covers and a soft spotlight that follows the mouse over cards.

(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;

  // ---------- 1. Hero: interactive dot field ----------
  const canvas = document.querySelector(".hero-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const hero = canvas.closest(".hero");
    const bg = canvas.parentElement; // full-width background layer
    // Performance: the faint grid is drawn ONCE into an off-screen image. Each frame only
    // copies that image and redraws the handful of dots near the light — and frames where
    // nothing moved are skipped entirely.
    let w = 0, h = 0, dpr = 1, cols = 0, rows = 0, visible = true, t = 0;
    let base = null, col = "#d4ff5a", lastX = NaN, lastY = NaN, dirty = true;
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    const GAP = 30;

    const readAccent = () => { col = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#d4ff5a"; dirty = true; };
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 1.5);
      w = bg.clientWidth; h = bg.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil((w - GAP / 2) / GAP); rows = Math.ceil((h - GAP / 2) / GAP);
      // pre-render the faint grid
      base = document.createElement("canvas");
      base.width = canvas.width; base.height = canvas.height;
      const b = base.getContext("2d");
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      b.fillStyle = "rgba(255,255,255,.11)";
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        b.beginPath(); b.arc(GAP / 2 + c * GAP, GAP / 2 + r * GAP, 0.8, 0, Math.PI * 2); b.fill();
      }
      dirty = true;
      draw(true);
    }
    function draw(force) {
      mouse.x += (mouse.tx - mouse.x) * 0.14;
      mouse.y += (mouse.ty - mouse.y) * 0.14;
      // without a mouse (phones), a slow wandering "light" moves across the grid
      const lx = fine && mouse.tx > -9000 ? mouse.x : w * (0.5 + 0.35 * Math.sin(t / 2600));
      const ly = fine && mouse.ty > -9000 ? mouse.y : h * (0.45 + 0.25 * Math.cos(t / 3100));
      if (!force && !dirty && Math.abs(lx - lastX) < 0.3 && Math.abs(ly - lastY) < 0.3) return; // nothing moved
      lastX = lx; lastY = ly; dirty = false;
      ctx.clearRect(0, 0, w, h);
      if (base) ctx.drawImage(base, 0, 0, w, h);
      const R = Math.min(220, w * 0.35);
      // only the grid cells inside the light's radius
      const c0 = Math.max(0, Math.floor((lx - R) / GAP)), c1 = Math.min(cols - 1, Math.ceil((lx + R) / GAP));
      const r0 = Math.max(0, Math.floor((ly - R) / GAP)), r1 = Math.min(rows - 1, Math.ceil((ly + R) / GAP));
      ctx.fillStyle = col;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
        const dx0 = GAP / 2 + c * GAP, dy0 = GAP / 2 + r * GAP;
        const dx = dx0 - lx, dy = dy0 - ly;
        const dist = Math.hypot(dx, dy);
        const f = 1 - dist / R;
        if (f <= 0.02) continue;
        const push = f * f * 16;
        ctx.globalAlpha = f * 0.9;
        ctx.beginPath();
        ctx.arc(dx0 + (dist ? (dx / dist) * push : 0), dy0 + (dist ? (dy / dist) * push : 0), 0.8 + f * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // Phones: the "light" wanders on its own, so it would redraw every frame — 30 fps is plenty
    // there. Nothing is drawn while the menu is open or the hero is off screen.
    let lastFrame = 0;
    const minGap = fine ? 0 : 33;
    function loop(now) {
      t = now;
      if (visible && !document.hidden && !document.body.classList.contains("menu-open") && now - lastFrame >= minGap) {
        lastFrame = now;
        draw(false);
      }
      requestAnimationFrame(loop);
    }
    hero.addEventListener("pointermove", (e) => {
      const r = bg.getBoundingClientRect();
      mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top;
      if (mouse.x < -9000) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    }, { passive: true });
    hero.addEventListener("pointerleave", () => { mouse.tx = mouse.ty = -9999; mouse.x = mouse.y = -9999; });
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(hero);
    let rt;
    addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    document.addEventListener("site:rendered", readAccent); // accent colour can change in the admin
    readAccent();
    resize();
    if (!reduce) requestAnimationFrame(loop);
  }

  // ---------- 2. Word band: speeds up and flips with scrolling ----------
  const track = document.querySelector(".band-track");
  if (track && !reduce) {
    // Only animates while the band is on screen; its width is measured once (not every frame)
    let x = 0, last = scrollY, velocity = 0, dir = -1, onScreen = false, half = 0;
    const measure = () => (half = track.scrollWidth / 2);
    new IntersectionObserver(([e]) => (onScreen = e.isIntersecting)).observe(track.parentElement);
    document.addEventListener("site:rendered", measure);
    addEventListener("resize", measure);
    measure();
    (function tick() {
      const now = scrollY;
      const delta = now - last;
      last = now;
      if (onScreen && !document.hidden) {
        if (Math.abs(delta) > 0.5) dir = delta > 0 ? -1 : 1;
        velocity += (Math.min(Math.abs(delta), 60) - velocity) * 0.1;
        x += dir * (0.6 + velocity * 0.35);
        if (half > 0) { if (x <= -half) x += half; if (x > 0) x -= half; }
        track.style.transform = `translate3d(${x.toFixed(1)}px,0,0) skewX(${(-dir * velocity * 0.25).toFixed(2)}deg)`;
      }
      requestAnimationFrame(tick);
    })();
  }

  // ---------- 3. Style playground ----------
  const pg = document.getElementById("pg");
  if (pg) {
    const TITLES = {
      minimal: "Simple. Honest.<br />Yours.",
      bold: "MAKE SOME<br />NOISE.",
      elegant: "Crafted with<br />quiet care.",
      playful: "Hello there,<br />sunshine!",
    };
    const KICKERS = { minimal: "New collection", bold: "Grand opening", elegant: "Since 2026", playful: "Fresh & fun" };
    const title = pg.querySelector(".pg-title");
    const kicker = pg.querySelector(".pg-kicker");
    const logo = pg.querySelector(".pg-logo");
    const url = pg.querySelector(".pg-url");
    const site = pg.querySelector(".pg-site");
    const swap = (fn) => {
      site.classList.add("pg-swap");
      setTimeout(() => { fn(); site.classList.remove("pg-swap"); }, reduce ? 0 : 180);
    };
    pg.querySelectorAll("[data-pg]").forEach((group) => {
      group.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-v]");
        if (!b) return;
        group.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
        const kind = group.dataset.pg, v = b.dataset.v;
        swap(() => {
          if (kind === "style") { pg.dataset.style = v; title.innerHTML = TITLES[v]; kicker.textContent = KICKERS[v]; }
          if (kind === "mode") pg.dataset.mode = v;
          if (kind === "color") pg.style.setProperty("--pg", v);
        });
      });
    });
    const name = pg.querySelector(".pg-name");
    name.addEventListener("input", () => {
      const n = name.value.trim() || "Your Brand";
      logo.textContent = n;
      url.textContent = n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "") + ".com";
    });
  }

  // ---------- Live concept-site covers: scale the 1440px-wide page to fit ----------
  const ro = new ResizeObserver((entries) => entries.forEach((e) => e.target.style.setProperty("--s", (e.contentRect.width / 1440).toFixed(4))));
  const watchLive = () => document.querySelectorAll(".mock-live:not([data-ro])").forEach((el) => {
    el.dataset.ro = "1";
    if (el.clientWidth) el.style.setProperty("--s", (el.clientWidth / 1440).toFixed(4)); // right away…
    ro.observe(el); // …and again whenever the card changes size
  });
  document.addEventListener("site:rendered", watchLive);
  watchLive();

  if (!fine || reduce) return;

  // ---------- 4. Spotlight + 3D tilt ----------
  const SPOT = ".teaser, .package, .calc, .quote, .service-row, .value, .brief-card, .contact-form, .pg-controls, .form-card";
  // Mouse events can fire several times per frame — only handle the latest one, once per frame
  let pending = null, scheduled = false, tilted = null;
  function handlePointer() {
    scheduled = false;
    const e = pending;
    const el = e.target.closest?.(SPOT);
    if (el) {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${(e.clientX - r.left).toFixed(0)}px`);
      el.style.setProperty("--my", `${(e.clientY - r.top).toFixed(0)}px`);
      el.classList.add("spot");
    }
    const thumb = e.target.closest?.(".thumb");
    if (tilted && tilted !== thumb) { tilted.classList.remove("tilting"); tilted.style.transform = ""; tilted = null; }
    if (thumb) {
      const r = thumb.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      tilted = thumb;
      thumb.classList.add("tilting");
      thumb.style.transform = `perspective(1000px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg)`;
      thumb.style.setProperty("--gx", `${((px + 0.5) * 100).toFixed(1)}%`);
      thumb.style.setProperty("--gy", `${((py + 0.5) * 100).toFixed(1)}%`);
    }
  }
  addEventListener("pointermove", (e) => {
    pending = e;
    if (!scheduled) { scheduled = true; requestAnimationFrame(handlePointer); }
  }, { passive: true });
})();
