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
    let w = 0, h = 0, dpr = 1, dots = [], visible = true, t = 0;
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    const GAP = 30;

    const accent = () => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#d4ff5a";
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = bg.clientWidth; h = bg.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      for (let y = GAP / 2; y < h; y += GAP) for (let x = GAP / 2; x < w; x += GAP) dots.push({ x, y });
      if (reduce) draw();
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      const col = accent();
      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;
      // without a mouse (phones), a slow wandering "light" moves across the grid
      const lx = fine && mouse.tx > -9000 ? mouse.x : w * (0.5 + 0.35 * Math.sin(t / 2600));
      const ly = fine && mouse.ty > -9000 ? mouse.y : h * (0.45 + 0.25 * Math.cos(t / 3100));
      const R = Math.min(220, w * 0.35);
      for (const d of dots) {
        const dx = d.x - lx, dy = d.y - ly;
        const dist = Math.hypot(dx, dy);
        const f = Math.max(0, 1 - dist / R);
        const wave = reduce ? 0 : Math.sin(d.x * 0.012 + d.y * 0.01 + t / 900) * 0.5 + 0.5;
        const push = f * f * 16;
        const x = d.x + (dist ? (dx / dist) * push : 0);
        const y = d.y + (dist ? (dy / dist) * push : 0);
        const r = 0.8 + f * 2.2;
        ctx.globalAlpha = 0.08 + wave * 0.06 + f * 0.85;
        ctx.fillStyle = f > 0.02 ? col : "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function loop(now) {
      t = now;
      if (visible) draw();
      requestAnimationFrame(loop);
    }
    hero.addEventListener("pointermove", (e) => {
      const r = bg.getBoundingClientRect();
      mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top;
      if (mouse.x < -9000) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    });
    hero.addEventListener("pointerleave", () => { mouse.tx = mouse.ty = -9999; mouse.x = mouse.y = -9999; });
    new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(hero);
    addEventListener("resize", resize);
    resize();
    if (!reduce) requestAnimationFrame(loop);
  }

  // ---------- 2. Word band: speeds up and flips with scrolling ----------
  const track = document.querySelector(".band-track");
  if (track && !reduce) {
    let x = 0, last = scrollY, velocity = 0, dir = -1;
    (function tick() {
      const now = scrollY;
      const delta = now - last;
      last = now;
      if (Math.abs(delta) > 0.5) dir = delta > 0 ? -1 : 1;
      velocity += (Math.min(Math.abs(delta), 60) - velocity) * 0.1;
      x += dir * (0.6 + velocity * 0.35);
      const half = track.scrollWidth / 2;
      if (half > 0) { if (x <= -half) x += half; if (x > 0) x -= half; }
      track.style.transform = `translate3d(${x}px,0,0) skewX(${(-dir * velocity * 0.25).toFixed(2)}deg)`;
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
  addEventListener("pointermove", (e) => {
    const el = e.target.closest?.(SPOT);
    if (el) {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
      el.classList.add("spot");
    }
    const thumb = e.target.closest?.(".thumb");
    document.querySelectorAll(".thumb.tilting").forEach((t) => { if (t !== thumb) { t.classList.remove("tilting"); t.style.transform = ""; } });
    if (thumb) {
      const r = thumb.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      thumb.classList.add("tilting");
      thumb.style.transform = `perspective(1000px) rotateX(${(-py * 6).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg)`;
      thumb.style.setProperty("--gx", `${(px + 0.5) * 100}%`);
      thumb.style.setProperty("--gy", `${(py + 0.5) * 100}%`);
    }
  }, { passive: true });
})();
