// Renders the homepage from content (saved admin content → falls back to content.json)
// and opens the admin panel on Ctrl+Shift+A (or by visiting /#admin).

(() => {
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // "*word*" → <em>word</em>, newlines → <br>
  const rich = (s) => esc(s).replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\n/g, "<br />");
  const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
  const safeUrl = (u) => (/^(https?:|mailto:|\/)/i.test(String(u || "").trim()) ? String(u).trim() : "");

  function renderList(id, items, tpl) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = (items || []).map(tpl).join("");
    el.querySelectorAll(".reveal").forEach((n) => window.observeReveal?.(n));
  }

  function render(c) {
    if (!c) return;
    document.querySelectorAll("[data-text]").forEach((el) => (el.textContent = get(c, el.dataset.text) ?? ""));
    document.querySelectorAll("[data-rich]").forEach((el) => (el.innerHTML = rich(get(c, el.dataset.rich))));
    document.querySelectorAll("[data-paras]").forEach((el) => {
      el.innerHTML = String(get(c, el.dataset.paras) || "")
        .split(/\n\s*\n/).filter((p) => p.trim()).map((p) => `<p>${rich(p.trim())}</p>`).join("");
    });
    document.querySelectorAll("[data-show]").forEach((el) => (el.hidden = !get(c, el.dataset.show)));

    // Site meta + accent colour
    if (c.site?.title) document.title = c.site.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", c.site?.description || "");
    if (c.site?.accent) document.documentElement.style.setProperty("--accent", c.site.accent);

    renderList("stats", c.stats, (s) => `<li><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></li>`);

    renderList("projects", c.work?.projects, (p, i) => {
      const media = p.image
        ? `<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy" />`
        : `<span class="thumb-title">${esc(p.title)}</span>`;
      const url = safeUrl(p.url);
      const open = url ? `<a class="project reveal" href="${esc(url)}" target="_blank" rel="noopener">` : `<article class="project reveal">`;
      const close = url ? "</a>" : "</article>";
      return `${open}
        <div class="thumb" data-i="${i % 4}">${media}${url ? '<span class="thumb-cta">View project ↗</span>' : ""}</div>
        <div class="project-info">
          <span class="project-num">${String(i + 1).padStart(2, "0")}</span>
          <div><h3>${esc(p.title)}</h3><p>${esc(p.subtitle)}</p></div>
          <ul class="tags">${(p.tags || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
        </div>${close}`;
    });

    renderList("services-list", c.services?.items, (s, i) =>
      `<div class="service reveal"><span class="num">${String(i + 1).padStart(2, "0")}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`);

    renderList("process-list", c.process?.steps, (s, i) =>
      `<li class="reveal"><span class="step">${String(i + 1).padStart(2, "0")}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`);

    renderList("skills", c.about?.skills, (s) => `<li>${esc(s)}</li>`);

    const photo = document.getElementById("about-photo");
    if (photo) {
      const initials = (c.site?.name || "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2);
      photo.innerHTML = c.about?.photo
        ? `<img src="${esc(c.about.photo)}" alt="${esc(c.site?.name)}" />`
        : `<div class="photo-placeholder">${esc(initials)}</div>`;
    }

    const links = [
      c.site?.email ? { label: c.site.email, url: `mailto:${c.site.email}` } : null,
      ...(c.site?.socials || []).filter((s) => safeUrl(s.url)),
    ].filter(Boolean);
    renderList("contact-links", links, (l) =>
      `<li><a href="${esc(safeUrl(l.url))}"${l.url.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener"'}>${esc(l.label)}</a></li>`);
  }

  async function load() {
    // 1) content saved from the admin panel, 2) default content.json
    try {
      const r = await fetch("/api/content", { headers: { Accept: "application/json" } });
      if (r.ok) {
        const j = await r.json();
        if (j && j.content) return j.content;
      }
    } catch {}
    const r = await fetch("content.json", { cache: "no-cache" });
    return r.json();
  }

  window.Site = { content: null, render, rich, esc };

  load()
    .then((c) => { window.Site.content = c; render(c); })
    .catch((e) => console.error("Could not load content", e))
    .finally(() => document.body.classList.remove("is-loading"));

  // ---------- Admin panel trigger ----------
  let adminLoading = null;
  function openAdmin() {
    if (window.Admin) return window.Admin.open();
    if (adminLoading) return;
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "admin.css";
    document.head.appendChild(css);
    adminLoading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "admin.js";
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    }).then(() => window.Admin.open()).finally(() => (adminLoading = null));
  }

  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      openAdmin();
    }
  });
  if (location.hash === "#admin") openAdmin();
  window.addEventListener("hashchange", () => location.hash === "#admin" && openAdmin());
})();
