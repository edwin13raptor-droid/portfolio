// ---------- Year ----------
document.querySelectorAll(".year").forEach((el) => (el.textContent = new Date().getFullYear()));

// ---------- Nav ----------
const nav = document.querySelector(".nav");
const toggle = document.querySelector(".nav-toggle");
const links = document.querySelector(".nav-links");

window.addEventListener("scroll", () => nav.classList.toggle("scrolled", window.scrollY > 10), { passive: true });

toggle?.addEventListener("click", () => {
  const open = links.classList.toggle("open");
  toggle.setAttribute("aria-expanded", String(open));
});
links?.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    links.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
  })
);

// ---------- Reveal on scroll ----------
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visible"); io.unobserve(e.target); }
  }),
  { threshold: 0.12 }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

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
