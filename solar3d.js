/* ============================================================
   Sol Atlas: 3D solar system (Three.js)
   Builds the scene, runs the animation and handles picking.
   Three.js and its add-ons are passed in, so this file has no imports.
   ============================================================ */

function createSolarSystem(opts) {
  const { THREE, OrbitControls, EffectComposer, RenderPass, UnrealBloomPass, canvas, bodies } = opts;
  const labelLayer = opts.labelLayer || null;
  const reduced = !!opts.reducedMotion;
  const sizeBoost = opts.sizeBoost || 1;
  let width = opts.width;
  let height = opts.height;

  const listeners = {};
  const emit = (type, value) => (listeners[type] || []).forEach((fn) => fn(value));

  /* ---------------- Renderer, scene, camera ---------------- */

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, opts.updateStyle !== false);
  renderer.setClearColor(0x02040c, 1);
  renderer.toneMapping = THREE.NoToneMapping; // tone mapping happens in the grade pass

  const scene = new THREE.Scene();
  const FOV = 40;
  const camera = new THREE.PerspectiveCamera(FOV, width / height, 0.1, 4000);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.enableZoom = !!opts.enableZoom;
  controls.rotateSpeed = 0.45;
  controls.minPolarAngle = 0.2;
  controls.maxPolarAngle = Math.PI * 0.6;
  controls.autoRotate = !reduced;
  controls.autoRotateSpeed = 0.16;
  canvas.style.touchAction = "pan-y"; // vertical swipes still scroll the page

  scene.add(new THREE.PointLight(0xfff0dc, 3.6, 0, 0));
  scene.add(new THREE.AmbientLight(0x3a4a80, 0.4));

  /* ---------------- Procedural textures ---------------- */

  function noise3(seed) {
    let s = seed;
    const rand = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const perm = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = (rand() * (i + 1)) | 0;
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    const p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const vals = new Float32Array(256);
    for (let i = 0; i < 256; i++) vals[i] = rand();
    const fade = (t) => t * t * (3 - 2 * t);
    const lerp = (a, b, t) => a + (b - a) * t;

    return (x, y, z) => {
      const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
      const u = fade(x - xi), v = fade(y - yi), w = fade(z - zi);
      const X = xi & 255, Y = yi & 255, Z = zi & 255;
      const X1 = (X + 1) & 255, Y1 = (Y + 1) & 255, Z1 = (Z + 1) & 255;
      const h = (a, b, c) => vals[p[p[p[a] + b] + c]];
      return lerp(
        lerp(lerp(h(X, Y, Z), h(X1, Y, Z), u), lerp(h(X, Y1, Z), h(X1, Y1, Z), u), v),
        lerp(lerp(h(X, Y, Z1), h(X1, Y, Z1), u), lerp(h(X, Y1, Z1), h(X1, Y1, Z1), u), v),
        w
      );
    };
  }

  function fbm(n, x, y, z, octaves) {
    let sum = 0, amp = 0.5, freq = 1, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * n(x * freq, y * freq, z * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / norm;
  }

  // stops: [[t, r, g, b], ...] sorted by t
  function ramp(stops, t, out) {
    t = Math.min(1, Math.max(0, t));
    let i = 1;
    while (i < stops.length - 1 && t > stops[i][0]) i++;
    const a = stops[i - 1], b = stops[i];
    const k = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0] || 1)));
    out[0] = a[1] + (b[1] - a[1]) * k;
    out[1] = a[2] + (b[2] - a[2]) * k;
    out[2] = a[3] + (b[3] - a[3]) * k;
    return out;
  }

  function mix(out, r, g, b, t) {
    out[0] += (r - out[0]) * t;
    out[1] += (g - out[1]) * t;
    out[2] += (b - out[2]) * t;
  }

  const smooth = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  function toTexture(c, srgb = true) {
    const tex = new THREE.CanvasTexture(c);
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    return tex;
  }

  // Paints an equirectangular map by sampling each pixel's point on the unit sphere, so it wraps seamlessly
  function paintSphere(w, h, fn) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(w, h);
    const d = img.data;
    const out = [0, 0, 0, 255];
    for (let py = 0; py < h; py++) {
      const lat = (0.5 - (py + 0.5) / h) * Math.PI;
      const cl = Math.cos(lat), sl = Math.sin(lat);
      for (let px = 0; px < w; px++) {
        const lon = ((px + 0.5) / w) * Math.PI * 2;
        out[3] = 255;
        fn(out, Math.cos(lon) * cl, sl, Math.sin(lon) * cl, lat, lon);
        const i = (py * w + px) * 4;
        d[i] = out[0]; d[i + 1] = out[1]; d[i + 2] = out[2]; d[i + 3] = out[3];
      }
    }
    ctx.putImageData(img, 0, 0);
    return toTexture(c);
  }

  // Elliptical spot on the map, used for storms. Returns 0..1 strength.
  function spot(lat, lon, cLat, cLon, wLon, hLat) {
    let dl = Math.abs(lon - cLon);
    if (dl > Math.PI) dl = Math.PI * 2 - dl;
    const e = (dl / wLon) ** 2 + ((lat - cLat) / hLat) ** 2;
    return e < 1 ? 1 - e : 0;
  }

  const TEX_W = opts.textureSize || 512;
  const TEX_H = TEX_W / 2;

  const PAINTERS = {
    sun(n) {
      const stops = [[0, 120, 28, 0], [0.35, 215, 80, 8], [0.6, 255, 150, 40], [0.82, 255, 210, 120], [1, 255, 248, 215]];
      return (o, x, y, z) => {
        const g = fbm(n, x * 5, y * 5, z * 5, 4);
        const s = fbm(n, x * 18 + 3, y * 18, z * 18, 2);
        ramp(stops, g * 0.75 + s * 0.45 - 0.08, o);
      };
    },
    mercury(n) {
      const stops = [[0, 62, 58, 55], [0.5, 140, 134, 128], [1, 205, 198, 190]];
      return (o, x, y, z) => {
        const g = fbm(n, x * 3, y * 3, z * 3, 5);
        const c = fbm(n, x * 10 + 7, y * 10, z * 10, 3);
        ramp(stops, g * 0.9 + (c > 0.62 ? -0.18 : c < 0.3 ? 0.08 : 0), o);
      };
    },
    venus(n) {
      const stops = [[0, 165, 115, 55], [0.45, 220, 175, 110], [0.72, 242, 212, 152], [1, 252, 238, 205]];
      return (o, x, y, z) => {
        const w = fbm(n, x * 1.5, y * 1.5, z * 1.5, 3);
        ramp(stops, fbm(n, x * 2 + w * 2.2, y * 7, z * 2 + w * 2.2, 4), o);
      };
    },
    earth(n) {
      const land = [[0, 52, 104, 46], [0.35, 88, 128, 58], [0.7, 150, 128, 84], [1, 196, 184, 160]];
      const sea = [[0, 34, 118, 196], [0.3, 16, 72, 162], [1, 8, 28, 88]];
      return (o, x, y, z) => {
        const l = fbm(n, x * 1.7, y * 1.7, z * 1.7, 5);
        const d = fbm(n, x * 6 + 11, y * 6, z * 6, 3);
        if (Math.abs(y) > 0.9 - d * 0.1) { o[0] = 236; o[1] = 244; o[2] = 252; return; }
        if (l > 0.53) {
          ramp(land, (l - 0.53) / 0.2 + d * 0.15, o);
          if (Math.abs(y) < 0.4 && d > 0.55) mix(o, 205, 172, 112, 0.7);
        } else {
          ramp(sea, (0.53 - l) / 0.22, o);
        }
      };
    },
    mars(n) {
      const stops = [[0, 86, 32, 18], [0.4, 158, 68, 34], [0.66, 202, 102, 56], [1, 228, 156, 104]];
      return (o, x, y, z) => {
        const g = fbm(n, x * 2.5, y * 2.5, z * 2.5, 5);
        const d = fbm(n, x * 7 + 5, y * 7, z * 7, 3);
        ramp(stops, g * 0.9 + d * 0.2 - 0.05, o);
        if (Math.abs(y) > 0.93 - d * 0.05) mix(o, 242, 232, 226, 0.92);
      };
    },
    jupiter(n) {
      const stops = [[0, 148, 92, 58], [0.3, 196, 146, 106], [0.55, 232, 208, 178], [0.8, 247, 234, 214], [1, 206, 160, 120]];
      return (o, x, y, z, lat, lon) => {
        const w = fbm(n, x * 2.5, y * 2.5, z * 2.5, 4);
        const band = Math.sin(y * 22 + w * 3.4) * 0.5 + 0.5;
        const fine = fbm(n, x * 4, y * 40, z * 4, 3);
        ramp(stops, band * 0.75 + fine * 0.3 - 0.03, o);
        const s = spot(lat, lon, -0.38, 1.2, 0.24, 0.1);
        if (s > 0) mix(o, 188, 82, 52, Math.sqrt(s) * 0.85);
      };
    },
    saturn(n) {
      const stops = [[0, 180, 146, 98], [0.5, 224, 200, 150], [1, 242, 228, 190]];
      return (o, x, y, z) => {
        const w = fbm(n, x * 2, y * 2, z * 2, 3);
        const band = Math.sin(y * 16 + w * 1.6) * 0.5 + 0.5;
        ramp(stops, band * 0.6 + fbm(n, x * 3, y * 30, z * 3, 3) * 0.4, o);
      };
    },
    uranus(n) {
      const stops = [[0, 118, 198, 208], [0.5, 160, 224, 232], [1, 205, 246, 250]];
      return (o, x, y, z) => {
        ramp(stops, 0.5 + (fbm(n, x * 2, y * 10, z * 2, 3) - 0.5) * 0.4 + y * 0.08, o);
      };
    },
    neptune(n) {
      const stops = [[0, 22, 40, 132], [0.5, 50, 86, 212], [1, 104, 146, 242]];
      return (o, x, y, z, lat, lon) => {
        const w = fbm(n, x * 2, y * 2, z * 2, 3);
        const band = Math.sin(y * 12 + w * 2) * 0.5 + 0.5;
        ramp(stops, band * 0.5 + fbm(n, x * 3, y * 3, z * 3, 4) * 0.5, o);
        const s = spot(lat, lon, -0.35, 2.5, 0.2, 0.09);
        if (s > 0) mix(o, 18, 26, 84, Math.sqrt(s) * 0.9);
        if (fbm(n, x * 3 + 9, y * 30, z * 3, 3) > 0.66) mix(o, 230, 240, 255, 0.55);
      };
    },
  };

  function cloudTexture() {
    const n = noise3(9001);
    return paintSphere(TEX_W, TEX_H, (o, x, y, z) => {
      const c = fbm(n, x * 3, y * 5, z * 3, 5);
      o[0] = o[1] = o[2] = 255;
      o[3] = smooth(0.5, 0.74, c) * 235;
    });
  }

  function ringTexture(kind) {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 4;
    const ctx = c.getContext("2d");
    const n = noise3(kind === "saturn" ? 77 : 78);
    const out = [0, 0, 0];
    const stops = [[0, 150, 132, 104], [0.4, 214, 196, 156], [0.75, 232, 216, 178], [1, 176, 156, 120]];
    for (let i = 0; i < 512; i++) {
      const t = i / 511;
      let a;
      if (kind === "saturn") {
        a = 0.45 + 0.35 * n(t * 60, 0.5, 0.5) + 0.2 * n(t * 220, 1.5, 0.5);
        if (t < 0.2) a *= 0.3;                      // faint inner C ring
        if (t > 0.58 && t < 0.64) a *= 0.06;        // Cassini division
        if (t > 0.86 && t < 0.875) a *= 0.2;        // Encke gap
        a *= smooth(0, 0.04, t) * smooth(1, 0.95, t);
        ramp(stops, t + (n(t * 40, 2.5, 0.5) - 0.5) * 0.3, out);
      } else {
        a = 0;
        for (const r of [0.25, 0.45, 0.6, 0.94]) a = Math.max(a, smooth(0.014, 0, Math.abs(t - r)));
        a *= 0.55;
        out[0] = 190; out[1] = 222; out[2] = 236;
      }
      ctx.fillStyle = `rgba(${out[0] | 0},${out[1] | 0},${out[2] | 0},${Math.min(1, Math.max(0, a))})`;
      ctx.fillRect(i, 0, 1, 4);
    }
    return toTexture(c);
  }

  function radialTexture(stops, size = 256) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([t, col]) => g.addColorStop(t, col));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return toTexture(c);
  }

  /* ---------------- Background: stars and nebula ---------------- */

  const dotTex = radialTexture([[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,255,255,0.6)"], [1, "rgba(255,255,255,0)"]], 64);
  const STAR_COLORS = [[0.91, 0.97, 1], [0.91, 0.97, 1], [0.91, 0.97, 1], [0.6, 0.9, 1], [0.7, 0.75, 1], [1, 0.85, 0.7]];

  function makeStars(count, size, brightness) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const r = 1400 + Math.random() * 800;
      const s = Math.sqrt(1 - u * u);
      pos.set([Math.cos(th) * s * r, u * r, Math.sin(th) * s * r], i * 3);
      const c = STAR_COLORS[(Math.random() * STAR_COLORS.length) | 0];
      const b = brightness * (0.25 + Math.random() ** 2 * 0.75);
      col.set([c[0] * b, c[1] * b, c[2] * b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({
      size, sizeAttenuation: false, vertexColors: true, map: dotTex,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);
    return pts;
  }

  makeStars(4200, 1.6, 0.9);
  const brightStars = makeStars(260, 3.4, 1.6);

  const nebulaTex = radialTexture([[0, "rgba(255,255,255,0.9)"], [0.4, "rgba(255,255,255,0.3)"], [1, "rgba(255,255,255,0)"]]);
  [
    [0x3b5bdb, 0.2, [-900, 300, -1300], 2400],
    [0x00d9ff, 0.09, [1200, -200, -900], 1800],
    [0x6a3bdb, 0.13, [300, 700, 1400], 2200],
    [0x1e3a9a, 0.16, [-1300, -500, 800], 2000],
  ].forEach(([color, opacity, p, scale]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: nebulaTex, color, opacity, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    sp.position.set(...p);
    sp.scale.setScalar(scale);
    scene.add(sp);
  });

  /* ---------------- Asteroid belt ---------------- */

  const belt = (() => {
    const count = 2200;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 25.2 + Math.random() * 1.9 + (Math.random() - 0.5) * 0.6;
      pos.set([Math.cos(a) * r, (Math.random() - 0.5) * 0.5, Math.sin(a) * r], i * 3);
      const b = 0.25 + Math.random() * 0.35;
      col.set([b * 1.05, b * 0.95, b * 0.85], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 1.5, sizeAttenuation: false, vertexColors: true, map: dotTex, transparent: true, depthWrite: false,
    }));
    scene.add(pts);
    return pts;
  })();

  /* ---------------- Sun and planets ---------------- */

  function atmosphere(radius, color, power, intensity) {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uPower: { value: power },
        uIntensity: { value: intensity },
      },
      vertexShader: `
        varying vec3 vN; varying vec3 vView; varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          vN = normalize(mat3(modelMatrix) * normal);
          vView = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform float uPower; uniform float uIntensity;
        varying vec3 vN; varying vec3 vView; varying vec3 vWorld;
        void main() {
          float f = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), uPower);
          float lit = smoothstep(-0.35, 0.6, dot(normalize(vN), normalize(-vWorld)));
          gl_FragColor = vec4(uColor * f * uIntensity * (0.15 + 0.85 * lit), 1.0);
        }`,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), mat);
  }

  const ATMOS = {
    venus: [0xf5d29a, 1.07, 2.6, 1.0],
    earth: [0x4aa3ff, 1.1, 2.4, 1.8],
    mars: [0xff8a5c, 1.05, 3.5, 0.6],
    jupiter: [0xf0d0a0, 1.03, 4, 0.5],
    saturn: [0xf0dca0, 1.03, 4, 0.5],
    uranus: [0x9feaf2, 1.07, 2.8, 1.1],
    neptune: [0x6f8bff, 1.07, 2.8, 1.4],
  };

  const entries = [];
  const byId = {};
  let seed = 101;

  bodies.forEach((b) => {
    const isSun = b.id === "sun";
    const radius = b.size / 26;
    const orbitR = isSun ? 0 : b.orbit / 10;

    const pivot = new THREE.Group();   // turns around the Sun
    const anchor = new THREE.Group();  // the body's position; scaled when it's enlarged
    const tilt = new THREE.Group();    // axial tilt, kept fixed in space
    const spin = new THREE.Group();    // rotation on its own axis
    scene.add(pivot);
    pivot.add(anchor);
    anchor.position.x = orbitR;
    anchor.add(tilt);
    tilt.add(spin);
    tilt.rotation.z = THREE.MathUtils.degToRad(b.tilt || 0); // tilts over 90° make the spin retrograde, as for Venus and Uranus

    const map = paintSphere(isSun ? TEX_W * 2 : TEX_W, isSun ? TEX_H * 2 : TEX_H, PAINTERS[b.id](noise3(seed++)));
    const geo = new THREE.SphereGeometry(radius, isSun ? 96 : 64, isSun ? 48 : 32);
    let surface;
    let line = null;

    if (isSun) {
      const mat = new THREE.MeshBasicMaterial({ map });
      mat.color.setScalar(2.4); // HDR, so the bloom picks it up
      surface = new THREE.Mesh(geo, mat);

      const shellMat = new THREE.MeshBasicMaterial({
        map, color: 0xffa040, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const shell = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.012, 96, 48), shellMat);
      shell.rotation.set(0.4, 1.3, 0.2);
      spin.add(shell);
      spin.userData.shell = shell;

      const glowTex = radialTexture([
        [0, "rgba(255,230,170,1)"], [0.18, "rgba(255,170,60,0.75)"], [0.45, "rgba(255,110,20,0.18)"], [1, "rgba(255,90,0,0)"],
      ]);
      const glows = [[radius * 4.6, 1.3], [radius * 10, 0.16]].map(([scale, strength]) => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        }));
        sp.material.color.setRGB(strength, strength * 0.8, strength * 0.55);
        sp.scale.setScalar(scale);
        sp.userData.base = scale;
        anchor.add(sp);
        return sp;
      });

      // Anamorphic lens streak through the Sun
      const streakTex = (() => {
        const c = document.createElement("canvas");
        c.width = 512; c.height = 32;
        const ctx = c.getContext("2d");
        const gx = ctx.createLinearGradient(0, 0, 512, 0);
        gx.addColorStop(0, "rgba(0,0,0,0)");
        gx.addColorStop(0.5, "rgba(255,255,255,1)");
        gx.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gx;
        ctx.fillRect(0, 0, 512, 32);
        ctx.globalCompositeOperation = "destination-in";
        const gy = ctx.createLinearGradient(0, 0, 0, 32);
        gy.addColorStop(0, "rgba(0,0,0,0)");
        gy.addColorStop(0.5, "rgba(0,0,0,1)");
        gy.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gy;
        ctx.fillRect(0, 0, 512, 32);
        return toTexture(c);
      })();
      const streak = new THREE.Sprite(new THREE.SpriteMaterial({
        map: streakTex, color: 0x5fd8ff, opacity: 0.35, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      streak.scale.set(radius * 26, radius * 0.5, 1);
      anchor.add(streak);
      spin.userData.glows = glows;
    } else {
      const gas = /jupiter|saturn|uranus|neptune/.test(b.id);
      surface = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, roughness: gas ? 0.78 : 0.92, metalness: 0 }));

      if (b.id === "earth") {
        const clouds = new THREE.Mesh(
          new THREE.SphereGeometry(radius * 1.018, 64, 32),
          new THREE.MeshStandardMaterial({ map: cloudTexture(), transparent: true, depthWrite: false, roughness: 1 })
        );
        spin.add(clouds);
        spin.userData.clouds = clouds;
      }

      if (b.rings) {
        const inner = radius * (b.id === "saturn" ? 1.24 : 1.5);
        const outer = radius * (b.id === "saturn" ? 2.35 : 2.05);
        const rg = new THREE.RingGeometry(inner, outer, 160, 1);
        const pos = rg.attributes.position, uv = rg.attributes.uv, v = new THREE.Vector3();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          uv.setXY(i, (v.length() - inner) / (outer - inner), 0.5);
        }
        const ring = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({
          map: ringTexture(b.id), transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1,
        }));
        ring.rotation.x = -Math.PI / 2;
        tilt.add(ring);
      }

      const a = ATMOS[b.id];
      if (a) tilt.add(atmosphere(radius * a[1], a[0], a[2], a[3]));

      const pts = [];
      for (let i = 0; i <= 256; i++) {
        const t = (i / 256) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(t) * orbitR, 0, Math.sin(t) * orbitR));
      }
      line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x3b5bdb, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      scene.add(line);
    }
    spin.add(surface);

    let label = null;
    if (labelLayer) {
      label = document.createElement("span");
      label.className = "label3d";
      label.textContent = isSun ? "Sun" : b.name;
      labelLayer.appendChild(label);
    }

    const baseScale = isSun ? 1 : sizeBoost;
    anchor.scale.setScalar(baseScale);
    const angle = Math.random() * Math.PI * 2;
    pivot.rotation.y = angle;
    anchor.rotation.y = -angle;

    const entry = {
      id: b.id, body: b, isSun, radius, orbitR, pivot, anchor, spin, line, label,
      pickRadius: radius * (b.rings ? 2 : 1),
      orbitSpeed: isSun ? 0 : (Math.PI * 2) / (parseFloat(b.period) * 2.4),
      spinSpeed: (Math.PI * 2) / parseFloat(b.spin),
      baseScale, scaleTarget: baseScale,
      screen: { x: 0, y: 0, r: 0, dist: 0, visible: false },
    };
    entries.push(entry);
    byId[b.id] = entry;
  });

  /* ---------------- Post-processing ---------------- */

  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 1.15, 0.65, 0.92);
  composer.addPass(bloom);

  // Final grade: ACES tone mapping, sRGB, slight chromatic fringe, vignette and film grain
  const gradeMaterial = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uExposure: { value: 1.05 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float uTime; uniform float uExposure; varying vec2 vUv;
      vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
      float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }
      void main() {
        vec2 c = vUv - 0.5;
        float ca = 0.006 * dot(c, c);
        vec3 col = vec3(
          texture2D(tDiffuse, vUv - c * ca * 4.0).r,
          texture2D(tDiffuse, vUv).g,
          texture2D(tDiffuse, vUv + c * ca * 4.0).b
        );
        col = aces(col * uExposure);
        col = pow(col, vec3(1.0 / 2.2));
        float vig = smoothstep(0.9, 0.25, length(c * vec2(1.0, 0.85)));
        col *= mix(0.45, 1.0, vig);
        col += (rand(vUv * 1000.0 + fract(uTime)) - 0.5) * 0.03;
        gl_FragColor = vec4(col, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
  });
  const gradeScene = new THREE.Scene();
  gradeScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), gradeMaterial));
  const gradeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  composer.addPass({
    enabled: true, needsSwap: true, clear: false, renderToScreen: false,
    setSize() {}, dispose() {},
    render(r, writeBuffer, readBuffer) {
      gradeMaterial.uniforms.tDiffuse.value = readBuffer.texture;
      r.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      r.render(gradeScene, gradeCamera);
    },
  });

  /* ---------------- Camera moves ---------------- */

  const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const overviewDistance = () => Math.max(68, 50 / (tanHalf * camera.aspect));
  const overviewPolar = () => (camera.aspect < 1 ? 0.95 : 1.14);
  const focusDistance = (e) => (e.isSun ? 34 : e.radius * e.baseScale * (e.body.rings ? 9 : 7.5) + 2);

  let introT = reduced ? 1 : 0;
  const introFrom = { r: 0, phi: 0.32, theta: -1.6 };
  const introTo = { phi: 0, theta: 0.55 };
  const spherical = new THREE.Spherical();
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

  function placeIntroCamera(t) {
    const e = easeInOut(t);
    const r = overviewDistance();
    spherical.set(
      THREE.MathUtils.lerp(r * 2.8, r, e),
      THREE.MathUtils.lerp(introFrom.phi, overviewPolar(), e),
      THREE.MathUtils.lerp(introFrom.theta, introTo.theta, e)
    );
    camera.position.setFromSpherical(spherical);
    camera.lookAt(controls.target);
  }
  placeIntroCamera(introT);
  controls.enabled = introT >= 1;

  /* ---------------- Picking ---------------- */

  const tmp = new THREE.Vector3();

  function updateScreen() {
    const half = height / 2;
    for (const e of entries) {
      e.anchor.getWorldPosition(tmp);
      const dist = tmp.distanceTo(camera.position);
      tmp.project(camera);
      const s = e.screen;
      s.visible = tmp.z < 1;
      s.x = (tmp.x * 0.5 + 0.5) * width;
      s.y = (-tmp.y * 0.5 + 0.5) * height;
      s.dist = dist;
      s.r = ((e.radius * e.anchor.scale.x) / (dist * tanHalf)) * half;
    }
  }

  function pick(x, y) {
    let best = null;
    for (const e of entries) {
      const s = e.screen;
      if (!s.visible) continue;
      const reach = Math.max(s.r * (e.pickRadius / e.radius) * 1.15, e.isSun ? 0 : 16);
      if (Math.hypot(x - s.x, y - s.y) <= reach && (!best || s.dist < best.screen.dist)) best = e;
    }
    return best ? best.id : null;
  }

  /* ---------------- Hover, focus and pointer input ---------------- */

  let canvasHover = null;   // from the mouse or a touch hold on the canvas
  let externalHover = null; // from outside, e.g. the planet buttons
  let hoveredId = null;
  let focusedId = null;
  let timeScale = 1;
  let dragging = false;
  let mouse = null;

  function applyHover() {
    const id = externalHover || canvasHover;
    if (id === hoveredId) return;
    hoveredId = id;
    canvas.style.cursor = id ? "pointer" : "";
    emit("hover", id);
  }

  function setFocus(id) {
    if (id && !byId[id]) return;
    focusedId = id;
    controls.autoRotateSpeed = id ? 0.45 : 0.16;
    emit("focus", id);
  }

  controls.addEventListener("start", () => { dragging = true; });
  controls.addEventListener("end", () => { dragging = false; });

  const localPoint = (ev) => {
    const r = canvas.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };

  let down = null;
  let holdTimer = null;
  let held = false;

  canvas.addEventListener("pointermove", (ev) => {
    const p = localPoint(ev);
    if (ev.pointerType !== "touch") mouse = p;
    if (down && Math.hypot(p.x - down.x, p.y - down.y) > 10) {
      down.moved = true;
      clearTimeout(holdTimer);
    }
  });
  canvas.addEventListener("pointerleave", (ev) => {
    if (ev.pointerType === "touch") return;
    mouse = null;
    canvasHover = null;
    applyHover();
  });

  canvas.addEventListener("pointerdown", (ev) => {
    const p = localPoint(ev);
    down = { ...p, t: performance.now(), moved: false };
    held = false;
    if (ev.pointerType === "touch") {
      holdTimer = setTimeout(() => {
        const id = pick(p.x, p.y);
        if (!id || down?.moved) return;
        held = true;
        canvasHover = id;
        applyHover();
        emit("hold", id);
        if (navigator.vibrate) navigator.vibrate(8);
      }, 220);
    }
  });

  const endPress = (ev, cancelled) => {
    clearTimeout(holdTimer);
    if (!down) return;
    const p = localPoint(ev);
    const quick = !down.moved && performance.now() - down.t < 450;
    if (held) {
      const id = canvasHover;
      canvasHover = null;
      applyHover();
      emit("release", id);
    } else if (!cancelled && quick) {
      const id = pick(p.x, p.y);
      if (id) {
        setFocus(id);
        emit("select", id);
      }
    }
    down = null;
    held = false;
  };
  canvas.addEventListener("pointerup", (ev) => endPress(ev, false));
  canvas.addEventListener("pointercancel", (ev) => endPress(ev, true));
  canvas.addEventListener("contextmenu", (ev) => ev.preventDefault());

  /* ---------------- Animation loop ---------------- */

  const clock = new THREE.Clock();
  let running = true;
  let elapsed = 0;
  const goal = new THREE.Vector3();
  const offset = new THREE.Vector3();

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    updateScreen();
    if (mouse && !dragging && !down) {
      canvasHover = pick(mouse.x, mouse.y);
      applyHover();
    }

    // Orbits ease to a stop while something is enlarged, then ease back
    const motion = reduced ? 0.15 : 1;
    timeScale += ((hoveredId ? 0 : 1) - timeScale) * (1 - Math.exp(-dt * 5));

    for (const e of entries) {
      if (!e.isSun) {
        e.pivot.rotation.y -= e.orbitSpeed * dt * timeScale * motion;
        e.anchor.rotation.y = -e.pivot.rotation.y;
      }
      e.spin.rotation.y += e.spinSpeed * dt * (0.25 + 0.75 * timeScale) * motion;

      const grow = e.id === hoveredId && e.id !== focusedId ? (e.isSun ? 1.1 : 1.8) : 1;
      e.scaleTarget = e.baseScale * grow;
      const sc = e.anchor.scale.x + (e.scaleTarget - e.anchor.scale.x) * (1 - Math.exp(-dt * 7));
      e.anchor.scale.setScalar(sc);

      if (e.line) {
        const hot = e.id === hoveredId || e.id === focusedId;
        const m = e.line.material;
        m.opacity += ((hot ? 0.85 : 0.3) - m.opacity) * (1 - Math.exp(-dt * 6));
        m.color.setHex(hot ? 0x00d9ff : 0x3b5bdb);
      }
      if (e.spin.userData.clouds) e.spin.userData.clouds.rotation.y += dt * 0.02 * motion;
      if (e.spin.userData.shell) e.spin.userData.shell.rotation.y -= dt * 0.03 * motion;
      if (e.spin.userData.glows) {
        e.spin.userData.glows.forEach((g, i) => g.scale.setScalar(g.userData.base * (1 + Math.sin(elapsed * (0.9 + i * 0.4)) * 0.035)));
      }
    }
    belt.rotation.y -= dt * 0.012 * timeScale * motion;
    brightStars.material.opacity = 0.8 + Math.sin(elapsed * 1.7) * 0.2;

    if (introT < 1) {
      introT = Math.min(1, introT + dt / 6.5);
      placeIntroCamera(introT);
      if (introT >= 1) controls.enabled = true;
    } else {
      // Glide the camera to the focused body (following it along its orbit) or back to the overview
      const k = 1 - Math.exp(-dt * 2);
      if (focusedId) byId[focusedId].anchor.getWorldPosition(goal);
      else goal.set(0, 0, 0);
      goal.sub(controls.target).multiplyScalar(k);
      controls.target.add(goal);
      camera.position.add(goal);

      offset.copy(camera.position).sub(controls.target);
      const len = offset.length();
      const want = focusedId ? focusDistance(byId[focusedId]) : overviewDistance();
      offset.setLength(len + (want - len) * k);
      camera.position.copy(controls.target).add(offset);
      controls.update(dt);
    }

    if (labelLayer) {
      for (const e of entries) {
        const s = e.screen;
        e.label.style.opacity = s.visible ? "" : "0";
        e.label.style.transform = `translate3d(${s.x.toFixed(1)}px, ${(s.y + s.r + 8).toFixed(1)}px, 0) translateX(-50%)`;
        e.label.classList.toggle("is-hot", e.id === hoveredId || e.id === focusedId);
      }
    }

    gradeMaterial.uniforms.uTime.value = elapsed;
    composer.render(dt);
  }
  frame();

  /* ---------------- Public API ---------------- */

  return {
    on(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    hover(id) { externalHover = id; applyHover(); },
    focus(id) { setFocus(id); },
    get focused() { return focusedId; },
    resize(w, h) {
      width = w;
      height = h;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, opts.updateStyle !== false);
      composer.setSize(w, h);
      bloom.resolution.set(w, h);
    },
    setRunning(on) {
      if (on === running) return;
      running = on;
      if (on) {
        clock.getDelta();
        frame();
      }
    },
  };
}
