import './style.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// --- STATE MANAGEMENT ---
const state = {
  activeScent: 'oud-imperial',
  scents: {
    'oud-imperial': {
      color: '#d4af37',      // Amber/Gold
      liquidColor: '#a67c1e',
      glowColor: '#aa7c11',
      labelColor: '#d4af37',
      price: 180,
      name: 'Oud Impérial'
    },
    'rose-sultan': {
      color: '#d11a2a',      // Velvet Ruby
      liquidColor: '#7a0010',
      glowColor: '#8b0000',
      labelColor: '#ffd700',
      price: 160,
      name: 'Rose Al-Sultan'
    },
    'amber-noir': {
      color: '#d27d2d',      // Warm Copper
      liquidColor: '#8a3324',
      glowColor: '#c04000',
      labelColor: '#f3e5ab',
      price: 170,
      name: 'Ambre Noir'
    }
  },
  cart: [],
  audio: {
    ctx: null,
    ambientHum: null,
    chimeFilter: null,
    isPlaying: false
  },
  mouse: {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0
  },
  windowWidth: window.innerWidth,
  isMobile: window.innerWidth <= 1024
};

// --- WEBGL SETUP ---
let scene, camera, renderer, bottleModel, liquidMesh, labelMesh;
let particlesGeometry, particlesMesh, particleCount = 120;
let sceneLights = {};

const container = document.getElementById('webgl-container');

function initWebGL() {
  // 1. Scene
  scene = new THREE.Scene();

  // 2. Camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 7);

  // 3. Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  container.appendChild(renderer.domElement);

  // 4. Lights
  // Soft ambient fill
  const ambientLight = new THREE.AmbientLight(0x0c0c10, 1.8);
  scene.add(ambientLight);
  sceneLights.ambient = ambientLight;

  // Key light: crisp warm gold
  const keyLight = new THREE.DirectionalLight(0xfff3d1, 8.0);
  keyLight.position.set(5, 4, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);
  sceneLights.key = keyLight;

  // Back Rim light: emphasizes glass silhouette
  const rimLight = new THREE.DirectionalLight(0xd4af37, 6.0);
  rimLight.position.set(-5, 3, -5);
  scene.add(rimLight);
  sceneLights.rim = rimLight;

  // Fill Light: subtle color contrast
  const fillLight = new THREE.PointLight(0xffffff, 2.5, 15);
  fillLight.position.set(-4, -2, 2);
  scene.add(fillLight);
  sceneLights.fill = fillLight;

  // Moving light for dynamic highlights on mouse move
  const highlightLight = new THREE.PointLight(0xd4af37, 3.0, 10);
  highlightLight.position.set(0, 1, 3);
  scene.add(highlightLight);
  sceneLights.highlight = highlightLight;

  // 5. Olfactory Note Particles Setup (Procedural Wave)
  initParticles();

  // Resize Listener
  window.addEventListener('resize', onWindowResize);
}

// --- PARTICLE SYSTEM FOR SCENT PROFILE ---
function initParticles() {
  particlesGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  const activeScentConfig = state.scents[state.activeScent];
  const scentColor = new THREE.Color(activeScentConfig.color);

  for (let i = 0; i < particleCount; i++) {
    // Start at center
    positions[i * 3] = 0;
    positions[i * 3 + 1] = 0;
    positions[i * 3 + 2] = 0.5;

    // Velocity vectors (expanding outwards)
    velocities[i * 3] = 0;
    velocities[i * 3 + 1] = 0;
    velocities[i * 3 + 2] = 0;

    // Color gradient
    colors[i * 3] = scentColor.r;
    colors[i * 3 + 1] = scentColor.g;
    colors[i * 3 + 2] = scentColor.b;

    // Random sizes
    sizes[i] = 0;
  }

  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Custom circular glowing particle shader
  const pMaterial = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  // Custom canvas helper to create a soft circular dot texture
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  pMaterial.map = texture;

  particlesMesh = new THREE.Points(particlesGeometry, pMaterial);
  scene.add(particlesMesh);

  // Keep track of velocities and state separately
  particlesMesh.userData = {
    velocities: velocities,
    sizes: sizes,
    ages: new Float32Array(particleCount),
    lifespan: new Float32Array(particleCount),
    active: false
  };
}

// Spawns/triggers a particle burst of a specific scent note type
function triggerParticleBurst(noteType) {
  if (!particlesMesh || !bottleModel) return;

  const positions = particlesGeometry.attributes.position.array;
  const colors = particlesGeometry.attributes.color.array;
  const uData = particlesMesh.userData;

  let burstColor;
  switch (noteType) {
    case 'saffron': burstColor = new THREE.Color('#ffdf73'); break; // bright golden
    case 'rose': burstColor = new THREE.Color('#d11a2a'); break;    // ruby crimson
    case 'oud': burstColor = new THREE.Color('#5c4033'); break;     // warm brown/gold
    case 'amber': burstColor = new THREE.Color('#e07a5f'); break;   // deep orange
    default: burstColor = new THREE.Color(state.scents[state.activeScent].color);
  }

  // Get current bottle world position
  const bottleWorldPos = new THREE.Vector3();
  bottleModel.getWorldPosition(bottleWorldPos);

  for (let i = 0; i < particleCount; i++) {
    // Reset positions to bottle center with slight noise
    positions[i * 3] = bottleWorldPos.x + (Math.random() - 0.5) * 0.2;
    positions[i * 3 + 1] = bottleWorldPos.y + (Math.random() - 0.5) * 0.4;
    positions[i * 3 + 2] = bottleWorldPos.z + (Math.random() - 0.5) * 0.2;

    // Expand in spherical shape with velocity
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos((Math.random() * 2) - 1);
    const speed = 0.05 + Math.random() * 0.08;

    uData.velocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
    uData.velocities[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed + 0.02; // upward drift
    uData.velocities[i * 3 + 2] = Math.cos(phi) * speed;

    // Apply colors
    colors[i * 3] = burstColor.r;
    colors[i * 3 + 1] = burstColor.g;
    colors[i * 3 + 2] = burstColor.b;

    // Lifespan config
    uData.ages[i] = 0;
    uData.lifespan[i] = 1.0 + Math.random() * 1.5; // lifespan in seconds
  }

  particlesGeometry.attributes.position.needsUpdate = true;
  particlesGeometry.attributes.color.needsUpdate = true;
  particlesMesh.material.opacity = 1.0;
  uData.active = true;

  // Add a nice subtle rotation jump to bottle when note triggers
  gsap.fromTo(bottleModel.rotation, 
    { y: bottleModel.rotation.y },
    { y: bottleModel.rotation.y + Math.PI * 0.4, duration: 1.2, ease: "power2.out" }
  );

  // Play interface glass chime sound
  playGlassChime(150 + Math.random() * 600);
}

function updateParticles(deltaTime) {
  const uData = particlesMesh.userData;
  if (!uData.active) return;

  const positions = particlesGeometry.attributes.position.array;
  let allDead = true;

  for (let i = 0; i < particleCount; i++) {
    if (uData.ages[i] < uData.lifespan[i]) {
      allDead = false;
      uData.ages[i] += deltaTime;

      // Update positions
      positions[i * 3] += uData.velocities[i * 3];
      positions[i * 3 + 1] += uData.velocities[i * 3 + 1];
      positions[i * 3 + 2] += uData.velocities[i * 3 + 2];

      // Add a bit of drag/friction
      uData.velocities[i * 3] *= 0.96;
      uData.velocities[i * 3 + 1] *= 0.96;
      uData.velocities[i * 3 + 2] *= 0.96;
    }
  }

  if (allDead) {
    uData.active = false;
    particlesMesh.material.opacity = 0.0;
  } else {
    // Gradually fade particles overall
    particlesGeometry.attributes.position.needsUpdate = true;
  }
}

// --- ASSET LOADING AND DRACO ---
function load3DAssets() {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  
  // Set decoder path pointing to copied assets
  dracoLoader.setDecoderPath('/draco/');
  loader.setDRACOLoader(dracoLoader);

  const progressPercent = document.getElementById('loader-percent');
  const progressBar = document.getElementById('loader-progress-bar');
  const loaderOverlay = document.getElementById('loader');

  loader.load(
    '/assets/ittar_bottle_draco.glb',
    (gltf) => {
      bottleModel = gltf.scene.getObjectByName('IttarBottle') || gltf.scene;
      
      // Extract sub-meshes for run-time updates
      liquidMesh = bottleModel.getObjectByName('PerfumeLiquid');
      labelMesh = bottleModel.getObjectByName('GoldLabel');

      // Add bottle to scene
      scene.add(bottleModel);

      // Trigger initial responsive scales
      adjustScaleForViewport();

      // Configure shadows and glass properties for webgl display
      bottleModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // Boost physical glass parameters inside browser rendering
          if (child.material.name === 'ObsidianGlass') {
            child.material.transparent = true;
            child.material.transmission = 0.92;
            child.material.ior = 1.62;
            child.material.thickness = 0.35;
            child.material.roughness = 0.06;
          }
          if (child.material.name === 'AmberLiquid') {
            child.material.transparent = true;
            child.material.transmission = 0.72;
            child.material.ior = 1.35;
            child.material.roughness = 0.12;
          }
        }
      });

      // Complete preloader and reveal site smoothly
      progressPercent.innerText = '100';
      progressBar.style.width = '100%';

      gsap.to(loaderOverlay, {
        opacity: 0,
        duration: 1.2,
        delay: 0.5,
        ease: 'power3.out',
        onComplete: () => {
          loaderOverlay.style.visibility = 'hidden';
          loaderOverlay.style.pointerEvents = 'none';
          
          // Animate Hero text entrances
          animateHeroEntrances();
        }
      });

      // Init the ScrollTrigger timeline
      initScrollTimeline();
    },
    (xhr) => {
      if (xhr.total > 0) {
        const percent = Math.floor((xhr.loaded / xhr.total) * 100);
        // Cap at 99% until fully assembled by three.js
        const displayPercent = Math.min(percent, 99);
        progressPercent.innerText = displayPercent.toString();
        progressBar.style.width = `${displayPercent}%`;
      }
    },
    (err) => {
      console.error('An error occurred loading the model:', err);
      // Fallback: hide loader if load fails to not lock user screen
      loaderOverlay.style.display = 'none';
    }
  );
}

// --- HERO ANIMATIONS ---
function animateHeroEntrances() {
  gsap.fromTo('.animate-text', 
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, duration: 1.2, stagger: 0.2, ease: "power4.out" }
  );

  // Animate bottle floating in
  if (bottleModel) {
    gsap.fromTo(bottleModel.position,
      { y: -3, z: -2 },
      { y: state.isMobile ? -0.4 : -0.2, z: 0, duration: 2.0, ease: "power3.out" }
    );
    gsap.fromTo(bottleModel.rotation,
      { y: Math.PI * 2, x: 0.2 },
      { y: 0.2, x: 0.05, duration: 2.2, ease: "power3.out" }
    );
  }
}

// --- SCROLLTRIGGER ANIMATION STORYTELLING ---
function initScrollTimeline() {
  if (!bottleModel) return;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: 'main',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.5, // smooth scrubbing lag
      invalidateOnRefresh: true
    }
  });

  // Check layout scales
  const isMobile = state.isMobile;

  // Hero -> Heritage (Scroll to section 2)
  tl.to(bottleModel.position, {
    x: isMobile ? 0 : -1.8,
    y: isMobile ? -1.5 : -0.2,
    z: isMobile ? -0.8 : -0.5,
    ease: "power2.inOut"
  }, 0);

  tl.to(bottleModel.rotation, {
    y: Math.PI * 0.9,  // Turn profile
    x: 0.1,
    ease: "power2.inOut"
  }, 0);

  // Heritage -> Scent Profile Notes (Scroll to section 3)
  tl.to(bottleModel.position, {
    x: 0,
    y: isMobile ? -3.0 : 0.15,
    z: isMobile ? 0.0 : 1.35, // zoom in close
    ease: "power2.inOut"
  }, 1);

  tl.to(bottleModel.rotation, {
    y: Math.PI * 2.0, // Face front label again
    x: -0.05,
    ease: "power2.inOut"
  }, 1);

  // Scent Profile -> Collection (Scroll to section 4)
  tl.to(bottleModel.position, {
    x: isMobile ? 0 : 1.55,
    y: isMobile ? -4.5 : -0.2,
    z: isMobile ? -0.6 : 0.0,
    ease: "power2.inOut"
  }, 2);

  tl.to(bottleModel.rotation, {
    y: Math.PI * 2.65, // Elegant angled view
    x: 0.08,
    ease: "power2.inOut"
  }, 2);

  // Collection -> Purchase Form (Scroll to section 5)
  tl.to(bottleModel.position, {
    x: isMobile ? 0 : 1.65,
    y: isMobile ? -5.9 : 0.0,
    z: isMobile ? 0.0 : 0.8,
    ease: "power2.inOut"
  }, 3);

  tl.to(bottleModel.rotation, {
    y: Math.PI * 4.0, // Back to centered float
    x: 0.05,
    ease: "power2.inOut"
  }, 3);
}

// Adjust bottle size and positioning based on screen size
function adjustScaleForViewport() {
  if (!bottleModel) return;
  
  state.isMobile = window.innerWidth <= 1024;
  const isMobile = state.isMobile;

  if (isMobile) {
    bottleModel.scale.set(0.9, 0.9, 0.9);
  } else {
    // Ultra-wide adaptation
    if (window.innerWidth > 2000) {
      bottleModel.scale.set(1.5, 1.5, 1.5);
    } else {
      bottleModel.scale.set(1.15, 1.15, 1.15);
    }
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  adjustScaleForViewport();
  
  // Re-run scrolltrigger timeline recalculations
  ScrollTrigger.refresh();
}

// --- MOUSE PARALLAX INTERACTION ---
window.addEventListener('mousemove', (e) => {
  // Convert coordinate spaces
  state.mouse.targetX = (e.clientX / window.innerWidth) - 0.5;
  state.mouse.targetY = (e.clientY / window.innerHeight) - 0.5;
});

// --- RENDER LOOP ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // Smooth mouse lerping
  state.mouse.x += (state.mouse.targetX - state.mouse.x) * 0.05;
  state.mouse.y += (state.mouse.targetY - state.mouse.y) * 0.05;

  if (bottleModel) {
    // Floating oscillation (luxury idle drift)
    const driftY = Math.sin(elapsedTime * 1.5) * 0.08;
    const driftRotZ = Math.cos(elapsedTime * 0.8) * 0.02;

    // Apply scroll-scrub animations + mouse parallax offsets + idle drift
    // Set position offset based on current scroll position
    scene.position.x = state.mouse.x * 0.35;
    scene.position.y = state.mouse.y * -0.35;
    
    bottleModel.position.y += driftY * deltaTime;
    bottleModel.rotation.z = driftRotZ;
    bottleModel.rotation.y += state.mouse.x * 0.08 * deltaTime;

    // Update dynamic highlight light source based on mouse
    if (sceneLights.highlight) {
      sceneLights.highlight.position.x = state.mouse.x * 6;
      sceneLights.highlight.position.y = 1 + state.mouse.y * -6;
    }
  }

  // Update notes visual particles
  updateParticles(deltaTime);

  renderer.render(scene, camera);
}

// --- INTERACTIVE PRODUCTS TRANSITION ---
function switchScentCollection(scentId) {
  if (state.activeScent === scentId) return;

  state.activeScent = scentId;
  const scentData = state.scents[scentId];

  // Update UI Elements
  document.querySelectorAll('.collection-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-product') === scentId);
  });

  document.querySelectorAll('.collection-product-info').forEach(info => {
    info.classList.toggle('active', info.getAttribute('id') === `info-${scentId}`);
  });

  // Synchronize purchase radio selections
  const radioInput = document.querySelector(`input[name="blend"][value="${scentId}"]`);
  if (radioInput) {
    radioInput.checked = true;
    updateTotalPrice();
  }

  // Visual Transitions in WebGL Materials using GSAP
  if (liquidMesh) {
    // Fluid color interpolation
    gsap.to(liquidMesh.material.color, {
      r: new THREE.Color(scentData.liquidColor).r,
      g: new THREE.Color(scentData.liquidColor).g,
      b: new THREE.Color(scentData.liquidColor).b,
      duration: 1.0,
      ease: "power2.out"
    });
  }

  if (labelMesh) {
    // Label plate tint shift
    gsap.to(labelMesh.material.color, {
      r: new THREE.Color(scentData.labelColor).r,
      g: new THREE.Color(scentData.labelColor).g,
      b: new THREE.Color(scentData.labelColor).b,
      duration: 1.0,
      ease: "power2.out"
    });
  }

  // Dynamic light coloring shift to reflect scent mood
  if (sceneLights.rim) {
    gsap.to(sceneLights.rim.color, {
      r: new THREE.Color(scentData.glowColor).r,
      g: new THREE.Color(scentData.glowColor).g,
      b: new THREE.Color(scentData.glowColor).b,
      duration: 1.2,
      ease: "power2.out"
    });
  }

  if (sceneLights.highlight) {
    gsap.to(sceneLights.highlight.color, {
      r: new THREE.Color(scentData.color).r,
      g: new THREE.Color(scentData.color).g,
      b: new THREE.Color(scentData.color).b,
      duration: 1.2,
      ease: "power2.out"
    });
  }

  // Spark chimes
  playGlassChime(300 + Math.random() * 400);
}

// --- E-COMMERCE CORE LOGIC ---
const qtyValue = document.getElementById('qty-value');
const qtyMinus = document.getElementById('qty-minus');
const qtyPlus = document.getElementById('qty-plus');
const calcTotal = document.getElementById('calculated-total');
const purchaseForm = document.getElementById('purchase-form');

const cartDrawer = document.getElementById('cart-drawer');
const cartOverlay = document.getElementById('cart-overlay');
const cartTrigger = document.getElementById('cart-trigger');
const cartClose = document.getElementById('cart-close-btn');
const cartItemsContainer = document.getElementById('cart-items-container');
const cartSubtotal = document.querySelector('.cart-subtotal-price');
const cartCountBubble = document.querySelector('.cart-count');

// Quantity pick handlers
qtyMinus.addEventListener('click', () => {
  let val = parseInt(qtyValue.value);
  if (val > 1) {
    qtyValue.value = (val - 1).toString();
    updateTotalPrice();
  }
});

qtyPlus.addEventListener('click', () => {
  let val = parseInt(qtyValue.value);
  qtyValue.value = (val + 1).toString();
  updateTotalPrice();
});

// Update purchase form price dynamically
function updateTotalPrice() {
  const selectedScent = document.querySelector('input[name="blend"]:checked').value;
  const sizeSelect = document.getElementById('bottle-size');
  const sizeOption = sizeSelect.options[sizeSelect.selectedIndex];
  const multiplier = parseFloat(sizeOption.getAttribute('data-price-multiplier'));
  
  const basePrice = state.scents[selectedScent].price;
  const quantity = parseInt(qtyValue.value);
  
  const total = Math.round(basePrice * multiplier * quantity);
  calcTotal.innerText = total.toString();
}

// Register select dropdown and radio change events
document.getElementById('bottle-size').addEventListener('change', updateTotalPrice);
document.querySelectorAll('input[name="blend"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    switchScentCollection(e.target.value);
  });
});

// Checkout submit trigger
purchaseForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const selectedScentId = document.querySelector('input[name="blend"]:checked').value;
  const volume = document.getElementById('bottle-size').value;
  const quantity = parseInt(qtyValue.value);
  
  addToCart(selectedScentId, volume, quantity);
  openCartDrawer();
  
  // Play purchase success sound
  playGlassChime(650);
  setTimeout(() => playGlassChime(1300), 150);
});

// Switch scent on bottom buy-now click
document.querySelectorAll('.buy-now-collection').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const scentId = e.currentTarget.getAttribute('data-id');
    switchScentCollection(scentId);
    
    // Smooth scroll to order form
    document.getElementById('purchase-section').scrollIntoView({ behavior: 'smooth' });
  });
});

// Cart interactions
cartTrigger.addEventListener('click', openCartDrawer);
cartClose.addEventListener('click', closeCartDrawer);
cartOverlay.addEventListener('click', closeCartDrawer);

function openCartDrawer() {
  cartDrawer.classList.add('active');
  cartOverlay.classList.add('active');
}

function closeCartDrawer() {
  cartDrawer.classList.remove('active');
  cartOverlay.classList.remove('active');
}

function addToCart(scentId, volume, qty) {
  const scent = state.scents[scentId];
  const sizeSelect = document.getElementById('bottle-size');
  const sizeOption = sizeSelect.options[sizeSelect.selectedIndex];
  const multiplier = parseFloat(sizeOption.getAttribute('data-price-multiplier'));
  
  const finalPrice = Math.round(scent.price * multiplier);
  
  // Check if identical item already exists
  const existingIdx = state.cart.findIndex(item => item.id === scentId && item.volume === volume);
  
  if (existingIdx > -1) {
    state.cart[existingIdx].qty += qty;
  } else {
    state.cart.push({
      id: scentId,
      name: scent.name,
      volume: volume,
      price: finalPrice,
      qty: qty
    });
  }
  
  updateCartUI();
}

function removeFromCart(idx) {
  state.cart.splice(idx, 1);
  updateCartUI();
  playGlassChime(180);
}

function updateCartUI() {
  // Clear container
  cartItemsContainer.innerHTML = '';
  
  if (state.cart.length === 0) {
    cartItemsContainer.innerHTML = '<div class="cart-empty-message">Your selection is currently empty.</div>';
    cartSubtotal.innerText = '$0';
    cartCountBubble.innerText = '0';
    return;
  }
  
  let totalSub = 0;
  let totalQty = 0;
  
  state.cart.forEach((item, index) => {
    totalSub += item.price * item.qty;
    totalQty += item.qty;
    
    // Unicode symbol mappings matching scent theme
    const symbol = item.id === 'rose-sultan' ? '🌹' : (item.id === 'amber-noir' ? '🔥' : '⚜');
    
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.innerHTML = `
      <div class="cart-item-img">${symbol}</div>
      <div class="cart-item-details">
        <h4 class="cart-item-name">${item.name}</h4>
        <span class="cart-item-meta">Volume: ${item.volume}</span>
        <div class="cart-item-price-row">
          <span class="cart-item-qty">Qty: ${item.qty}</span>
          <span class="cart-item-price">$${item.price * item.qty}</span>
        </div>
        <button class="cart-item-remove" data-index="${index}">Remove</button>
      </div>
    `;
    cartItemsContainer.appendChild(itemEl);
  });
  
  cartSubtotal.innerText = `$${totalSub}`;
  cartCountBubble.innerText = totalQty.toString();
  
  // Register click events for remove buttons
  document.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      removeFromCart(idx);
    });
  });
}

// Checkout alert trigger
document.getElementById('checkout-btn').addEventListener('click', () => {
  alert('⚜ Maison d\'Ittar Ritual: Order successfully placed! Proceeding to premium fulfillment atelier.');
  state.cart = [];
  updateCartUI();
  closeCartDrawer();
});

// Newsletter sub trigger
document.getElementById('newsletter-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = e.target.querySelector('input');
  alert(`⚜ Atelier Invitation Sent: Check your inbox at ${input.value} for premium seasonal oud allocations.`);
  input.value = '';
});

// --- DYNAMIC SCENT NOTE LISTENING ---
function initNoteHoverEvents() {
  document.querySelectorAll('.note-item').forEach(item => {
    // Hover event for mouse-enabled devices
    item.addEventListener('mouseenter', (e) => {
      const noteType = e.currentTarget.getAttribute('data-note');
      
      // Toggle CSS active
      document.querySelectorAll('.note-item').forEach(n => n.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      // Trigger scent particles
      triggerParticleBurst(noteType);
    });

    // Touch event for mobile viewports
    item.addEventListener('click', (e) => {
      const noteType = e.currentTarget.getAttribute('data-note');
      
      document.querySelectorAll('.note-item').forEach(n => n.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      triggerParticleBurst(noteType);
    });
  });
}

// --- PROCEDURAL WEB AUDIO SYNTHESIS ---
function initAudio() {
  if (state.audio.ctx) return; // Already initialized

  // Audio Context setup
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  state.audio.ctx = new AudioContext();

  const ctx = state.audio.ctx;

  // 1. Luxury Ambient Drone (Deep resonant filter swell)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const droneGain = ctx.createGain();
  const lowpass = ctx.createBiquadFilter();

  osc1.type = 'sawtooth';
  osc1.frequency.value = 55; // A1 note
  
  osc2.type = 'triangle';
  osc2.frequency.value = 110; // A2 note detuned slightly
  osc2.detune.value = 6;

  lowpass.type = 'lowpass';
  lowpass.frequency.value = 180;
  lowpass.Q.value = 1.0;

  droneGain.gain.value = 0.05; // Quiet background hum

  osc1.connect(lowpass);
  osc2.connect(lowpass);
  lowpass.connect(droneGain);
  droneGain.connect(ctx.destination);

  osc1.start();
  osc2.start();

  state.audio.ambientHum = droneGain;

  // 2. Chime Generator Setup
  state.audio.chimeFilter = ctx.createBiquadFilter();
  state.audio.chimeFilter.type = 'peaking';
  state.audio.chimeFilter.frequency.value = 1800;
  state.audio.chimeFilter.connect(ctx.destination);

  // Smooth filter swell LFO simulation
  setInterval(() => {
    if (state.audio.isPlaying) {
      const time = ctx.currentTime;
      const freq = 180 + Math.sin(time * 0.5) * 60;
      lowpass.frequency.setValueAtTime(freq, time);
    }
  }, 100);
}

// Generates procedural crystal chimes
function playGlassChime(frequency) {
  const ctx = state.audio.ctx;
  if (!ctx || !state.audio.isPlaying) return;

  // Verify running state (browsers freeze AudioContext until interaction)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const time = ctx.currentTime;
  const osc = ctx.createOscillator();
  const chimeGain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, time);
  
  // Detuning to generate an expensive, metallic "chime" harmony
  osc.frequency.exponentialRampToValueAtTime(frequency * 1.5, time + 0.6);

  chimeGain.gain.setValueAtTime(0.0, time);
  chimeGain.gain.linearRampToValueAtTime(0.12, time + 0.02); // fast attack
  chimeGain.gain.exponentialRampToValueAtTime(0.001, time + 1.2); // long release

  osc.connect(chimeGain);
  chimeGain.connect(state.audio.chimeFilter);

  osc.start(time);
  osc.stop(time + 1.3);
}

// Audio toggle controller
const audioBtn = document.getElementById('audio-toggle');
if (audioBtn) {
  audioBtn.addEventListener('click', () => {
    // Init Audio Context on first click (User gesture requirement)
    if (!state.audio.ctx) {
      initAudio();
    }

    const ctx = state.audio.ctx;

    if (state.audio.isPlaying) {
      // Mute audio
      gsap.to(state.audio.ambientHum.gain, { value: 0.0, duration: 0.8 });
      audioBtn.classList.remove('active');
      audioBtn.querySelector('.audio-label').innerText = 'SOUND OFF';
      state.audio.isPlaying = false;
    } else {
      // Unmute audio
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      gsap.to(state.audio.ambientHum.gain, { value: 0.06, duration: 0.8 });
      audioBtn.classList.add('active');
      audioBtn.querySelector('.audio-label').innerText = 'SOUND ON';
      state.audio.isPlaying = true;
      
      // Play entrance chime
      playGlassChime(440);
      setTimeout(() => playGlassChime(880), 100);
    }
  });
}

// --- MOBILE DRAWER MENUS ---
const menuTrigger = document.querySelector('.mobile-menu-trigger');
const navDrawer = document.getElementById('mobile-nav-drawer');
const drawerClose = document.querySelector('.drawer-close-btn');

if (menuTrigger) {
  menuTrigger.addEventListener('click', () => {
    navDrawer.classList.add('active');
  });
}

if (drawerClose) {
  drawerClose.addEventListener('click', () => {
    navDrawer.classList.remove('active');
  });
}

// Auto-close menu drawer on nav clicks
document.querySelectorAll('.mobile-nav-link').forEach(link => {
  link.addEventListener('click', () => {
    navDrawer.classList.remove('active');
  });
});

// --- BOOTSTRAP INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initWebGL();
  load3DAssets();
  initNoteHoverEvents();
  animate();
  
  // Highlight the Saffron note item as active by default
  const defaultNote = document.querySelector('.note-item[data-note="saffron"]');
  if (defaultNote) defaultNote.classList.add('active');
});

// ═══════════════════════════════════════════════════════════
//  PREMIUM CURSOR CONTROLLER
// ═══════════════════════════════════════════════════════════
function initCursor() {
  // Only enable on non-touch devices
  if (window.matchMedia('(hover: none)').matches) return;

  const dot   = document.getElementById('cursor-dot');
  const ring  = document.getElementById('cursor-ring');
  const label = document.getElementById('cursor-label');

  if (!dot || !ring) return;

  // Live mouse position (snaps instantly)
  let mouseX = -100, mouseY = -100;
  // Ring lerped position (trails smoothly)
  let ringX  = -100, ringY  = -100;

  // ── Move dot instantly with mouse ──────────────────────
  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    // Move cursor label with mouse
    label.style.left = mouseX + 'px';
    label.style.top  = mouseY + 'px';
  });

  // ── Animate ring with lerp (smooth magnetic trailing) ──
  function tickCursor() {
    // Lerp ring toward mouse at 12% per frame
    ringX += (mouseX - ringX) * 0.12;
    ringY += (mouseY - ringY) * 0.12;

    // Apply transforms directly for max performance
    dot.style.left  = mouseX + 'px';
    dot.style.top   = mouseY + 'px';
    ring.style.left = ringX  + 'px';
    ring.style.top  = ringY  + 'px';

    requestAnimationFrame(tickCursor);
  }

  tickCursor();

  // ── Cursor disappears when leaving the window ───────────
  document.addEventListener('mouseleave', () => {
    dot.style.opacity  = '0';
    ring.style.opacity = '0';
  });

  document.addEventListener('mouseenter', () => {
    dot.style.opacity  = '';
    ring.style.opacity = '';
  });

  // ── Define element categories for cursor state ──────────

  // Links and nav items → hover state
  const hoverTargets = 'a, .nav-link, .footer-link, .mobile-nav-link, ' +
    '.note-item, .collection-nav-btn, .audio-toggle, .scroll-indicator, ' +
    '.brand-logo, .drawer-close-btn, .cart-close-btn, .cart-item-remove, ' +
    '.newsletter-submit, .qty-btn, .radio-label, .luxury-select';

  // Buttons and CTAs → btn state (ring only, larger)
  const btnTargets = '.btn-luxury, .btn-submit-order, .cart-trigger, ' +
    '.checkout-btn, .buy-now-collection, .mobile-menu-trigger';

  // Editorial copy → text cursor
  const textTargets = 'p, .editorial-body, .hero-subtitle, .note-desc, ' +
    '.product-display-desc, .section-subtitle, .purchase-intro, .newsletter-text';

  // ── Helper to show/hide contextual label ────────────────
  function showLabel(text) {
    label.textContent = text;
    label.classList.add('visible');
  }

  function hideLabel() {
    label.classList.remove('visible');
  }

  // ── Attach hover listeners for btn state ────────────────
  document.querySelectorAll(btnTargets).forEach(el => {
    el.addEventListener('mouseenter', (e) => {
      document.body.classList.add('cursor-btn');
      document.body.classList.remove('cursor-hover', 'cursor-text');

      // Show contextual label based on element type
      const labelMap = {
        '.btn-luxury':           'View',
        '.btn-submit-order':     'Add',
        '.cart-trigger':         'Cart',
        '.checkout-btn':         'Order',
        '.buy-now-collection':   'Select',
        '.mobile-menu-trigger':  'Menu',
      };
      const matchedClass = Object.keys(labelMap).find(cls => e.currentTarget.matches(cls));
      if (matchedClass) showLabel(labelMap[matchedClass]);

      // Magnetic pull: move ring slightly toward button center
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top  + rect.height / 2;
      gsap.to({ x: ringX, y: ringY }, {
        duration: 0.35,
        x: centerX,
        y: centerY,
        ease: 'power3.out',
        onUpdate: function() {
          // ringX/ringY updated on next tick naturally, just let lerp handle it
        }
      });
    });

    el.addEventListener('mouseleave', () => {
      document.body.classList.remove('cursor-btn');
      hideLabel();
    });
  });

  // ── Attach hover listeners for interactive elements ──────
  document.querySelectorAll(hoverTargets).forEach(el => {
    // Skip if already handled by btn targets
    el.addEventListener('mouseenter', () => {
      if (!document.body.classList.contains('cursor-btn')) {
        document.body.classList.add('cursor-hover');
        document.body.classList.remove('cursor-text');
      }
    });

    el.addEventListener('mouseleave', () => {
      document.body.classList.remove('cursor-hover');
    });
  });

  // ── Text cursor on editorial copy paragraphs ─────────────
  document.querySelectorAll(textTargets).forEach(el => {
    el.addEventListener('mouseenter', () => {
      if (!document.body.classList.contains('cursor-btn') &&
          !document.body.classList.contains('cursor-hover')) {
        document.body.classList.add('cursor-text');
      }
    });

    el.addEventListener('mouseleave', () => {
      document.body.classList.remove('cursor-text');
    });
  });

  // ── Mouse click burst: dot pulses on click ───────────────
  window.addEventListener('mousedown', () => {
    gsap.to(dot, {
      scale: 2.5,
      duration: 0.15,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(dot, { scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.4)' });
      }
    });
    gsap.to(ring, {
      scale: 1.5,
      opacity: 0.4,
      duration: 0.15,
      ease: 'power2.out',
      onComplete: () => {
        gsap.to(ring, { scale: 1, opacity: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
      }
    });
  });

  // ── Loader hides cursor during loading ───────────────────
  const loader = document.getElementById('loader');
  if (loader) {
    // Observe loader visibility to toggle cursor-hidden
    const loaderObserver = new MutationObserver(() => {
      const isHidden = loader.style.visibility === 'hidden' ||
                       parseFloat(loader.style.opacity) === 0;
      document.body.classList.toggle('cursor-hidden', !isHidden);
    });
    loaderObserver.observe(loader, { attributes: true, attributeFilter: ['style'] });
  }
}

