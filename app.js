import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, serverTimestamp, query, where, orderBy, limit, startAfter, documentId } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const db = getFirestore(initializeApp(firebaseConfig));
const DELIVERY_FEE = 5000;
const FREE_FROM = 50000;
const PAGE_SIZE = 24;
const deliveryFor = sub => sub >= FREE_FROM ? 0 : DELIVERY_FEE;
const deliveryText = d => d === 0 ? 'مجاني' : money(d);
const categories = [
  {id:'brooches',name:'بروشات',icon:'🧷'},
  {id:'special-necklaces',name:'قلادات اختصاص',icon:'💫'},
  {id:'accessories',name:'إكسسوارات',icon:'💍'},
  {id:'sets',name:'أطقم',icon:'🎁'},
  {id:'pens',name:'أقلام',icon:'🖊️'},
  {id:'table-lamps',name:'تيبل لامب',icon:'💡'},
  {id:'stationery',name:'قرطاسية',icon:'📒'},
  {id:'medals',name:'مداليات',icon:'🏅'}
];

let products = [];
let allProductsLoaded = false;
const categoryState = {};

function normalizeProduct(d){
  const x = {};
  Object.entries(d.data()).forEach(([k,v])=>{ x[k.trim().toLowerCase()] = v; });
  return {
    id: d.id,
    name: String(x.name ?? '').trim(),
    category: String(x.categoryid ?? '').trim(),
    price: Number(x.price ?? 0),
    desc: String(x.description ?? '').trim(),
    status: String(x.status ?? '').trim().toLowerCase(),
    isFeatured: Boolean(x.isfeatured),
    sortOrder: Number(x.sortorder ?? 0),
    thumb: String(x.thumb ?? ''),
    imageIds: Array.isArray(x.imageids) ? x.imageids : [],
    optionTitle: String(x.optiontitle ?? '').trim(),
    options: Array.isArray(x.options) ? x.options : []
  };
}
const isVisibleProduct = p => p && (p.status === 'active' || p.status === 'unavailable');
function mergeProducts(list){
  const map = new Map(products.map(p=>[p.id,p]));
  list.forEach(p=>map.set(p.id,p));
  products = [...map.values()].sort((a,b)=>a.sortOrder-b.sortOrder);
}
async function loadInitialProducts(){
  const snap = await getDocs(query(collection(db,'products'), limit(PAGE_SIZE)));
  mergeProducts(snap.docs.map(normalizeProduct).filter(isVisibleProduct));
}
async function ensureAllProducts(){
  if(allProductsLoaded) return;
  const snap = await getDocs(collection(db,'products'));
  mergeProducts(snap.docs.map(normalizeProduct).filter(isVisibleProduct));
  allProductsLoaded = true;
}
async function ensureProduct(id){
  let p = getProduct(id);
  if(p) return p;
  try{
    const s = await getDoc(doc(db,'products',id));
    if(!s.exists()) return null;
    p = normalizeProduct(s);
    if(isVisibleProduct(p)) mergeProducts([p]);
    return isVisibleProduct(p) ? p : null;
  }catch(e){ return null; }
}
async function ensureCartProducts(){
  const ids = [...new Set(Object.keys(cart).map(pid))];
  await Promise.all(ids.map(id=>ensureProduct(id)));
}
async function loadCategoryBatch(id, reset=false){
  if(reset || !categoryState[id]) categoryState[id]={last:null,done:false};
  const st = categoryState[id];
  if(st.done) return [];
  const ref=collection(db,'products');
  let q;
  if(st.last){
    q=query(ref,where('categoryId','==',id),orderBy(documentId()),startAfter(st.last),limit(PAGE_SIZE));
  }else{
    q=query(ref,where('categoryId','==',id),orderBy(documentId()),limit(PAGE_SIZE));
  }
  const snap=await getDocs(q);
  if(snap.docs.length) st.last=snap.docs[snap.docs.length-1];
  if(snap.docs.length<PAGE_SIZE) st.done=true;
  const batch=snap.docs.map(normalizeProduct).filter(isVisibleProduct);
  mergeProducts(batch);
  return batch;
}

let cart = JSON.parse(localStorage.getItem('sunnyCart') || '{}');
const app = document.getElementById('app');
const sideMenu = document.getElementById('sideMenu');
const overlay = document.getElementById('overlay');
const toast = document.getElementById('toast');

function money(n){return new Intl.NumberFormat('ar-IQ').format(n) + ' د.ع';}
function categoryById(id){return categories.find(c=>c.id===id);}
function getProduct(id){return products.find(p=>p.id===id);}
const pid=k=>k.split('|')[0];
function saveCart(){localStorage.setItem('sunnyCart',JSON.stringify(cart)); updateCartCount();}
function cartCount(){return Object.values(cart).reduce((s,q)=>s+q,0);}
function cartSubtotal(){
  return Object.entries(cart).reduce((s,[id,q])=>{
    const p=getProduct(pid(id));
    return s+(p&&p.status==='active'?p.price*q:0);
  },0);
}
function updateCartCount(){document.getElementById('cartCount').textContent=cartCount();document.getElementById('menuCartCount').textContent=cartCount();}
function showToast(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1800);}
function productCard(p){
  const unavailable=p.status==='unavailable';
  return `<article class="product-card">
  <button class="product-image" data-product="${p.id}" aria-label="عرض ${esc(p.name)}">${p.thumb?`<img src="${p.thumb}" alt="${esc(p.name)}" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">`:'☀️'}${unavailable?'<span class="sold-badge">غير متوفر حاليًا</span>':''}</button>
  <div class="product-body">
    <h3>${esc(p.name)}</h3><div class="product-desc">${esc(p.desc)}</div>
    <div class="product-bottom"><span class="price">${money(p.price)}</span>
      ${unavailable?'':`<div class="qty"><button data-qty="-" data-id="${p.id}">−</button><span id="qty-${p.id}">1</span><button data-qty="+" data-id="${p.id}">+</button></div>`}
    </div>
    ${unavailable?'<button class="add-btn" disabled style="opacity:.55;cursor:not-allowed">غير متوفر حاليًا</button>':p.options.length?`<button class="add-btn" data-product="${p.id}">اختر القياس</button>`:`<button class="add-btn" data-add="${p.id}">أضف للسلة</button>`}
  </div></article>`;
}
function grid(list){return list.length?list.map(productCard).join(''):'<p class="muted">لا توجد منتجات حاليًا.</p>';}

function home(){
 const visible=products.filter(isVisibleProduct);
 const featured=visible.filter(p=>p.isFeatured).slice(0,4);
 const top=featured.length?featured:visible.slice(0,4);
 const rest=visible.filter(p=>!top.includes(p)).slice(0,4);
 app.innerHTML=`<section class="hero"><div class="hero-copy"><span class="eyebrow">متجر البروشات الأكبر في العراق</span><h1>خليك <span>أكثر إشراقًا.</span></h1><p>قطعة من الشّغف بين يديك✨</p><div class="hero-buttons"><button class="primary-btn" data-route="categories">تصفح الأقسام</button><button class="secondary-btn" data-route="how-to-order">كيف أطلب؟</button></div></div><div class="hero-card"><div class="sun-visual">☀️</div></div></section>
 <section class="section"><div class="section-head"><div><h2>الأقسام</h2><p>اختر القسم واستكشف المنتجات.</p></div></div><div class="categories">${categories.map(c=>`<button class="category-card" data-category="${c.id}"><div class="category-icon">${c.icon}</div><strong>${c.name}</strong><small>عرض المنتجات ←</small></button>`).join('')}</div></section>
 <section class="section"><div class="section-head"><div><h2>الأكثر رواجًا</h2><p>منتجات مختارة من المتجر.</p></div><button class="view-all" data-route="categories">عرض الكل</button></div><div class="product-grid">${grid(top)}</div></section>
 <section class="section"><div class="section-head"><div><h2>وصل حديثًا</h2><p>اكتشف أحدث منتجات Sunny Store.</p></div></div><div class="product-grid">${grid(rest)}</div></section>`;
}
function categoriesPage(){app.innerHTML=`<section class="page"><div class="page-title"><h1>الأقسام</h1><p>اختر قسمًا لعرض منتجاته.</p></div><div class="categories">${categories.map(c=>`<button class="category-card" data-category="${c.id}"><div class="category-icon">${c.icon}</div><strong>${c.name}</strong><small>عرض المنتجات ←</small></button>`).join('')}</div></section>`;}

async function categoryPage(id){
  const c=categoryById(id);if(!c)return home();
  app.innerHTML=`<section class="page"><div class="breadcrumb"><button data-route="home">الرئيسية</button> ← ${c.name}</div><div class="page-title"><h1>${c.icon} ${c.name}</h1><p>جاري تحميل منتجات القسم...</p></div></section>`;
  await loadCategoryBatch(id,true);
  renderCategoryPage(id);
}
function renderCategoryPage(id){
  const c=categoryById(id);if(!c)return home();
  const list=products.filter(p=>p.category===id&&isVisibleProduct(p));
  const done=categoryState[id]?.done;
  app.innerHTML=`<section class="page"><div class="breadcrumb"><button data-route="home">الرئيسية</button> ← ${c.name}</div><div class="page-title"><h1>${c.icon} ${c.name}</h1><p>منتجات قسم ${c.name}</p></div><div class="search-box"><span>⌕</span><input id="categorySearch" placeholder="ابحث داخل المنتجات المحمّلة من هذا القسم..."></div><div id="categoryProducts" class="product-grid" style="margin-top:20px">${grid(list)}</div>${done?'':`<div style="text-align:center;margin-top:18px"><button class="secondary-btn" id="loadMoreCat">عرض المزيد</button></div>`}</section>`;
  const search=$('categorySearch');
  search?.addEventListener('input',async e=>{
    const q=e.target.value.trim();
    if(q) await ensureAllProducts();
    const current=products.filter(p=>p.category===id&&isVisibleProduct(p));
    document.getElementById('categoryProducts').innerHTML=current.filter(p=>p.name.includes(q)||p.desc.includes(q)).map(productCard).join('')||'<p class="muted">لا توجد منتجات مطابقة.</p>';
  });
  const more=document.getElementById('loadMoreCat');
  if(more) more.onclick=async()=>{more.disabled=true;more.textContent='جاري التحميل...';await loadCategoryBatch(id,false);renderCategoryPage(id);};
}

async function productPage(id){
  const p=await ensureProduct(id);if(!p)return home();
  const c=categoryById(p.category);if(!c)return home();
  const unavailable=p.status==='unavailable';
  app.innerHTML=`<section class="page"><div class="breadcrumb"><button data-route="home">الرئيسية</button> ← <button data-category="${c.id}">${c.name}</button> ← ${esc(p.name)}</div><div class="product-detail"><div class="detail-gallery" id="gal"><div class="detail-placeholder">☀️</div></div><div class="detail-info"><span class="eyebrow">${c.name}</span><h1>${esc(p.name)}</h1><div class="detail-price">${money(p.price)}</div><p class="detail-desc">${esc(p.desc)}</p>${unavailable?'<div class="info-box"><strong>غير متوفر حاليًا</strong><p class="muted" style="margin-bottom:0">هذا المنتج سيبقى ظاهرًا ويمكنك الرجوع له لاحقًا عند توفره.</p></div>':''}${!unavailable&&p.options.length?`<div class="info-box"><strong>${esc(p.optionTitle||'اختر القياس')}</strong><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">${p.options.map(o=>`<button class="secondary-btn" data-opt="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`:''}<div class="detail-actions"><div class="quantity-large"><button id="detailMinus"${unavailable?' disabled':''}>−</button><span id="detailQty">1</span><button id="detailPlus"${unavailable?' disabled':''}>+</button></div><button class="primary-btn" id="detailAdd"${unavailable?' disabled style="opacity:.55;cursor:not-allowed"':''}>${unavailable?'غير متوفر حاليًا':'أضف للسلة'}</button></div></div></div></section>`;
  let q=1;const out=document.getElementById('detailQty');
  document.getElementById('detailMinus').onclick=()=>{if(unavailable)return;q=Math.max(1,q-1);out.textContent=q};
  document.getElementById('detailPlus').onclick=()=>{if(unavailable)return;q++;out.textContent=q};
  let sel='';
  document.querySelectorAll('[data-opt]').forEach(b=>b.onclick=()=>{sel=b.dataset.opt;document.querySelectorAll('[data-opt]').forEach(x=>x.style.outline='');b.style.outline='3px solid #8a6a00'});
  document.getElementById('detailAdd').onclick=()=>{if(unavailable)return;if(p.options.length&&!sel){showToast('اختر '+(p.optionTitle||'القياس')+' أولاً');return}addToCart(p.options.length?id+'|'+sel:id,q)};
  loadGallery(p);
}
async function loadGallery(p){
  const g=document.getElementById('gal');if(!g)return;
  if(!p.imageIds.length){g.innerHTML='<div class="detail-placeholder">☀️</div>';return}
  const sources=[];
  for(const iid of p.imageIds){
    try{const s=await getDoc(doc(db,'images',iid));if(s.exists()&&s.data().big)sources.push(s.data().big)}catch(e){}
  }
  if(!sources.length){g.innerHTML='<div class="detail-placeholder">☀️</div>';return}
  let current=0;
  const render=()=>{
    g.innerHTML=`<div class="gallery-main"><button class="gallery-arrow gallery-prev" aria-label="الصورة السابقة">‹</button><img id="galleryMainImg" src="${sources[current]}" alt="${esc(p.name)}" class="gallery-main-img"><button class="gallery-arrow gallery-next" aria-label="الصورة التالية">›</button></div>${sources.length>1?`<div class="gallery-dots">${sources.map((_,i)=>`<button class="gallery-dot${i===current?' active':''}" data-gidx="${i}" aria-label="الصورة ${i+1}"></button>`).join('')}</div>`:''}`;
    const main=document.getElementById('galleryMainImg');main.onclick=()=>zoom(main.src);
    const prev=g.querySelector('.gallery-prev'),next=g.querySelector('.gallery-next');
    if(sources.length===1){prev.hidden=true;next.hidden=true}
    prev.onclick=()=>{current=(current-1+sources.length)%sources.length;render()};
    next.onclick=()=>{current=(current+1)%sources.length;render()};
    g.querySelectorAll('[data-gidx]').forEach(b=>b.onclick=()=>{current=Number(b.dataset.gidx);render()});
  };
  render();
}
function zoom(src){const o=document.createElement('div');o.style.cssText='position:fixed;inset:0;background:#000d;z-index:99;display:flex;align-items:center;justify-content:center;padding:8px';const i=document.createElement('img');i.src=src;i.style.cssText='max-width:100%;max-height:100%';o.append(i);o.onclick=()=>o.remove();document.body.append(o)}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=id=>document.getElementById(id);
const OST={new:'تم استلام طلبك',contacted:'تم التواصل معك',preparing:'قيد التجهيز',shipped:'تم الشحن',done:'مكتمل',cancelled:'ملغي'};
const myIds=()=>{try{return JSON.parse(localStorage.getItem('sunnyOrders')||'[]')}catch(e){return[]}};
async function orderPage(id){
  app.innerHTML='<section class="page"><p class="muted">جاري التحميل...</p></section>';
  try{
    const s=await getDoc(doc(db,'orders',id));
    if(!s.exists()){app.innerHTML='<section class="page"><div class="page-title"><h1>الطلب غير موجود</h1></div></section>';return}
    const o=s.data(),c=o.customer||{};
    app.innerHTML=`<section class="page"><div class="page-title"><h1>طلبك #${esc(id.slice(0,6).toUpperCase())}</h1><p>شكرًا ${esc(c.name)}، سنتواصل معك لتأكيد الطلب.</p></div>
<div class="info-box"><strong>الحالة: ${OST[o.status]||esc(o.status)}</strong></div>
<div class="cart-items" style="margin-top:14px">${(o.items||[]).map(i=>`<div class="cart-row"><div class="cart-row-top"><span class="cart-row-name">${esc(i.name)}${i.option?' — '+esc(i.option):''} × ${Number(i.qty)}</span><span>${money(Number(i.price)*Number(i.qty))}</span></div></div>`).join('')}</div>
<div class="cart-summary"><div class="sum-line"><span>مجموع المنتجات</span><strong>${money(o.subtotal)}</strong></div><div class="sum-line"><span>التوصيل</span><strong>${deliveryText(Number(o.delivery))}</strong></div><div class="sum-line total"><span>الإجمالي النهائي</span><strong>${money(o.total)}</strong></div></div>
<p class="muted">احتفظ بهذه الصفحة لمتابعة حالة طلبك، أو افتحها لاحقًا من «طلباتي» في القائمة.</p></section>`;
  }catch(e){app.innerHTML='<section class="page"><div class="page-title"><h1>تعذر تحميل الطلب</h1></div></section>'}
}
async function myOrders(){
  const ids=myIds();
  app.innerHTML=`<section class="page"><div class="page-title"><h1>طلباتي</h1></div><div id="mo">${ids.length?'جاري التحميل...':'لا توجد طلبات على هذا الجهاز.'}</div></section>`;
  const out=[];
  for(const id of ids){try{const s=await getDoc(doc(db,'orders',id));if(s.exists()){const o=s.data();out.push(`<button class="search-result" data-route="order/${id}"><span>#${id.slice(0,6).toUpperCase()} — ${OST[o.status]||esc(o.status)}</span><strong>${money(o.total)}</strong></button>`)}}catch(e){}}
  if(ids.length)document.getElementById('mo').innerHTML=out.join('')||'لا توجد طلبات.';
}
function howToOrder(){app.innerHTML=`<section class="page how-to"><div class="page-title"><h1>كيف أطلب؟</h1><p>طلبك بسيط، وسنتواصل معك لتأكيده.</p></div><div class="steps"><div class="step"><span class="step-num">1</span><div><strong>اختر المنتج</strong><p class="muted">تصفح الأقسام أو ابحث عن المنتج الذي تريده، ثم افتح صفحته.</p></div></div><div class="step"><span class="step-num">2</span><div><strong>أضفه إلى السلة</strong><p class="muted">حدد الكمية التي تريدها ثم اضغط «أضف للسلة».</p></div></div><div class="step"><span class="step-num">3</span><div><strong>املأ معلوماتك</strong><p class="muted">اكتب اسمك ومحافظتك وعنوانك ورقم هاتف يحتوي واتساب فعّال.</p></div></div><div class="step"><span class="step-num">4</span><div><strong>نؤكد الطلب معك</strong><p class="muted">بعد إرسال الطلب سنتواصل معك عبر واتساب لتأكيد التفاصيل.</p></div></div></div></section>`;}
function addToCart(id,q=1){const p=getProduct(pid(id));if(!p||p.status!=='active'){showToast('هذا المنتج غير متوفر حاليًا');return}cart[id]=(cart[id]||0)+q;saveCart();showToast('تمت إضافة المنتج إلى السلة');}
function changeQty(id,delta){cart[id]=(cart[id]||0)+delta;if(cart[id]<=0)delete cart[id];saveCart();renderCart();}
function renderCart(){
  const items=document.getElementById('cartItems');
  const entries=Object.entries(cart).filter(([id])=>getProduct(pid(id)));
  if(!entries.length){items.innerHTML='<div class="muted">السلة فارغة حاليًا.</div>';document.getElementById('cartSummary').innerHTML='';document.getElementById('checkoutBtn').disabled=true;document.getElementById('checkoutBtn').style.opacity=.5;return;}
  const hasUnavailable=entries.some(([id])=>getProduct(pid(id))?.status!=='active');
  document.getElementById('checkoutBtn').disabled=hasUnavailable;
  document.getElementById('checkoutBtn').style.opacity=hasUnavailable?.5:1;
  items.innerHTML=entries.map(([id,q])=>{
    const p=getProduct(pid(id)),unavailable=p.status!=='active';
    return `<div class="cart-row"><div style="display:flex;gap:10px;align-items:center"><div class="cart-thumb">${p.thumb?`<img src="${p.thumb}" alt="${esc(p.name)}">`:'☀️'}</div><div style="flex:1"><div class="cart-row-top"><span class="cart-row-name">${esc(p.name)}${id.includes('|')?' — '+esc(id.split('|')[1]):''}${unavailable?' · <b>غير متوفر</b>':''}</span><span>${money(p.price*q)}</span></div><div class="cart-row-bottom"><div class="qty"><button data-cart-minus="${id}">−</button><span>${q}</span><button data-cart-plus="${id}">+</button></div><button class="remove-btn" data-remove="${id}">حذف</button></div></div></div></div>`;
  }).join('');
  const sub=cartSubtotal(),dlv=deliveryFor(sub),total=sub+dlv;
  document.getElementById('cartSummary').innerHTML=`${hasUnavailable?'<p class="err" style="margin-top:0">احذف المنتج غير المتوفر لإكمال الطلب.</p>':''}<div class="sum-line"><span>مجموع المنتجات المتوفرة</span><strong>${money(sub)}</strong></div><div class="sum-line"><span>التوصيل داخل العراق</span><strong>${deliveryText(dlv)}</strong></div><div class="sum-line total"><span>الإجمالي النهائي</span><strong>${money(total)}</strong></div>`;
}
async function openCart(){document.getElementById('cartPanel').hidden=false;await ensureCartProducts();renderCart();}
async function openSearch(){
  document.getElementById('searchPanel').hidden=false;
  const inp=document.getElementById('globalSearch');
  const out=document.getElementById('searchResults');
  out.innerHTML='<p class="muted">جاري تجهيز البحث...</p>';
  try{await ensureAllProducts();out.innerHTML='<p class="muted">اكتب اسم المنتج للبحث.</p>'}catch(e){out.innerHTML='<p class="muted">تعذر تحميل البحث.</p>'}
  setTimeout(()=>inp.focus(),50);
}
function openMenu(){sideMenu.classList.add('open');sideMenu.setAttribute('aria-hidden','false');overlay.hidden=false}
function closeMenu(){sideMenu.classList.remove('open');sideMenu.setAttribute('aria-hidden','true');overlay.hidden=true}
function route(){
  const hash=location.hash.replace(/^#\/?/,'')||'home';
  if(hash==='home')home();
  else if(hash==='categories')categoriesPage();
  else if(hash==='how-to-order')howToOrder();
  else if(hash.startsWith('category/'))categoryPage(hash.split('/')[1]);
  else if(hash.startsWith('product/'))productPage(hash.split('/')[1]);
  else if(hash.startsWith('order/'))orderPage(hash.split('/')[1]);
  else if(hash==='my-orders')myOrders();
  else home();
  window.scrollTo(0,0);updateCartCount();
}
function go(path){location.hash='/'+path;closeMenu();}

document.addEventListener('click',e=>{
  const el=e.target.closest('[data-route]');if(el){go(el.dataset.route);return}
  const cat=e.target.closest('[data-category]');if(cat){go('category/'+cat.dataset.category);return}
  const prod=e.target.closest('[data-product]');if(prod){go('product/'+prod.dataset.product);return}
  const add=e.target.closest('[data-add]');if(add){const q=parseInt(document.getElementById('qty-'+add.dataset.add)?.textContent||'1');addToCart(add.dataset.add,q);return}
  const qty=e.target.closest('[data-qty]');if(qty){const id=qty.dataset.id;const out=document.getElementById('qty-'+id);let q=parseInt(out.textContent)||1;q=qty.dataset.qty==='+'?q+1:Math.max(1,q-1);out.textContent=q;return}
  const cp=e.target.closest('[data-cart-plus]');if(cp){changeQty(cp.dataset.cartPlus,1);return}
  const cm=e.target.closest('[data-cart-minus]');if(cm){changeQty(cm.dataset.cartMinus,-1);return}
  const rm=e.target.closest('[data-remove]');if(rm){delete cart[rm.dataset.remove];saveCart();renderCart();return}
  if(e.target.closest('#menuBtn'))openMenu();
  if(e.target.closest('[data-close-menu]'))closeMenu();
  if(e.target===overlay)closeMenu();
  if(e.target.closest('[data-open-cart]'))openCart();
  if(e.target.closest('[data-close-cart]'))document.getElementById('cartPanel').hidden=true;
  if(e.target.closest('[data-open-search]')){closeMenu();openSearch()}
  if(e.target.closest('[data-close-search]'))document.getElementById('searchPanel').hidden=true;
  if(e.target.closest('[data-close-checkout]'))document.getElementById('checkoutPanel').hidden=true;
  if(e.target.closest('#checkoutBtn')){if(cartCount())openCheckout()}
});
function openCheckout(){document.getElementById('cartPanel').hidden=true;document.getElementById('checkoutPanel').hidden=false;document.getElementById('checkoutTotal').textContent=`الإجمالي النهائي: ${money(cartSubtotal()+deliveryFor(cartSubtotal()))} (${deliveryFor(cartSubtotal())===0?'التوصيل مجاني':'يشمل التوصيل '+money(DELIVERY_FEE)})`;}
document.getElementById('globalSearch').addEventListener('input',e=>{
  const q=e.target.value.trim();
  const list=products.filter(p=>isVisibleProduct(p)&&(!q||p.name.includes(q)||p.desc.includes(q)));
  document.getElementById('searchResults').innerHTML=list.map(p=>`<button class="search-result" data-product="${p.id}"><span>${esc(p.name)}${p.status==='unavailable'?' · غير متوفر':''}</span><strong>${money(p.price)}</strong></button>`).join('')||'<p class="muted">لا توجد نتائج.</p>';
});
document.getElementById('checkoutForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!cartCount())return;
  await ensureCartProducts();
  const unavailable=Object.keys(cart).some(k=>getProduct(pid(k))?.status!=='active');
  if(unavailable){showToast('احذف المنتج غير المتوفر من السلة أولاً');return}
  const f=Object.fromEntries(new FormData(e.target));
  const items=Object.entries(cart).filter(([k])=>getProduct(pid(k))?.status==='active').map(([k,q])=>{const p=getProduct(pid(k));return{id:p.id,name:p.name,option:k.includes('|')?k.split('|')[1]:'',price:p.price,qty:q}});
  if(!items.length)return;
  const sub=cartSubtotal(),btn=e.target.querySelector('[type=submit]');btn.disabled=true;
  try{
    const ref=await addDoc(collection(db,'orders'),{customer:{name:f.name||'',governorate:f.governorate||'',address:f.address||'',phone:f.phone||'',notes:f.notes||''},items,subtotal:sub,delivery:deliveryFor(sub),total:sub+deliveryFor(sub),status:'new',createdAt:serverTimestamp()});
    localStorage.setItem('sunnyOrders',JSON.stringify([ref.id,...myIds()].slice(0,20)));
    cart={};saveCart();e.target.reset();document.getElementById('checkoutPanel').hidden=true;go('order/'+ref.id);
  }catch(err){console.error(err);showToast('تعذر إرسال الطلب، حاول مرة أخرى')}
  btn.disabled=false;
});

document.querySelector('[name=address]').placeholder='المنطقة، الحي، أقرب نقطة دالّة';
const cardFix=document.createElement('style');
cardFix.textContent=`
.product-image{width:100%;height:auto!important;aspect-ratio:1/1;padding:0!important;overflow:hidden;position:relative}
.product-image img{width:100%;height:100%;object-fit:cover;display:block}
.sold-badge{position:absolute;right:8px;bottom:8px;background:#2b2618;color:#fff;border-radius:999px;padding:5px 9px;font-size:12px}
.gallery-main{position:relative;display:flex;align-items:center;justify-content:center;min-height:280px}
.gallery-main-img{width:100%;max-height:520px;object-fit:contain;border-radius:12px;cursor:zoom-in;display:block}
.gallery-arrow{position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:42px;height:42px;border-radius:50%;border:0;background:#fffdf5e8;color:#2b2618;font-size:30px;line-height:1;box-shadow:0 2px 12px #0002;padding:0;margin:0}
.gallery-prev{right:10px}.gallery-next{left:10px}
.gallery-dots{display:flex;justify-content:center;gap:7px;margin-top:10px}
.gallery-dot{width:9px;height:9px;border-radius:50%;padding:0;margin:0;background:#d8cfae}
.gallery-dot.active{background:#8a6a00}
.cart-thumb{width:56px;height:56px;min-width:56px;border-radius:9px;overflow:hidden;background:#fff4c9;display:flex;align-items:center;justify-content:center}
.cart-thumb img{width:100%;height:100%;object-fit:cover}
`;
document.head.append(cardFix);
document.querySelector('.side-nav')?.insertAdjacentHTML('beforeend','<button data-route="my-orders">طلباتي</button>');
window.addEventListener('hashchange',route);
app.innerHTML='<section class="page"><p class="muted">جاري التحميل...</p></section>';
Promise.all([loadInitialProducts(),ensureCartProducts()]).then(()=>{
  saveCart();
  route();
}).catch(err=>{ console.error(err); showToast('تعذر تحميل المنتجات'); route(); });
