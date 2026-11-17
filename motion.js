// Motion layer — the "show what I can do" part of the site.
// Word-by-word heading reveals, custom cursor, magnetic buttons, parallax project covers,
// count-up stats and a scroll progress line. Everything is skipped for people who
// prefer reduced motion, and the cursor only runs on mouse/trackpad devices.

(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (reduce) return;
  document.documentElement.classList.add("motion");

  // ---------- 1. Split headings into masked words ----------
  // (the homepage statement uses the scroll-lit effect below instead)
  const SPLIT = ".hero h1, .page-hero h1, .section-head h2, .col-title, .faq-side h2, .intake-head h1";
  let wordIndex = 0;

  function splitNode(node, out) {
    if (node.nodeType === 3) {
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) return out.append(document.createTextNode(" "));
        const w = document.createElement("span");
        w.className = "w";
        const i = document.createElement("span");
        i.className = "wi";
        i.style.setProperty("--wi", wordIndex++);
        i.textContent = part;
        w.append(i);
        out.append(w);
      });
    } else if (node.nodeName === "BR") {
      out.append(document.createElement("br"));
    } else {
      const clone = node.cloneNode(false);
      node.childNodes.forEach((c) => splitNode(c, clone));
      out.append(clone);
    }
  }

  const splitIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); splitIO.unobserve(e.target); }
  }), { threshold: 0.2, rootMargin: "0px 0px -8% 0px" });

  function splitAll(instant) {
    document.querySelectorAll(SPLIT).forEach((el) => {
      const sig = el.innerHTML;
      if (el.dataset.splitSig === sig) return; // already split, unchanged
      wordIndex = 0;
      const frag = document.createDocumentFragment();
      [...el.childNodes].forEach((c) => splitNode(c, frag));
      el.replaceChildren(frag);
      el.classList.add("split");
      el.dataset.splitSig = el.innerHTML;
      if (instant) el.classList.add("in");
      else splitIO.observe(el);
    });
  }

  // ---------- 2. Count-up numbers ("40+", "98%", "24h") ----------
  const countIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    countIO.unobserve(e.target);
    const el = e.target;
    const m = el.textContent.match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/);
    if (!m) return;
    const [, pre, num, post] = m;
    const target = parseFloat(num.replace(",", "."));
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / 1600, 1);
      const v = target * (1 - Math.pow(1 - p, 4));
      el.textContent = pre + (Number.isInteger(target) ? Math.round(v) : v.toFixed(1)) + post;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });

  function counters(instant) {
    if (instant) return;
    document.querySelectorAll(".stats strong").forEach((el) => {
      if (el.dataset.counted) return;
      el.dataset.counted = "1";
      countIO.observe(el);
    });
  }

  // Run after every render (first load, and live admin edits — those appear instantly)
  // If this page is being prepared in the background (hover prerender), hold the intro
  // animations until the visitor actually arrives, so they still see them play.
  const arrived = document.prerendering
    ? new Promise((r) => document.addEventListener("prerenderingchange", r, { once: true }))
    : Promise.resolve();
  let first = true;
  document.addEventListener("site:rendered", async () => {
    const instant = !first;
    first = false;
    if (!instant) await arrived;
    splitAll(instant);
    counters(instant);
    if (!instant) document.documentElement.classList.add("intro");
  });

  // ---------- 3. Scroll progress + parallax ----------
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  document.body.append(bar);

  // ---------- Scroll-lit text: words go from dim to bright as you scroll ----------
  // Any element with [data-lit]. Its words are wrapped once per render (keeping <em>, <br>
  // and paragraphs), then the scroll handler lights up the right number of words.
  function wrapWords(node) {
    if (node.nodeType === 3) {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) return frag.append(document.createTextNode(part));
        const s = document.createElement("span");
        s.className = "lw";
        s.textContent = part;
        frag.append(s);
      });
      node.replaceWith(frag);
    } else if (node.nodeType === 1 && !node.classList.contains("lw")) {
      [...node.childNodes].forEach(wrapWords);
    }
  }
  let litEls = [];
  function prepareLit() {
    litEls = [...document.querySelectorAll("[data-lit]")].map((el) => {
      if (el.dataset.litSig !== el.innerHTML) {
        [...el.childNodes].forEach(wrapWords);
        el.classList.add("lit");
        el.dataset.litSig = el.innerHTML;
      }
      const words = [...el.querySelectorAll(".lw")];
      const lit = words.findIndex((w) => !w.classList.contains("on"));
      return { el, words, shown: lit === -1 ? words.length : lit };
    });
  }

  // One read pass, then one write pass per frame (no layout thrashing); the list of
  // parallax covers is collected once per render instead of on every scroll.
  let ticking = false, mocks = [], heroTitle = null, maxScroll = 0;
  const collect = () => {
    mocks = [...document.querySelectorAll(".thumb .mock")];
    heroTitle = document.querySelector(".hero h1");
    prepareLit();
    maxScroll = document.documentElement.scrollHeight - innerHeight;
  };
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const vh = innerHeight, y = scrollY;
      const offsets = mocks.map((m) => {
        const r = m.parentElement.getBoundingClientRect();
        return r.bottom < 0 || r.top > vh ? null : (r.top + r.height / 2 - vh / 2) / vh; // -1..1
      });
      // how many words of each lit block should be bright: starts as the block enters the
      // lower part of the screen, finishes as it reaches the upper third; at the very
      // bottom of the page everything is lit so no text is left dim
      const atBottom = maxScroll > 0 && y >= maxScroll - 4;
      const litCounts = litEls.map(({ el, words }) => {
        const r = el.getBoundingClientRect();
        if (r.top > vh || r.bottom < -vh) return null;
        const p = atBottom ? 1 : Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
        return Math.round(p * words.length);
      });
      bar.style.transform = `scaleX(${maxScroll > 0 ? Math.min(1, y / maxScroll) : 0})`;
      offsets.forEach((o, i) => { if (o !== null) mocks[i].style.translate = `0 ${(o * 26).toFixed(1)}px`; });
      litCounts.forEach((n, i) => {
        const L = litEls[i];
        if (n === null || n === L.shown) return;
        // only touch the words whose state changes
        const from = Math.min(n, Math.max(L.shown, 0)), to = Math.max(n, Math.max(L.shown, 0));
        for (let k = from; k < to; k++) L.words[k]?.classList.toggle("on", k < n);
        L.shown = n;
      });
      if (heroTitle && y < vh) heroTitle.style.translate = `0 ${(y * 0.18).toFixed(1)}px`;
    });
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", () => { collect(); onScroll(); });
  document.addEventListener("site:rendered", () => { collect(); onScroll(); });
  addEventListener("load", () => { collect(); onScroll(); });

  if (!finePointer) return;

  // ---------- 4. Custom cursor ----------
  const cursor = document.createElement("div");
  cursor.className = "cursor";
  cursor.innerHTML = '<span class="cursor-label"></span>';
  document.body.append(cursor);
  document.documentElement.classList.add("has-cursor");
  const label = cursor.firstChild;

  // The follow-animation only runs while the dot is catching up, then sleeps until the mouse moves
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my, shown = false, running = false;
  function loop() {
    cx += (mx - cx) * 0.25;
    cy += (my - cy) * 0.25;
    if (Math.abs(mx - cx) < 0.1 && Math.abs(my - cy) < 0.1) { cx = mx; cy = my; running = false; }
    cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
    if (running) requestAnimationFrame(loop);
  }
  addEventListener("mousemove", (e) => {
    mx = e.clientX; my = e.clientY;
    if (!shown) { shown = true; cx = mx; cy = my; cursor.classList.add("on"); }
    if (!running) { running = true; requestAnimationFrame(loop); }
  }, { passive: true });
  document.addEventListener("mouseleave", () => { shown = false; cursor.classList.remove("on"); });

  addEventListener("mouseover", (e) => {
    const t = e.target;
    const inAdmin = t.closest(".adm, .adm-toasts");
    const project = t.closest(".project");
    const field = t.closest("input, textarea, select");
    const link = t.closest("a, button, summary, label.choice, .filter");
    cursor.classList.toggle("hide", !!(inAdmin || field));
    cursor.classList.toggle("view", !!project && !inAdmin);
    cursor.classList.toggle("link", !project && !!link && !inAdmin);
    label.textContent = project ? (project.dataset.open ? "Open" : project.matches("a") ? "Visit" : "View") : "";
  });
  addEventListener("mousedown", () => cursor.classList.add("down"));
  addEventListener("mouseup", () => cursor.classList.remove("down"));

  // ---------- 5. Magnetic buttons ----------
  addEventListener("mousemove", (e) => {
    const b = e.target.closest?.(".btn, .nav-links a, .footer-big");
    document.querySelectorAll(".magnet-active").forEach((x) => {
      if (x !== b) { x.classList.remove("magnet-active"); x.style.translate = ""; }
    });
    if (!b || b.closest(".adm")) return;
    const r = b.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
    const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
    const strength = b.classList.contains("footer-big") ? 18 : 10;
    b.classList.add("magnet-active");
    b.style.translate = `${(dx * strength).toFixed(1)}px ${(dy * strength).toFixed(1)}px`;
  }, { passive: true });
})();
