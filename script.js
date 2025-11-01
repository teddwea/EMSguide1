// script.js - updated with admin delete panels for chat, announcements, scene, and transport

const STORAGE_KEY = 'paramedicData_v1';
const SESSION_ADMIN_KEY = 'paramedicIsAdmin';
const SESSION_USER_KEY = 'paramedicCurrentUser';

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = {
      users: [
        {
          id: uid(),
          username: 'Admin',
          password: 'teddwaparamedic',
          role: 'admin'
        }
      ],
      chats: [],
      announcements: [],
      sceneReports: [],
      transportLogs: [],
      tabs: [{ id: 'home', title: 'Home' }]
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('loadData parse', e);
    return null;
  }
}

function saveData(d) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

function uid() {
  return 'id-' + Math.random().toString(36).slice(2, 10);
}

let DATA = loadData();
let CURRENT_USER = sessionStorage.getItem(SESSION_USER_KEY) || null;
let IS_ADMIN = sessionStorage.getItem(SESSION_ADMIN_KEY) === 'true';

// elements
const nameOverlay = document.getElementById('nameOverlay');
const enterName = document.getElementById('enterName');
const enterNameBtn = document.getElementById('enterNameBtn');
const currentUserDiv = document.getElementById('currentUser');
const userNameDom = document.getElementById('userName');
const userMetaDom = document.getElementById('userMeta');
const logoutBtn = document.getElementById('logoutBtn');

const topTabsDom = document.getElementById('topTabs');
const addTabBtn = document.getElementById('addTabBtn');

const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');
const chatList = document.getElementById('chatList');

const announceInput = document.getElementById('announceInput');
const announceSend = document.getElementById('announceSend');
const announceList = document.getElementById('announceList');

const sceneList = document.getElementById('sceneList');
const scenePageList = document.getElementById('scenePageList');
const sceneAdd = document.getElementById('sceneAdd');

const transportList = document.getElementById('transportList');
const transportPageList = document.getElementById('transportPageList');
const transportAdd = document.getElementById('transportAdd');

const adminLockedNotice = document.getElementById('adminLockedNotice');
const adminContent = document.getElementById('adminContent');
const userListDom = document.getElementById('userList');
const createUserBtn = document.getElementById('createUserBtn');
const newUserName = document.getElementById('newUserName');
const userMsg = document.getElementById('userMsg');

let adminDataPanelsAdded = false;

const adminPassModal = document.getElementById('adminPassModal');
const adminPassInput = document.getElementById('adminPassInput');
const adminPassOk = document.getElementById('adminPassOk');
const adminPassCancel = document.getElementById('adminPassCancel');
const adminPassMsg = document.getElementById('adminPassMsg');

function init() {
  if (CURRENT_USER) hideNameOverlay();
  else showNameOverlay();
  renderCurrentUser();
  renderTopTabs();
  renderAllContent();
  updateAdminUI();
}

function showNameOverlay() {
  nameOverlay.style.display = 'flex';
  enterName.focus();
}
function hideNameOverlay() {
  nameOverlay.style.display = 'none';
}

enterNameBtn.addEventListener('click', submitName);
enterName.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitName();
});
function submitName() {
  const val = enterName.value.trim();
  if (!val) return;
  CURRENT_USER = val;
  sessionStorage.setItem(SESSION_USER_KEY, CURRENT_USER);
  hideNameOverlay();
  renderCurrentUser();
}

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_USER_KEY);
  sessionStorage.removeItem(SESSION_ADMIN_KEY);
  CURRENT_USER = null;
  IS_ADMIN = false;
  showNameOverlay();
  updateAdminUI();
  renderCurrentUser();
});

function renderCurrentUser() {
  if (CURRENT_USER) {
    currentUserDiv.style.display = 'flex';
    userNameDom.textContent = CURRENT_USER;
    userMetaDom.textContent = IS_ADMIN ? 'Admin (session)' : '';
  } else {
    currentUserDiv.style.display = 'none';
  }
}

function renderTopTabs() {
  topTabsDom.innerHTML = '';
  (DATA.tabs || []).forEach((tab) => {
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.dataset.id = tab.id;
    btn.textContent = tab.title;
    if (tab.id === 'home') btn.classList.add('active');
    btn.addEventListener('click', () => showPage(tab.id));
    if (tab.id !== 'home') {
      const del = document.createElement('span');
      del.textContent = ' ✕';
      del.style.marginLeft = '8px';
      del.style.opacity = '0.6';
      del.style.cursor = 'pointer';
      del.addEventListener('click', (ev) => {
        ev.stopPropagation();
        DATA.tabs = DATA.tabs.filter((t) => t.id !== tab.id);
        saveData(DATA);
        const el = document.getElementById(tab.id);
        if (el) el.remove();
        renderTopTabs();
        showPage('home');
      });
      btn.appendChild(del);
    }
    topTabsDom.appendChild(btn);
  });
}

function showPage(id) {
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');

  document.querySelectorAll('.side-btn').forEach((b) =>
    b.classList.toggle('active', b.dataset.page === id)
  );
  document.querySelectorAll('.top-tabs .tab').forEach((t) =>
    t.classList.toggle('active', t.dataset.id === id)
  );

  const chatPanel = document.querySelector('.chat-panel');
  const announcePanel = document.querySelector('.announce-panel');
  const sceneCard = document.getElementById('scene-card');
  const transportCard = document.getElementById('transport-card');

  if (id !== 'home') {
    chatPanel?.classList.add('hidden');
    announcePanel?.classList.add('hidden');
    sceneCard?.classList.add('hidden');
    transportCard?.classList.add('hidden');
  } else {
    chatPanel?.classList.remove('hidden');
    announcePanel?.classList.remove('hidden');
    sceneCard?.classList.remove('hidden');
    transportCard?.classList.remove('hidden');
  }

  if (id === 'admin' && !IS_ADMIN) openAdminPasswordPrompt();
}

// CHAT
function renderChats() {
  chatList.innerHTML = '';
  (DATA.chats || []).forEach((c) => {
    const m = document.createElement('div');
    m.className = 'message';
    m.innerHTML = `<div class="avatar-sm"></div>
      <div class="msg-body">
        <div class="msg-head"><strong>${escapeHtml(c.username)}</strong> <span class="meta">${new Date(
      c.ts
    ).toLocaleString()}</span></div>
        <div class="msg-text">${escapeHtml(c.text)}</div>
      </div>`;
    chatList.appendChild(m);
  });
}
chatSend.addEventListener('click', () => {
  const txt = chatInput.value.trim();
  if (!txt || !CURRENT_USER) return;
  const item = { id: uid(), username: CURRENT_USER, text: txt, ts: Date.now() };
  DATA.chats.push(item);
  saveData(DATA);
  chatInput.value = '';
  renderChats();
});

// ANNOUNCEMENTS
function renderAnnouncements() {
  announceList.innerHTML = '';
  (DATA.announcements || []).forEach((a) => {
    const card = document.createElement('div');
    card.className = 'announce-card';
    card.innerHTML = `<div class="announce-top"><div class="announce-icons"><span class="pill">!</span></div>
      <div class="announce-user"><strong>${escapeHtml(
        a.username
      )}</strong> <span class="meta">${new Date(a.ts).toLocaleString()}</span></div></div>
      <div class="announce-text"><p>${escapeHtml(a.text)}</p></div>`;
    announceList.appendChild(card);
  });
}
announceSend.addEventListener('click', () => {
  const txt = announceInput.value.trim();
  if (!txt || !CURRENT_USER) return;
  const item = { id: uid(), username: CURRENT_USER, text: txt, ts: Date.now() };
  DATA.announcements.unshift(item);
  saveData(DATA);
  announceInput.value = '';
  renderAnnouncements();
});

// SCENE REPORTS
function renderScene() {
  sceneList.innerHTML = '';
  scenePageList.innerHTML = '';
  (DATA.sceneReports || []).forEach((item) => {
    const li = document.createElement('div');
    li.className = 'list-item';
    li.innerHTML = `<div class="list-left"><div class="badge">RECENT</div><div class="name">${escapeHtml(
      item.title
    )}</div><div class="sub">${escapeHtml(item.details || '')}</div></div>`;
    sceneList.appendChild(li);
    const pageItem = document.createElement('div');
    pageItem.className = 'list-item';
    pageItem.innerHTML = `<div><div class="name">${escapeHtml(
      item.title
    )}</div><div class="sub">${escapeHtml(item.details || '')}</div></div>`;
    scenePageList.appendChild(pageItem);
  });
}
sceneAdd.addEventListener('click', () => {
  if (!CURRENT_USER) return;
  const title = prompt('Scene title');
  if (!title) return;
  const details = prompt('Details (optional)') || '';
  const item = { id: uid(), title, details, username: CURRENT_USER, ts: Date.now() };
  DATA.sceneReports.unshift(item);
  saveData(DATA);
  renderScene();
});

// TRANSPORT LOGS
function renderTransport() {
  transportList.innerHTML = '';
  transportPageList.innerHTML = '';
  (DATA.transportLogs || []).forEach((item) => {
    const li = document.createElement('div');
    li.className = 'list-item';
    li.innerHTML = `<div class="list-left"><div class="badge">RECENT</div><div class="name">${escapeHtml(
      item.title
    )}</div><div class="sub">${escapeHtml(item.details || '')}</div></div>`;
    transportList.appendChild(li);
    const pageItem = document.createElement('div');
    pageItem.className = 'list-item';
    pageItem.innerHTML = `<div><div class="name">${escapeHtml(
      item.title
    )}</div><div class="sub">${escapeHtml(item.details || '')}</div></div>`;
    transportPageList.appendChild(pageItem);
  });
}
transportAdd.addEventListener('click', () => {
  if (!CURRENT_USER) return;
  const title = prompt('Transport title');
  if (!title) return;
  const details = prompt('Details (optional)') || '';
  const item = { id: uid(), title, details, username: CURRENT_USER, ts: Date.now() };
  DATA.transportLogs.unshift(item);
  saveData(DATA);
  renderTransport();
});

// ADMIN
function openAdminPasswordPrompt() {
  adminPassInput.value = '';
  adminPassMsg.textContent = '';
  adminPassModal.style.display = 'flex';
  adminPassInput.focus();
}
adminPassCancel.addEventListener('click', () => {
  adminPassModal.style.display = 'none';
  showPage('home');
});
adminPassOk.addEventListener('click', () => {
  const p = adminPassInput.value || '';
  const adminUser = DATA.users.find((u) => u.role === 'admin' && u.username.toLowerCase() === 'admin');
  const ok = (adminUser && p === adminUser.password) || p === 'teddwaparamedic';
  if (ok) {
    IS_ADMIN = true;
    sessionStorage.setItem(SESSION_ADMIN_KEY, 'true');
    adminPassModal.style.display = 'none';
    updateAdminUI();
    renderCurrentUser();
    showPage('admin');
  } else adminPassMsg.textContent = 'Incorrect password';
});

function updateAdminUI() {
  if (IS_ADMIN) {
    adminLockedNotice.style.display = 'none';
    adminContent.style.display = 'block';
    renderUsers();
    if (!adminDataPanelsAdded) createAdminDataPanels();
  } else {
    adminLockedNotice.style.display = 'block';
    adminLockedNotice.innerText = 'Admin access is locked. Click Admin to enter the password.';
    adminContent.style.display = 'none';
  }
}

function renderUsers() {
  userListDom.innerHTML = '';
  (DATA.users || []).forEach((u) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `<div class="list-left"><div class="name">${escapeHtml(u.username)}</div></div>`;
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      if (!IS_ADMIN) return;
      if (!confirm('Remove ' + u.username + '?')) return;
      DATA.users = DATA.users.filter((x) => x.username !== u.username);
      saveData(DATA);
      renderUsers();
    });
    row.appendChild(removeBtn);
    userListDom.appendChild(row);
  });
}

function createAdminDataPanels() {
  adminDataPanelsAdded = true;
  const container = document.createElement('div');
  container.style.marginTop = '20px';
  container.innerHTML = `
    <h3>Manage Data</h3>
    <div class="panel small"><div class="panel-header">Chat Messages</div><div class="panel-inner" id="adminChatList"></div></div>
    <div class="panel small"><div class="panel-header">Announcements</div><div class="panel-inner" id="adminAnnounceList"></div></div>
    <div class="panel small"><div class="panel-header">Scene Reports</div><div class="panel-inner" id="adminSceneList"></div></div>
    <div class="panel small"><div class="panel-header">Transport Logs</div><div class="panel-inner" id="adminTransportList"></div></div>
  `;
  adminContent.appendChild(container);
  renderAdminDataLists();
}

function renderAdminDataLists() {
  renderAdminChatList();
  renderAdminAnnounceList();
  renderAdminSceneList();
  renderAdminTransportList();
}

function renderAdminChatList() {
  const list = document.getElementById('adminChatList');
  list.innerHTML = '';
  (DATA.chats || []).forEach((c) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `<div><strong>${escapeHtml(c.username)}</strong>: ${escapeHtml(c.text)} <span class="meta">${new Date(c.ts).toLocaleString()}</span></div>`;
    const del = document.createElement('button');
    del.className = 'btn';
    del.textContent = '🗑';
    del.addEventListener('click', () => {
      if (!confirm('Delete this chat?')) return;
      DATA.chats = DATA.chats.filter((x) => x.id !== c.id);
      saveData(DATA);
      renderChats();
      renderAdminChatList();
    });
    row.appendChild(del);
    list.appendChild(row);
  });
}

function renderAdminAnnounceList() {
  const list = document.getElementById('adminAnnounceList');
  list.innerHTML = '';
  (DATA.announcements || []).forEach((a) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `<div><strong>${escapeHtml(a.username)}</strong>: ${escapeHtml(a.text)} <span class="meta">${new Date(a.ts).toLocaleString()}</span></div>`;
    const del = document.createElement('button');
    del.className = 'btn';
    del.textContent = '🗑';
    del.addEventListener('click', () => {
      if (!confirm('Delete this announcement?')) return;
      DATA.announcements = DATA.announcements.filter((x) => x.id !== a.id);
      saveData(DATA);
      renderAnnouncements();
      renderAdminAnnounceList();
    });
    row.appendChild(del);
    list.appendChild(row);
  });
}

function renderAdminSceneList() {
  const list = document.getElementById('adminSceneList');
  list.innerHTML = '';
  (DATA.sceneReports || []).forEach((s) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `<div><strong>${escapeHtml(s.username)}</strong>: ${escapeHtml(s.title)} <span class="meta">${new Date(s.ts).toLocaleString()}</span></div>`;
    const del = document.createElement('button');
    del.className = 'btn';
    del.textContent = '🗑';
    del.addEventListener('click', () => {
      if (!confirm('Delete this scene report?')) return;
      DATA.sceneReports = DATA.sceneReports.filter((x) => x.id !== s.id);
      saveData(DATA);
      renderScene();
      renderAdminSceneList();
    });
    row.appendChild(del);
    list.appendChild(row);
  });
}

function renderAdminTransportList() {
  const list = document.getElementById('adminTransportList');
  list.innerHTML = '';
  (DATA.transportLogs || []).forEach((t) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `<div><strong>${escapeHtml(t.username)}</strong>: ${escapeHtml(t.title)} <span class="meta">${new Date(t.ts).toLocaleString()}</span></div>`;
    const del = document.createElement('button');
    del.className = 'btn';
    del.textContent = '🗑';
    del.addEventListener('click', () => {
      if (!confirm('Delete this transport log?')) return;
      DATA.transportLogs = DATA.transportLogs.filter((x) => x.id !== t.id);
      saveData(DATA);
      renderTransport();
      renderAdminTransportList();
    });
    row.appendChild(del);
    list.appendChild(row);
  });
}

// RENDER ALL
function renderAllContent() {
  renderChats();
  renderAnnouncements();
  renderScene();
  renderTransport();
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

document.querySelectorAll('.side-btn').forEach((b) => {
  b.addEventListener('click', () => showPage(b.dataset.page));
});

addTabBtn.addEventListener('click', () => {
  const name = prompt('New tab name');
  if (!name) return;
  const id = uid();
  DATA.tabs.push({ id, title: name });
  saveData(DATA);
  const pg = document.createElement('div');
  pg.className = 'page';
  pg.id = id;
  pg.innerHTML = `<div class="panel"><div class="panel-header">${escapeHtml(
    name
  )}</div><div class="panel-inner"><p>New tab content here.</p></div></div>`;
  document.querySelector('.main').appendChild(pg);
  renderTopTabs();
  showPage(id);
});

init();