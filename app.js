// Sunny Store — الواجهة التجريبية الأولى.
// في المرحلة التالية سنستبدل البيانات التجريبية ببيانات Firestore.
const categories = [
  ['📌','بروشات'],['💎','قلادات اختصاص'],['✨','إكسسوارات'],['🎁','أطقم'],
  ['🖊️','أقلام'],['💡','تيبل لامب'],['📒','قرطاسية'],['🔑','مداليات']
];
const demoProducts = [
  {id:'demo-1',name:'بروش Sunny',desc:'قطعة لطيفة تضيف لمستك الخاصة',price:15000,icon:'📌',tag:'مميز'},
  {id:'demo-2',name:'ميدالية شمس',desc:'تفصيلة صغيرة ترافقك كل يوم',price:12000,icon:'🔑',tag:'جديد'},
  {id:'demo-3',name:'ساعة أنيقة',desc:'تصميم بسيط وحضور واضح',price:28000,icon:'⌚',tag:'مميز'},
  {id:'demo-4',name:'طقم إكسسوارات',desc:'اختيار جميل للهدايا والمناسبات',price:35000,icon:'🎁',tag:'جديد'}
];
let cart=[];
const $=s=>document.querySelector(s);
const formatIQD=n=>new Intl.NumberFormat('ar-IQ').format(n);
function renderCategories(){ $('#categoriesGrid').innerHTML=categories.map(([icon,name])=>`<button class="category-card" data-category="${name}"><div class="cat-icon">${icon}</div><h3>${name}</h3></button>`).join(''); }
function renderProducts(list=demoProducts){ $('#products').innerHTML=list.length?list.map(p=>`<article class="product-card"><div class="product-image"><span class="tag">${p.tag}</span><span>${p.icon}</span></div><div class="product-body"><h3>${p.name}</h3><p>${p.desc}</p><div class="price-row"><span class="price">${formatIQD(p.price)} د.ع</span><button class="add-btn" data-add="${p.id}">أضف للسلة</button></div></div></article>`).join(''):'<div class="status-empty">لم نجد منتجًا بهذا الاسم.</div>'; }
function updateCart(){ $('#cartCount').textContent=cart.reduce((s,x)=>s+x.qty,0); $('#total').textContent=formatIQD(cart.reduce((s,x)=>s+x.price*x.qty,0)); $('#cartItems').innerHTML=cart.length?cart.map(x=>`<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eee8d9;padding:13px 0;gap:12px"><div><b>${x.name}</b><div style="font-size:11px;color:#756f63;margin-top:4px">${x.qty} × ${formatIQD(x.price)} د.ع</div></div><button class="close-btn" style="width:30px;height:30px;font-size:18px" data-remove="${x.id}">×</button></div>`).join(''):'<div class="empty-cart">السلة فارغة حاليًا ☀️</div>'; }
function openCart(){ $('#cart').classList.add('open'); $('#cart').setAttribute('aria-hidden','false'); }
function closeCart(){ $('#cart').classList.remove('open'); $('#cart').setAttribute('aria-hidden','true'); }
function openModal(){ if(!cart.length){alert('أضف منتجًا إلى السلة أولًا.');return} $('#modal').classList.add('open'); $('#modal').setAttribute('aria-hidden','false'); }
function closeModal(){ $('#modal').classList.remove('open'); $('#modal').setAttribute('aria-hidden','true'); }
$('#categoriesGrid').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;$('#search').value='';renderProducts(demoProducts);document.querySelector('#featured').scrollIntoView({behavior:'smooth'});closeMobileMenu();});
$('#products').addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(!b)return;const p=demoProducts.find(x=>x.id===b.dataset.add);const existing=cart.find(x=>x.id===p.id);existing?existing.qty++:cart.push({...p,qty:1});updateCart();openCart();});
$('#cartItems').addEventListener('click',e=>{const b=e.target.closest('[data-remove]');if(!b)return;cart=cart.filter(x=>x.id!==b.dataset.remove);updateCart();});
function openMobileMenu(){const nav=$('#mainNav');nav.classList.add('mobile-open');$('#mobileMenu').setAttribute('aria-expanded','true');} function closeMobileMenu(){const nav=$('#mainNav');nav.classList.remove('mobile-open');$('#mobileMenu').setAttribute('aria-expanded','false');} $('#cartBtn').onclick=openCart;$('#closeCart').onclick=closeCart;$('#overlay').onclick=closeCart;$('#checkout').onclick=openModal;$('#closeModal').onclick=closeModal;$('#mobileMenu').onclick=()=>$('#mainNav').classList.contains('mobile-open')?closeMobileMenu():openMobileMenu();$('#mainNav').addEventListener('click',e=>{if(e.target.closest('a'))closeMobileMenu();});$('#searchFocus').onclick=()=>{$('#search').focus();document.querySelector('#featured').scrollIntoView({behavior:'smooth'});closeMobileMenu();};
$('#search').addEventListener('input',e=>{const q=e.target.value.trim();renderProducts(q?demoProducts.filter(p=>(p.name+' '+p.desc).includes(q)):demoProducts);});
$('#orderForm').addEventListener('submit',e=>{e.preventDefault();$('#message').textContent='تم تسجيل الطلب تجريبيًا. سنربطه بـ Firebase في المرحلة التالية.';});
$('#year').textContent=new Date().getFullYear();renderCategories();renderProducts();updateCart();

document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMobileMenu();closeCart();closeModal();}});
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')closeModal();});
