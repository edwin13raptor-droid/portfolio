// Default website content. The admin panel saves changes on top of this (stored in Vercel Blob).
// It is a .js file (not .json) so the site also works when you open the HTML files directly.
window.DEFAULT_CONTENT = {
  "site": {
    "name": "Edwin Dol",
    "role": "Website Designer",
    "title": "Edwin Dol — Website Designer",
    "description": "Edwin Dol is an independent website designer creating considered, high-end websites for brands that care about detail.",
    "email": "edwin13.raptor@gmail.com",
    "location": "Netherlands — working worldwide",
    "available": true,
    "availableText": "Available for new projects",
    "accent": "#d4ff5a",
    "socials": []
  },
  "home": {
    "heading": "Websites, designed\nwith *intention.*",
    "lead": "I'm Edwin Dol, an independent website designer. I create quiet, considered websites for brands that value clarity, craft and detail.",
    "ctaPrimary": "Start your project",
    "ctaSecondary": "View work",
    "stats": [
      { "value": "100%", "label": "Custom design — no templates" },
      { "value": "24h", "label": "Reply time" },
      { "value": "1 week", "label": "To launch a homepage" },
      { "value": "7+", "label": "Main pages capped in price" }
    ],
    "showClients": false,
    "clients": ["Add your first client here"],
    "featuredHeading": "Selected *work*",
    "featuredText": "Two concept sites — click one to open its full homepage. Each is designed from scratch around the brand, the audience and the goal.",
    "introHeading": "I design websites that feel *effortless* — and work hard for your business.",
    "introText": "Every site I make starts with understanding what you need it to do. Then I design something that looks premium, loads fast and turns visitors into customers.",
    "marquee": ["Design", "Develop", "Launch", "Grow"],
    "playgroundHeading": "Try it — *your* site,\nyour style.",
    "playgroundText": "Pick a style and a colour and watch the website change live. Every site I build is designed around your brand like this.",
    "ctaHeading": "Your business deserves\na site like *this.*",
    "ctaText": "Fast, beautiful and built to win customers. Tell me about your project and get a quote within 24 hours.",
    "ctaButton": "Start your project",
    "testimonialsHeading": "Kind *words*",
    "showTestimonials": false,
    "testimonials": [
      { "quote": "Replace this with a real quote from your first happy client.", "name": "Client name", "role": "Role, Company" },
      { "quote": "Add a second real testimonial here — then switch this section on in the admin panel.", "name": "Client name", "role": "Role, Company" }
    ]
  },
  "work": {
    "eyebrow": "Work",
    "heading": "Selected *projects*",
    "intro": "Concept websites that show what I can build for you. Click a project to open its full homepage — each one is custom-designed, fast and built to grow the business behind it.",
    "projects": [
      { "id": "p1", "title": "Lumen Café", "subtitle": "Concept site — a warm neighbourhood café with menu and online orders", "category": "Hospitality", "year": "2026", "color": "#c98b5a", "tags": ["Concept", "Web Design", "Ordering"], "image": "", "url": "demos/lumen-cafe/index.html" },
      { "id": "p2", "title": "Northwind Studio", "subtitle": "Concept site — a minimal portfolio for an architecture studio", "category": "Architecture", "year": "2026", "color": "#7f97b2", "tags": ["Concept", "UI / UX", "Portfolio"], "image": "", "url": "demos/northwind-studio/index.html" }
    ]
  },
  "services": {
    "eyebrow": "Services",
    "heading": "Everything you need\nto look *world-class* online",
    "intro": "From a single landing page to a full website — designed, built, launched and looked after.",
    "items": [
      { "id": "s1", "title": "Website Design", "text": "Custom, considered designs tailored to your brand — never templates.", "points": ["Brand-led art direction", "Mobile-first layouts", "Design system & components"] },
      { "id": "s2", "title": "Development", "text": "Fast, responsive builds that feel effortless on every device.", "points": ["Lightning-fast loading", "SEO-ready structure", "Edit content yourself"] },
      { "id": "s3", "title": "Landing Pages", "text": "Focused pages for launches, campaigns and lead generation.", "points": ["Conversion-focused copy", "A/B ready", "Analytics set up"] },
      { "id": "s4", "title": "Care & Support", "text": "Hosting, updates and small changes, so your site stays perfect.", "points": ["Hosting & domain help", "Monthly updates", "Priority support"] }
    ],
    "packagesHeading": "Pricing",
    "packagesText": "Simple, transparent pricing: main pages and inner pages each have a price cap, so big sites never get out of hand.",
    "pricing": {
      "currency": "USD",
      "homePage": 100,
      "extraPage": 150,
      "largeAfter": 6,
      "largePrice": 1000,
      "innerPage": 25,
      "innerCapAfter": 30,
      "innerCap": 750
    },
    "packages": [
      { "id": "pk1", "name": "Single page", "amount": 100, "from": false, "pagesLabel": "1 main page", "text": "One custom-designed homepage — the fastest way to get online.", "features": ["Custom design", "Contact form", "Mobile optimised", "Basic SEO", "+ {inner} per inner page"], "featured": false },
      { "id": "pk2", "name": "Business", "amount": 250, "from": true, "pagesLabel": "2 – {largeAfter} main pages", "text": "Homepage {home} + {page} for each additional main page.", "features": ["Up to {largeAfter} custom pages", "Edit it yourself (CMS)", "Booking or contact forms", "SEO & analytics", "+ {inner} per inner page"], "featured": true },
      { "id": "pk3", "name": "Unlimited", "amount": 1000, "from": false, "pagesLabel": "{largeAfterPlus}+ main pages", "text": "Main pages are capped at {large} — add as many as you need.", "features": ["Unlimited main pages", "Online shop / payments", "Custom animations", "Multi-language", "+ {inner} per inner page"], "featured": false }
    ],
    "processHeading": "How it *works*",
    "steps": [
      { "id": "st1", "title": "Brief", "text": "You fill in my project form so I know exactly what you need." },
      { "id": "st2", "title": "Design", "text": "I design the look and layout, and we refine it together." },
      { "id": "st3", "title": "Build", "text": "Your site gets built — fast, responsive and SEO-ready." },
      { "id": "st4", "title": "Launch", "text": "We go live on your domain, and I'm here for support afterwards." }
    ],
    "faqHeading": "Questions",
    "faq": [
      { "id": "f1", "q": "How long does a website take?", "a": "Most websites take 2–4 weeks from brief to launch. A landing page can be ready in about a week." },
      { "id": "f2", "q": "Do I need my own domain?", "a": "No problem if you don't have one yet — I'll help you choose and set it up." },
      { "id": "f3", "q": "Can I edit the website myself?", "a": "Yes. I can add an easy admin panel so you can change text and images without touching code." },
      { "id": "f4", "q": "What do you need from me?", "a": "Your logo (if you have one), some photos and a few words about your business. I can help with the rest." },
      { "id": "f5", "q": "How does payment work?", "a": "50% to start, 50% at launch. For larger projects we can split it into more parts." },
      { "id": "f6", "q": "Why are prices shown in my currency?", "a": "The site detects your region and converts my prices (set in US dollars) at today's exchange rate. The final quote is confirmed after the brief." },
      { "id": "f7", "q": "What's the difference between main and inner pages?", "a": "Main pages are custom-designed layouts like Home, About or Contact. Inner pages reuse a template — like blog posts, products or portfolio items. Main pages are capped at $1,000 from 7 pages; inner pages are $25 each, capped at $750 once you have more than 30." }
    ]
  },
  "about": {
    "eyebrow": "About",
    "heading": "Design with *purpose.*",
    "intro": "I'm Edwin Dol — an independent website designer helping brands and small businesses look as good online as they are in real life.",
    "body": "I believe a great website should do more than look good — it should help your business grow. I combine clean design, smooth user experience and solid code to build sites that feel effortless to use.\n\nWorking alone means you always talk directly to the person designing your site. No account managers, no hand-offs — just fast, honest collaboration.\n\nWhen I'm not designing, you'll find me exploring new design trends, gaming, or sketching ideas for the next project.",
    "photo": "",
    "valuesHeading": "What I *care* about",
    "values": [
      { "id": "v1", "title": "Clarity", "text": "Every element earns its place. Less noise, more meaning." },
      { "id": "v2", "title": "Craft", "text": "Spacing, type, motion — the small details that make it feel premium." },
      { "id": "v3", "title": "Results", "text": "Beautiful is the baseline. The real goal is more customers for you." }
    ],
    "experienceHeading": "Experience",
    "experience": [
      { "id": "e1", "year": "2024 — now", "title": "Independent Website Designer", "text": "Designing and building websites for brands across Europe." },
      { "id": "e2", "year": "2022 — 2024", "title": "Freelance Web Designer", "text": "Landing pages and websites for local businesses and startups." },
      { "id": "e3", "year": "2021", "title": "First client website", "text": "Where it all started — and I haven't stopped since." }
    ],
    "skillsHeading": "Tools",
    "skills": ["Figma", "HTML / CSS", "JavaScript", "Webflow", "WordPress", "Framer", "Responsive Design", "SEO", "Vercel"]
  },
  "contact": {
    "eyebrow": "Contact",
    "heading": "Let's *talk.*",
    "text": "Quick question? Send a message. Ready to start a website? The project form helps me give you a quote faster.",
    "briefHeading": "Starting a new website?",
    "briefText": "Fill in the project brief — about 5 minutes — and get a quote within 24 hours.",
    "response": "I reply within 24 hours, Monday to Saturday."
  }
};
