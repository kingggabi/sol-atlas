/* ============================================================
   Sol Atlas: solar system explorer
   ============================================================ */

// size and orbit radius are in map units (the map is 1000 units wide).
// period is the stylised time for one lap around the Sun.
const BODIES = [
  {
    id: "sun", name: "The Sun", type: "Star (G-type main sequence)",
    size: 130, spin: "60s", tilt: 7.25,
    accent: "#FFB53D",
    desc: "The Sun is a ball of hydrogen and helium plasma about 4.6 billion years old. In its core it fuses roughly 600 million tonnes of hydrogen into helium every second, and the energy from that reaction is the light and heat that reach Earth. Its gravity keeps every planet, moon, asteroid and comet in the solar system in orbit.",
    stats: [
      ["Diameter", "1,392,700 km"],
      ["Distance from Earth", "149.6 million km"],
      ["Rotation (equator)", "about 25 days"],
      ["Surface temperature", "about 5,500 °C"],
      ["Core temperature", "about 15 million °C"],
      ["Age", "about 4.6 billion years"],
    ],
    fact: "The Sun holds 99.86% of all the mass in the solar system. About 1.3 million Earths would fit inside it.",
  },
  {
    id: "mercury", name: "Mercury", type: "Rocky planet",
    size: 18, orbit: 112, period: "7s", spin: "40s", tilt: 0.03,
    accent: "#B5B0AB",
    desc: "Mercury is the smallest planet and the closest one to the Sun. It has almost no atmosphere, so its cratered surface can't hold on to heat: the day side bakes and the night side freezes. Up close it looks a lot like our Moon.",
    stats: [
      ["Diameter", "4,879 km"],
      ["Distance from Sun", "57.9 million km"],
      ["Day length", "58.6 Earth days"],
      ["Year length", "88 Earth days"],
      ["Moons", "0"],
      ["Temperature", "−180 to 430 °C"],
    ],
    fact: "From one sunrise to the next takes 176 Earth days on Mercury, which is two of its years.",
  },
  {
    id: "venus", name: "Venus", type: "Rocky planet",
    size: 26, orbit: 152, period: "11s", spin: "60s", tilt: 177.4, retro: true,
    accent: "#F0C878",
    desc: "Venus is nearly the same size as Earth, but its thick carbon dioxide atmosphere traps so much heat that it is the hottest planet, hotter than Mercury. Clouds of sulphuric acid cover the whole planet, and the pressure at the surface is about 90 times what it is on Earth.",
    stats: [
      ["Diameter", "12,104 km"],
      ["Distance from Sun", "108.2 million km"],
      ["Day length", "243 Earth days"],
      ["Year length", "225 Earth days"],
      ["Moons", "0"],
      ["Average temperature", "about 465 °C"],
    ],
    fact: "Venus spins backwards compared with most planets, and so slowly that one day there is longer than its year.",
  },
  {
    id: "earth", name: "Earth", type: "Rocky planet",
    size: 28, orbit: 196, period: "16s", spin: "14s", tilt: 23.4,
    accent: "#4AA3FF",
    desc: "Earth is the only planet we know of with liquid water on its surface and life. Its magnetic field and atmosphere of nitrogen and oxygen block most of the Sun's harmful radiation. The Moon keeps Earth's tilt steady and causes the tides.",
    stats: [
      ["Diameter", "12,742 km"],
      ["Distance from Sun", "149.6 million km"],
      ["Day length", "23 h 56 min"],
      ["Year length", "365.25 days"],
      ["Moons", "1"],
      ["Average temperature", "about 15 °C"],
    ],
    fact: "Water covers about 71% of Earth's surface but makes up only a tiny fraction of the planet's mass.",
  },
  {
    id: "mars", name: "Mars", type: "Rocky planet",
    size: 22, orbit: 238, period: "24s", spin: "15s", tilt: 25.2,
    accent: "#E8673A",
    desc: "Mars is red because its dust is full of iron oxide, which is rust. It is a cold desert with ice caps at both poles and dry riverbeds that show water once flowed there. Rovers on the surface are looking for signs of ancient life.",
    stats: [
      ["Diameter", "6,779 km"],
      ["Distance from Sun", "227.9 million km"],
      ["Day length", "24 h 37 min"],
      ["Year length", "687 Earth days"],
      ["Moons", "2 (Phobos and Deimos)"],
      ["Average temperature", "about −65 °C"],
    ],
    fact: "Olympus Mons, a volcano on Mars, is about 22 km high, nearly three times the height of Mount Everest.",
  },
  {
    id: "jupiter", name: "Jupiter", type: "Gas giant",
    size: 62, orbit: 300, period: "42s", spin: "8s", tilt: 3.1,
    accent: "#E3B28A",
    desc: "Jupiter has more than twice the mass of all the other planets put together. The stripes are bands of ammonia and water clouds in a deep atmosphere of hydrogen and helium. It also has the strongest magnetic field of any planet.",
    stats: [
      ["Diameter", "139,820 km"],
      ["Distance from Sun", "778.5 million km"],
      ["Day length", "9 h 56 min"],
      ["Year length", "11.9 Earth years"],
      ["Moons", "95+"],
      ["Cloud-top temperature", "about −110 °C"],
    ],
    fact: "The Great Red Spot is a storm wider than Earth. It has been going for at least 190 years.",
  },
  {
    id: "saturn", name: "Saturn", type: "Gas giant",
    size: 44, orbit: 372, period: "60s", spin: "9s", tilt: 26.7, rings: true,
    accent: "#E8D4A6",
    desc: "Saturn's rings are made of countless pieces of ice and rock, from grains of dust to chunks the size of a house. The planet itself is mostly hydrogen and helium. Its largest moon, Titan, has a thick atmosphere and lakes of liquid methane.",
    stats: [
      ["Diameter", "116,460 km"],
      ["Distance from Sun", "1.43 billion km"],
      ["Day length", "10 h 33 min"],
      ["Year length", "29.4 Earth years"],
      ["Moons", "274"],
      ["Cloud-top temperature", "about −140 °C"],
    ],
    fact: "Saturn is less dense than water. In a bathtub big enough, it would float.",
  },
  {
    id: "uranus", name: "Uranus", type: "Ice giant",
    size: 34, orbit: 432, period: "80s", spin: "12s", tilt: 97.8, retro: true, rings: true,
    accent: "#8FDDE6",
    desc: "Uranus rotates on its side, probably because something huge hit it long ago. Methane in the atmosphere absorbs red light, which gives the planet its pale blue-green colour. It has the coldest atmosphere of any planet and 13 known faint rings.",
    stats: [
      ["Diameter", "50,724 km"],
      ["Distance from Sun", "2.87 billion km"],
      ["Day length", "17 h 14 min"],
      ["Year length", "84 Earth years"],
      ["Moons", "29"],
      ["Coldest recorded", "about −224 °C"],
    ],
    fact: "Because of its 98° tilt, each pole gets about 42 years of daylight and then 42 years of night.",
  },
  {
    id: "neptune", name: "Neptune", type: "Ice giant",
    size: 32, orbit: 480, period: "100s", spin: "11s", tilt: 28.3,
    accent: "#6F8BFF",
    desc: "Neptune is the farthest planet from the Sun. Methane gives it a deep blue colour. It has the fastest winds measured anywhere in the solar system.",
    stats: [
      ["Diameter", "49,244 km"],
      ["Distance from Sun", "4.5 billion km"],
      ["Day length", "16 h 6 min"],
      ["Year length", "164.8 Earth years"],
      ["Moons", "16"],
      ["Average temperature", "about −200 °C"],
    ],
    fact: "Astronomers found Neptune in 1846 by working out where it had to be from the way it pulled on Uranus.",
  },
];

/* ---------------- Small CSS planet (used for the panel preview) ---------------- */

function createBody(body, size) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `body ${body.id}`;
  el.dataset.id = body.id;
  el.style.setProperty("--size", `${size}px`);
  el.style.setProperty("--spin", body.spin);
  el.style.setProperty("--tilt", `${body.retro ? body.tilt - 180 : body.tilt}deg`);
  if (body.retro) el.style.setProperty("--dir", "reverse");

  el.innerHTML = `
    <span class="stage">
      ${body.id === "sun" ? '<span class="corona"></span>' : ""}
      <span class="tilt">
        ${body.rings ? '<span class="ring back"></span>' : ""}
        <span class="sphere"><span class="surface"></span><span class="shade"></span></span>
        ${body.rings ? '<span class="ring front"></span>' : ""}
      </span>
    </span>
    <span class="label">${body.id === "sun" ? "Sun" : body.name}</span>`;
  return el;
}

/* ---------------- Info panel ---------------- */

const panel = document.getElementById("panel");
const panelEmpty = document.getElementById("panel-empty");
const panelBody = document.getElementById("panel-body");
const chips = document.getElementById("body-chips");
const $ = (id) => document.getElementById(id);
let selectedId = null;

function showInfo(id) {
  const index = BODIES.findIndex((b) => b.id === id);
  const b = BODIES[index];
  if (!b) return;

  chips.querySelectorAll(".chip").forEach((el) =>
    el.classList.toggle("is-selected", el.dataset.id === id)
  );
  if (id === selectedId) return;
  selectedId = id;

  panel.style.setProperty("--accent", b.accent);
  $("p-index").textContent = String(index).padStart(2, "0");
  $("p-type").textContent = b.type;
  $("p-name").textContent = b.name;
  $("p-tagline").textContent = index === 0
    ? "At the centre of the solar system"
    : `Planet ${index} from the Sun`;
  $("p-desc").textContent = b.desc;
  $("p-fact").textContent = b.fact;
  $("p-stats").innerHTML = b.stats
    .map(([k, v]) => `<div class="stat"><dt>${k}</dt><dd>${v}</dd></div>`)
    .join("");

  const preview = $("p-preview");
  preview.innerHTML = "";
  const previewSize = b.id === "sun" ? 96 : b.rings ? 64 : 84;
  const clone = createBody(b, previewSize);
  clone.tabIndex = -1;
  clone.setAttribute("aria-hidden", "true");
  clone.querySelector(".label").remove();
  if (b.rings) clone.style.paddingInline = `${previewSize * 0.7}px`;
  preview.appendChild(clone);

  panelEmpty.hidden = true;
  panelBody.hidden = false;
  panelBody.classList.remove("enter");
  void panelBody.offsetWidth; // restart the entrance animation
  panelBody.classList.add("enter");
}

function revealPanel() {
  const rect = panel.getBoundingClientRect();
  if (rect.top > window.innerHeight * 0.75 || rect.bottom < 0) {
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/* ---------------- Planet buttons ---------------- */

// The 3D scene, once it has loaded. The buttons work without it.
let solar = null;

BODIES.forEach((b) => {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.dataset.id = b.id;
  chip.setAttribute("role", "listitem");
  chip.style.setProperty("--accent", b.accent);
  chip.innerHTML = `<span class="chip-dot" aria-hidden="true"></span>${b.id === "sun" ? "Sun" : b.name}`;

  // Hovering or focusing a button enlarges that body in the scene, like hovering the body itself
  const preview = (on) => {
    solar?.hover(on ? b.id : null);
    if (on) showInfo(b.id);
  };
  chip.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") preview(true); });
  chip.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") preview(false); });
  chip.addEventListener("focus", () => preview(true));
  chip.addEventListener("blur", () => preview(false));
  chip.addEventListener("click", () => {
    showInfo(b.id);
    solar?.focus(b.id);
  });
  chip.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") revealPanel();
  });
  chips.appendChild(chip);
});

/* ---------------- 3D scene ---------------- */

const stage = document.getElementById("system3d");
const solarCanvas = document.getElementById("solar-canvas");
const overviewBtn = document.getElementById("overview-btn");
const status = document.getElementById("system-status");

async function initScene() {
  try {
    const [THREE, { OrbitControls }, { EffectComposer }, { RenderPass }, { UnrealBloomPass }] = await Promise.all([
      import("three"),
      import("three/addons/controls/OrbitControls.js"),
      import("three/addons/postprocessing/EffectComposer.js"),
      import("three/addons/postprocessing/RenderPass.js"),
      import("three/addons/postprocessing/UnrealBloomPass.js"),
    ]);

    const small = window.matchMedia("(max-width: 640px)").matches;
    solar = createSolarSystem({
      THREE, OrbitControls, EffectComposer, RenderPass, UnrealBloomPass,
      canvas: solarCanvas,
      labelLayer: document.getElementById("labels3d"),
      bodies: BODIES,
      width: stage.clientWidth,
      height: stage.clientHeight,
      updateStyle: false,
      sizeBoost: small ? 1.7 : 1,
      textureSize: small ? 256 : 512,
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
  } catch (err) {
    console.error(err);
    status.textContent = "The 3D view couldn't load here. Use the buttons below to read about each planet.";
    stage.classList.add("is-failed");
    return;
  }

  status.hidden = true;
  stage.classList.add("is-ready");

  solar.on("hover", (id) => { if (id) showInfo(id); });
  solar.on("select", (id) => showInfo(id));
  solar.on("hold", (id) => showInfo(id));
  solar.on("release", () => setTimeout(revealPanel, 250));
  solar.on("focus", (id) => { overviewBtn.hidden = !id; });
  overviewBtn.addEventListener("click", () => solar.focus(null));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && solar.focused) solar.focus(null);
  });

  // Mobile browsers fire resize when the address bar hides; only resize when the stage size really changed
  let lastSize = "";
  new ResizeObserver(() => {
    const size = `${stage.clientWidth}x${stage.clientHeight}`;
    if (size === lastSize) return;
    lastSize = size;
    solar.resize(stage.clientWidth, stage.clientHeight);
  }).observe(stage);

  // Only animate while the scene is on screen
  new IntersectionObserver(([entry]) => solar.setRunning(entry.isIntersecting)).observe(stage);
}

initScene();

/* ---------------- Starfield ---------------- */

(function starfield() {
  const canvas = document.getElementById("starfield");
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORS = ["#E8F7FF", "#E8F7FF", "#E8F7FF", "#00D9FF", "#8EA4FF"];
  let stars = [];
  let shooting = null;
  let w = 0, h = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(420, Math.floor((w * h) / 3200));
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.3 + 0.2,
      depth: Math.random() * 0.6 + 0.1,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.005,
      color: COLORS[(Math.random() * COLORS.length) | 0],
    }));
  }

  function spawnShootingStar() {
    shooting = {
      x: Math.random() * w * 0.7 + w * 0.2,
      y: Math.random() * h * 0.4,
      vx: -(Math.random() * 6 + 8),
      vy: Math.random() * 3 + 3,
      life: 1,
    };
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const scroll = window.scrollY;

    for (const s of stars) {
      s.phase += s.speed;
      const alpha = 0.45 + Math.sin(s.phase) * 0.4;
      let y = (s.y - scroll * s.depth * 0.25) % h;
      if (y < 0) y += h;
      ctx.globalAlpha = Math.max(0.05, alpha);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!shooting && Math.random() < 0.004) spawnShootingStar();
    if (shooting) {
      const s = shooting;
      const grad = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 12, s.y - s.vy * 12);
      grad.addColorStop(0, "rgba(232,247,255,0.9)");
      grad.addColorStop(1, "rgba(0,217,255,0)");
      ctx.globalAlpha = s.life;
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 12, s.y - s.vy * 12);
      ctx.stroke();
      s.x += s.vx;
      s.y += s.vy;
      s.life -= 0.012;
      if (s.life <= 0 || s.x < -100 || s.y > h + 100) shooting = null;
    }

    ctx.globalAlpha = 1;
    if (!reduced) requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener("resize", () => {
    resize();
    if (reduced) draw();
  });
  draw();
})();
