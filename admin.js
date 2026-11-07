// Admin panel — loaded only when Ctrl+Shift+A is pressed (or /#admin is visited).
// Edits the site content with a live preview, uploads images, and saves via /api/content.

(() => {
  if (window.Admin) return;

  // ---------- helpers ----------
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "html") el.innerHTML = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : String(kid));
    return el;
  };
  const get = (o, p) => p.split(".").reduce((x, k) => (x == null ? x : x[k]), o);
  const set = (o, p, v) => {
    const ks = p.split(".");
    const last = ks.pop();
    const target = ks.reduce((x, k) => (x[k] ??= /^\d+$/.test(k) ? [] : {}), o);
    target[last] = v;
  };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const uid = () => "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  async function api(path, opts = {}) {
    const r = await fetch(path, { credentials: "same-origin", ...opts });
    let j = {};
    try { j = await r.json(); } catch {}
    if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
    return j;
  }

  // ---------- schema: what can be edited ----------
  const RICH_HINT = "Wrap words in *stars* to dim them. New line = line break.";
  const TABS = [
    { id: "general", label: "General", fields: [
      { key: "site.name", label: "Your name / logo", type: "text" },
      { key: "site.title", label: "Browser tab title", type: "text" },
      { key: "site.description", label: "Google description", type: "textarea", hint: "Shown in search results. ~150 characters." },
      { key: "site.email", label: "Contact email", type: "text" },
      { key: "site.available", label: "Show “available” badge", type: "toggle" },
      { key: "site.availableText", label: "Badge text", type: "text" },
      { key: "site.accent", label: "Accent colour", type: "color" },
      { key: "site.socials", label: "Social links", type: "list", itemLabel: (i) => i.label || "Link",
        fields: [{ key: "label", label: "Name", type: "text" }, { key: "url", label: "URL", type: "text", hint: "Leave empty to hide." }],
        blank: () => ({ label: "", url: "" }) },
    ]},
    { id: "hero", label: "Hero", fields: [
      { key: "hero.heading", label: "Big heading", type: "textarea", rows: 2, hint: RICH_HINT },
      { key: "hero.lead", label: "Intro text", type: "textarea" },
      { key: "hero.ctaPrimary", label: "Main button", type: "text" },
      { key: "hero.ctaSecondary", label: "Second button", type: "text" },
      { key: "stats", label: "Stats", type: "list", itemLabel: (i) => `${i.value} ${i.label}`,
        fields: [{ key: "value", label: "Number", type: "text" }, { key: "label", label: "Label", type: "text" }],
        blank: () => ({ value: "0", label: "New stat" }) },
    ]},
    { id: "work", label: "Work", fields: [
      { key: "work.eyebrow", label: "Small label", type: "text" },
      { key: "work.heading", label: "Heading", type: "textarea", rows: 2, hint: RICH_HINT },
      { key: "work.projects", label: "Projects", type: "list", itemLabel: (i) => i.title || "Untitled project",
        fields: [
          { key: "image", label: "Cover image", type: "image" },
          { key: "title", label: "Title", type: "text" },
          { key: "subtitle", label: "Short description", type: "text" },
          { key: "tags", label: "Tags", type: "tags" },
          { key: "url", label: "Link (optional)", type: "text", hint: "e.g. https://client-site.com" },
        ],
        blank: () => ({ id: uid(), title: "New project", subtitle: "", tags: [], image: "", url: "" }) },
    ]},
    { id: "services", label: "Services", fields: [
      { key: "services.eyebrow", label: "Small label", type: "text" },
      { key: "services.heading", label: "Heading", type: "textarea", rows: 2, hint: RICH_HINT },
      { key: "services.items", label: "Services", type: "list", itemLabel: (i) => i.title || "Service",
        fields: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Description", type: "textarea" }],
        blank: () => ({ id: uid(), title: "New service", text: "" }) },
    ]},
    { id: "process", label: "Process", fields: [
      { key: "process.eyebrow", label: "Small label", type: "text" },
      { key: "process.heading", label: "Heading", type: "textarea", rows: 2, hint: RICH_HINT },
      { key: "process.steps", label: "Steps", type: "list", itemLabel: (i) => i.title || "Step",
        fields: [{ key: "title", label: "Title", type: "text" }, { key: "text", label: "Description", type: "textarea" }],
        blank: () => ({ id: uid(), title: "New step", text: "" }) },
    ]},
    { id: "about", label: "About", fields: [
      { key: "about.photo", label: "Your photo", type: "image" },
      { key: "about.eyebrow", label: "Small label", type: "text" },
      { key: "about.heading", label: "Heading", type: "textarea", rows: 2, hint: RICH_HINT },
      { key: "about.body", label: "About text", type: "textarea", rows: 8, hint: "Empty line = new paragraph." },
      { key: "about.skills", label: "Skills", type: "tags" },
    ]},
    { id: "contact", label: "Contact", fields: [
      { key: "contact.eyebrow", label: "Small label", type: "text" },
      { key: "contact.heading", label: "Heading", type: "textarea", rows: 2, hint: RICH_HINT },
      { key: "contact.text", label: "Text", type: "textarea" },
    ]},
  ];

  // ---------- state ----------
  let draft = null;
  let saved = null;
  let dirty = false;
  let tab = "general";
  const openItems = new Set();

  // ---------- DOM ----------
  const root = h("aside", { class: "adm", "aria-label": "Admin panel", hidden: true });
  document.body.append(root);
  const toasts = h("div", { class: "adm-toasts" });
  document.body.append(toasts);

  function toast(msg, kind = "ok") {
    const t = h("div", { class: `adm-toast ${kind}` }, msg);
    toasts.append(t);
    setTimeout(() => t.classList.add("out"), 2600);
    setTimeout(() => t.remove(), 3000);
  }

  function setDirty(v) {
    dirty = v;
    root.querySelector(".adm-dirty")?.toggleAttribute("hidden", !v);
    const btn = root.querySelector(".adm-save");
    if (btn) btn.disabled = !v;
  }

  function preview() {
    window.Site.render(draft);
  }

  function change(path, value) {
    set(draft, path, value);
    setDirty(true);
    preview();
  }

  // ---------- views ----------
  function viewLogin(error = "") {
    const input = h("input", { type: "password", class: "adm-input", placeholder: "Password", autocomplete: "current-password", required: true });
    const err = h("p", { class: "adm-error" }, error);
    const btn = h("button", { class: "adm-btn primary", type: "submit" }, "Log in");
    const form = h("form", { class: "adm-login", onsubmit: async (e) => {
      e.preventDefault();
      btn.disabled = true; btn.textContent = "Checking…"; err.textContent = "";
      try {
        await api("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: input.value }) });
        await startEditing();
      } catch (ex) {
        err.textContent = ex.message;
        btn.disabled = false; btn.textContent = "Log in";
        input.select();
      }
    }},
      h("div", { class: "adm-lock" }, "●"),
      h("h2", {}, "Admin"),
      h("p", { class: "adm-muted" }, "Log in to edit your website."),
      input, btn, err,
    );
    root.replaceChildren(header(false), form);
    setTimeout(() => input.focus(), 50);
  }

  function header(loggedIn) {
    return h("header", { class: "adm-head" },
      h("div", { class: "adm-title" }, h("span", { class: "adm-badge" }, "Admin"), loggedIn ? h("span", { class: "adm-dirty", hidden: !dirty }, "Unsaved changes") : null),
      h("div", { class: "adm-head-actions" },
        loggedIn ? h("button", { class: "adm-icon", title: "Log out", onclick: logout }, "Log out") : null,
        h("button", { class: "adm-icon adm-close", title: "Close (Esc)", "aria-label": "Close", onclick: close }, "✕"),
      ),
    );
  }

  function viewEditor() {
    const tabs = h("nav", { class: "adm-tabs" }, TABS.map((t) =>
      h("button", { class: `adm-tab${t.id === tab ? " active" : ""}`, onclick: () => { tab = t.id; viewEditor(); } }, t.label)));
    const current = TABS.find((t) => t.id === tab);
    const body = h("div", { class: "adm-body" }, current.fields.map((f) => field(f, f.key)));
    const foot = h("footer", { class: "adm-foot" },
      h("button", { class: "adm-btn ghost", title: "Download a backup of all content", onclick: downloadJson }, "Backup"),
      h("button", { class: "adm-btn ghost", onclick: discard }, "Discard"),
      h("button", { class: "adm-btn primary adm-save", onclick: save, disabled: !dirty }, "Save changes"),
    );
    const sameTab = root.dataset.tab === tab;
    const scroll = root.querySelector(".adm-body")?.scrollTop;
    root.dataset.tab = tab;
    root.replaceChildren(header(true), tabs, body, foot);
    if (sameTab && scroll) body.scrollTop = scroll;
  }

  // ---------- fields ----------
  function field(f, path) {
    const value = get(draft, path);
    const label = h("label", { class: "adm-label" }, f.label);
    const hint = f.hint ? h("p", { class: "adm-hint" }, f.hint) : null;

    if (f.type === "text") {
      return h("div", { class: "adm-field" }, label,
        h("input", { class: "adm-input", type: "text", value: value ?? "", oninput: (e) => change(path, e.target.value) }), hint);
    }
    if (f.type === "textarea") {
      const ta = h("textarea", { class: "adm-input", rows: f.rows || 4, oninput: (e) => change(path, e.target.value) });
      ta.value = value ?? "";
      return h("div", { class: "adm-field" }, label, ta, hint);
    }
    if (f.type === "toggle") {
      return h("label", { class: "adm-field adm-toggle" },
        h("input", { type: "checkbox", checked: !!value, onchange: (e) => change(path, e.target.checked) }),
        h("span", { class: "adm-switch" }), h("span", {}, f.label));
    }
    if (f.type === "color") {
      const text = h("input", { class: "adm-input", type: "text", value: value || "", maxlength: 7 });
      const pick = h("input", { type: "color", class: "adm-color", value: /^#[0-9a-f]{6}$/i.test(value) ? value : "#d4ff5a" });
      pick.oninput = () => { text.value = pick.value; change(path, pick.value); };
      text.oninput = () => { if (/^#[0-9a-f]{6}$/i.test(text.value)) { pick.value = text.value; change(path, text.value); } };
      return h("div", { class: "adm-field" }, label, h("div", { class: "adm-row" }, pick, text), hint);
    }
    if (f.type === "tags") {
      const input = h("input", { class: "adm-input", type: "text", value: (value || []).join(", "),
        oninput: (e) => change(path, e.target.value.split(",").map((s) => s.trim()).filter(Boolean)) });
      return h("div", { class: "adm-field" }, label, input, h("p", { class: "adm-hint" }, "Separate with commas."));
    }
    if (f.type === "image") return imageField(f, path, value, label);
    if (f.type === "list") return listField(f, path, value || [], label);
    return null;
  }

  function imageField(f, path, value, label) {
    const status = h("span", { class: "adm-hint" });
    const picker = h("input", { type: "file", accept: "image/jpeg,image/png,image/webp,image/gif,image/avif", hidden: true });
    picker.onchange = async () => {
      const file = picker.files[0];
      if (!file) return;
      status.textContent = "Uploading…";
      try {
        const blob = await shrink(file);
        const r = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
          method: "POST", credentials: "same-origin", headers: { "Content-Type": blob.type }, body: blob,
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Upload failed.");
        change(path, j.url);
        toast("Image uploaded — remember to save");
        viewEditor();
      } catch (e) {
        status.textContent = "";
        toast(e.message, "err");
      }
    };
    const thumb = value
      ? h("img", { src: value, alt: "" })
      : h("span", { class: "adm-hint" }, "No image");
    return h("div", { class: "adm-field" }, label,
      h("div", { class: "adm-image" },
        h("div", { class: "adm-thumb" }, thumb),
        h("div", { class: "adm-image-actions" },
          h("button", { class: "adm-btn small", type: "button", onclick: () => picker.click() }, value ? "Change image" : "Upload image"),
          value ? h("button", { class: "adm-btn small ghost", type: "button", onclick: () => { change(path, ""); viewEditor(); } }, "Remove") : null,
          status, picker,
        ),
      ),
    );
  }

  function listField(f, path, items, label) {
    const move = (i, d) => {
      const arr = get(draft, path);
      const j = i + d;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      const a = `${path}.${i}`, b = `${path}.${j}`;
      const ao = openItems.has(a), bo = openItems.has(b);
      openItems.delete(a); openItems.delete(b);
      if (ao) openItems.add(b);
      if (bo) openItems.add(a);
      setDirty(true); preview(); viewEditor();
    };
    const remove = (i) => {
      const name = f.itemLabel(items[i]);
      if (!confirm(`Delete “${name}”?`)) return;
      get(draft, path).splice(i, 1);
      openItems.clear();
      setDirty(true); preview(); viewEditor();
    };
    const add = () => {
      if (!get(draft, path)) set(draft, path, []);
      const arr = get(draft, path);
      arr.push(f.blank());
      openItems.add(`${path}.${arr.length - 1}`);
      setDirty(true); preview(); viewEditor();
    };

    const rows = items.map((item, i) => {
      const key = `${path}.${i}`;
      const isOpen = openItems.has(key);
      const title = h("span", { class: "adm-item-title" }, f.itemLabel(item));
      const bodyEl = isOpen ? h("div", { class: "adm-item-body" }, f.fields.map((sf) => {
        const el = field(sf, `${key}.${sf.key}`);
        // keep the row title in sync while typing
        el?.addEventListener?.("input", () => (title.textContent = f.itemLabel(get(draft, key))));
        return el;
      })) : null;
      return h("div", { class: `adm-item${isOpen ? " open" : ""}` },
        h("div", { class: "adm-item-head" },
          h("button", { class: "adm-item-toggle", type: "button", onclick: () => { isOpen ? openItems.delete(key) : openItems.add(key); viewEditor(); } },
            h("span", { class: "adm-caret" }, "›"), title),
          h("div", { class: "adm-item-actions" },
            h("button", { class: "adm-mini", type: "button", title: "Move up", disabled: i === 0, onclick: () => move(i, -1) }, "↑"),
            h("button", { class: "adm-mini", type: "button", title: "Move down", disabled: i === items.length - 1, onclick: () => move(i, 1) }, "↓"),
            h("button", { class: "adm-mini danger", type: "button", title: "Delete", onclick: () => remove(i) }, "✕"),
          ),
        ),
        bodyEl,
      );
    });

    return h("div", { class: "adm-field adm-list" },
      h("div", { class: "adm-list-head" }, label, h("span", { class: "adm-count" }, String(items.length))),
      rows,
      h("button", { class: "adm-btn small dashed", type: "button", onclick: add }, "+ Add"),
    );
  }

  // Resize big photos in the browser so uploads are fast and under the size limit
  async function shrink(file, max = 2000) {
    if (file.type === "image/gif" || file.size < 600_000) return file;
    const bmp = await createImageBitmap(file).catch(() => null);
    if (!bmp) return file;
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const canvas = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * scale), height: Math.round(bmp.height * scale) });
    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const out = await new Promise((r) => canvas.toBlob(r, "image/webp", 0.86));
    return out && out.size < file.size ? out : file;
  }

  // ---------- actions ----------
  async function save() {
    const btn = root.querySelector(".adm-save");
    btn.disabled = true; btn.textContent = "Saving…";
    try {
      await api("/api/content", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: draft }) });
      saved = clone(draft);
      window.Site.content = clone(draft);
      setDirty(false);
      toast("Saved — your site is updated");
    } catch (e) {
      if (/logged in/i.test(e.message)) { toast("Session expired — log in again", "err"); return viewLogin(); }
      toast(e.message, "err");
      btn.disabled = false;
    } finally {
      btn.textContent = "Save changes";
    }
  }

  function discard() {
    if (dirty && !confirm("Discard all unsaved changes?")) return;
    draft = clone(saved);
    setDirty(false);
    preview();
    viewEditor();
  }

  function downloadJson() {
    const a = h("a", { href: URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" })), download: "content.json" });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function logout() {
    if (dirty && !confirm("You have unsaved changes. Log out anyway?")) return;
    await api("/api/auth", { method: "DELETE" }).catch(() => {});
    draft = clone(saved || window.Site.content);
    setDirty(false);
    preview();
    viewLogin();
  }

  async function startEditing() {
    // Pull the freshest saved content (skips the CDN cache)
    try {
      const j = await api("/api/content?fresh=1");
      if (j.content) window.Site.content = j.content;
    } catch {}
    saved = clone(window.Site.content);
    draft = clone(saved);
    setDirty(false);
    preview();
    viewEditor();
  }

  // ---------- open / close ----------
  async function open() {
    root.hidden = false;
    document.body.classList.add("adm-open");
    requestAnimationFrame(() => root.classList.add("show"));
    if (draft) return viewEditor();
    root.replaceChildren(header(false), h("div", { class: "adm-loading" }, "Loading…"));
    try {
      const { isAdmin } = await api("/api/auth");
      isAdmin ? await startEditing() : viewLogin();
    } catch {
      viewLogin("Can't reach the server. The admin panel only works on the live (Vercel) site.");
    }
  }

  function close() {
    if (dirty && !confirm("You have unsaved changes. Close and discard them?")) return;
    if (dirty) { draft = clone(saved); setDirty(false); preview(); }
    root.classList.remove("show");
    document.body.classList.remove("adm-open");
    setTimeout(() => (root.hidden = true), 300);
    if (location.hash === "#admin") history.replaceState(null, "", location.pathname + location.search);
  }

  window.addEventListener("keydown", (e) => {
    if (root.hidden) return;
    if (e.key === "Escape") close();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s" && dirty) { e.preventDefault(); save(); }
  });
  window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  window.Admin = { open, close };
})();
