import './style.css';
import { TEMPLATES, shareLinks, qrSvg, storyImage } from './share.js';
import { authEnabled, googleEnabled, emailEnabled, currentUser, onAuthChange, signInWithEmail, signInWithGoogle, signOut, claimTable, fetchMyTables } from './supabase.js';
import { hasBackend, createTable, updateTable, loadTable, loadCards, loadOwnerCards, addCard, deleteCard, fetchLeaderboard } from './supabase.js';

const BASE_URL = import.meta.env.BASE_URL;

const foods = [
  ['turkey','Roast turkey','mains','main','center'], ['ham','Honey ham','mains','ham','center'], ['chicken','Roast chicken','mains','chicken','center'], ['beef','Sliced roast beef','mains','beef','center'], ['veg-roast','Herb meatloaf','mains','veg','center'],
  ['mash','Mashed potatoes','sides','mash','bowl'], ['gravy','Gravy boat','sides','gravy','bowl'], ['mac','Mac & cheese','sides','mac','bowl'], ['beans','Green bean bake','sides','beans','bowl'], ['yams','Candied yams','sides','yams','bowl'], ['corn','Sweet corn','sides','corn','bowl'], ['carrots','Glazed carrots','sides','carrots','bowl'], ['sprouts','Brussels sprouts','sides','sprouts','bowl'], ['stuffing','Sage stuffing','sides','stuffing','bowl'], ['rolls','Dinner rolls','sides','rolls','basket'], ['cornbread','Cornbread','sides','cornbread','bowl'], ['cranberry','Cranberry sauce','sides','cranberry','bowl'], ['eggs','Loaded baked potato','sides','eggs','plate'], ['salad','Garden salad','sides','salad','bowl'],
  ['pumpkin-pie','Pumpkin pie','desserts','pie','pie'], ['apple-pie','Apple pie','desserts','applepie','pie'], ['pecan','Pecan pie','desserts','pecan','pie'], ['cheesecake','Cheesecake','desserts','cake','cake'], ['rolls-sweet','Cinnamon rolls','desserts','rollsSweet','plate'], ['cookies','Spiced cookies','desserts','cookies','plate'], ['brownies','Brownies','desserts','brownies','plate'], ['cupcakes','Cupcakes','desserts','cupcakes','plate'],
  ['cider','Apple cider','drinks','cider','drink'], ['cocoa','Hot cocoa','drinks','cocoa','drink'], ['lemonade','Lemonade','drinks','lemonade','drink'], ['cran-juice','Cranberry fizz','drinks','cranjuice','drink'], ['milk','Milk bottle','drinks','milk','drink'],
  ['cheese','Cheese board','snacks','cheese','board'], ['fruit','Fruit platter','snacks','fruit','board'], ['bread','Bread basket','snacks','bread','basket'],
  ['pumpkin','Pumpkin','decor','pumpkin','decor'], ['mini-pumpkin','Mini pumpkin','decor','minipumpkin','decor'], ['candle','Taper candles','decor','candle','decor'], ['leaves','Autumn leaves','decor','leaves','decor'], ['flowers','Sunflowers','decor','flowers','decor'], ['pinecone','Pinecones','decor','pinecone','decor'], ['placecard','Place card','decor','placecard','card'], ['cornucopia','Cornucopia','decor','cornucopia','decor']
];
const categoryNames = { all:'All pieces', mains:'Turkey & mains', sides:'Sides', desserts:'Desserts', drinks:'Drinks', snacks:'Snacks', decor:'Decorations' };
const categoryArt = { mains:'🍗', sides:'🥔', desserts:'🥧', drinks:'🥂', snacks:'🧀', decor:'🍂' };
const assetCategory = { decor:'decorations' };
const assetSlugs = { turkey:'roast-turkey', ham:'honey-ham', chicken:'rotisserie-turkey', beef:'roast-chicken', 'veg-roast':'vegetarian-roast', mash:'mashed-potatoes', gravy:'gravy', mac:'mac-and-cheese', beans:'green-bean-casserole', yams:'sweet-potato-casserole', corn:'corn', carrots:'glazed-carrots', sprouts:'brussels-sprouts', stuffing:'stuffing', rolls:'dinner-rolls', cornbread:'cornbread', cranberry:'cranberry-sauce', eggs:'deviled-eggs', salad:'rice', 'pumpkin-pie':'pumpkin-pie', 'apple-pie':'apple-pie', pecan:'pecan-pie', cheesecake:'cheesecake', 'rolls-sweet':'cinnamon-rolls', cookies:'cookies', brownies:'brownies', cupcakes:'cupcakes', cider:'apple-cider', cocoa:'hot-chocolate', lemonade:'lemonade', 'cran-juice':'cranberry-juice', milk:'milk', cheese:'cheese-platter', fruit:'fruit-platter', bread:'bread-basket', pumpkin:'pumpkins', 'mini-pumpkin':'mini-pumpkin', candle:'candle', leaves:'autumn-leaves', flowers:'sunflowers', pinecone:'pinecones', placecard:'place-card', cornucopia:'cornucopia' };
function assetFor(item) { return `${BASE_URL}assets/foods/${assetCategory[item[2]] || item[2]}/${assetSlugs[item[0]] || item[0]}.png`; }
const newTableId = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const OWNER_KEY = id => `harvest-table:owner:${id}`;
const LAST_KEY = 'harvest-table:last';
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* private mode: owner link just won't be remembered */ } }
};
let state = { page:'home', filter:'all', selected:null, tableId:newTableId(), remoteId:null, editToken:null, hostName:'', isOwner:true, items:[], cards:[], history:[], future:[], zoom:1, gratitude:'', musicMuted:true, modal:null, shareUrl:'', listed:false, cardPage:0, leaderboard:null, user:null, accountTables:[] };
let drag = null;
let saveTimer = null;
let lastSaved = '';

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
const foodById = id => foods.find(f => f[0] === id);
const cardFoods = ['turkey','pumpkin-pie','apple-pie','mash','cranberry','rolls','cider','cocoa','cookies','cupcakes','pumpkin','flowers','leaves','candle','cornucopia','cheese'];
const FEEDBACK_URL = import.meta.env.VITE_FEEDBACK_URL || 'https://github.com/foojanbabaeeian/DecoMyThanksgivingTable/issues/new/choose';
const CARDS_PER_PAGE = 20;
// Pieces unlock as a table receives thank-you cards from *other people*.
const UNLOCKS = [
  { at:3, ids:['flowers','candle'], label:'Sunflowers & taper candles' },
  { at:5, ids:['cornucopia','pecan'], label:'Cornucopia & pecan pie' },
  { at:10, ids:['ham','cheesecake','cheese'], label:'Honey ham, cheesecake & cheese board' },
  { at:20, ids:['rolls-sweet','cupcakes','placecard'], label:'Cinnamon rolls, cupcakes & place cards' }
];
const unlockAt = id => UNLOCKS.find(u => u.ids.includes(id))?.at || 0;
const MY_CARDS_KEY = id => `harvest-table:mycards:${id}`;
const SEEN_KEY = id => `harvest-table:seen:${id}`;
const TABLES_KEY = 'harvest-table:tables';
function readJson(key, fallback) { try { const v = JSON.parse(store.get(key) || 'null'); return v ?? fallback; } catch { return fallback; } }
function myCardIds() { return new Set(readJson(MY_CARDS_KEY(state.tableId), [])); }
function rememberMyCard(id) { const ids = myCardIds(); ids.add(String(id)); store.set(MY_CARDS_KEY(state.tableId), JSON.stringify([...ids])); }
function receivedCount() { const mine = myCardIds(); return state.cards.filter(c => !mine.has(c.id)).length; }
const isLocked = id => state.isOwner && receivedCount() < unlockAt(id);
const nextUnlock = () => UNLOCKS.find(u => u.at > receivedCount()) || null;
function myTables() {
  let list = readJson(TABLES_KEY, []);
  if (!Array.isArray(list) || !list.length) { const last = store.get(LAST_KEY); list = last ? [{ id:last, name:'My table' }] : []; }
  const seen = new Set(list.map(t => t.id));
  for (const t of state.accountTables) if (!seen.has(t.id)) list.push({ id:t.id, name:t.host_name || 'My table' });
  return list;
}
// Signing in links every table this browser holds a key for to the account.
async function linkLocalTables() {
  for (const t of readJson(TABLES_KEY, [])) {
    const token = store.get(OWNER_KEY(t.id));
    if (token) { try { await claimTable(t.id, token); } catch (err) { console.warn(err); } }
  }
  state.accountTables = await fetchMyTables().catch(() => []);
}
function signInRedirect() { return `${pageBase()}${location.search}`; }
function rememberTable() {
  if (!state.remoteId) return;
  const list = myTables().filter(t => t.id !== state.remoteId);
  list.unshift({ id:state.remoteId, name:state.hostName || 'My table' });
  store.set(TABLES_KEY, JSON.stringify(list.slice(0, 20)));
  store.set(LAST_KEY, state.remoteId);
}
// Celebrate tiers that unlocked since the owner last looked.
function announceUnlocks() {
  if (!state.isOwner || !state.remoteId) return;
  const n = receivedCount();
  const seen = Number(store.get(SEEN_KEY(state.remoteId)) || 0);
  const fresh = UNLOCKS.filter(u => u.at > seen && u.at <= n);
  store.set(SEEN_KEY(state.remoteId), String(n));
  if (fresh.length) setTimeout(() => { toast(`✦ Unlocked: ${fresh.map(u => u.label).join(', ')}!`); burst(innerWidth / 2, innerHeight / 2.4, ['🥧','🍂','✨','🦃','🍁'], 26); }, 400);
}
// "Fozhan’s family" stays as typed; everything else gets ’s: "Chris" → "Chris’s", "The Lee family" → "The Lee family’s".
function possessive(name) { const n = String(name || '').trim(); if (/['’]s\b/i.test(n)) return n; return `${n}’s`; }
const hostLabel = () => state.hostName ? possessive(state.hostName) : 'Our';
function encodeTable(value) { return btoa(unescape(encodeURIComponent(JSON.stringify(value)))); }
function decodeTable(value) { return JSON.parse(decodeURIComponent(escape(atob(value)))); }
function fixAsset(asset) { return String(asset || '').replace(/^\/assets\//, `${BASE_URL}assets/`); }
function sanitizeItem(x) { return { uid:num(x.uid, Date.now()+Math.random()), kind:String(x.kind||''), name:String(x.name||''), asset:fixAsset(x.asset), x:num(x.x,50), y:num(x.y,50), rotate:num(x.rotate,0), scale:num(x.scale,1), z:num(x.z,3) }; }
function sanitizeCard(c) { return { id:String(c.id ?? `${Date.now()}-${Math.random()}`), sealed:!c.message, message:String(c.message||'').slice(0,600), name:String(c.name ?? c.sender_name ?? '').slice(0,60), anonymous:Boolean(c.anonymous), food:String(c.food ?? c.food_asset ?? '') }; }
function arrangement() { return { items:state.items.map(sanitizeItem), gratitude:state.gratitude }; }
function snapshotKey() { return JSON.stringify({ a:arrangement(), h:state.hostName, l:state.listed }); }
function pageBase() { return `${location.origin}${location.pathname}`; }
function tableLink() { return state.remoteId ? `${pageBase()}?t=${state.remoteId}` : `${pageBase()}#table=${encodeTable({ ...arrangement(), cards:state.cards, hostName:state.hostName })}`; }

// Little celebrations. Skipped entirely for people who ask for reduced motion.
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const HOT_FOOD = new Set(['main','ham','chicken','beef','veg','mash','gravy','stuffing','yams','cocoa','cider','rolls','bread','cornbread','pie','applepie','pecan','rollsSweet']);
let pendingFx = null;   // { uid, cls } applied to one placed piece on the next render
function burst(x, y, emojis = ['🍂','🍁','✨','💛'], count = 14) {
  if (reduceMotion()) return;
  const layer = document.createElement('div');
  layer.className = 'burst'; layer.setAttribute('aria-hidden', 'true');
  layer.style.left = `${x}px`; layer.style.top = `${y}px`;
  for (let i = 0; i < count; i++) {
    const s = document.createElement('span');
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const dist = 50 + Math.random() * 70;
    s.textContent = emojis[i % emojis.length];
    s.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(angle) * dist - 30}px`);
    s.style.setProperty('--r', `${Math.round(Math.random() * 360 - 180)}deg`);
    s.style.animationDelay = `${Math.random() * 80}ms`;
    layer.appendChild(s);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 1300);
}
function burstAt(el, emojis, count) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, emojis, count);
}
function toast(message) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
async function copyText(text) { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }

async function init() {
  if (authEnabled) {
    state.user = await currentUser().catch(() => null);
    onAuthChange(async (event, user) => {
      const was = state.user?.id;
      state.user = user;
      if (event === 'SIGNED_IN' && user && was !== user.id) {
        await linkLocalTables();
        toast('Signed in ✦ Your tables are saved to your account.');
        if (state.remoteId && !state.isOwner && state.accountTables.some(t => t.id === state.remoteId)) { location.reload(); return; }
        render();
      }
      if (event === 'SIGNED_OUT') { state.accountTables = []; render(); }
    });
    if (state.user) state.accountTables = await fetchMyTables().catch(() => []);
  }
  const id = new URLSearchParams(location.search).get('t');
  if (id) {
    if (!hasBackend) { state.page = 'missing'; render(); return; }
    state.page = 'loading'; render();
    try {
      const table = await loadTable(id);
      if (!table) throw new Error('Table not found');
      state.remoteId = state.tableId = table.id;
      state.hostName = table.host_name || '';
      state.listed = Boolean(table.listed);
      state.items = (table.arrangement?.items || []).map(sanitizeItem);
      state.gratitude = table.arrangement?.gratitude || '';
      state.editToken = store.get(OWNER_KEY(table.id));
      state.isOwner = Boolean(state.editToken);
      if (!state.isOwner && state.user) {
        state.accountTables = await fetchMyTables().catch(() => []);
        state.isOwner = state.accountTables.some(t => t.id === table.id);
      }
      state.page = state.isOwner ? 'studio' : 'guest';
      lastSaved = snapshotKey();
      state.cards = (state.isOwner ? await loadOwnerCards(table.id, state.editToken) : withMySentCards(table.id, await loadCards(table.id))).map(sanitizeCard);
      state.cardPage = Math.max(0, Math.ceil(state.cards.length / CARDS_PER_PAGE) - 1);
      if (state.isOwner) { rememberTable(); announceUnlocks(); }
    } catch (err) {
      console.warn(err);
      if (state.page === 'loading') state.page = 'missing';
    }
    render(); return;
  }
  if (new URLSearchParams(location.search).get('view') === 'leaderboard') { openLeaderboard(); return; }
  const raw = location.hash.match(/^#table=(.+)$/);
  if (raw) {
    try {
      const shared = decodeTable(raw[1]);
      state.items = (shared.items || []).map(sanitizeItem);
      state.cards = (shared.cards || shared.notes || []).map(sanitizeCard);
      state.gratitude = shared.gratitude || '';
      state.hostName = shared.hostName || '';
      state.isOwner = false; state.page = 'guest';
    } catch { history.replaceState(null, '', location.pathname); }
  }
  render();
}

// Creates the table in Supabase the first time, then keeps it saved. Returns the share link.
async function ensureShared() {
  if (hasBackend && !state.remoteId) {
    const { id, edit_token } = await createTable(state.hostName, arrangement(), state.listed);
    state.remoteId = state.tableId = id; state.editToken = edit_token; state.isOwner = true;
    store.set(OWNER_KEY(id), edit_token); rememberTable();
    lastSaved = snapshotKey();
    history.replaceState(null, '', `${location.pathname}?t=${id}`);
  } else {
    await saveNow();
  }
  state.shareUrl = tableLink();
  return state.shareUrl;
}
async function saveNow() {
  if (!hasBackend || !state.remoteId || !(state.editToken || state.user)) return;
  const key = snapshotKey();
  if (key === lastSaved) return;
  await updateTable(state.remoteId, state.editToken, state.hostName, arrangement(), state.listed);
  lastSaved = key;
  rememberTable();
}
function scheduleSave() {
  if (!state.isOwner || !state.remoteId || !(state.editToken || state.user)) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow().catch(err => { console.warn(err); toast('Couldn’t save your latest changes. Check your connection.'); }), 900);
}


function render() {
  const pages = { home, pantry, finish, guest, leaderboard:leaderboardPage, loading:loadingPage, missing:missingPage };
  document.querySelector('#app').innerHTML = (pages[state.page] || studio)() + modal();
  bind();
  scheduleSave();
}
function music() { return `<button class="music-toggle" data-music aria-label="${state.musicMuted?'Play':'Mute'} theme song" title="Play or mute theme song">${state.musicMuted?'♫':'🔊'}</button>`; }
// The YouTube player lives outside #app so re-rendering the page doesn't restart the song.
function ensureMusicPlayer() {
  if (document.querySelector('.music-dock')) return false;
  const dock = document.createElement('div');
  dock.className = 'music-dock'; dock.setAttribute('aria-hidden', 'true');
  dock.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/4KJeS1MdYWc?enablejsapi=1&autoplay=1&mute=0&loop=1&playlist=4KJeS1MdYWc&playsinline=1" title="Thanksgiving theme song" allow="autoplay; encrypted-media"></iframe>';
  document.body.appendChild(dock);
  return true;
}
function musicCommand(func) { document.querySelector('.music-dock iframe')?.contentWindow?.postMessage(JSON.stringify({ event:'command', func, args:[] }), '*'); }
function menuButton() { return `<button class="menu-button" data-menu-open aria-label="Open menu"><span></span><span></span><span></span></button>`; }
function brand(attr='data-page="home"') { return `<button class="brand" ${attr}><span class="brand-mark">✦</span><span>Deco<i>Thanks</i></span></button>`; }
function header(active='') { return `<header class="topbar">${brand()}<nav><button class="nav-link ${active==='studio'?'active':''}" data-page="studio">Table studio</button><button class="nav-link ${active==='pantry'?'active':''}" data-page="pantry">The pantry</button>${music()}<span class="season-pill">Thanksgiving 2026</span>${menuButton()}</nav></header>`; }
function guestHeader() { return `<header class="topbar">${brand('data-new-table')}<nav>${music()}<button class="share-button" data-new-table>Make your own table</button>${menuButton()}</nav></header>`; }
function home() { const last = store.get(LAST_KEY); return `<main class="home-page"><div class="home-leaves"><span class="home-leaf leaf-a">✦</span><span class="home-leaf leaf-b">✦</span><span class="home-leaf leaf-c">✦</span><span class="home-leaf leaf-d">✦</span></div><header class="home-top">${brand()}<div class="home-top-actions">${music()}${menuButton()}</div></header><section class="home-hero"><div class="home-table-frame"><img src="${BASE_URL}cozy-thanksgiving-feast.webp" alt="A fully decorated Thanksgiving feast at golden hour"/></div><div class="home-cta"><h1>Your Thanksgiving, <em>your way.</em></h1><p class="home-sub">Decorate a table, share the link, and let everyone leave you a thank-you card.</p><div class="home-buttons"><button class="primary home-button" data-page="studio">Create my table <span>→</span></button>${last?`<button class="secondary home-button" data-open-table="${esc(last)}">Open my shared table</button>`:''}</div><button class="text-link home-lb" data-menu="leaderboard">🏆 See the most-loved tables</button></div></section></main>`; }
function loadingPage() { return `<main class="status-page">${guestHeader()}<div class="status-inner"><span class="status-icon">✦</span><h1>Setting the table…</h1></div></main>`; }
function missingPage() { return `<main class="status-page">${guestHeader()}<div class="status-inner"><span class="status-icon">🍂</span><h1>We couldn’t find that table</h1><p>${hasBackend?'The link may be incomplete. Ask whoever sent it to copy it again.':'Shared tables aren’t switched on for this site yet.'}</p><button class="primary" data-new-table>Make your own table <span>→</span></button></div></main>`; }
function pantry() { const groups = ['mains','sides','desserts','drinks','snacks','decor']; return `<main class="pantry-page">${header('pantry')}<div class="pantry-heading"><div><p class="eyebrow">Take your pick</p><h1>The pantry</h1><p>Every good table starts with a little bit of everything.</p></div><button class="secondary" data-page="studio">Back to my table <span>→</span></button></div><div class="pantry-tabs"><button class="tab ${state.filter==='all'?'active':''}" data-filter="all">All pieces <small>${foods.length}</small></button>${groups.map(g=>`<button class="tab ${state.filter===g?'active':''}" data-filter="${g}">${categoryNames[g]} <small>${foods.filter(x=>x[2]===g).length}</small></button>`).join('')}</div><div class="pantry-grid">${foods.filter(x=>state.filter==='all'||x[2]===state.filter).map(item=>foodCard(item)).join('')}</div></main>`; }
function foodCard(item) { const at = unlockAt(item[0]); const locked = isLocked(item[0]); return `<button class="food-card ${locked?'locked':''}" data-add="${item[0]}" title="${locked?`Unlocks at ${at} thank-you cards`:`Add ${item[1]}`}"><span class="card-art"><img src="${assetFor(item)}" alt="${item[1]}"/>${locked?`<span class="lock-badge">🔒 ${at} cards</span>`:''}</span><span class="card-info"><small>${categoryNames[item[2]]}</small><strong>${item[1]}</strong><i>${locked?`Unlocks at ${at} cards`:'+ add to table'}</i></span></button>`; }
function unlockWidget() {
  const n = receivedCount(), next = nextUnlock();
  if (!next) return `<div class="unlock-box done"><small>All pieces unlocked</small><b>Your pantry is fully stocked ✦</b></div>`;
  const prev = [...UNLOCKS].reverse().find(u => u.at <= n)?.at || 0;
  const pct = Math.round((n - prev) / (next.at - prev) * 100);
  const left = next.at - n;
  return `<button class="unlock-box" data-share><small>Next unlock · ${left} more card${left===1?'':'s'} from friends</small><b>${esc(next.label)}</b><span class="unlock-bar"><span style="width:${pct}%"></span></span><i>Share your table to unlock →</i></button>`;
}
function tableArt(cls='table-art') { return `<img class="${cls}" src="${BASE_URL}thanksgiving-table.webp" alt="Illustrated Thanksgiving dinner table" draggable="false"/>`; }
const cardFrom = c => c.anonymous ? 'Anonymous' : (c.name || 'A friend');
// Guests can't read other people's cards, but their own browser remembers what they wrote.
const SENT_KEY = id => `harvest-table:sent:${id}`;
function rememberSent(tableId, card) { const sent = readJson(SENT_KEY(tableId), {}); sent[card.id] = { message:card.message, name:card.name, anonymous:card.anonymous }; store.set(SENT_KEY(tableId), JSON.stringify(sent)); }
function withMySentCards(tableId, cards) { const sent = readJson(SENT_KEY(tableId), {}); return cards.map(c => sent[c.id] ? { ...c, ...sent[c.id], mine:true } : c); }
function cardIcon(c) { const f = foodById(c.food); return f ? `<img src="${assetFor(f)}" alt=""/>` : '<span>♡</span>'; }
function cardSticker(card, i) {
  const angle = i * 2.39996;
  const r = 0.6 + 0.4 * ((i % 5) / 4);
  const x = Math.max(8, Math.min(92, 50 + Math.cos(angle) * 40 * r));
  const y = Math.max(12, Math.min(88, 52 + Math.sin(angle) * 34 * r));
  return `<button class="card-sticker" data-read="${esc(card.id)}" style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%" title="A card from ${esc(cardFrom(card))}" aria-label="Read the card from ${esc(cardFrom(card))}">${cardIcon(card)}<span class="seal" aria-hidden="true">♥</span>${card.sealed?'':`<b class="sticker-name">${esc(cardFrom(card).slice(0, 14))}</b>`}</button>`;
}
function cardPages() { return Math.max(1, Math.ceil(state.cards.length / CARDS_PER_PAGE)); }
function cardLayer() {
  const pages = cardPages(), p = Math.min(state.cardPage, pages - 1);
  const stickers = state.cards.slice(p * CARDS_PER_PAGE, (p + 1) * CARDS_PER_PAGE).map((c, i) => cardSticker(c, i)).join('');
  if (pages < 2) return stickers;
  return stickers + `<div class="card-pager"><button data-card-page="-1" ${p===0?'disabled':''} aria-label="Previous table of cards">‹</button><span>🍽️ Table ${p+1} of ${pages}<small>${state.cards.length} cards</small></span><button data-card-page="1" ${p>=pages-1?'disabled':''} aria-label="Next table of cards">›</button></div>`;
}
function studio() { const visible = foods.filter(x=>state.filter==='all'||x[2]===state.filter); return `<main class="studio-page">${header('studio')}<div class="studio-layout"><aside class="studio-aside"><div class="aside-top"><div><p class="eyebrow">Your canvas</p><h2>Table studio</h2></div><span class="count"><b>${state.items.length}</b><small>pieces</small></span></div><p class="aside-desc">Choose a piece, then give it a place at the table. There is no wrong way to gather.</p><div class="progress"><span style="width:${Math.min(100,Math.max(8,state.items.length*8))}%"></span></div><button class="received-cards" data-cards><span>♡</span><div><b>${state.cards.length}</b><small>thank-you cards received</small></div></button>${unlockWidget()}<button class="settings-link" data-menu="settings">⚙️ Table settings</button><div class="filter-list">${Object.keys(categoryNames).map(k=>`<button class="filter ${state.filter===k?'selected':''}" data-filter="${k}"><span>${k==='all'?'✦':categoryArt[k]}</span>${categoryNames[k]}<b>${k==='all'?foods.length:foods.filter(x=>x[2]===k).length}</b></button>`).join('')}</div><button class="random-button" data-random><span>✧</span> Surprise me</button><button class="pantry-link" data-page="pantry">Browse all pieces <span>→</span></button></aside><section class="workspace"><div class="workspace-top"><div><p class="eyebrow">Thursday, November 26</p><h3>${esc(hostLabel())} Thanksgiving table <span>·</span> <em>${state.remoteId?'shared · saves automatically':'just getting started'}</em></h3></div><div class="workspace-actions"><button class="icon-button" data-undo title="Undo">↶</button><button class="icon-button" data-clear title="Clear table">⌫</button><button class="share-button" data-share>Share table</button><button class="finish-button" data-finish>Finish decorating <span>→</span></button></div></div><div class="table-stage"><div class="table-canvas" id="table-canvas" style="--zoom:${state.zoom}">${tableArt()}<div class="placement-layer">${state.items.map(item=>placed(item)).join('')}${cardLayer()}<div class="drop-hint ${state.items.length?'hidden':''}"><span>✦</span><strong>Start with a little something</strong><small>Pick a favorite from the pantry</small></div></div></div></div><div class="studio-bottom"><div class="quick-tools"><button data-rotate>↻ Rotate</button><button data-duplicate>＋ Duplicate</button><button data-delete>× Remove</button></div><div class="zoom-tools"><button data-zoom="-">−</button><span>${Math.round(state.zoom*100)}%</span><button data-zoom="+">＋</button></div><div class="gratitude"><span>♡</span><button data-write>Write a thank-you card</button><button data-share class="gratitude-share">Invite friends to write one →</button></div></div></section><aside class="mini-pantry"><div class="mini-heading"><h3>Pick a piece</h3><button data-page="pantry">View all</button></div><div class="mini-tabs"><button class="mini-tab ${state.filter==='all'?'active':''}" data-filter="all">All</button><button class="mini-tab ${state.filter==='mains'?'active':''}" data-filter="mains">Mains</button><button class="mini-tab ${state.filter==='sides'?'active':''}" data-filter="sides">Sides</button><button class="mini-tab ${state.filter==='desserts'?'active':''}" data-filter="desserts">Sweet</button></div><div class="mini-grid">${visible.slice(0,12).map(item=>foodCard(item)).join('')}</div><button class="feast-button" data-feast><span>✦</span> Build the ultimate feast</button></aside></div></main>`; }
function guest() { const n = state.cards.length; const who = state.hostName ? esc(state.hostName) : 'the host'; return `<main class="guest-page">${guestHeader()}<section class="guest-layout"><div class="guest-copy"><p class="eyebrow">You’re invited to the table</p><h1>${state.hostName?esc(possessive(state.hostName)):'A friend’s'} <em>Thanksgiving table</em></h1><p>Leave ${who} a thank-you card. It’ll sit right on the table next to everyone else’s, sealed so only ${who} can read it.</p><div class="guest-actions"><button class="primary" data-write>Write a thank-you card <span>♡</span></button><button class="secondary" data-cards>See the cards <span>${n}</span></button></div><button class="text-link" data-new-table>Make your own table →</button></div><div class="table-stage guest-stage"><div class="table-canvas">${tableArt()}<div class="placement-layer">${state.items.map(item=>placed(item, true)).join('')}${cardLayer()}${n?'':`<div class="drop-hint"><span>♡</span><strong>No cards yet</strong><small>Be the first to leave one</small></div>`}</div></div></div></section></main>`; }
function placed(x, readonly=false) { const fx = pendingFx && pendingFx.uid === x.uid ? pendingFx.cls : ''; return `<div class="placed-item ${readonly?'readonly':''} ${!readonly&&state.selected===x.uid?'chosen':''} ${HOT_FOOD.has(x.kind)?'fx-steam':''} ${x.kind==='candle'?'fx-flicker':''} ${fx}" data-uid="${x.uid}" style="left:${x.x}%;top:${x.y}%;transform:translate(-50%,-50%) rotate(${x.rotate}deg) scale(${x.scale});z-index:${x.z}"><img src="${esc(x.asset)}" alt="${esc(x.name)}" draggable="false"/>${readonly?'':`<button class="item-remove" data-item-delete="${x.uid}">×</button>`}</div>`; }
function leaderboardPage() {
  const rows = state.leaderboard;
  const body = !hasBackend ? '<p class="lb-empty">The leaderboard turns on once card syncing is connected.</p>'
    : rows === null ? '<p class="lb-empty">Loading the most-loved tables…</p>'
    : rows.error ? `<p class="lb-empty">${esc(rows.error)}</p>`
    : !rows.length ? '<p class="lb-empty">No tables on the board yet. Share yours and switch on “Show my table on the public leaderboard” to be the first!</p>'
    : `<ol class="lb-list">${rows.map((r, i) => `<li class="${i<3?'top':''}"><span class="lb-rank">${['🥇','🥈','🥉'][i] || i+1}</span><span class="lb-name">${esc(possessive(r.host_name || 'A friend'))} table</span><span class="lb-count">${Number(r.card_count)||0} ♡</span><a class="lb-visit" href="?t=${encodeURIComponent(r.id)}">Visit</a></li>`).join('')}</ol>`;
  const back = state.isOwner ? `<button class="primary" data-page="studio">${state.remoteId?'Back to my table':'Create my table'} <span>→</span></button>` : '<button class="primary" data-new-table>Make your own table <span>→</span></button>';
  return `<main class="leaderboard-page">${state.isOwner?header('leaderboard'):guestHeader()}<div class="lb-inner"><p class="eyebrow">Thanksgiving 2026</p><h1>Most-loved tables</h1><p class="lb-sub">Ranked by thank-you cards. Hosts choose whether their table shows up here.</p>${body}<div class="lb-actions">${back}</div></div></main>`;
}
function finish() { return `<main class="finish-page">${header()}<div class="finish-inner"><div class="finish-copy"><p class="eyebrow">A table made with love</p><h1>Your Thanksgiving<br/><em>feast is ready!</em></h1><p>Now share the link so everyone can pull up a chair and leave you a thank-you card.</p><div class="finish-actions"><button class="primary" data-share>Share my table <span>↗</span></button><button class="secondary" data-cards>Read cards (${state.cards.length})</button><button class="secondary" data-download>Download dinner <span>↓</span></button><button class="secondary" data-page="studio">Edit table</button></div><div class="thankful-quote">“${esc(state.gratitude||'The best memories are made around the table.')}”</div></div><div class="final-table"><div class="table-canvas">${tableArt()}<div class="placement-layer">${state.items.map(item=>placed(item, true)).join('')}${cardLayer()}</div></div><div class="final-label"><span>✦</span> gathered at our table</div></div></div></main>`; }

function modal() {
  const m = state.modal; if (!m) return '';
  const who = state.hostName ? esc(state.hostName) : 'the host';
  let body = '';
  if (m.type === 'write') {
    body = `<h2>Write a thank-you card</h2><p class="modal-sub">${state.isOwner?'Add a card to your own table':`For ${state.hostName?esc(possessive(state.hostName)):'the host’s'} Thanksgiving table`}</p><form data-card-form novalidate><label class="field"><span>Your message</span><textarea name="message" maxlength="600" rows="5" placeholder="I’m thankful for you because…"></textarea></label><div class="field-row"><label class="field"><span>Your name</span><input name="name" maxlength="60" autocomplete="name" placeholder="Optional"/></label><label class="check"><input type="checkbox" name="anonymous"/> Send anonymously</label></div><fieldset class="sticker-pick"><legend>Pick a sticker for your card</legend>${cardFoods.map((id, i) => { const f = foodById(id); return `<label title="${f[1]}"><input type="radio" name="food" value="${id}" ${i===0?'checked':''}/><img src="${assetFor(f)}" alt="${f[1]}"/></label>`; }).join('')}</fieldset><p class="form-error" hidden></p><div class="modal-actions"><button type="button" class="secondary" data-close>Cancel</button><button type="submit" class="primary">Place card on table <span>♡</span></button></div></form>`;
  } else if (m.type === 'read') {
    const c = state.cards.find(x => x.id === m.id); if (!c) return '';
    if (c.sealed) { body = `<div class="card-read sealed"><div class="card-read-icon">${cardIcon(c)}</div><p class="card-message">💌 This card is sealed.</p><p class="card-from">Only ${state.hostName?esc(state.hostName):'the host'} can read the cards on this table.</p></div><div class="modal-actions"><button class="secondary" data-cards>All cards</button><button class="primary" data-write>Write your own <span>♡</span></button></div>`; return `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><button class="modal-x" data-close aria-label="Close">×</button>${body}</div></div>`; }
    body = `<div class="card-read"><div class="card-read-icon">${cardIcon(c)}</div><p class="card-message">${esc(c.message)}</p><p class="card-from">— ${esc(cardFrom(c))}</p></div><div class="modal-actions">${state.isOwner?`<button class="secondary danger" data-delete-card="${esc(c.id)}">Remove card</button>`:''}<button class="secondary" data-cards>All cards</button><button class="primary" data-close>Close</button></div>`;
  } else if (m.type === 'list') {
    const n = state.cards.length;
    body = `<h2>Thank-you cards <small>${n}</small></h2>${n?`<div class="card-list">${state.cards.map(c=>`<button class="card-row" data-read="${esc(c.id)}"><span class="card-row-icon">${cardIcon(c)}</span><span><strong>${c.sealed?'💌 Sealed card':esc(c.message)}</strong><small>${c.mine?'Your card · only you and the host can read it':c.sealed?'Only the host can read it':esc(cardFrom(c))}</small></span></button>`).join('')}</div>${state.isOwner?'':`<p class="modal-note">Only ${state.hostName?esc(state.hostName):'the host'} can read these cards. You can always see the ones you wrote.</p>`}`:`<p class="modal-sub">No cards yet. ${state.isOwner?'Share your link so friends can leave some!':'Be the first to leave one!'}</p>`}<div class="modal-actions">${state.isOwner?'<button class="secondary" data-share>Share my link</button>':''}<button class="primary" data-write>Write a card <span>♡</span></button></div>`;
  } else if (m.type === 'share') {
    const tplKey = m.tpl || 'family';
    const msg = state.shareUrl ? TEMPLATES[tplKey].text(state.hostName ? possessive(state.hostName) : 'my', state.shareUrl, pageBase()) : '';
    const links = shareLinks(msg, `${hostLabel()} Thanksgiving table 🦃`);
    const details = `<label class="field"><span>Whose table is this?</span><input id="host-name" maxlength="40" value="${esc(state.hostName)}" placeholder="e.g. The Garcia family"/></label>${hasBackend?`<label class="check listed-check"><input type="checkbox" id="listed" ${state.listed?'checked':''}/><span>Show my table on the public leaderboard <small>Shows your table name and card count.</small></span></label>`:''}<p class="form-error" ${m.error?'':'hidden'}>${esc(m.error||'')}</p>${hasBackend?'':'<p class="modal-note">Card syncing isn’t connected on this site yet, so this link carries a snapshot of your table. Guests can read it, but their cards won’t reach you until Supabase is set up.</p>'}`;
    body = !state.shareUrl
      ? `<h2>Invite people to your table</h2><p class="modal-sub">Anyone with the link can see your table and leave you a sealed thank-you card.</p>${details}<div class="modal-actions"><button class="primary" data-make-link>Get my share link <span>↗</span></button></div>`
      : `<h2>Invite people to your table</h2><p class="modal-sub">Send it to the people you’re thankful for.</p>
<div class="share-link"><input id="share-url" readonly value="${esc(state.shareUrl)}"/><button class="primary" data-copy>Copy</button></div>
<div class="share-quick">
<a class="share-btn" data-quick="whatsapp" href="${esc(links.whatsapp)}" target="_blank" rel="noopener"><span class="sb-ico wa">✆</span>WhatsApp</a>
<a class="share-btn" data-quick="sms" href="${esc(links.sms)}"><span class="sb-ico">💬</span>Messages</a>
<a class="share-btn" data-quick="email" href="${esc(links.email)}"><span class="sb-ico">✉️</span>Email</a>
${navigator.share?'<button class="share-btn" data-native-share><span class="sb-ico">📤</span>More</button>':''}
</div>
<div class="share-msg"><div class="tpl-chips" role="group" aria-label="Message for">${Object.entries(TEMPLATES).map(([k,t])=>`<button class="chip ${k===tplKey?'on':''}" data-tpl="${k}" aria-pressed="${k===tplKey}">${t.label}</button>`).join('')}</div>
<textarea id="share-msg" rows="6" aria-label="Message to send">${esc(msg)}</textarea>
<button class="secondary" data-copy-msg>Copy message</button></div>
<div class="share-qr">${qrSvg(state.shareUrl)}<div><b>Sharing at the dinner table?</b><p>Guests can scan this with their phone camera to leave a card.</p><button class="primary" data-story>Save story image <span>↓</span></button></div></div>
<details class="share-details"><summary>Table name &amp; leaderboard</summary>${details}<div class="modal-actions"><button class="secondary" data-make-link>Save changes</button></div></details>
<div class="modal-actions"><button class="primary" data-close>Done</button></div>`;
  } else if (m.type === 'menu') {
    const item = (attr, icon, label, extra='') => `<li><button ${attr}><span class="mi">${icon}</span><span class="ml">${label}</span>${extra}<b>›</b></button></li>`;
    const count = myTables().length;
    const leaves = ['🍂','🍁','🍂','🍁','🍂'].map((l, i) => `<span style="--d:${i}">${l}</span>`).join('');
    body = `<div class="menu-leaves" aria-hidden="true">${leaves}</div><div class="menu-head"><span class="menu-crest" aria-hidden="true">🦃</span><h2 class="menu-title">Menu</h2><p class="menu-sub">Happy Thanksgiving</p></div><ul class="menu-list">${state.isOwner?item('data-page="studio"','🍽️','Table studio')+item('data-page="pantry"','🥧','The pantry'):item('data-new-table','🍽️','Make your own table')}${item('data-menu="tables"','🧺','My tables', count?`<em>${count}</em>`:'')}${state.isOwner?item('data-menu="settings"','⚙️','Table settings'):''}${authEnabled?(state.user?item('data-menu="account"','👤','My account', '<em>signed in</em>'):item('data-menu="signin"','🔐','Save my tables')):''}${item('data-menu="leaderboard"','🏆','Leaderboard')}${item('data-menu="how"','🍂','How it works')}<li><a href="${esc(FEEDBACK_URL)}" target="_blank" rel="noopener"><span class="mi">💌</span><span class="ml">Feedback</span><b>↗</b></a></li>${item('data-menu="privacy"','🕯️','Privacy')}</ul><p class="menu-foot"><button data-menu="terms">Terms</button> · <button data-menu="privacy">Privacy</button> · <a href="https://github.com/foojanbabaeeian/DecoMyThanksgivingTable" target="_blank" rel="noopener">Open source</a></p>`;
  } else if (m.type === 'settings') {
    body = `<h2>Table settings</h2><p class="modal-sub">${state.remoteId?'Changes show up for everyone who opens your link.':'These apply as soon as you share your table.'}</p>
<label class="field"><span>Table name</span><input id="settings-name" maxlength="40" value="${esc(state.hostName)}" placeholder="e.g. The Garcia family"/></label>
${hasBackend?`<label class="check listed-check"><input type="checkbox" id="settings-listed" ${state.listed?'checked':''}/><span>Show my table on the public leaderboard <small>Your table name and card count become public. Card messages stay private. You can turn this off anytime.</small></span></label>`:''}
<p class="form-error" hidden></p>
<div class="modal-actions"><button class="secondary" data-close>Cancel</button><button class="primary" data-save-settings>Save</button></div>`;
  } else if (m.type === 'signin') {
    body = m.sent
      ? `<h2>Check your inbox 💌</h2><p class="modal-sub">We sent a sign-in link to <b>${esc(m.sent)}</b>. Open it on this device to finish signing in. It can take a minute; check your spam folder too.</p><div class="modal-actions"><button class="secondary" data-menu="signin">Use a different email</button><button class="primary" data-close>OK</button></div>`
      : `<h2>Save your tables</h2><p class="modal-sub">Sign in to open your tables, edit them and read your cards on any device. It’s optional: everything works without an account.</p>
${googleEnabled?'<button class="google-btn" data-google><span class="g">G</span>Continue with Google</button>':''}${googleEnabled&&emailEnabled?'<div class="or-line"><span>or</span></div>':''}
${emailEnabled?`<form data-email-form novalidate><label class="field"><span>Email</span><input type="email" name="email" required autocomplete="email" placeholder="you@example.com"/></label><p class="form-error" hidden></p><div class="modal-actions"><button type="button" class="secondary" data-close>Not now</button><button type="submit" class="primary">Email me a sign-in link</button></div></form>`:''}
<p class="modal-note">We only use your account to sign you in. No passwords, no newsletters.</p>`;
  } else if (m.type === 'account') {
    const n = state.accountTables.length;
    body = `<h2>My account</h2><p class="modal-sub">Signed in as <b>${esc(state.user?.email || 'you')}</b>.</p><p class="modal-note">${n} table${n===1?'':'s'} saved to your account. Open them from <b>My tables</b> on any device where you’re signed in.</p><div class="modal-actions"><button class="secondary danger" data-signout>Sign out</button><button class="secondary" data-menu="tables">My tables</button><button class="primary" data-close>Done</button></div>`;
  } else if (m.type === 'tables') {
    const list = myTables();
    body = `<h2>My tables</h2><p class="modal-sub">${state.user?'Tables on this device and in your account.':'Tables you created on this device.'}</p>${list.length?`<div class="card-list">${list.map(t=>`<a class="card-row" href="?t=${encodeURIComponent(t.id)}"><span class="card-row-icon"><span>🍽</span></span><span><strong>${esc(t.name)}</strong><small>Open table</small></span></a>`).join('')}</div>`:'<p class="modal-note">No shared tables yet. Decorate one and press “Share table” to get your link.</p>'}<div class="modal-actions"><button class="primary" data-new-table>Start a new table <span>→</span></button></div>`;
  } else if (m.type === 'how') {
    body = `<h2>How it works</h2><ol class="how-list"><li><b>Decorate your table.</b> Drag food and decorations anywhere on the table.</li><li><b>Share your link.</b> Send it to family, friends and group chats.</li><li><b>Get thank-you cards.</b> Everyone who opens your link can leave you a card with a sticker. Cards sit right on your table.</li><li><b>Unlock more pieces.</b> The more cards friends leave, the fancier your table gets.</li></ol><div class="unlock-tiers">${UNLOCKS.map(u=>`<div><b>${u.at} cards</b><span>${esc(u.label)}</span></div>`).join('')}</div><p class="modal-note">Cards you write on your own table don’t count toward unlocks.</p><div class="modal-actions"><button class="primary" data-close>Got it</button></div>`;
  } else if (m.type === 'privacy') {
    body = `<h2>Privacy</h2><div class="policy"><p>DecoThanks has no accounts and no ad tracking.</p><p><b>What we store:</b> your table’s layout and name, and each thank-you card’s message, sender name (unless sent anonymously) and sticker.</p><p><b>Who can see it:</b> anyone with your table’s link can see the table and how many cards it has. <b>Only the table’s host can read the cards and see who wrote them</b>: messages and names are locked in the database behind the host’s private key. People who write a card can see their own card again on the same device. If you turn on the leaderboard, your table’s name and card count are public.</p><p><b>Your edit key:</b> the browser you created a table in keeps a private key so only you can change it. Clearing your browser data removes it.</p><p><b>Optional account:</b> if you sign in, we store your email address and link your tables to it, so you can manage them from any device. Nobody else can see your email.</p><p><b>Music:</b> the theme song plays through YouTube’s privacy-enhanced player, and only after you press play.</p><p>To have a table or card removed, use Feedback in the menu.</p></div><div class="modal-actions"><button class="primary" data-close>Close</button></div>`;
  } else if (m.type === 'terms') {
    body = `<h2>Terms</h2><div class="policy"><p>Be kind. Cards are meant to say thank you.</p><p>Don’t post anything hateful, harassing, sexual, or anyone’s private information. We may remove cards or tables that break these rules.</p><p>You’re responsible for what you write. DecoThanks is provided as is, without warranties.</p></div><div class="modal-actions"><button class="primary" data-close>Close</button></div>`;
  }
  return `<div class="modal-backdrop ${m.type==='menu'?'menu-backdrop':''} ${m.type==='write'?'write-backdrop':''}"><div class="modal" role="dialog" aria-modal="true"><button class="modal-x" data-close aria-label="Close">×</button>${body}</div></div>`;
}

function snapshot(){ state.history.push(JSON.stringify(state.items)); if(state.history.length>30)state.history.shift(); state.future=[]; }
function lockedToast(id) { const f = foodById(id); const left = unlockAt(id) - receivedCount(); toast(`${f?.[1] || 'This piece'} unlocks after ${left} more thank-you card${left===1?'':'s'}. Share your table!`); }
function addItem(id, x=50, y=50) { const f=foods.find(a=>a[0]===id); if(!f)return; if(isLocked(id)){lockedToast(id);return false;} snapshot(); state.items.push({uid:Date.now()+Math.random(),kind:f[3],name:f[1],asset:assetFor(f),x:x+(Math.random()*8-4),y:y+(Math.random()*8-4),rotate:(Math.random()*8-4),scale:f[4]==='center'?1.2:.83,z:state.items.length+3}); state.selected=state.items.at(-1).uid; pendingFx={uid:state.selected, cls:'pop-in'}; render(); pendingFx=null; burstAt(document.querySelector(`#table-canvas .placed-item[data-uid="${state.selected}"]`), ['✨','✨','🍂'], 8); return true; }
function openLeaderboard() {
  state.page = 'leaderboard'; state.modal = null; state.leaderboard = null; render();
  if (!hasBackend) return;
  fetchLeaderboard().then(rows => { state.leaderboard = rows; }).catch(err => { console.warn(err); state.leaderboard = { error: 'Couldn’t load the leaderboard. Try again in a moment.' }; }).finally(() => { if (state.page === 'leaderboard') render(); });
}
function closeModal() { state.modal = null; render(); }
async function submitCard(form) {
  const data = new FormData(form);
  const errorEl = form.querySelector('.form-error');
  const message = String(data.get('message') || '').trim();
  if (!message) { errorEl.hidden = false; errorEl.textContent = 'Write a little something first.'; return; }
  const card = { message: message.slice(0, 600), name: String(data.get('name') || '').trim().slice(0, 60), anonymous: data.get('anonymous') === 'on', food: String(data.get('food') || '') };
  const submit = form.querySelector('[type=submit]');
  submit.disabled = true; submit.textContent = 'Placing your card…';
  try {
    if (hasBackend && (state.remoteId || state.isOwner)) {
      if (!state.remoteId) await ensureShared();
      const saved = sanitizeCard({ ...(await addCard(state.remoteId, card)), message:card.message, name:card.name, anonymous:card.anonymous });
      if (!state.isOwner) rememberSent(state.remoteId, saved);
      state.cards.push(saved);
      if (state.isOwner) rememberMyCard(saved.id);
    } else {
      const local = sanitizeCard({ ...card, id: newTableId() });
      state.cards.push(local);
      if (state.isOwner) rememberMyCard(local.id);
      if (!state.isOwner) history.replaceState(null, '', `${location.pathname}#table=${encodeTable({ ...arrangement(), cards: state.cards, hostName: state.hostName })}`);
    }
    if (state.isOwner) state.gratitude = card.message;
    state.cardPage = cardPages() - 1;
    closeModal();
    const landed = document.querySelector(`.card-sticker[data-read="${CSS.escape(state.cards.at(-1).id)}"]`);
    if (landed) { landed.classList.add('landed'); setTimeout(() => burstAt(landed, ['🍂','🍁','💛','✨'], 16), 650); }
    toast(hasBackend || state.isOwner ? 'Your card is on the table ♡' : 'Card added! Send this page’s link back so they can see it.');
  } catch (err) {
    console.warn(err);
    submit.disabled = false; submit.textContent = 'Place card on table ♡';
    errorEl.hidden = false; errorEl.textContent = err.message;
  }
}
function bind(){
  const on = (sel, fn) => document.querySelectorAll(sel).forEach(el => el.addEventListener('click', e => fn(e, el)));
  on('[data-page]', (e,b)=>{state.page=b.dataset.page;state.modal=null;render()});
  document.querySelector('[data-music]')?.addEventListener('click',e=>{state.musicMuted=!state.musicMuted;const created=!state.musicMuted&&ensureMusicPlayer();if(!created){musicCommand(state.musicMuted?'pauseVideo':'playVideo');}e.currentTarget.textContent=state.musicMuted?'♫':'🔊';e.currentTarget.setAttribute('aria-label',state.musicMuted?'Play theme song':'Mute theme song')});
  on('[data-share]', ()=>{ state.shareUrl = state.remoteId ? tableLink() : ''; state.modal={type:'share'}; render(); if (matchMedia('(pointer:fine)').matches) document.querySelector('#host-name')?.focus(); });
  on('[data-write]', ()=>{ state.modal={type:'write'}; render(); if (matchMedia('(pointer:fine)').matches) document.querySelector('[data-card-form] textarea')?.focus(); });
  on('[data-cards]', ()=>{ state.modal={type:'list'}; render(); });
  on('[data-read]', (e,b)=>{ e.stopPropagation(); state.modal={type:'read', id:b.dataset.read}; render(); });
  on('[data-close]', closeModal);
  on('[data-menu-open]', ()=>{ state.modal={type:'menu'}; render(); });
  document.querySelector('[data-email-form]')?.addEventListener('submit', async e=>{
    e.preventDefault();
    const form = e.currentTarget, err = form.querySelector('.form-error'), btn = form.querySelector('[type=submit]');
    const email = String(new FormData(form).get('email') || '').trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.hidden = false; err.textContent = 'Please enter a valid email address.'; return; }
    btn.disabled = true; btn.textContent = 'Sending…';
    try { await signInWithEmail(email, signInRedirect()); state.modal = { type:'signin', sent:email }; render(); }
    catch (ex) { console.warn(ex); btn.disabled = false; btn.textContent = 'Email me a sign-in link'; err.hidden = false; err.textContent = ex.message; }
  });
  on('[data-google]', async (e,b)=>{ b.disabled = true; try { await signInWithGoogle(signInRedirect()); } catch (ex) { console.warn(ex); b.disabled = false; toast(ex.message); } });
  on('[data-signout]', async ()=>{ await signOut(); state.user = null; state.accountTables = []; if (state.isOwner && !state.editToken) { location.reload(); return; } closeModal(); toast('Signed out.'); });
  on('[data-save-settings]', async (e,b)=>{
    const err = document.querySelector('.modal .form-error');
    const name = (document.querySelector('#settings-name')?.value || '').trim().slice(0, 40);
    const listedBox = document.querySelector('#settings-listed');
    const before = { hostName: state.hostName, listed: state.listed };
    state.hostName = name; if (listedBox) state.listed = listedBox.checked;
    b.disabled = true; b.textContent = 'Saving…';
    try {
      await saveNow();
      state.shareUrl = state.remoteId ? tableLink() : state.shareUrl;
      closeModal();
      toast(state.remoteId ? (state.listed && !before.listed ? 'Saved! Your table is on the leaderboard 🏆' : 'Saved ✦') : 'Saved. It applies when you share your table.');
    } catch (ex) {
      console.warn(ex);
      Object.assign(state, before);
      b.disabled = false; b.textContent = 'Save';
      if (err) { err.hidden = false; err.textContent = ex.message; }
    }
  });
  on('[data-menu]', (e,b)=>{ const v=b.dataset.menu; if (v==='leaderboard') openLeaderboard(); else { state.modal={type:v}; render(); } });
  on('[data-card-page]', (e,b)=>{ e.stopPropagation(); state.cardPage=Math.max(0,Math.min(cardPages()-1,state.cardPage+Number(b.dataset.cardPage))); render(); });
  document.querySelector('.modal-backdrop')?.addEventListener('click', e=>{ if (e.target === e.currentTarget) closeModal(); });
  document.querySelector('[data-card-form]')?.addEventListener('submit', e=>{ e.preventDefault(); submitCard(e.currentTarget); });
  on('[data-new-table]', ()=>{ location.href = location.pathname; });
  on('[data-open-table]', (e,b)=>{ location.href = `${location.pathname}?t=${encodeURIComponent(b.dataset.openTable)}`; });
  on('[data-make-link]', async (e,b)=>{
    state.hostName = (document.querySelector('#host-name')?.value || '').trim().slice(0, 40);
    const listedBox = document.querySelector('#listed'); if (listedBox) state.listed = listedBox.checked;
    b.disabled = true; b.textContent = 'Saving…';
    try { const url = await ensureShared(); const copied = await copyText(url); state.modal = {type:'share', tpl: state.modal?.tpl}; render(); toast(copied ? 'Link copied! Send it to your people.' : 'Your link is ready. Copy it below.'); if (copied) burstAt(document.querySelector('#share-url'), ['💌','✨','🧡'], 12); }
    catch (err) { console.warn(err); state.modal = {type:'share', error: err.message}; render(); }
  });
  on('[data-copy]', async (e,b)=>{ const input=document.querySelector('#share-url'); input?.select(); const copied = await copyText(state.shareUrl); toast(copied ? 'Link copied!' : 'Press Ctrl+C / ⌘C to copy the link.'); if (copied) burstAt(b, ['💌','✨','🧡'], 12); });
  on('[data-native-share]', async ()=>{ const text = document.querySelector('#share-msg')?.value || state.shareUrl; try { await navigator.share({ title:`${hostLabel()} Thanksgiving table`, text }); } catch { /* user cancelled */ } });
  on('[data-tpl]', (e,b)=>{ state.modal = { ...state.modal, type:'share', tpl:b.dataset.tpl }; render(); });
  on('[data-copy-msg]', async (e,b)=>{ const copied = await copyText(document.querySelector('#share-msg')?.value || ''); toast(copied ? 'Message copied! Paste it anywhere.' : 'Select the message and copy it.'); if (copied) burstAt(b, ['💌','✨','🧡'], 12); });
  document.querySelector('#share-msg')?.addEventListener('input', e=>{ const l = shareLinks(e.target.value, `${hostLabel()} Thanksgiving table 🦃`); document.querySelectorAll('[data-quick]').forEach(a=>{ a.href = l[a.dataset.quick]; }); });
  on('[data-story]', async (e,b)=>{
    b.disabled = true; const label = b.innerHTML; b.textContent = 'Making your image…';
    try {
      const blob = await storyImage({ title: state.hostName ? possessive(state.hostName) : 'My', items: arrangement().items, cardCount: state.cards.length, url: state.shareUrl, home: pageBase(), tableArt: `${BASE_URL}thanksgiving-table.webp` });
      const file = new File([blob], 'decothanks-story.png', { type: 'image/png' });
      if (navigator.canShare?.({ files:[file] })) { try { await navigator.share({ files:[file], text: document.querySelector('#share-msg')?.value || state.shareUrl }); } catch { /* cancelled */ } }
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'decothanks-story.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Story image saved 📸'); }
    } catch (err) { console.warn(err); toast('Couldn’t make the image. Try again?'); }
    b.disabled = false; b.innerHTML = label;
  });
  on('[data-delete-card]', async (e,b)=>{
    const id = b.dataset.deleteCard;
    if (!confirm('Remove this card from your table?')) return;
    try { if (hasBackend && state.remoteId) await deleteCard(state.remoteId, state.editToken, id); state.cards = state.cards.filter(c => c.id !== id); state.modal = {type:'list'}; render(); toast('Card removed'); }
    catch (err) { console.warn(err); toast(err.message); }
  });
  document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;render()});
  document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const offscreen=state.page==='pantry'||innerWidth<=760;const added=addItem(b.dataset.add);if(added&&offscreen)toast(`Added ${foodById(b.dataset.add)?.[1]||'it'} to your table`);});
  document.querySelectorAll('[data-item-delete]').forEach(b=>b.onclick=e=>{e.stopPropagation();const i=state.items.findIndex(x=>String(x.uid)===b.dataset.itemDelete);if(i>-1){snapshot();state.items.splice(i,1);state.selected=null;render()}});
  document.querySelectorAll('#table-canvas .placed-item:not(.readonly)').forEach(el=>{const item=state.items.find(x=>String(x.uid)===el.dataset.uid);if(!item)return;el.onpointerdown=e=>{if(e.target.classList.contains('item-remove'))return;state.selected=item.uid;snapshot();el.setPointerCapture(e.pointerId);drag={item,startX:e.clientX,startY:e.clientY,ox:item.x,oy:item.y};el.classList.add('dragging')};el.onpointermove=e=>{if(!drag||drag.item!==item)return;const stage=document.querySelector('#table-canvas').getBoundingClientRect();item.x=Math.max(8,Math.min(92,drag.ox+(e.clientX-drag.startX)/stage.width*100));item.y=Math.max(12,Math.min(86,drag.oy+(e.clientY-drag.startY)/stage.height*100));el.style.left=item.x+'%';el.style.top=item.y+'%'};el.onpointerup=()=>{if(drag){const moved=drag.item.x!==drag.ox||drag.item.y!==drag.oy;drag=null;if(moved)pendingFx={uid:item.uid,cls:'settle'};render();pendingFx=null}};el.onclick=()=>{state.selected=item.uid;render()}});
  document.querySelector('[data-undo]')?.addEventListener('click',()=>{if(state.history.length){state.future.push(JSON.stringify(state.items));state.items=JSON.parse(state.history.pop());render()}});
  document.querySelector('[data-clear]')?.addEventListener('click',()=>{if(state.items.length){snapshot();state.items=[];render()}});
  document.querySelector('[data-rotate]')?.addEventListener('click',()=>{const i=state.items.find(x=>x.uid===state.selected);if(i){snapshot();i.rotate+=15;render()}});
  document.querySelector('[data-duplicate]')?.addEventListener('click',()=>{const i=state.items.find(x=>x.uid===state.selected);if(i){snapshot();state.items.push({...i,uid:Date.now(),x:i.x+5,y:i.y+4,z:state.items.length+3});render()}});
  document.querySelector('[data-delete]')?.addEventListener('click',()=>{const i=state.items.findIndex(x=>x.uid===state.selected);if(i>-1){snapshot();state.items.splice(i,1);state.selected=null;render()}});
  document.querySelector('[data-feast]')?.addEventListener('click',()=>{snapshot();['turkey','mash','stuffing','cranberry','pumpkin-pie','cider','rolls','candle','flowers'].filter(id=>!isLocked(id)).forEach((id,i)=>{const f=foods.find(a=>a[0]===id);state.items.push({uid:Date.now()+i,kind:f[3],name:f[1],asset:assetFor(f),x:25+(i%3)*25,y:32+Math.floor(i/3)*23,rotate:(i%2?5:-4),scale:f[4]==='center'?1.12:.75,z:i+3})});render();document.querySelectorAll('#table-canvas .placed-item').forEach((el,i)=>{el.classList.add('pop-in');el.style.animationDelay=`${i*60}ms`});burstAt(document.querySelector('#table-canvas'),['🍂','🍁','✨','🥧','🦃'],22)});
  document.querySelector('[data-random]')?.addEventListener('click',()=>addItem((list=>list[Math.floor(Math.random()*list.length)])(foods.filter(f=>!isLocked(f[0])))[0],30+Math.random()*40,30+Math.random()*35));
  document.querySelector('[data-finish]')?.addEventListener('click',()=>{state.page='finish';render()});
  document.querySelectorAll('[data-zoom]').forEach(b=>b.onclick=()=>{state.zoom=Math.max(.7,Math.min(1.3,state.zoom+(b.dataset.zoom==='+'?.1:-.1)));render()});
  document.querySelector('[data-download]')?.addEventListener('click',()=>{const abs=p=>esc(new URL(p,location.href).href);const inner=state.items.map(item=>`<image href="${abs(item.asset)}" x="${item.x*6.2-310}" y="${item.y*4.1-205}" width="145" height="115" preserveAspectRatio="xMidYMid meet" transform="rotate(${item.rotate} ${item.x*6.2-237.5} ${item.y*4.1-147.5})"/>`).join('');const file=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 410"><image href="${abs(`${BASE_URL}thanksgiving-table.webp`)}" width="620" height="410" preserveAspectRatio="xMidYMid slice"/>${inner}<text x="310" y="390" text-anchor="middle" fill="#a16b50" font-family="Georgia" font-size="14">gathered at our table</text></svg>`;const blob=new Blob([file],{type:'image/svg+xml'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='my-thanksgiving-table.svg';a.click()});
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.modal) closeModal(); });
init();
