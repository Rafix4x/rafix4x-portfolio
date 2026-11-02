import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { createScene } from "./scene.js";
import { buildTechGrid } from "./tech.js";

gsap.registerPlugin(ScrollTrigger, SplitText);

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* ------------------------------------------------------------------ brand motion identity
   personality: Premium (350–600ms, no overshoot, single signature easing). */
gsap.defaults({ duration: 0.5, ease: "power3.out" });

/* ------------------------------------------------------------------ 3D scene */
let sceneLoaded;
const sceneGate = new Promise((resolve) => { sceneLoaded = resolve; });

try {
  const scene = createScene($("#scene"), { onReady: sceneLoaded });
  window.addEventListener("pagehide", () => scene.dispose(), { once: true });
} catch (err) {
  console.error("3D scene unavailable:", err);
  sceneLoaded();
}
setTimeout(sceneLoaded, 5000);

/* ------------------------------------------------------------------ tech grid */
let tech = null;
try {
  tech = buildTechGrid($("#techGrid"));
} catch (err) {
  console.error("Tech grid unavailable:", err);
}

/* ------------------------------------------------------------------ loader → entrance */
const loader = $("#loader");
const loaderPct = $("#loaderPct");
let progress = { v: 0 };

const intro = gsap.timeline({ paused: true });

function buildIntro() {
  intro
    .from(".hero-title .split-line", { yPercent: 115, duration: 1.05, ease: "power4.out", stagger: 0.09 })
    .from(".kicker, [data-intro]", { y: 18, autoAlpha: 0, duration: 0.7, stagger: 0.06 }, 0.35)
    .from(".nav > *", { y: -12, autoAlpha: 0, duration: 0.6, stagger: 0.05 }, 0.2)
    .from(".hero-foot", { borderTopColor: "rgba(231,240,255,0)", duration: 0.6 }, 0.6);
}

/* The hero is only ever hidden by a `.from()` tween, so if the timeline never
   plays the page would sit blank behind a loader. This is the one escape hatch:
   drop the overlay and show everything as authored. */
function revealNow() {
  document.body.classList.remove("locked");
  if (loader && loader.isConnected) loader.remove();
  intro.progress(1).pause();
}

async function boot() {
  document.body.classList.add("locked");

  // hold the number short of 100 until the first WebGL frame is on screen
  const fill = gsap.to(progress, {
    v: 92,
    duration: 1.4,
    ease: "power2.out",
    onUpdate: () => {
      if (loaderPct) loaderPct.textContent = String(Math.round(progress.v)).padStart(2, "0");
    },
  });

  await Promise.all([sceneGate, new Promise((r) => (document.readyState === "complete" ? r() : addEventListener("load", r, { once: true })))]);

  fill.kill();
  await new Promise((r) => gsap.to(progress, {
    v: 100,
    duration: 0.3,
    ease: "none",
    onUpdate: () => { if (loaderPct) loaderPct.textContent = "100"; },
    onComplete: r,
  }));

  await gsap.to(loader, {
    autoAlpha: 0,
    duration: 0.5,
    ease: "power2.in",
  });

  loader?.remove();
  document.body.classList.remove("locked");

  buildIntro();
  intro.play();
  ScrollTrigger.refresh();
  setTimeout(() => ScrollTrigger.refresh(), 400);
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (reducedMotion) {
  revealNow();
  gsap.set("[data-intro], .split-line", { clearProps: "all" });
} else {
  boot();
}

/* Watchdog: slow phones, backgrounded tabs and stalled font loads can strand the
   boot promise, so the page is always visible within a few seconds regardless. */
setTimeout(revealNow, 4200);

/* ------------------------------------------------------------------ headline splits
   Runs before the intro timeline is built so it can animate the split lines. */
const heroTitle = $(".hero-title");
if (heroTitle) {
  for (const line of $$("[data-line]", heroTitle)) {
    line.setAttribute("aria-label", line.textContent);
    const split = SplitText.create(line, { type: "lines", linesClass: "split-line" });
    split.lines.forEach((l) => l.setAttribute("aria-hidden", "true"));
  }
}

for (const h2 of $$("h2[data-split]")) {
  SplitText.create(h2, { type: "lines", linesClass: "split-line" });

  gsap.from(h2.querySelectorAll(".split-line"), {
    yPercent: 110,
    opacity: 0,
    duration: 0.85,
    ease: "power3.out",
    stagger: 0.07,
    scrollTrigger: { trigger: h2, start: "top 82%", once: true },
  });
}

/* ------------------------------------------------------------------ scroll reveals
   One tween per element instead of one per section: a deep-linked or fast-scrolled
   section can never leave elements stranded mid-transition. Stagger budget stays
   in the 50–80ms band, capped so a group never exceeds ~400ms. */
gsap.utils.toArray(".section").forEach((section) => {
  const targets = $$("[data-intro], [data-project], .service, .tech", section).filter(
    (el) => !el.closest(".hero")
  );
  if (!targets.length) return;

  ScrollTrigger.batch(targets, {
    start: "top 88%",
    once: true,
    onEnter: (batch) =>
      gsap.fromTo(
        batch,
        { y: 22, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.7,
          ease: "power3.out",
          stagger: { each: 0.06, max: 0.36 },
          overwrite: true,
        }
      ),
  });
});

/* hero meta gets its own timing so it doesn't wait on the intro timeline */
gsap.from(".hero-meta div", {
  y: 14,
  autoAlpha: 0,
  duration: 0.6,
  stagger: 0.05,
  delay: 1.1,
  ease: "power3.out",
});

/* ------------------------------------------------------------------ marquee: seamless, pausable */
const track = $("[data-marquee]");
if (track) {
  const clone = track.cloneNode(true);
  track.append(...clone.childNodes);

  const loop = gsap.to(track, {
    xPercent: -50,
    ease: "none",
    duration: 42,
    repeat: -1,
  });

  ScrollTrigger.create({
    trigger: track,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => (self.isActive ? loop.play() : loop.pause()),
  });

  track.closest(".marquee")?.addEventListener("pointerenter", () => loop.timeScale(0.25));
  track.closest(".marquee")?.addEventListener("pointerleave", () => loop.timeScale(1));
}

/* ------------------------------------------------------------------ counters */
for (const el of $$("[data-count]")) {
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix || "";

  gsap.fromTo(
    el,
    { innerText: 0 },
    {
      innerText: target,
      duration: 1.8,
      ease: "power2.out",
      snap: { innerText: 1 },
      onComplete: () => { el.textContent = `${target}${suffix}`; },
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    }
  );
}

/* ------------------------------------------------------------------ nav */
const nav = $("#nav");
const navProgress = $("#navProgress");
const links = $$(".nav-links a");
const linked = links.map((a) => ({ a, el: $(a.getAttribute("href")) })).filter((s) => s.el);

let ticking = false;
function onFrame() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  navProgress.style.width = `${max > 0 ? (y / max) * 100 : 0}%`;
  nav.classList.toggle("shrink", y > 24);

  let current = linked[0];
  for (const s of linked) if (s.el.getBoundingClientRect().top <= innerHeight * 0.4) current = s;
  for (const s of linked) s.a.classList.toggle("active", s.a === current?.a);
  ticking = false;
}

addEventListener("scroll", () => {
  if (!ticking) { ticking = true; requestAnimationFrame(onFrame); }
}, { passive: true });
onFrame();

/* ------------------------------------------------------------------ typed terminal */
const SNIPPET = [
  { t: "// who is this guy\n", k: "k-cmt" },
  { t: "const rafi = {\n" },
  { t: "  focus: ", k: "k-prop" },
  { t: '["backend", "apis", "automation"],\n', k: "k-str" },
  { t: "  stack: ", k: "k-prop" },
  { t: '["node", "express", "python", "go"],\n', k: "k-str" },
  { t: "  learning: ", k: "k-prop" },
  { t: '["system design", "cloud"],\n', k: "k-str" },
  { t: "  based: ", k: "k-prop" },
  { t: '"bangladesh",\n', k: "k-str" },
  { t: "  github: ", k: "k-prop" },
  { t: '"Rafix4x",\n', k: "k-str" },
  { t: "};" },
];

const typedEl = $("#typed");

function renderTerminal(chars) {
  if (!typedEl) return;
  typedEl.textContent = "";
  let left = chars;
  for (const part of SNIPPET) {
    if (left <= 0) break;
    const span = document.createElement("span");
    if (part.k) span.className = part.k;
    span.textContent = part.t.slice(0, left);
    typedEl.append(span);
    left -= part.t.length;
  }
}

const fullText = SNIPPET.reduce((n, p) => n + p.t.length, 0);

if (typedEl) {
  if (reducedMotion) {
    renderTerminal(fullText);
  } else {
    renderTerminal(0);
    const state = { chars: 0 };
    ScrollTrigger.create({
      trigger: typedEl,
      start: "top 80%",
      once: true,
      onEnter: () => {
        gsap.to(state, {
          chars: fullText,
          duration: fullText / 55,
          ease: "none",
          onUpdate: () => renderTerminal(Math.round(state.chars)),
        });
      },
    });
  }
}

/* ------------------------------------------------------------------ project rows: hairline draw + micro parallax */
for (const row of $$("[data-project]")) {
  const bar = row.querySelector(".project-link");
  if (!bar) continue;

  gsap.from(row, {
    y: 18,
    autoAlpha: 0,
    duration: 0.7,
    ease: "power3.out",
    scrollTrigger: { trigger: row, start: "top 88%", once: true },
  });
}

/* ------------------------------------------------------------------ GitHub stars */
async function loadStars() {
  await Promise.all(
    $$("[data-repo]").map(async (el) => {
      try {
        const res = await fetch(`https://api.github.com/repos/Rafix4x/${el.dataset.repo}`);
        if (!res.ok) return;
        const { stargazers_count: stars } = await res.json();
        if (stars > 0) el.textContent = `★ ${stars}`;
      } catch {
        /* offline or rate-limited — the row simply has no star count */
      }
    })
  );
}
loadStars();

/* ------------------------------------------------------------------ misc */
const yearEl = $("#year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

window.addEventListener("pagehide", () => tech?.dispose?.(), { once: true });
addEventListener("load", () => ScrollTrigger.refresh());
