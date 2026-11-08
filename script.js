// ---------- Year ----------
document.querySelectorAll(".year").forEach((el) => (el.textContent = new Date().getFullYear()));

// ---------- Nav border on scroll (header is injected by site.js) ----------
window.addEventListener("scroll", () => {
  document.querySelector(".nav")?.classList.toggle("scrolled", window.scrollY > 10);
}, { passive: true });

// ---------- Reveal on scroll ----------
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
  }),
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
window.observeReveal = (el) => io.observe(el);

// ---------- Custom dropdowns ----------
// Native <select> menus use the operating system's colours (bright blue highlight etc.),
// which can't be styled reliably. Each select gets a matching custom dropdown; the real
// <select> stays hidden underneath, so forms, validation and change events work as before.
function enhanceSelect(sel) {
  if (sel.dataset.enhanced || sel.closest(".adm")) return;
  sel.dataset.enhanced = "1";

  const wrap = document.createElement("div");
  wrap.className = "cselect" + (sel.closest(".currency") ? " cselect-pill" : "");
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);
  sel.classList.add("cselect-native");
  sel.tabIndex = -1;
  sel.setAttribute("aria-hidden", "true");

  const uid = sel.id || "sel" + Math.random().toString(36).slice(2, 8);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "cselect-btn";
  btn.id = uid + "-btn";
  btn.setAttribute("aria-haspopup", "listbox");
  btn.setAttribute("aria-expanded", "false");
  const label = sel.id && document.querySelector(`label[for="${sel.id}"]`);
  if (label) { label.htmlFor = btn.id; btn.setAttribute("aria-labelledby", `${label.id || (label.id = uid + "-label")} ${btn.id}`); }
  else if (sel.getAttribute("aria-label")) btn.setAttribute("aria-label", sel.getAttribute("aria-label"));

  const list = document.createElement("ul");
  list.className = "cselect-list";
  list.setAttribute("role", "listbox");
  list.id = uid + "-list";
  list.hidden = true;
  btn.setAttribute("aria-controls", list.id);
  wrap.append(btn, list);

  let active = 0;
  let typed = "", typedAt = 0;

  function build() {
    list.innerHTML = "";
    [...sel.options].forEach((o, i) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.id = `${list.id}-${i}`;
      li.dataset.i = i;
      li.textContent = o.textContent;
      if (o.value === "") li.classList.add("is-placeholder");
      li.setAttribute("aria-selected", String(i === sel.selectedIndex));
      list.appendChild(li);
    });
    sync();
  }
  function sync() {
    const o = sel.options[sel.selectedIndex];
    btn.textContent = o ? o.textContent : "";
    btn.classList.toggle("is-empty", !o || o.value === "");
    list.querySelectorAll("li").forEach((li) => li.setAttribute("aria-selected", String(Number(li.dataset.i) === sel.selectedIndex)));
  }
  function highlight(i) {
    const items = list.children;
    if (!items.length) return;
    active = Math.max(0, Math.min(items.length - 1, i));
    [...items].forEach((li, n) => li.classList.toggle("active", n === active));
    btn.setAttribute("aria-activedescendant", items[active].id);
    items[active].scrollIntoView({ block: "nearest" });
  }
  function open() {
    if (!list.hidden) return;
    document.querySelectorAll(".cselect.open").forEach((w) => w !== wrap && w._close?.());
    list.hidden = false;
    wrap.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    // open upwards if there isn't room below
    const r = btn.getBoundingClientRect();
    wrap.classList.toggle("up", innerHeight - r.bottom < Math.min(300, list.scrollHeight + 16) && r.top > innerHeight - r.bottom);
    highlight(Math.max(0, sel.selectedIndex));
  }
  function close() {
    if (list.hidden) return;
    list.hidden = true;
    wrap.classList.remove("open", "up");
    btn.setAttribute("aria-expanded", "false");
    btn.removeAttribute("aria-activedescendant");
  }
  wrap._close = close;
  function choose(i) {
    if (sel.selectedIndex !== i) {
      sel.selectedIndex = i;
      sel.dispatchEvent(new Event("input", { bubbles: true }));
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    sync();
    close();
    btn.focus();
  }

  btn.addEventListener("click", () => (list.hidden ? open() : close()));
  list.addEventListener("mousedown", (e) => e.preventDefault()); // keep focus on the button
  list.addEventListener("click", (e) => {
    const li = e.target.closest("li");
    if (li) choose(Number(li.dataset.i));
  });
  list.addEventListener("mousemove", (e) => {
    const li = e.target.closest("li");
    if (li && Number(li.dataset.i) !== active) highlight(Number(li.dataset.i));
  });
  btn.addEventListener("keydown", (e) => {
    const isOpen = !list.hidden;
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key) && !isOpen) { e.preventDefault(); return open(); }
    if (!isOpen) return;
    if (e.key === "ArrowDown") { e.preventDefault(); highlight(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlight(active - 1); }
    else if (e.key === "Home") { e.preventDefault(); highlight(0); }
    else if (e.key === "End") { e.preventDefault(); highlight(list.children.length - 1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(active); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    else if (e.key === "Tab") close();
    else if (e.key.length === 1) {
      // type-ahead: jump to the option starting with the typed letters
      const now = Date.now();
      typed = (now - typedAt > 700 ? "" : typed) + e.key.toLowerCase();
      typedAt = now;
      const idx = [...sel.options].findIndex((o) => o.textContent.toLowerCase().startsWith(typed));
      if (idx >= 0) highlight(idx);
    }
  });
  btn.addEventListener("blur", () => setTimeout(() => { if (!wrap.contains(document.activeElement)) close(); }, 120));
  document.addEventListener("pointerdown", (e) => { if (!wrap.contains(e.target)) close(); });

  sel.addEventListener("change", sync);
  sel.form?.addEventListener("reset", () => setTimeout(sync));
  // options can be filled in later (e.g. the currency picker) → rebuild when they change
  new MutationObserver(build).observe(sel, { childList: true, subtree: true, characterData: true });
  build();
}
window.enhanceSelects = (root = document) => root.querySelectorAll("select").forEach(enhanceSelect);
window.enhanceSelects();

// ---------- Count-up stats ----------
document.querySelectorAll("[data-count]").forEach((el) => {
  const target = Number(el.dataset.count);
  const obs = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    obs.disconnect();
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / 1400, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  obs.observe(el);
});

// ---------- Conditional fields (intake form) ----------
function updateConditionals(form) {
  form.querySelectorAll("[data-show-when]").forEach((el) => {
    const [name, value] = el.dataset.showWhen.split("=");
    const checked = form.querySelector(`input[name="${name}"]:checked`);
    el.hidden = !(checked && checked.value === value);
  });
}

// ---------- Progress bar (intake form) ----------
function updateProgress(form) {
  const bar = document.querySelector(".progress-bar");
  if (!bar) return;
  const cards = [...form.querySelectorAll(".form-card")];
  const touched = cards.filter((card) =>
    [...card.querySelectorAll("input, textarea, select")].some((f) =>
      f.type === "checkbox" || f.type === "radio" ? f.checked && !f.defaultChecked : f.value.trim() !== ""
    )
  ).length;
  bar.style.width = `${(touched / cards.length) * 100}%`;
}

// ---------- Collect form data (checkbox groups -> arrays) ----------
function collect(form) {
  const data = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    if (el.closest("[hidden]")) continue; // skip hidden conditional fields
    if (el.type === "checkbox") {
      if (!data[el.name]) data[el.name] = [];
      if (el.checked) data[el.name].push(el.value);
    } else if (el.type === "radio") {
      if (el.checked) data[el.name] = el.value;
    } else {
      data[el.name] = el.value.trim();
    }
  }
  return data;
}

// ---------- Validation ----------
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function validate(form) {
  let firstBad = null;
  form.querySelectorAll(".field").forEach((f) => f.classList.remove("invalid"));

  form.querySelectorAll("[required]").forEach((input) => {
    const bad = !input.value.trim() || (input.type === "email" && !emailOk(input.value.trim()));
    if (bad) {
      input.closest(".field").classList.add("invalid");
      firstBad ??= input;
    }
  });
  form.querySelectorAll("[data-required-group]").forEach((group) => {
    const name = group.dataset.requiredGroup;
    if (!form.querySelector(`input[name="${name}"]:checked`)) {
      group.closest(".field").classList.add("invalid");
      firstBad ??= group;
    }
  });

  if (firstBad) {
    firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
    firstBad.focus?.({ preventScroll: true });
  }
  return !firstBad;
}

// ---------- Submit any [data-form] ----------
document.querySelectorAll("form[data-form]").forEach((form) => {
  const status = form.querySelector(".form-status");
  const button = form.querySelector('button[type="submit"]');
  const type = form.dataset.form;

  updateConditionals(form);
  form.addEventListener("change", () => { updateConditionals(form); updateProgress(form); });
  form.addEventListener("input", (e) => {
    e.target.closest(".field")?.classList.remove("invalid");
    updateProgress(form);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";
    status.className = "form-status";
    if (!validate(form)) {
      status.textContent = "Please fill in the highlighted fields.";
      status.classList.add("error");
      return;
    }

    const label = button.textContent;
    button.disabled = true;
    button.textContent = "Sending…";

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...collect(form) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Something went wrong.");

      form.reset();
      updateConditionals(form);
      updateProgress(form);

      const thanks = document.querySelector(".thank-you");
      if (type === "intake" && thanks) {
        form.hidden = true;
        document.querySelector(".progress")?.setAttribute("hidden", "");
        thanks.hidden = false;
        thanks.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        status.textContent = "Thanks! Your message was sent — I'll reply soon.";
        status.classList.add("success");
      }
    } catch (err) {
      status.textContent = `${err.message} You can also email me directly at edwin13.raptor@gmail.com.`;
      status.classList.add("error");
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });
});
