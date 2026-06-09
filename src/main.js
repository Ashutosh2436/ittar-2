import './style.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ─── STATE ───────────────────────────────────────────────
const state = {
  cart: [],
  scents: {
    'oud-imperial': { price: 180, name: 'Oud Impérial',   emoji: '⚜️' },
    'rose-sultan':  { price: 160, name: 'Rose Al-Sultan', emoji: '🌹' },
    'amber-noir':   { price: 170, name: 'Ambre Noir',     emoji: '🔥' }
  }
};

// ─── CUSTOM CURSOR ───────────────────────────────────────
const cursorDot  = document.getElementById('cursor-dot');
const cursorRing = document.getElementById('cursor-ring');
let mouseX = 0, mouseY = 0, ringX = 0, ringY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  gsap.set(cursorDot, { x: mouseX, y: mouseY });
});

gsap.ticker.add(() => {
  ringX += (mouseX - ringX) * 0.1;
  ringY += (mouseY - ringY) * 0.1;
  gsap.set(cursorRing, { x: ringX, y: ringY });
});

document.querySelectorAll('a, button, .product-card, .scent-opt-card').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
});

document.querySelectorAll('.btn-add-cart, .btn-primary, .btn-order-submit, .btn-checkout').forEach(el => {
  el.addEventListener('mouseenter', () => {
    document.body.classList.remove('cursor-hover');
    document.body.classList.add('cursor-btn');
  });
  el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-btn'));
});

// ─── HEADER SCROLL ───────────────────────────────────────
const header = document.getElementById('site-header');
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 40);
});

// ─── MOBILE NAV ──────────────────────────────────────────
const mobileMenuBtn     = document.getElementById('mobile-menu-btn');
const mobileNav         = document.getElementById('mobile-nav');
const mobileNavOverlay  = document.getElementById('mobile-nav-overlay');
const mobileNavClose    = document.getElementById('mobile-nav-close');

const openMobileNav  = () => { mobileNav.classList.add('active'); mobileNavOverlay.classList.add('active'); };
const closeMobileNav = () => { mobileNav.classList.remove('active'); mobileNavOverlay.classList.remove('active'); };

mobileMenuBtn.addEventListener('click', openMobileNav);
mobileNavClose.addEventListener('click', closeMobileNav);
mobileNavOverlay.addEventListener('click', closeMobileNav);
document.querySelectorAll('.mobile-nav-link').forEach(l => l.addEventListener('click', closeMobileNav));

// ─── CART ─────────────────────────────────────────────────
const cartDrawer     = document.getElementById('cart-drawer');
const cartOverlay    = document.getElementById('cart-overlay');
const cartTrigger    = document.getElementById('cart-trigger');
const cartCloseBtn   = document.getElementById('cart-close-btn');
const cartItemsCont  = document.getElementById('cart-items-container');
const cartCountBadge = document.getElementById('cart-count');
const cartSubtotal   = document.querySelector('.cart-subtotal-price');

const openCart  = () => { cartDrawer.classList.add('active'); cartOverlay.classList.add('active'); };
const closeCart = () => { cartDrawer.classList.remove('active'); cartOverlay.classList.remove('active'); };

cartTrigger.addEventListener('click', openCart);
cartCloseBtn.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

function addToCart(id, name, price, volume = '12ml', qty = 1) {
  const existing = state.cart.find(i => i.id === id && i.volume === volume);
  if (existing) { existing.qty += qty; } 
  else { state.cart.push({ id, name, price, volume, qty }); }
  updateCartUI();
  openCart();
  gsap.fromTo(cartTrigger, { scale: 1.25 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1,0.5)' });
}

function removeFromCart(idx) {
  state.cart.splice(idx, 1);
  updateCartUI();
}

function updateCartUI() {
  cartItemsCont.innerHTML = '';
  if (state.cart.length === 0) {
    cartItemsCont.innerHTML = '<p class="cart-empty-msg">Your cart is empty.</p>';
    cartSubtotal.textContent = '$0';
    cartCountBadge.textContent = '0';
    return;
  }
  let total = 0, totalQty = 0;
  const symbols = { 'oud-imperial': '⚜️', 'rose-sultan': '🌹', 'amber-noir': '🔥' };

  state.cart.forEach((item, idx) => {
    total    += item.price * item.qty;
    totalQty += item.qty;
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <div class="cart-item-img">${symbols[item.id] || '🧴'}</div>
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-meta">Size: ${item.volume}</div>
        <div class="cart-item-price-row">
          <span class="cart-item-qty">Qty: ${item.qty}</span>
          <span class="cart-item-price">$${item.price * item.qty}</span>
        </div>
        <button class="cart-item-remove" data-idx="${idx}">Remove</button>
      </div>`;
    cartItemsCont.appendChild(el);
  });
  cartSubtotal.textContent = `$${total}`;
  cartCountBadge.textContent = totalQty.toString();
  cartItemsCont.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', e => removeFromCart(parseInt(e.currentTarget.dataset.idx)));
  });
}

// ─── CARD "ADD TO CART" BUTTONS ───────────────────────────
document.querySelectorAll('.btn-add-cart[data-product]').forEach(btn => {
  btn.addEventListener('click', () => {
    const id    = btn.dataset.product;
    const name  = btn.dataset.name;
    const price = parseInt(btn.dataset.price);
    addToCart(id, name, price);
    const orig = btn.textContent;
    btn.textContent = '✓ Added!';
    btn.style.background = '#2d6a4f';
    setTimeout(() => { btn.textContent = orig; btn.style.background = ''; }, 1600);
  });
});

// ─── ORDER FORM ───────────────────────────────────────────
const qtyMinus   = document.getElementById('qty-minus');
const qtyPlus    = document.getElementById('qty-plus');
const qtyInput   = document.getElementById('qty-value');
const sizeSelect = document.getElementById('bottle-size');
const calcTotal  = document.getElementById('calculated-total');

function updateTotal() {
  const scentId = document.querySelector('input[name="blend"]:checked').value;
  const base    = state.scents[scentId].price;
  const mult    = parseFloat(sizeSelect.options[sizeSelect.selectedIndex].dataset.priceMultiplier);
  const qty     = parseInt(qtyInput.value);
  calcTotal.textContent = Math.round(base * mult * qty);
}

qtyMinus.addEventListener('click', () => {
  if (parseInt(qtyInput.value) > 1) { qtyInput.value = parseInt(qtyInput.value) - 1; updateTotal(); }
});
qtyPlus.addEventListener('click', () => {
  qtyInput.value = parseInt(qtyInput.value) + 1; updateTotal();
});
sizeSelect.addEventListener('change', updateTotal);
document.querySelectorAll('input[name="blend"]').forEach(r => r.addEventListener('change', updateTotal));

document.getElementById('purchase-form').addEventListener('submit', e => {
  e.preventDefault();
  const scentId = document.querySelector('input[name="blend"]:checked').value;
  const volume  = sizeSelect.value;
  const qty     = parseInt(qtyInput.value);
  const mult    = parseFloat(sizeSelect.options[sizeSelect.selectedIndex].dataset.priceMultiplier);
  const price   = Math.round(state.scents[scentId].price * mult);
  addToCart(scentId, state.scents[scentId].name, price, volume, qty);
});

// ─── CHECKOUT ─────────────────────────────────────────────
document.getElementById('checkout-btn').addEventListener('click', () => {
  if (state.cart.length === 0) return;
  alert("⚜️ Order placed successfully! A confirmation will be sent to your email.");
  state.cart = []; updateCartUI(); closeCart();
});

// ─── NEWSLETTER ───────────────────────────────────────────
document.getElementById('newsletter-form').addEventListener('submit', e => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.textContent = '✓';
  btn.style.background = '#2d6a4f';
  e.target.querySelector('input').value = '';
  setTimeout(() => { btn.textContent = '→'; btn.style.background = ''; }, 2500);
});

// ─── ENTRANCE ANIMATIONS ──────────────────────────────────
const obs = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      const delay = Array.from(entry.target.parentElement?.children || []).indexOf(entry.target) * 100;
      setTimeout(() => entry.target.classList.add('visible'), delay);
      obs.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.animate-in').forEach(el => obs.observe(el));

// ─── SCROLL REVEAL: Product Cards ────────────────────────
ScrollTrigger.batch('.product-card', {
  onEnter: els => gsap.fromTo(els,
    { opacity: 0, y: 50 },
    { opacity: 1, y: 0, stagger: 0.15, duration: 0.85, ease: 'power3.out' }
  ),
  once: true, start: 'top 88%'
});

// Why cards
ScrollTrigger.batch('.why-card', {
  onEnter: els => gsap.fromTo(els,
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, stagger: 0.1, duration: 0.7, ease: 'power3.out' }
  ),
  once: true, start: 'top 88%'
});

// Testimonials
ScrollTrigger.batch('.testimonial-card', {
  onEnter: els => gsap.fromTo(els,
    { opacity: 0, y: 30 },
    { opacity: 1, y: 0, stagger: 0.12, duration: 0.7, ease: 'power3.out' }
  ),
  once: true, start: 'top 88%'
});

// ─── SMOOTH SCROLL ────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ─── INIT ─────────────────────────────────────────────────
updateTotal();
updateCartUI();
