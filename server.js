// script.js - Tailwind front-end demo
// Data is saved to localStorage under 'paramedic_tailwind_v1'

const STORAGE_KEY = 'paramedic_tailwind_v1';

// quick selectors
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const uid = () => 'id-' + Math.random().toString(36).slice(2,10);

// initial data (three placeholders)
function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    const initial = {
      users: [
        { id: uid(), username: 'Alex', status: 'on' },       // on duty
        { id: uid(), username: 'Sam', status: 'busy' },      // busy
        { id: uid(), username: 'Jordan', status: 'off' }     // off duty
      ],
      chats: [],
      announcements: [],
      sceneReports: [],
      transportLogs: [],
      tabs: [ { id: 'home', title: 'Home' } ]
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try { return JSON.parse(raw); } catch(e){ console.error(e); return null; }
}
function saveData(d){ localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); }

let DATA = loadData();
let CURRENT_USER = sessionStorage.getItem('paramedic_user') || null;

// UI refs
const nameOverlay = $('#nameOverlay');
const enterName = $('#enterName');
const enterNameBtn = $('#enterNameBtn');

const currentUserDom = $('#currentUser');
const userNameDom = $('#userName');
const userMeta = $('#userMeta');
const logoutBtn = $('#logoutBtn');

const topTabs = $('#topTabs');
const addTabBtn = $('#addTabBtn');

const sideBtns = $$('.side-btn');
const pages = $$('.page');

const chatList = $('#chatList');
const chatInput = $('#chatInput');
const chatSend = $('#chatSend');

const announceList = $('#announceList');
const announceInput = $('#announceInput');
const announceSend = $('#announceSend');

const paramedicsList = $('#paramedicsList');
const setOnDuty = $('#setOnDuty');
const setBusy = $('#setBusy');
const setOffDuty = $('#setOffDuty');

const sceneList = $('#sceneList');
const sceneAdd = $('#sceneAdd');

const transportList = $('#transportList');
const transportAdd = $('#transportAdd');

const toggleChatter = $('#toggleChatter');
const chatterAudio = $('#chatter');
const chatterVol = $('#chatterVol');

const toggleTheme = $('#toggleTheme');

// ------------- initialization -------------
function init(){
  if(CURRENT_USER) hideNameOverlay();
  else showNameOverlay();

  renderCurrentUser();
  renderTopTabs();
  renderAll();
  wireEvents();
  ensurePagesForTabs();
}

function showNameOverlay(){ nameOverlay.style.display = 'flex'; enterName.focus(); }
function hideNameOverlay(){ nameOverlay.style.display = 'none'; }

// enter name handlers
enterNameBtn.addEventListener('click', submitName);
enterName.addEventListener('keydown', (e) => { if(e.key === 'Enter') submitName(); });

function submitName(){
  const v = enterName.value.trim();
  if(!v) return;
  CURRENT_USER = v;
  sessionStorage.setItem('paramedic_user', CURRENT_USER);
  hideNameOverlay();
  renderCurrentUser();
}

// change user
logoutBtn.addEventListener('click', ()=>{
  sessionStorage.removeItem('paramedic_user');
  CURRENT_USER = null;
  renderCurrentUser();
  showNameOverlay();
});

// render current user
function renderCurrentUser(){
  if(CURRENT_USER){
    currentUserDom.classList.remove('hidden');
    userNameDom.textContent = CURRENT_USER;
    userMeta.textContent = '';
  } else {
    currentUserDom.classList.add('hidden');
  }
}

// ------------- top tabs -------------
function renderTopTabs(){
  topTabs.innerHTML = '';
  (DATA.tabs || []).forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'tab px-3 py-1 rounded-md text-sm';
    btn.dataset.id = tab.id;
    btn.textContent = tab.title;
    if(tab.id === 'home') btn.classList.add('border-b-4', 'border-[#1fa3ff]');
    btn.addEventListener('click', ()=> showPage(tab.id));
    // add simple ✕ for non-home
    if(tab.id !== 'home'){
      const x = document.createElement('span');
      x.textContent = ' ✕';
      x.className = 'ml-1 text-white/60 cursor-pointer';
      x.addEventListener('click', (ev) => {
        ev.stopPropagation();
        // delete immediately
        DATA.tabs = DATA.tabs.filter(t => t.id !== tab.id);
        saveData(DATA);
        const el = document.getElementById(tab.id);
        if(el) el.remove();
        renderTopTabs();
        showPage('home');
      });
      btn.appendChild(x);
    }
    topTabs.appendChild(btn);
  });
}

// add tab: user selects from options (GUI prompt)
addTabBtn.addEventListener('click', ()=>{
  const choices = ['Vitals','Diagnosis','Scene Reports','Transport Logs','Settings'];
  // simple selection using prompt to keep file minimal
  const pick = prompt('Add Tab — choose a number:\n' + choices.map((c,i)=>`${i+1}. ${c}`).join('\n'));
  if(!pick) return;
  const idx = parseInt(pick,10) - 1;
  if(isNaN(idx) || idx < 0 || idx >= choices.length) return alert('Invalid choice');
  const title = choices[idx];
  const id = title.toLowerCase().replace(/\s+/g,'-') + '-' + Math.random().toString(36).slice(2,6);
  DATA.tabs.push({ id, title });
  saveData(DATA);
  // create section
  const sec = document.createElement('section');
  sec.id = id;
  sec.className = 'page hidden';
  sec.innerHTML = `<div class="panel bg-gradient-to-b from-[#1e1f21] to-[#242526] rounded-xl p-4 border border-white/5 shadow-lg"><h3 class="font-semibold text-lg">${title}</h3><div class="mt-4 text-white/60">Blank page for ${title}.</div></div>`;
  document.querySelector('main').appendChild(sec);
  renderTopTabs();
  showPage(id);
});

// ------------- sidebar navigation -------------
sideBtns.forEach(b => b.addEventListener('click', ()=> showPage(b.dataset.page)));

function showPage(id){
  $$('.page').forEach(p => p.classList.add('hidden'));
  const el = document.getElementById(id);
  if(el) el.classList.remove('hidden');

  // highlight side buttons
  $$('.side-btn').forEach(b => b.classList.toggle('bg-white/3', b.dataset.page === id));
  // highlight top tab if matching
  $$('.tab').forEach(t => t.classList.toggle('border-b-4 border-[#1fa3ff]', t.dataset.id === id));
  // chat & announce only on home — they are inside the home section so fine
}

// ------------- chat & announcements -------------
function renderChats(){
  chatList.innerHTML = '';
  (DATA.chats || []).forEach(c => {
    const el = document.createElement('div');
    el.className = 'flex gap-3 items-start';
    el.innerHTML = `<div class="w-10 h-10 bg-white/10 rounded-full"></div>
      <div class="flex-1"><div class="text-sm font-semibold">${escape(c.username)} <span class="text-xs text-white/60 ml-2">${new Date(c.ts).toLocaleTimeString()}</span></div><div class="text-sm text-white/80">${escape(c.text)}</div></div>`;
    chatList.appendChild(el);
  });
}
chatSend.addEventListener('click', ()=>{
  const t = chatInput.value.trim();
  if(!t) return;
  if(!CURRENT_USER) return alert('Enter your name first');
  DATA.chats.push({ id: uid(), username: CURRENT_USER, text: t, ts: Date.now() });
  saveData(DATA);
  chatInput.value = '';
  renderChats();
});

function renderAnnouncements(){
  announceList.innerHTML = '';
  (DATA.announcements || []).forEach(a => {
    const el = document.createElement('div');
    el.className = 'p-3 bg-white/2 rounded-md';
    el.innerHTML = `<div class="text-sm font-semibold">${escape(a.username)} <span class="text-xs text-white/60 ml-2">${new Date(a.ts).toLocaleTimeString()}</span></div><div class="text-sm text-white/80">${escape(a.text)}</div>`;
    announceList.appendChild(el);
  });
}
announceSend.addEventListener('click', ()=>{
  const t = announceInput.value.trim();
  if(!t) return;
  if(!CURRENT_USER) return alert('Enter your name first');
  DATA.announcements.unshift({ id: uid(), username: CURRENT_USER, text: t, ts: Date.now() });
  saveData(DATA);
  announceInput.value = '';
  renderAnnouncements();
});

// ------------- Scene & Transport -------------
function renderScene(){
  sceneList.innerHTML = '';
  (DATA.sceneReports || []).forEach(s => {
    const el = document.createElement('div');
    el.className = 'p-2 bg-white/2 rounded-md';
    el.textContent = `${s.title} — ${s.details || ''}`;
    sceneList.appendChild(el);
  });
}
$('#sceneAdd').addEventListener('click', ()=>{
  if(!CURRENT_USER) return alert('Enter your name first');
  const t = prompt('Scene title');
  if(!t) return;
  const d = prompt('Details (optional)') || '';
  DATA.sceneReports.unshift({ id: uid(), title: t, details: d, username: CURRENT_USER, ts: Date.now() });
  saveData(DATA);
  renderScene();
});

function renderTransport(){
  transportList.innerHTML = '';
  (DATA.transportLogs || []).forEach(s => {
    const el = document.createElement('div');
    el.className = 'p-2 bg-white/2 rounded-md';
    el.textContent = `${s.title} — ${s.details || ''}`;
    transportList.appendChild(el);
  });
}
$('#transportAdd').addEventListener('click', ()=>{
  if(!CURRENT_USER) return alert('Enter your name first');
  const t = prompt('Transport title');
  if(!t) return;
  const d = prompt('Details (optional)') || '';
  DATA.transportLogs.unshift({ id: uid(), title: t, details: d, username: CURRENT_USER, ts: Date.now() });
  saveData(DATA);
  renderTransport();
});

// ------------- Paramedics panel (duty only) -------------
function renderParamedics(){
  paramedicsList.innerHTML = '';
  (DATA.users || []).forEach(u => {
    const outer = document.createElement('div');
    // decide color classes by status
    let bg = 'bg-white/3 text-white';
    let pill = 'bg-green-600';
    if(u.status === 'on'){ bg = 'bg-green-700/10'; pill = 'bg-green-600'; }
    if(u.status === 'busy'){ bg = 'bg-orange-700/10'; pill = 'bg-orange-500'; }
    if(u.status === 'off'){ bg = 'bg-red-700/10'; pill = 'bg-red-500'; }

    outer.innerHTML = `
      <div class="paramedic-card ${bg} p-3">
        <div class="flex-shrink-0">
          <div class="w-10 h-10 rounded-full bg-white/10"></div>
        </div>
        <div class="flex-1">
          <div class="font-semibold">${escape(u.username)}</div>
          <div class="mt-1"><span class="status-pill ${pill}">${u.status === 'on' ? '• On Duty' : u.status === 'busy' ? '• Busy' : '• Off Duty'}</span></div>
        </div>
      </div>
    `;
    // click to open small editor to change their duty (visual only)
    outer.firstElementChild.addEventListener('click', ()=> openUserDutyEditor(u.id));
    paramedicsList.appendChild(outer);
  });
}

function openUserDutyEditor(userId){
  const u = DATA.users.find(x => x.id === userId);
  if(!u) return;
  const ans = prompt(`Set duty for ${u.username}\n1. On Duty\n2. Busy\n3. Off Duty\n(enter 1/2/3)`);
  if(!ans) return;
  const idx = parseInt(ans,10);
  if(idx === 1) u.status = 'on';
  else if(idx === 2) u.status = 'busy';
  else if(idx === 3) u.status = 'off';
  saveData(DATA);
  renderParamedics();
}

// small duty buttons change your own status
setOnDuty.addEventListener('click', ()=> setMyStatus('on'));
setBusy.addEventListener('click', ()=> setMyStatus('busy'));
setOffDuty.addEventListener('click', ()=> setMyStatus('off'));

function setMyStatus(s){
  if(!CURRENT_USER) return alert('Enter your name first');
  let u = DATA.users.find(x => x.username === CURRENT_USER);
  if(!u){
    u = { id: uid(), username: CURRENT_USER, status: s };
    DATA.users.push(u);
  } else {
    u.status = s;
  }
  saveData(DATA);
  renderParamedics();
}

// ------------- chatter & theme -------------
let chatterOn = false;
toggleChatter && toggleChatter.addEventListener('click', ()=>{
  chatterOn = !chatterOn;
  toggleChatter.textContent = chatterOn ? 'Turn Off' : 'Turn On';
  if(chatterOn){ try { chatterAudio.volume = parseFloat(chatterVol ? chatterVol.value : 0.5); chatterAudio.play(); } catch(e){} }
  else { chatterAudio.pause(); chatterAudio.currentTime = 0; }
});
if(chatterVol) chatterVol.addEventListener('input', ()=> { if(chatterAudio) chatterAudio.volume = parseFloat(chatterVol.value); });

toggleTheme && toggleTheme.addEventListener('click', ()=> {
  document.body.classList.toggle('bg-white'); // minimal visual toggle if you prefer to tweak
});

// ------------- Admin placeholder (visual only) -------------
$('#admin').addEventListener('click', ()=> {
  // simply show the admin page — no password required in this visual-only version
  showPage('admin');
});

// ------------- helpers & boot -------------
function renderAll(){
  renderChats();
  renderAnnouncements();
  renderParamedics();
  renderScene();
  renderTransport();
}

function ensurePagesForTabs(){
  (DATA.tabs || []).forEach(t => {
    if(t.id === 'home') return;
    if(!document.getElementById(t.id)){
      const sec = document.createElement('section');
      sec.id = t.id;
      sec.className = 'page hidden';
      sec.innerHTML = `<div class="panel bg-gradient-to-b from-[#1e1f21] to-[#242526] rounded-xl p-4 border border-white/5 shadow-lg"><h3 class="font-semibold text-lg">${t.title}</h3><div class="mt-4 text-white/60">Blank page for ${t.title}.</div></div>`;
      document.querySelector('main').appendChild(sec);
    }
  });
}

function wireEvents(){
  // create default home visible
  showPage('home');

  // restore CURRENT_USER if session exists
  if(sessionStorage.getItem('paramedic_user')) {
    CURRENT_USER = sessionStorage.getItem('paramedic_user');
    renderCurrentUser();
  }

  // top tab clicks wired in renderTopTabs -> showPage
}

function escape(s){ return s ? String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])) : ''; }

init();
