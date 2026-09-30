import { firebaseConfig } from './firebase-config.js';

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js';
import {
  getFirestore,
  collection,
  getDocs
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const DELIVERY_FEE = 5000;

let categories = [];
let products = [];

let cart = JSON.parse(localStorage.getItem('sunnyCart') || '{}');

const app = document.getElementById('app');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');
const toast = document.getElementById('toast');

function money(n) {
  return new Intl.NumberFormat('ar-IQ').format(n) + ' د.ع';
}

function categoryById(id) {
  return categories.find(c => c.id === id);
}

function getProduct(id) {
  return products.find(p => p.id === id);
}

function saveCart() {
  localStorage.setItem('sunnyCart', JSON.stringify(cart));
  updateCartCount();
}

function cartCount() {
  return Object.values(cart).reduce((sum, q) => sum + q, 0);
}

function cartSubtotal() {
  return Object.entries(cart).reduce((sum, [id, q]) => {
    const product = getProduct(id);
    return sum + (product ? product.price * q : 0);
  }, 0);
}

function updateCartCount() {
  document.getElementById('cartCount').textContent = cartCount();
  document.getElementById('menuCartCount').textContent = cartCount();
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');

  clearTimeout(showToast.t);

  showToast.t = setTimeout(() => {
    toast.classList.remove('show');
  }, 1800);
}

/* =========================
   تحميل البيانات من Firebase
========================= */

async function loadStoreData() {
  try {
    const categorySnapshot = await getDocs(collection(db, 'categories'));

    categories = categorySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    categories.sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), 'ar')
    );

    const productSnapshot = await getDocs(collection(db, 'products'));

    products = productSnapshot.docs
      .map(doc => {
        const data = doc.data();

        return {
          id: doc.id,
          name: data.name || 'منتج بدون اسم',
          category: data.categoryId || '',
          price: Number(data.price || 0),
          desc: data.description || data.shortDescription || '',
          images: Array.isArray(data.images) ? data.images : [],
          stock: Number(data.stock ?? 0),
          status: data.status || 'active',
          isFeatured: Boolean(data.isFeatured),
          sortOrder: Number(data.sortOrder || 0),
          createdAt: data.createdAt || null
        };
      })
      .filter(product => product.status === 'active');

    products.sort((a, b) => a.sortOrder - b.sortOrder);

    route();
    updateCartCount();

  } catch (error) {
    console.error('Firebase error:', error);

    app.innerHTML = `
      <section class="page">
        <div class="page-title">
          <h1>حدث خطأ</h1>
          <p class="muted">
            تعذر تحميل المنتجات حاليًا. حاول تحديث الصفحة.
          </p>
        </div>
      </section>
    `;
  }
}

/* =========================
   المنتجات
========================= */

function productCard(p) {
  const image = p.images?.[0];

  return `
    <article class="product-card">

      <button
        class="product-image"
        data-product="${p.id}"
        aria-label="عرض ${p.name}"
      >
        ${
          image
            ? `<img src="${image}" alt="${p.name}" loading="lazy">`
            : `☀️`
        }
      </button>

      <div class="product-body">

        <h3>${p.name}</h3>

        <div class="product-desc">
          ${p.desc}
        </div>

        <div class="product-bottom">

          <span class="price">
            ${money(p.price)}
          </span>

          <div class="qty">
            <button data-qty="-" data-id="${p.id}">−</button>
            <span id="qty-${p.id}">1</span>
            <button data-qty="+" data-id="${p.id}">+</button>
          </div>

        </div>

        <button class="add-btn" data-add="${p.id}">
          أضف للسلة
        </button>

      </div>

    </article>
  `;
}

/* =========================
   الصفحة الرئيسية
========================= */

function home() {

  const featured = products
    .filter(p => p.isFeatured)
    .slice(0, 4);

  const newest = [...products]
    .sort((a, b) => b.sortOrder - a.sortOrder)
    .slice(0, 4);

  app.innerHTML = `

    <section class="hero">

      <div class="hero-copy">

        <span class="eyebrow">
          متجر البروشات الأكبر في العراق
        </span>

        <h1>
          خليك <span>أكثر إشراقًا.</span>
        </h1>

        <p>
          اكتشف بروشات وإكسسوارات وهدايا مختارة
          تضيف لمسة مشرقة إلى يومك.
        </p>

        <div class="hero-buttons">

          <button
            class="primary-btn"
            data-route="categories"
          >
            تصفح الأقسام
          </button>

          <button
            class="secondary-btn"
            data-route="how-to-order"
          >
            كيف أطلب؟
          </button>

        </div>

      </div>

      <div class="hero-card">
        <div class="sun-visual">☀️</div>
      </div>

    </section>


    <section class="section">

      <div class="section-head">

        <div>
          <h2>الأقسام</h2>
          <p>اختر القسم واستكشف المنتجات.</p>
        </div>

      </div>

      <div class="categories">

        ${categories.map(c => `

          <button
            class="category-card"
            data-category="${c.id}"
          >

            <div class="category-icon">
              ${c.icon || '☀️'}
            </div>

            <strong>${c.name}</strong>

            <small>
              عرض المنتجات ←
            </small>

          </button>

        `).join('')}

      </div>

    </section>


    <section class="section">

      <div class="section-head">

        <div>
          <h2>الأكثر رواجًا</h2>
          <p>منتجات مختارة من المتجر.</p>
        </div>

        <button
          class="view-all"
          data-route="categories"
        >
          عرض الكل
        </button>

      </div>

      <div class="product-grid">

        ${
          featured.length
            ? featured.map(productCard).join('')
            : '<p class="muted">لا توجد منتجات مميزة حاليًا.</p>'
        }

      </div>

    </section>


    <section class="section">

      <div class="section-head">

        <div>
          <h2>وصل حديثًا</h2>
          <p>اكتشف أحدث منتجات Sunny Store.</p>
        </div>

      </div>

      <div class="product-grid">

        ${
          newest.length
            ? newest.map(productCard).join('')
            : '<p class="muted">لا توجد منتجات حاليًا.</p>'
        }

      </div>

    </section>
  `;
}


/* =========================
   صفحة الأقسام
========================= */

function categoriesPage() {

  app.innerHTML = `

    <section class="page">

      <div class="page-title">
        <h1>الأقسام</h1>
        <p>اختر قسمًا لعرض منتجاته.</p>
      </div>

      <div class="categories">

        ${categories.map(c => `

          <button
            class="category-card"
            data-category="${c.id}"
          >

            <div class="category-icon">
              ${c.icon || '☀️'}
            </div>

            <strong>${c.name}</strong>

            <small>
              عرض المنتجات ←
            </small>

          </button>

        `).join('')}

      </div>

    </section>
  `;
}


/* =========================
   صفحة القسم
========================= */

function categoryPage(id) {

  const category = categoryById(id);

  if (!category) {
    home();
    return;
  }

  const list = products.filter(
    p => p.category === id
  );

  app.innerHTML = `

    <section class="page">

      <div class="breadcrumb">
        <button data-route="home">الرئيسية</button>
        ← ${category.name}
      </div>

      <div class="page-title">

        <h1>
          ${category.icon || '☀️'} ${category.name}
        </h1>

        <p>
          منتجات قسم ${category.name}
        </p>

      </div>

      <div class="search-box">

        <span>⌕</span>

        <input
          id="categorySearch"
          placeholder="ابحث داخل هذا القسم..."
        >

      </div>

      <div
        id="categoryProducts"
        class="product-grid"
        style="margin-top:20px"
      >

        ${
          list.length
            ? list.map(productCard).join('')
            : '<p class="muted">لا توجد منتجات في هذا القسم حاليًا.</p>'
        }

      </div>

    </section>
  `;

  document
    .getElementById('categorySearch')
    .addEventListener('input', e => {

      const q = e.target.value.trim();

      const filtered = list.filter(p =>
        p.name.includes(q) ||
        p.desc.includes(q)
      );

      document.getElementById('categoryProducts').innerHTML =
        filtered.length
          ? filtered.map(productCard).join('')
          : '<p class="muted">لا توجد منتجات مطابقة.</p>';
    });
}


/* =========================
   صفحة المنتج
========================= */

function productPage(id) {

  const p = getProduct(id);

  if (!p) {
    home();
    return;
  }

  const category = categoryById(p.category);

  if (!category) {
    home();
    return;
  }

  const images = p.images || [];

  const gallery = images.length
    ? images.map((image, index) => `
        <img
          src="${image}"
          alt="${p.name} - صورة ${index + 1}"
          loading="${index === 0 ? 'eager' : 'lazy'}"
        >
      `).join('')
    : `<div class="detail-placeholder">☀️</div>`;

  app.innerHTML = `

    <section class="page">

      <div class="breadcrumb">

        <button data-route="home">
          الرئيسية
        </button>

        ←

        <button data-category="${category.id}">
          ${category.name}
        </button>

        ← ${p.name}

      </div>


      <div class="product-detail">

        <div class="detail-gallery">

          ${gallery}

        </div>


        <div class="detail-info">

          <span class="eyebrow">
            ${category.name}
          </span>

          <h1>${p.name}</h1>

          <div class="detail-price">
            ${money(p.price)}
          </div>

          <p class="detail-desc">
            ${p.desc}
          </p>


          ${
            p.stock <= 0
              ? `
                <div class="info-box">
                  هذا المنتج غير متوفر حاليًا.
                </div>
              `
              : ''
          }


          <div class="detail-actions">

            <div class="quantity-large">

              <button id="detailMinus">
                −
              </button>

              <span id="detailQty">
                1
              </span>

              <button id="detailPlus">
                +
              </button>

            </div>


            <button
              class="primary-btn"
              id="detailAdd"
              ${p.stock <= 0 ? 'disabled' : ''}
            >
              أضف للسلة
            </button>

          </div>

        </div>

      </div>

    </section>
  `;


  let q = 1;

  const out = document.getElementById('detailQty');

  document.getElementById('detailMinus').onclick = () => {
    q = Math.max(1, q - 1);
    out.textContent = q;
  };


  document.getElementById('detailPlus').onclick = () => {

    if (p.stock > 0) {
      q = Math.min(p.stock, q + 1);
      out.textContent = q;
    }

  };


  document.getElementById('detailAdd').onclick = () => {

    if (p.stock <= 0) return;

    addToCart(id, q);

  };
}


/* =========================
   كيف أطلب؟
========================= */

function howToOrder() {

  app.innerHTML = `

    <section class="page how-to">

      <div class="page-title">

        <h1>كيف أطلب؟</h1>

        <p>
          طلبك بسيط، وسنتواصل معك لتأكيده.
        </p>

      </div>


      <div class="steps">

        <div class="step">

          <span class="step-num">1</span>

          <div>

            <strong>اختر المنتج</strong>

            <p class="muted">
              تصفح الأقسام أو ابحث عن المنتج
              الذي تريده، ثم افتح صفحته.
            </p>

          </div>

        </div>


        <div class="step">

          <span class="step-num">2</span>

          <div>

            <strong>أضفه إلى السلة</strong>

            <p class="muted">
              حدد الكمية التي تريدها ثم اضغط
              «أضف للسلة».
            </p>

          </div>

        </div>


        <div class="step">

          <span class="step-num">3</span>

          <div>

            <strong>املأ معلوماتك</strong>

            <p class="muted">
              اكتب اسمك ومحافظتك وعنوانك
              ورقم هاتف يحتوي واتساب فعّال.
            </p>

          </div>

        </div>


        <div class="step">

          <span class="step-num">4</span>

          <div>

            <strong>نؤكد الطلب معك</strong>

            <p class="muted">
              بعد إرسال الطلب سنتواصل معك
              عبر واتساب لتأكيد التفاصيل.
            </p>

          </div>

        </div>

      </div>

    </section>
  `;
}


/* =========================
   السلة
========================= */

function addToCart(id, q = 1) {

  const product = getProduct(id);

  if (!product || product.stock <= 0) {
    showToast('المنتج غير متوفر حاليًا');
    return;
  }

  const current = cart[id] || 0;

  cart[id] = Math.min(
    current + q,
    product.stock
  );

  saveCart();

  showToast('تمت إضافة المنتج إلى السلة');
}


function changeQty(id, delta) {

  const product = getProduct(id);

  if (!product) return;

  cart[id] = (cart[id] || 0) + delta;

  if (cart[id] <= 0) {
    delete cart[id];
  }

  if (product.stock > 0 && cart[id] > product.stock) {
    cart[id] = product.stock;
  }

  saveCart();

  renderCart();
}


function renderCart() {

  const items = document.getElementById('cartItems');

  const entries = Object.entries(cart)
    .filter(([id]) => getProduct(id));


  if (!entries.length) {

    items.innerHTML =
      '<div class="muted">السلة فارغة حاليًا.</div>';

    document.getElementById('cartSummary').innerHTML = '';

    document.getElementById('checkoutBtn').disabled = true;

    document.getElementById('checkoutBtn').style.opacity = .5;

    return;
  }


  document.getElementById('checkoutBtn').disabled = false;

  document.getElementById('checkoutBtn').style.opacity = 1;


  items.innerHTML = entries.map(([id, q]) => {

    const p = getProduct(id);

    return `

      <div class="cart-row">

        <div class="cart-row-top">

          <span class="cart-row-name">
            ${p.name}
          </span>

          <span>
            ${money(p.price * q)}
          </span>

        </div>


        <div class="cart-row-bottom">

          <div class="qty">

            <button data-cart-minus="${id}">
              −
            </button>

            <span>${q}</span>

            <button data-cart-plus="${id}">
              +
            </button>

          </div>


          <button
            class="remove-btn"
            data-remove="${id}"
          >
            حذف
          </button>

        </div>

      </div>
    `;

  }).join('');


  const sub = cartSubtotal();

  const total = sub + DELIVERY_FEE;


  document.getElementById('cartSummary').innerHTML = `

    <div class="sum-line">

      <span>مجموع المنتجات</span>

      <strong>${money(sub)}</strong>

    </div>


    <div class="sum-line">

      <span>التوصيل داخل العراق</span>

      <strong>${money(DELIVERY_FEE)}</strong>

    </div>


    <div class="sum-line total">

      <span>الإجمالي النهائي</span>

      <strong>${money(total)}</strong>

    </div>

  `;
}


/* =========================
   النوافذ والقائمة
========================= */

function openCart() {

  document.getElementById('cartPanel').hidden = false;

  renderCart();
}


function openSearch() {

  document.getElementById('searchPanel').hidden = false;

  setTimeout(() => {
    document.getElementById('globalSearch').focus();
  }, 50);
}


function openMenu() {

  sideMenu.classList.add('open');

  sideMenu.setAttribute('aria-hidden', 'false');

  overlay.hidden = false;
}


function closeMenu() {

  sideMenu.classList.remove('open');

  sideMenu.setAttribute('aria-hidden', 'true');

  overlay.hidden = true;
}


/* =========================
   التنقل
========================= */

function route() {

  const hash =
    location.hash.replace(/^#\/?/, '') || 'home';


  if (hash === 'home') {
    home();

  } else if (hash === 'categories') {
    categoriesPage();

  } else if (hash === 'how-to-order') {
    howToOrder();

  } else if (hash.startsWith('category/')) {

    categoryPage(
      hash.split('/')[1]
    );

  } else if (hash.startsWith('product/')) {

    productPage(
      hash.split('/')[1]
    );

  } else {

    home();

  }


  window.scrollTo(0, 0);

  updateCartCount();
}


function go(path) {

  location.hash = '/' + path;

  closeMenu();
}


/* =========================
   الأحداث
========================= */

document.addEventListener('click', e => {

  const el =
    e.target.closest('[data-route]');

  if (el) {
    go(el.dataset.route);
    return;
  }


  const cat =
    e.target.closest('[data-category]');

  if (cat) {

    go(
      'category/' +
      cat.dataset.category
    );

    return;
  }


  const prod =
    e.target.closest('[data-product]');

  if (prod) {

    go(
      'product/' +
      prod.dataset.product
    );

    return;
  }


  const add =
    e.target.closest('[data-add]');

  if (add) {

    const q = parseInt(
      document.getElementById(
        'qty-' + add.dataset.add
      )?.textContent || '1'
    );

    addToCart(
      add.dataset.add,
      q
    );

    return;
  }


  const qty =
    e.target.closest('[data-qty]');

  if (qty) {

    const id = qty.dataset.id;

    const out =
      document.getElementById('qty-' + id);

    let q =
      parseInt(out.textContent) || 1;

    const product = getProduct(id);

    if (qty.dataset.qty === '+') {

      if (!product || q < product.stock) {
        q++;
      }

    } else {

      q = Math.max(1, q - 1);

    }

    out.textContent = q;

    return;
  }


  const cp =
    e.target.closest('[data-cart-plus]');

  if (cp) {

    changeQty(
      cp.dataset.cartPlus,
      1
    );

    return;
  }


  const cm =
    e.target.closest('[data-cart-minus]');

  if (cm) {

    changeQty(
      cm.dataset.cartMinus,
      -1
    );

    return;
  }


  const rm =
    e.target.closest('[data-remove]');

  if (rm) {

    delete cart[rm.dataset.remove];

    saveCart();

    renderCart();

    return;
  }


  if (e.target.closest('#menuBtn')) {
    openMenu();
  }


  if (e.target.closest('[data-close-menu]')) {
    closeMenu();
  }


  if (e.target === overlay) {
    closeMenu();
  }


  if (e.target.closest('[data-open-cart]')) {
    openCart();
  }


  if (e.target.closest('[data-close-cart]')) {
    document.getElementById('cartPanel').hidden = true;
  }


  if (e.target.closest('[data-open-search]')) {

    closeMenu();

    openSearch();

  }


  if (e.target.closest('[data-close-search]')) {

    document.getElementById('searchPanel').hidden = true;

  }


  if (e.target.closest('[data-close-checkout]')) {

    document.getElementById('checkoutPanel').hidden = true;

  }


  if (e.target.closest('#checkoutBtn')) {

    if (cartCount()) {
      openCheckout();
    }

  }

});


/* =========================
   إتمام الطلب
========================= */

function openCheckout() {

  document.getElementById('cartPanel').hidden = true;

  document.getElementById('checkoutPanel').hidden = false;

  document.getElementById('checkoutTotal').textContent =
    `الإجمالي النهائي: ${money(
      cartSubtotal() + DELIVERY_FEE
    )} (يشمل التوصيل ${money(DELIVERY_FEE)})
