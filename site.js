// Renders every page from content (admin-saved content merged over content.json),
// injects the shared header + footer, and opens the admin panel on Ctrl+Shift+A (or /#admin).

(() => {
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // "*word*" → <em>word</em>, newlines → <br>
  const rich = (s) => esc(s).replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\n/g, "<br />");
  const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj);
  const safeUrl = (u) => (/^(https?:|mailto:|\/)/i.test(String(u || "").trim()) ? String(u).trim() : "");
  const pad = (n) => String(n).padStart(2, "0");
  const page = document.body.dataset.page || "";

  // ---------- Regional pricing ----------
  // Prices are stored in your base currency (ZAR by default) and shown in the visitor's currency.
  const CURRENCY_BY_COUNTRY = {
    ZA: "ZAR", NA: "NAD", BW: "BWP", ZM: "ZMW", MZ: "MZN", ZW: "USD", LS: "ZAR", SZ: "ZAR",
    NG: "NGN", KE: "KES", GH: "GHS", EG: "EGP", MA: "MAD", TZ: "TZS", UG: "UGX",
    US: "USD", CA: "CAD", MX: "MXN", BR: "BRL", AR: "ARS",
    GB: "GBP", IE: "EUR", NL: "EUR", DE: "EUR", FR: "EUR", BE: "EUR", ES: "EUR", IT: "EUR", PT: "EUR",
    AT: "EUR", FI: "EUR", GR: "EUR", LU: "EUR", SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", HR: "EUR",
    CH: "CHF", SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", HU: "HUF", RO: "RON", TR: "TRY",
    AE: "AED", SA: "SAR", QA: "QAR", IL: "ILS", IN: "INR", PK: "PKR", BD: "BDT", LK: "LKR",
    AU: "AUD", NZ: "NZD", SG: "SGD", MY: "MYR", PH: "PHP", ID: "IDR", TH: "THB", JP: "JPY", CN: "CNY", KR: "KRW", HK: "HKD",
  };
  // Rough offline rates per 1 ZAR — only used when live rates can't be fetched
  const FALLBACK_PER_ZAR = {
    ZAR: 1, NAD: 1, BWP: 0.75, ZMW: 1.45, MZN: 3.5, NGN: 85, KES: 7.1, GHS: 0.85, EGP: 2.7, MAD: 0.55, TZS: 145, UGX: 205,
    USD: 0.055, CAD: 0.077, MXN: 1.05, BRL: 0.3, ARS: 55, GBP: 0.043, EUR: 0.05, CHF: 0.048, SEK: 0.6, NOK: 0.6, DKK: 0.38,
    PLN: 0.22, CZK: 1.27, HUF: 20, RON: 0.25, TRY: 1.9, AED: 0.2, SAR: 0.21, QAR: 0.2, ILS: 0.2, INR: 4.7, PKR: 15.5,
    BDT: 6.7, LKR: 16.5, AUD: 0.085, NZD: 0.095, SGD: 0.074, MYR: 0.25, PHP: 3.2, IDR: 890, THB: 1.9, JPY: 8.4, CNY: 0.4, KRW: 77, HKD: 0.43,
  };
  const PICKER = ["ZAR", "USD", "EUR", "GBP", "AUD", "CAD", "INR", "NGN", "KES", "AED", "NZD", "BWP", "NAD"];
  const fx = { base: "USD", code: "USD", rate: 1, live: false, rates: null };

  function rateFor(code) {
    if (code === fx.base) return 1;
    if (fx.rates?.[code]) return fx.rates[code];
    const a = FALLBACK_PER_ZAR[code], b = FALLBACK_PER_ZAR[fx.base];
    return a && b ? a / b : null;
  }
  function setCurrency(code) {
    const r = rateFor(code);
    if (!r) code = fx.base;
    fx.code = code;
    fx.rate = r || 1;
  }
  // Round converted prices to friendly numbers (e.g. 54.94 → 55, 8,317 → 8,300)
  function nice(v) {
    if (v <= 0) return 0;
    const digits = Math.floor(Math.log10(v)) + 1;
    const step = Math.pow(10, Math.max(0, digits - 2));
    return Math.round(v / step) * step;
  }
  // Base-currency amount → visitor's currency (rounded to a friendly number)
  const conv = (n) => (fx.code === fx.base ? n : nice(n * fx.rate));
  // Convert an amount; with pricing rules `p`, amounts like home + k × page are converted
  // part by part so they match the calculator exactly.
  function convert(n, p) {
    if (fx.code === fx.base) return n;
    if (p && p.extraPage) {
      const k = (n - p.homePage) / p.extraPage;
      if (Number.isInteger(k) && k >= 0 && k < p.largeAfter) return conv(p.homePage) + k * conv(p.extraPage);
    }
    return conv(n);
  }
  // Format a value that is already in the visitor's currency
  function fmt(v) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: fx.code, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(v);
    } catch {
      return `${fx.code} ${Math.round(v).toLocaleString()}`;
    }
  }
  const money = (amount, p) => fmt(convert(Number(amount) || 0, p));

  /* ---- The pricing rules ----
     Main pages (custom designs: Home, About, Contact…):
       1 page        → homePage                        ($100)
       2–6 pages     → homePage + extraPage × (n − 1)  ($100 + $150 each)
       7+ pages      → capped at largePrice            ($1,000 flat)
     Inner pages (templated: blog posts, products, portfolio items):
       innerPage × m, never capped                     ($25 each)
     Total = main pages cost + inner pages cost
     Everything is calculated from converted unit prices, so each breakdown line adds up exactly. */
  function quote(mainPages, innerPages, p) {
    const main = Math.max(1, Math.floor(mainPages) || 1);
    const inner = Math.max(0, Math.floor(innerPages) || 0);
    const unit = { home: conv(p.homePage), page: conv(p.extraPage), cap: conv(p.largePrice), inner: conv(p.innerPage) };
    const uncapped = unit.home + (main - 1) * unit.page;
    const capped = main > p.largeAfter;
    const mainCost = capped ? unit.cap : uncapped;
    const innerCost = inner * unit.inner;
    return { main, inner, unit, capped, uncapped, mainCost, innerCost, total: mainCost + innerCost };
  }

  // Replace {home} {page} {large} {inner} {largeAfter} {largeAfterPlus} in package texts
  function fill(text, p) {
    return esc(text)
      .replace(/\{home\}/g, money(p.homePage))
      .replace(/\{page\}/g, money(p.extraPage))
      .replace(/\{large\}/g, money(p.largePrice))
      .replace(/\{inner\}/g, money(p.innerPage))
      .replace(/\{largeAfterPlus\}/g, String(p.largeAfter + 1))
      .replace(/\{largeAfter\}/g, String(p.largeAfter));
  }
  function pricingOf(c) {
    const p = c.services?.pricing || {};
    return {
      currency: String(p.currency || "USD").toUpperCase(),
      homePage: Number(p.homePage) || 0,
      extraPage: Number(p.extraPage) || 0,
      largeAfter: Number(p.largeAfter) || 6,
      largePrice: Number(p.largePrice) || 0,
      innerPage: Number(p.innerPage) || 0,
    };
  }

  async function detectCurrency(base) {
    fx.base = base;
    let saved = null;
    try { saved = localStorage.getItem("currency"); } catch {}
    let country = null;
    try {
      const r = await fetch(`/api/rates?base=${encodeURIComponent(base)}`);
      if (r.ok) {
        const j = await r.json();
        country = j.country;
        if (j.rates) { fx.rates = j.rates; fx.live = true; }
      }
    } catch {}
    if (!country) {
      // No server (e.g. local preview): guess from the browser's language, e.g. en-ZA → ZA
      try { country = new Intl.Locale(navigator.language).maximize().region; } catch {}
    }
    setCurrency(saved || CURRENCY_BY_COUNTRY[country] || "USD");
  }

  function renderPricing(c) {
    const p = pricingOf(c);
    if (p.currency !== fx.base) {
      // Base currency was changed in the admin panel → old live rates no longer apply
      fx.base = p.currency; fx.rates = null; fx.live = false;
      setCurrency(fx.code);
    }

    list("packages", c.services?.packages, (pk) => `
      <article class="package${pk.featured ? " is-featured" : ""} reveal">
        ${pk.featured ? '<span class="badge">Most popular</span>' : ""}
        <h3>${esc(pk.name)}</h3>
        <p class="pages-label">${fill(pk.pagesLabel || "", p)}</p>
        <p class="price">${pk.from ? '<small>from</small> ' : ""}${money(pk.amount ?? 0, p)}</p>
        <p class="package-text">${fill(pk.text, p)}</p>
        <ul>${(pk.features || []).map((f) => `<li>${fill(f, p)}</li>`).join("")}</ul>
        <a href="start.html" class="btn ${pk.featured ? "" : "btn-ghost"} btn-full">Get started</a>
      </article>`);

    // Currency picker + note
    const picker = document.getElementById("currency-picker");
    if (picker) {
      const codes = [...new Set([fx.code, fx.base, ...PICKER])].filter((code) => rateFor(code));
      picker.innerHTML = codes.map((code) => `<option value="${code}"${code === fx.code ? " selected" : ""}>${code}</option>`).join("");
      picker.onchange = () => {
        try { localStorage.setItem("currency", picker.value); } catch {}
        setCurrency(picker.value);
        render(window.Site.content);
      };
    }
    const note = document.getElementById("currency-note");
    if (note) {
      note.textContent = fx.code === fx.base
        ? `Prices in ${fx.base}.`
        : `Converted from ${fx.base} at ${fx.live ? "today's" : "an approximate"} rate — final quote confirmed after the brief.`;
    }

    // Price calculator
    const calc = document.getElementById("price-calc");
    if (calc) {
      const mainR = calc.querySelector('input[name="main"]');
      const innerR = calc.querySelector('input[name="inner"]');
      const innerN = calc.querySelector('input[name="innerCount"]');
      const mainOut = calc.querySelector('[data-out="main"]');
      const out = calc.querySelector(".calc-price");
      const lines = calc.querySelector(".calc-breakdown");
      const hint = calc.querySelector(".calc-hint");
      calc.querySelectorAll("[data-unit]").forEach((el) => {
        const k = el.dataset.unit;
        el.textContent = k === "inner" ? fmt(conv(p.innerPage)) : k === "cap" ? fmt(conv(p.largePrice)) : String(p.largeAfter + 1);
      });
      mainR.max = String(Math.max(12, p.largeAfter + 6));

      const fillBar = (r) => r.style.setProperty("--fill", `${((r.value - r.min) / (r.max - r.min)) * 100}%`);
      const row = (label, detail, amount, cls = "") =>
        `<li class="${cls}"><span class="b-label">${label}<small>${detail}</small></span><span class="b-amt">${amount}</span></li>`;

      const update = (e) => {
        // keep the inner-pages slider and number box in sync (the number box has no limit)
        if (e?.target === innerN) innerR.value = Math.min(Number(innerN.value) || 0, Number(innerR.max));
        if (e?.target === innerR) innerN.value = innerR.value;
        if (Number(innerN.value) < 0) innerN.value = "0";

        const q = quote(Number(mainR.value), Number(innerN.value), p);
        mainOut.textContent = String(q.main);
        out.innerHTML = fmt(q.total);

        const mainDetail = q.capped
          ? `${p.largeAfter + 1}+ main pages are capped at ${fmt(q.unit.cap)} flat`
          : q.main === 1
            ? `Homepage — ${fmt(q.unit.home)}`
            : `Homepage ${fmt(q.unit.home)} + ${q.main - 1} × ${fmt(q.unit.page)}`;
        const innerDetail = q.inner
          ? `${q.inner} × ${fmt(q.unit.inner)} — never capped`
          : `${fmt(q.unit.inner)} each — blog posts, products, portfolio items`;
        lines.innerHTML =
          row(`Main pages <b>× ${q.main}</b>`, mainDetail, fmt(q.mainCost)) +
          row(`Inner pages <b>× ${q.inner}</b>`, innerDetail, fmt(q.innerCost)) +
          row("Total", "Main pages + inner pages", fmt(q.total), "b-total");

        hint.textContent = q.capped && q.uncapped > q.mainCost
          ? `The cap saves you ${fmt(q.uncapped - q.mainCost)} on main pages.`
          : q.capped
            ? `You've reached the cap — more main pages won't cost extra.`
            : q.main === p.largeAfter
              ? `From ${p.largeAfter + 1} main pages, the price is capped at ${fmt(q.unit.cap)}.`
              : `Main pages are capped at ${fmt(q.unit.cap)} from ${p.largeAfter + 1} pages. Inner pages are ${fmt(q.unit.inner)} each with no cap.`;

        calc.classList.toggle("is-capped", q.capped);
        fillBar(mainR); fillBar(innerR);
        out.classList.remove("bump"); void out.offsetWidth; out.classList.add("bump");
      };
      mainR.oninput = innerR.oninput = innerN.oninput = update;
      update();
    }

    // Intake form budget options (data-budget="from-to" in base currency)
    document.querySelectorAll("input[data-budget]").forEach((input) => {
      const [lo, hi] = input.dataset.budget.split("-").map((x) => (x === "" ? null : Number(x)));
      const label = !lo ? `Under ${money(hi)}` : hi == null ? `${money(lo)}+` : `${money(lo)} – ${money(hi)}`;
      input.value = fx.code === fx.base ? label : `${label} (${fx.code})`;
      input.nextElementSibling.textContent = label;
    });
  }

  const NAV = [
    { id: "work", label: "Work", href: "work.html" },
    { id: "services", label: "Services", href: "services.html" },
    { id: "about", label: "About", href: "about.html" },
    { id: "contact", label: "Contact", href: "contact.html" },
  ];

  // Saved content may be missing newer fields → fill them from the defaults
  function merge(base, over) {
    if (Array.isArray(over)) return over;
    if (over && typeof over === "object" && base && typeof base === "object" && !Array.isArray(base)) {
      const out = { ...base };
      for (const k of Object.keys(over)) out[k] = merge(base[k], over[k]);
      return out;
    }
    return over === undefined ? base : over;
  }

  // ---------- shared header / footer ----------
  function renderHeader(c) {
    const el = document.getElementById("site-header");
    if (!el) return;
    el.className = "nav";
    el.innerHTML = `
      <a href="index.html" class="logo">${esc(c.site.name)}</a>
      <nav>
        <button class="nav-toggle" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
        <ul class="nav-links">
          ${NAV.map((n) => `<li><a href="${n.href}"${n.id === page ? ' class="active" aria-current="page"' : ""}>${n.label}</a></li>`).join("")}
          <li><a href="start.html" class="btn btn-small">Start a project</a></li>
        </ul>
      </nav>`;
    const toggle = el.querySelector(".nav-toggle");
    const links = el.querySelector(".nav-links");
    toggle.onclick = () => {
      const open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("menu-open", open);
    };
  }

  function renderFooter(c) {
    const el = document.getElementById("site-footer");
    if (!el) return;
    const socials = (c.site.socials || []).filter((s) => safeUrl(s.url));
    el.className = "site-footer";
    el.innerHTML = `
      <div class="footer-cta">
        <p class="eyebrow">${c.site.available ? '<span class="dot"></span> ' + esc(c.site.availableText) : "Get in touch"}</p>
        <a href="start.html" class="footer-big">Let's work <em>together</em> <span class="arrow">→</span></a>
      </div>
      <div class="footer-grid">
        <div>
          <p class="footer-label">Pages</p>
          <ul><li><a href="index.html">Home</a></li>${NAV.map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join("")}<li><a href="start.html">Start a project</a></li></ul>
        </div>
        <div>
          <p class="footer-label">Contact</p>
          <ul><li><a href="mailto:${esc(c.site.email)}">${esc(c.site.email)}</a></li><li>${esc(c.site.location)}</li></ul>
        </div>
        <div>
          <p class="footer-label">Social</p>
          <ul>${socials.length ? socials.map((s) => `<li><a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></li>`).join("") : "<li class='muted'>Coming soon</li>"}</ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} ${esc(c.site.name)} — ${esc(c.site.role)}</span>
        <a href="#top" onclick="window.scrollTo({top:0,behavior:'smooth'});return false;">Back to top ↑</a>
      </div>`;
  }

  // ---------- building blocks ----------
  function list(id, items, tpl) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = (items || []).map(tpl).join("");
    [...el.children].forEach((n, i) => n.style.setProperty("--i", i % 4)); // staggered reveal
    el.querySelectorAll(".reveal").forEach((n) => window.observeReveal?.(n));
  }

  // Browser-window mockup used as the project cover (shows the uploaded image if there is one)
  function mock(p, i) {
    const host = (p.url && safeUrl(p.url)) ? safeUrl(p.url).replace(/^https?:\/\//, "").replace(/\/.*$/, "")
      : `${String(p.title || "site").toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`;
    const screen = p.image
      ? `<img src="${esc(p.image)}" alt="${esc(p.title)} website" loading="lazy" />`
      : `<div class="mock-ui v${i % 3}">
          <div class="mock-nav"><b>${esc(p.title)}</b><s></s><s></s><s></s></div>
          <div class="mock-hero"><div class="mock-h">${esc(p.title)}</div><div class="mock-lines"><s></s><s></s></div><div class="mock-btn"></div></div>
          <div class="mock-media"></div>
          <div class="mock-grid"><i></i><i></i><i></i></div>
        </div>`;
    return `<div class="mock" style="--c:${esc(p.color || "#888")}">
      <div class="mock-bar"><i></i><i></i><i></i><span>${esc(host)}</span></div>
      <div class="mock-screen">${screen}</div>
    </div>`;
  }

  function projectCard(p, i, big = false) {
    const url = safeUrl(p.url);
    const tag = url ? `a href="${esc(url)}" target="_blank" rel="noopener"` : "article";
    const end = url ? "a" : "article";
    return `<${tag} class="project${big ? " project-big" : ""} reveal" data-cat="${esc(p.category || "")}">
      <div class="thumb" style="--c:${esc(p.color || "#888")}">${mock(p, i)}${url ? '<span class="thumb-cta">Visit site ↗</span>' : ""}</div>
      <div class="project-info">
        <div class="project-top"><h3>${esc(p.title)}</h3><span class="project-year">${esc(p.year || "")}</span></div>
        <p>${esc(p.subtitle)}</p>
        <ul class="tags">${(p.tags || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      </div>
    </${end}>`;
  }

  // ---------- render everything on the current page ----------
  function render(c) {
    if (!c) return;
    renderHeader(c);
    renderFooter(c);

    document.querySelectorAll("[data-text]").forEach((el) => (el.textContent = get(c, el.dataset.text) ?? ""));
    document.querySelectorAll("[data-rich]").forEach((el) => (el.innerHTML = rich(get(c, el.dataset.rich))));
    document.querySelectorAll("[data-paras]").forEach((el) => {
      el.innerHTML = String(get(c, el.dataset.paras) || "")
        .split(/\n\s*\n/).filter((p) => p.trim()).map((p) => `<p>${rich(p.trim())}</p>`).join("");
    });
    document.querySelectorAll("[data-show]").forEach((el) => (el.hidden = !get(c, el.dataset.show)));
    document.querySelectorAll("[data-href-mail]").forEach((el) => (el.href = `mailto:${c.site.email}`));

    const pageTitle = document.body.dataset.title;
    document.title = pageTitle ? `${pageTitle} — ${c.site.name}` : c.site.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", c.site.description || "");
    if (c.site.accent) document.documentElement.style.setProperty("--accent", c.site.accent);

    const projects = c.work?.projects || [];

    // Home
    list("stats", c.home?.stats, (s) => `<li class="reveal"><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></li>`);
    list("clients", c.home?.clients, (n) => `<li>${esc(n)}</li>`);
    // Word band: one "set" repeated twice so showcase.js can loop it seamlessly
    const words = c.home?.marquee || [];
    const set = [...words, ...words];
    list("marquee", [...set, ...set], (wd, i) =>
      `<span class="${i % 2 ? "w-fill" : "w-out"}">${esc(wd)}</span><span class="star">✦</span>`);
    list("featured", projects.slice(0, 3), (p, i) => projectCard(p, i, i === 0));
    list("services-teaser", c.services?.items, (s, i) => `
      <a href="services.html" class="teaser reveal"><span class="num">${pad(i + 1)}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p><span class="teaser-arrow">→</span></a>`);
    list("testimonials", c.home?.testimonials, (t) => `
      <figure class="quote reveal"><blockquote>“${esc(t.quote)}”</blockquote>
        <figcaption><span class="avatar">${esc((t.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2))}</span><span><strong>${esc(t.name)}</strong><small>${esc(t.role)}</small></span></figcaption></figure>`);

    // Work
    list("projects", projects, (p, i) => projectCard(p, i));
    const filters = document.getElementById("work-filters");
    if (filters) {
      const cats = ["All", ...new Set(projects.map((p) => p.category).filter(Boolean))];
      filters.innerHTML = cats.map((cat, i) => `<button class="filter${i === 0 ? " active" : ""}" data-cat="${esc(cat)}">${esc(cat)}<sup>${cat === "All" ? projects.length : projects.filter((p) => p.category === cat).length}</sup></button>`).join("");
      filters.onclick = (e) => {
        const b = e.target.closest(".filter");
        if (!b) return;
        filters.querySelectorAll(".filter").forEach((x) => x.classList.toggle("active", x === b));
        document.querySelectorAll("#projects .project").forEach((card) => {
          card.hidden = b.dataset.cat !== "All" && card.dataset.cat !== b.dataset.cat;
        });
      };
    }
    const count = document.getElementById("project-count");
    if (count) count.textContent = pad(projects.length);

    // Services
    list("services-list", c.services?.items, (s, i) => `
      <article class="service-row reveal">
        <span class="num">${pad(i + 1)}</span>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.text)}</p>
        <ul>${(s.points || []).map((pt) => `<li>${esc(pt)}</li>`).join("")}</ul>
      </article>`);
    renderPricing(c);
    list("process-list", c.services?.steps, (s, i) =>
      `<li class="reveal"><span class="step">${pad(i + 1)}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`);
    list("faq", c.services?.faq, (f) =>
      `<details class="faq-item reveal"><summary>${esc(f.q)}<span class="plus"></span></summary><p>${esc(f.a)}</p></details>`);

    // About
    const photo = document.getElementById("about-photo");
    if (photo) {
      const initials = (c.site.name || "").split(/\s+/).map((w) => w[0]).join("").slice(0, 2);
      photo.innerHTML = c.about?.photo
        ? `<img src="${esc(c.about.photo)}" alt="${esc(c.site.name)}" />`
        : `<div class="photo-placeholder"><span>${esc(initials)}</span><small>${esc(c.site.location)}</small></div>`;
    }
    list("values", c.about?.values, (v, i) => `<div class="value reveal"><span class="num">${pad(i + 1)}</span><h3>${esc(v.title)}</h3><p>${esc(v.text)}</p></div>`);
    list("experience", c.about?.experience, (e) => `<li class="reveal"><span class="exp-year">${esc(e.year)}</span><div><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p></div></li>`);
    list("skills", c.about?.skills, (s) => `<li>${esc(s)}</li>`);

    // Contact
    const links = [
      { label: "Email", value: c.site.email, url: `mailto:${c.site.email}` },
      ...(c.site.socials || []).filter((s) => safeUrl(s.url)).map((s) => ({ label: s.label, value: s.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), url: s.url })),
    ];
    list("contact-links", links, (l) =>
      `<li><span>${esc(l.label)}</span><a href="${esc(safeUrl(l.url))}"${l.url.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener"'}>${esc(l.value)}</a></li>`);

    document.dispatchEvent(new Event("site:rendered")); // motion.js hooks in here
  }

  async function load() {
    // content.js sets window.DEFAULT_CONTENT (works even when the page is opened as a file)
    const defaults = window.DEFAULT_CONTENT;
    if (location.protocol === "file:") return defaults;
    try {
      const r = await fetch("/api/content", { headers: { Accept: "application/json" } });
      if (r.ok) {
        const j = await r.json();
        if (j && j.content) return merge(defaults, j.content);
      }
    } catch {}
    return defaults;
  }

  window.Site = { content: null, render, rich, esc, merge, fx };

  // Draw the top menu (and phone hamburger) + footer right away from the defaults,
  // so navigation never waits on anything loading
  if (window.DEFAULT_CONTENT) {
    renderHeader(window.DEFAULT_CONTENT);
    renderFooter(window.DEFAULT_CONTENT);
  }

  const needsPrices = () => document.querySelector("#packages, #price-calc, input[data-budget]");
  load()
    .then(async (c) => {
      window.Site.content = c;
      if (needsPrices()) await detectCurrency(pricingOf(c).currency);
      render(c);
    })
    .catch((e) => console.error("Could not load content", e))
    .finally(() => setTimeout(() => document.body.classList.remove("is-loading"), 30));
  // Never leave the page invisible, even if something above fails
  setTimeout(() => document.body.classList.remove("is-loading"), 2500);

  // ---------- smooth page transitions ----------
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (a.target === "_blank" || a.hasAttribute("download")) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname === location.pathname || !/\.html$|\/$|^\/[^.]*$/.test(url.pathname)) return;
    e.preventDefault();
    document.body.classList.add("is-leaving");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => (location.href = url.href), reduce ? 0 : 560);
  });
  window.addEventListener("pageshow", (e) => e.persisted && document.body.classList.remove("is-leaving"));

  // ---------- admin panel trigger ----------
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
  let reopen = false;
  try { reopen = sessionStorage.getItem("admOpen") === "1"; } catch {}
  if (location.hash === "#admin" || reopen) openAdmin();
  window.addEventListener("hashchange", () => location.hash === "#admin" && openAdmin());
})();
