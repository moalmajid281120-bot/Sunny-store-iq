import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const db = getFirestore(initializeApp(firebaseConfig));
const DELIVERY_FEE = 5000;
const categories = [
  {id:'brooches',name:'بروشات',icon:'✨'},
  {id:'special-necklaces',name:'قلادات اختصاص',icon:'📿'},
  {id:'accessories',name:'إكسسوارات',icon:'👜'},
  {id:'sets',name:'أطقم',icon:'🎁'},
  {id:'pens',name:'أقلام',icon:'🖊️'},
  {id:'table-lamps',name:'تيبل لامب',icon:'💡'},
  {id:'stationery',name:'قرطاسية',icon:'📒'},
  {id:'medals',name:'مداليات',icon:'🏅'}
];
let products = [];
async function loadProducts(){
  const snap = await getDocs(collection(db,'products'));
  products = snap.docs.map(d=>{
    const x = d.data();
    return {
      id: d.id,
      name: String(x.Name ?? x.name ?? '').trim(),
      category: String(x.categoryId ?? '').trim(),
      price: Number(x.Price ?? x.price ?? 0),
      desc: String(x.description ?? '').trim(),
      status: String(x.Status ?? x.status ?? '').trim().toLowerCase(),
      sortOrder: Number(x.sortOrder ?? 0)
    };
  }).filter(p=>p.status==='active').sort((a,b)=>a.sortOrder-b.sortOrder);
}
let cart = JSON.parse(localStorage.getItem('sunnyCart') || '{}');
const app = document.getElementById('app');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');
const toast = document.getElementById('toast');

function money(n){return new Intl.NumberFormat('ar-IQ').format(n) + ' د.ع';}
function categoryById(id){return categories.find(c=>c.id===id);}
function getProduct(id){return products.find(p=>p.id===id);}
function saveCart(){localStorage.setItem('sunnyCart',JSON.stringify(cart)); updateCartCount();}
function cartCount(){return Object.values(cart).reduce((s,q)=>s+q,0);}
function cartSubtotal(){return Object.entries(cart).reduce((s,[id,q])=>s+(getProduct(id)?.price||0)*q,0);}
function updateCartCount(){document.getElementById('cartCount').textContent=cartCount();document.getElementById('menuCartCount').textContent=cartCount();}
function showToast(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1800);}
function productCard(p){return `<article class="product-card">
  <button class="product-image" data-product="${p.id}" aria-label="عرض ${p.name}">☀️</button>
  <div class="product-body">
    <h3>${p.name}</h3><div class="product-desc">${p.desc}</div>
    <div class="product-bottom"><span class="price">${money(p.price)}</span>
      <div class="qty"><button data-qty="-" data-id="${p.id}">−</button><span id="qty-${p.id}">1</span><button data-qty="+" data-id="${p.id}">+</button></div>
    </div>
    <button class="add-btn" data-add="${p.id}">أضف للسلة</button>
  </div></article>`;}
function home(){
 app.innerHTML=`<section class="hero"><div class="hero-copy"><span class="eyebrow">متجر البروشات الأكبر في العراق</span><h1>خليك <span>أكثر إشراقًا.</span></h1><p>اكتشف بروشات وإكسسوارات وهدايا مختارة تضيف لمسة مشرقة إلى يومك.</p><div class="hero-buttons"><button class="primary-btn" data-route="categories">تصفح الأقسام</button><button class="secondary-btn" data-route="how-to-order">كيف أطلب؟</button></div></div><div class="hero-card"><div class="sun-visual">☀️</div></div></section>
 <section class="section"><div class="section-head"><div><h2>الأقسام</h2><p>اختر القسم واستكشف المنتجات.</p></div></div><div class="categories">${categories.map(c=>`<button class="category-card" data-category="${c.id}"><div class="category-icon">${c.icon}</div><strong>${c.name}</strong><small>عرض المنتجات ←</small></button>`).join('')}</div></section>
 <section class="section"><div class="section-head"><div><h2>الأكثر رواجًا</h2><p>مجموعة مختارة للعرض التجريبي.</p></div><button class="view-all" data-route="categories">عرض الكل</button></div><div class="product-grid">${products.slice(0,4).map(productCard).join('')}</div></section>
 <section class="section"><div class="section-head"><div><h2>وصل حديثًا</h2><p>سنربط هذا القسم لاحقًا بقاعدة البيانات.</p></div></div><div class="product-grid">${products.slice(4).map(productCard).join('')}</div></section>`;
}
function categoriesPage(){app.innerHTML=`<section class="page"><div class="page-title"><h1>الأقسام</h1><p>اختر قسمًا لعرض منتجاته.</p></div><div class="categories">${categories.map(c=>`<button class="category-card" data-category="${c.id}"><div class="category-icon">${c.icon}</div><strong>${c.name}</strong><small>عرض المنتجات ←</small></button>`).join('')}</div></section>`;}
function categoryPage(id){const c=categoryById(id);const list=products.filter(p=>p.category===id);app.innerHTML=`<section class="page"><div class="breadcrumb"><button data-route="home">الرئيسية</button> ← ${c.name}</div><div class="page-title"><h1>${c.icon} ${c.name}</h1><p>منتجات قسم ${c.name}</p></div><div class="search-box"><span>⌕</span><input id="categorySearch" placeholder="ابحث داخل هذا القسم..."></div><div id="categoryProducts" class="product-grid" style="margin-top:20px">${list.map(productCard).join('')}</div></section>`;document.getElementById('categorySearch').addEventListener('input',e=>{const q=e.target.value.trim();document.getElementById('categoryProducts').innerHTML=list.filter(p=>p.name.includes(q)||p.desc.includes(q)).map(productCard).join('')||'<p class="muted">لا توجد منتجات مطابقة.</p>';});}
function productPage(id){const p=getProduct(id);if(!p)return home();const c=categoryById(p.category);app.innerHTML=`<section class="page"><div class="breadcrumb"><button data-route="home">الرئيسية</button> ← <button data-category="${c.id}">${c.name}</button> ← ${p.name}</div><div class="product-detail"><div class="detail-gallery"><div class="detail-placeholder">☀️</div></div><div class="detail-info"><span class="eyebrow">${c.name}</span><h1>${p.name}</h1><div class="detail-price">${money(p.price)}</div><p class="detail-desc">${p.desc}</p><div class="info-box">يمكن للمنتج دعم أكثر من صورة. عند ربط Firebase ورفع الصور سنعرضها هنا كمعرض صور.</div><div class="detail-actions"><div class="quantity-large"><button id="detailMinus">−</button><span id="detailQty">1</span><button id="detailPlus">+</button></div><button class="primary-btn" id="detailAdd">أضف للسلة</button></div></div></div></section>`;let q=1;const out=document.getElementById('detailQty');document.getElementById('detailMinus').onclick=()=>{q=Math.max(1,q-1);out.textContent=q};document.getElementById('detailPlus').onclick=()=>{q++;out.textContent=q};document.getElementById('detailAdd').onclick=()=>addToCart(id,q);}
function howToOrder(){app.innerHTML=`<section class="page how-to"><div class="page-title"><h1>كيف أطلب؟</h1><p>طلبك بسيط، وسنتواصل معك لتأكيده.</p></div><div class="steps"><div class="step"><span class="step-num">1</span><div><strong>اختر المنتج</strong><p class="muted">تصفح الأقسام أو ابحث عن المنتج الذي تريده، ثم افتح صفحته.</p></div></div><div class="step"><span class="step-num">2</span><div><strong>أضفه إلى السلة</strong><p class="muted">حدد الكمية التي تريدها ثم اضغط «أضف للسلة».</p></div></div><div class="step"><span class="step-num">3</span><div><strong>املأ معلوماتك</strong><p class="muted">اكتب اسمك ومحافظتك وعنوانك ورقم هاتف يحتوي واتساب فعّال.</p></div></div><div class="step"><span class="step-num">4</span><div><strong>نؤكد الطلب معك</strong><p class="muted">بعد إرسال الطلب سنتواصل معك عبر واتساب لتأكيد التفاصيل.</p></div></div></div></section>`;}
function addToCart(id,q=1){cart[id]=(cart[id]||0)+q;saveCart();showToast('تمت إضافة المنتج إلى السلة');}
function changeQty(id,delta){cart[id]=(cart[id]||0)+delta;if(cart[id]<=0)delete cart[id];saveCart();renderCart();}
function renderCart(){const items=document.getElementById('cartItems');const entries=Object.entries(cart);if(!entries.length){items.innerHTML='<div class="muted">السلة فارغة حاليًا.</div>';document.getElementById('cartSummary').innerHTML='';document.getElementById('checkoutBtn').disabled=true;document.getElementById('checkoutBtn').style.opacity=.5;return;}document.getElementById('checkoutBtn').disabled=false;document.getElementById('checkoutBtn').style.opacity=1;items.innerHTML=entries.map(([id,q])=>{const p=getProduct(id);return `<div class="cart-row"><div class="cart-row-top"><span class="cart-row-name">${p.name}</span><span>${money(p.price*q)}</span></div><div class="cart-row-bottom"><div class="qty"><button data-cart-minus="${id}">−</button><span>${q}</span><button data-cart-plus="${id}">+</button></div><button class="remove-btn" data-remove="${id}">حذف</button></div></div>`}).join('');const sub=cartSubtotal(),total=sub+DELIVERY_FEE;document.getElementById('cartSummary').innerHTML=`<div class="sum-line"><span>مجموع المنتجات</span><strong>${money(sub)}</strong></div><div class="sum-line"><span>التوصيل داخل العراق</span><strong>${money(DELIVERY_FEE)}</strong></div><div class="sum-line total"><span>الإجمالي النهائي</span><strong>${money(total)}</strong></div>`;}
function openCart(){document.getElementById('cartPanel').hidden=false;renderCart();}
function openSearch(){document.getElementById('searchPanel').hidden=false;setTimeout(()=>document.getElementById('globalSearch').focus(),50);}
function openMenu(){sideMenu.classList.add('open');sideMenu.setAttribute('aria-hidden','false');overlay.hidden=false}
function closeMenu(){sideMenu.classList.remove('open');sideMenu.setAttribute('aria-hidden','true');overlay.hidden=true}
function route(){const hash=location.hash.replace(/^#\/?/,'')||'home';if(hash==='home')home();else if(hash==='categories')categoriesPage();else if(hash==='how-to-order')howToOrder();else if(hash.startsWith('category/'))categoryPage(hash.split('/')[1]);else if(hash.startsWith('product/'))productPage(hash.split('/')[1]);else home();window.scrollTo(0,0);updateCartCount();}
function go(path){location.hash='/'+path;closeMenu();}

document.addEventListener('click',e=>{const el=e.target.closest('[data-route]');if(el){go(el.dataset.route);return}const cat=e.target.closest('[data-category]');if(cat){go('category/'+cat.dataset.category);return}const prod=e.target.closest('[data-product]');if(prod){go('product/'+prod.dataset.product);return}const add=e.target.closest('[data-add]');if(add){const q=parseInt(document.getElementById('qty-'+add.dataset.add)?.textContent||'1');addToCart(add.dataset.add,q);return}const qty=e.target.closest('[data-qty]');if(qty){const id=qty.dataset.id;const out=document.getElementById('qty-'+id);let q=parseInt(out.textContent)||1;q=qty.dataset.qty==='+'?q+1:Math.max(1,q-1);out.textContent=q;return}const cp=e.target.closest('[data-cart-plus]');if(cp){changeQty(cp.dataset.cartPlus,1);return}const cm=e.target.closest('[data-cart-minus]');if(cm){changeQty(cm.dataset.cartMinus,-1);return}const rm=e.target.closest('[data-remove]');if(rm){delete cart[rm.dataset.remove];saveCart();renderCart();return}if(e.target.closest('#menuBtn'))openMenu();if(e.target.closest('[data-close-menu]'))closeMenu();if(e.target===overlay)closeMenu();if(e.target.closest('[data-open-cart]'))openCart();if(e.target.closest('[data-close-cart]'))document.getElementById('cartPanel').hidden=true;if(e.target.closest('[data-open-search]')){closeMenu();openSearch()}if(e.target.closest('[data-close-search]'))document.getElementById('searchPanel').hidden=true;if(e.target.closest('[data-close-checkout]'))document.getElementById('checkoutPanel').hidden=true;if(e.target.closest('#checkoutBtn')){if(cartCount())openCheckout()}});
function openCheckout(){document.getElementById('cartPanel').hidden=true;document.getElementById('checkoutPanel').hidden=false;document.getElementById('checkoutTotal').textContent=`الإجمالي النهائي: ${money(cartSubtotal()+DELIVERY_FEE)} (يشمل التوصيل ${money(DELIVERY_FEE)})`;}
document.getElementById('globalSearch').addEventListener('input',e=>{const q=e.target.value.trim();const list=products.filter(p=>!q||p.name.includes(q)||p.desc.includes(q));document.getElementById('searchResults').innerHTML=list.map(p=>`<button class="search-result" data-product="${p.id}"><span>${p.name}</span><strong>${money(p.price)}</strong></button>`).join('')||'<p class="muted">لا توجد نتائج.</p>';});
document.getElementById('checkoutForm').addEventListener('submit',e=>{e.preventDefault();if(!cartCount())return;const data=Object.fromEntries(new FormData(e.target));showToast('تم استلام طلبك تجريبيًا');setTimeout(()=>{alert(`شكرًا ${data.name}!\nسيتم التواصل معك عبر واتساب لتأكيد الطلب.\nالإجمالي: ${money(cartSubtotal()+DELIVERY_FEE)}`);cart={};saveCart();e.target.reset();document.getElementById('checkoutPanel').hidden=true;route();},150);});
window.addEventListener('hashchange',route);
loadProducts().then(()=>{
  Object.keys(cart).forEach(id=>{ if(!getProduct(id)) delete cart[id]; });
  saveCart();
  route();
}).catch(err=>{ console.error(err); showToast('تعذر تحميل المنتجات'); route(); });
getDocs(collection(db,'products')).then(s=>alert('عدد المستندات: '+s.size+'\n'+JSON.stringify(s.docs[0]?.data()))).catch(e=>alert('خطأ: '+e.message));
