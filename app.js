import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ===== Firebase 設定 =====
const firebaseConfig = {
  apiKey: "AIzaSyBtcxWhxaJb7XF02oCCfR8rONeQoj8tsK8",
  authDomain: "my-budget-app-c7f36.firebaseapp.com",
  projectId: "my-budget-app-c7f36",
  storageBucket: "my-budget-app-c7f36.firebasestorage.app",
  messagingSenderId: "319063435763",
  appId: "1:319063435763:web:269517918494067a39ca86"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ===== 記帳類別 =====
const CATEGORIES = {
  expense: [
    { id: 'food',      emoji: '🍜', name: '餐飲' },
    { id: 'shop',      emoji: '🛍️', name: '購物' },
    { id: 'transport', emoji: '🚌', name: '交通' },
    { id: 'entertain', emoji: '🎮', name: '娛樂' },
    { id: 'beauty',    emoji: '💄', name: '美妝' },
    { id: 'health',    emoji: '💊', name: '醫療' },
    { id: 'home',      emoji: '🏠', name: '居家' },
    { id: 'other_exp', emoji: '📦', name: '其他' },
  ],
  income: [
    { id: 'salary',    emoji: '💼', name: '薪水' },
    { id: 'bonus',     emoji: '🎁', name: '獎金' },
    { id: 'invest',    emoji: '📈', name: '投資' },
    { id: 'gift',      emoji: '🧧', name: '紅包' },
    { id: 'freelance', emoji: '💻', name: '接案' },
    { id: 'other_inc', emoji: '✨', name: '其他' },
  ],
};

// ===== 帳戶類型 =====
const ACCOUNT_TYPES = [
  { id: 'bank',     emoji: '🏦', name: '銀行' },
  { id: 'cash',     emoji: '💵', name: '現金' },
  { id: 'credit',   emoji: '💳', name: '信用卡' },
  { id: 'stock',    emoji: '📈', name: '證券' },
  { id: 'saving',   emoji: '🐖', name: '存款' },
  { id: 'other',    emoji: '📂', name: '其他' },
];

// ===== 狀態 =====
let currentUser         = null;
let currentType         = 'expense';
let selectedCategory    = null;
let selectedAccountType = null;
let viewYear  = new Date().getFullYear();
let viewMonth = new Date().getMonth();
let unsubRecords   = null;
let unsubAccounts  = null;
let allRecords  = [];
let allAccounts = [];
let currentPage = 'home';
let detailAccountId  = null;   // 目前查看明細的帳戶 ID
let detailMode       = 'month'; // 'month' | 'range' | 'all'
let detailViewYear   = new Date().getFullYear();
let detailViewMonth  = new Date().getMonth();
let detailRangeStart = '';
let detailRangeEnd   = '';

// ===== DOM — 通用 =====
const loginScreen    = document.getElementById('loginScreen');
const appScreen      = document.getElementById('appScreen');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn      = document.getElementById('logoutBtn');
const userAvatar     = document.getElementById('userAvatar');
const pageTitle      = document.getElementById('pageTitle');
const pageHome       = document.getElementById('pageHome');
const pageAccounts   = document.getElementById('pageAccounts');
const navHome        = document.getElementById('navHome');
const navAccountsBtn = document.getElementById('navAccounts');

// ===== DOM — 記帳 =====
const modalOverlay  = document.getElementById('modalOverlay');
const openFormBtn   = document.getElementById('openFormBtn');
const closeFormBtn  = document.getElementById('closeFormBtn');
const recordForm    = document.getElementById('recordForm');
const btnExpense    = document.getElementById('btnExpense');
const btnIncome     = document.getElementById('btnIncome');
const categoryGrid  = document.getElementById('categoryGrid');
const amountInput   = document.getElementById('amount');
const dateInput     = document.getElementById('date');
const noteInput     = document.getElementById('note');
const submitBtn     = document.getElementById('submitBtn');
const accountSelect = document.getElementById('accountSelect');
const recordList    = document.getElementById('recordList');
const emptyState    = document.getElementById('emptyState');
const totalIncome   = document.getElementById('totalIncome');
const totalExpense  = document.getElementById('totalExpense');
const totalBalance  = document.getElementById('totalBalance');
const currentMonthLabel = document.getElementById('currentMonthLabel');
const prevMonthBtn  = document.getElementById('prevMonth');
const nextMonthBtn  = document.getElementById('nextMonth');

// ===== DOM — 帳戶 =====
const accountModalOverlay  = document.getElementById('accountModalOverlay');
const openAccountFormBtn   = document.getElementById('openAccountFormBtn');
const closeAccountFormBtn  = document.getElementById('closeAccountFormBtn');
const accountForm          = document.getElementById('accountForm');
const accountTypeGrid      = document.getElementById('accountTypeGrid');
const accountNameInput     = document.getElementById('accountName');
const accountBalanceInput  = document.getElementById('accountBalance');
const accountNoteInput     = document.getElementById('accountNote');
const accountSubmitBtn     = document.getElementById('accountSubmitBtn');
const accountEditId        = document.getElementById('accountEditId');
const accountModalTitle    = document.getElementById('accountModalTitle');
const accountList          = document.getElementById('accountList');
const accountEmptyState    = document.getElementById('accountEmptyState');
const accountsNetWorth      = document.getElementById('accountsNetWorth');
const accountsTotalAsset    = document.getElementById('accountsTotalAsset');
const accountsTotalLiability = document.getElementById('accountsTotalLiability');

// ===== DOM — 帳戶明細 =====
const pageAccountDetail  = document.getElementById('pageAccountDetail');
const backToAccountsBtn  = document.getElementById('backToAccountsBtn');
const detailIcon         = document.getElementById('detailIcon');
const detailName         = document.getElementById('detailName');
const detailType         = document.getElementById('detailType');

const detailIncome       = document.getElementById('detailIncome');
const detailExpense      = document.getElementById('detailExpense');
const detailBalance      = document.getElementById('detailBalance');
const accountDetailList  = document.getElementById('accountDetailList');
const accountDetailEmpty = document.getElementById('accountDetailEmpty');
const detailListTitle    = document.getElementById('detailListTitle');
const detailModeMonth    = document.getElementById('detailModeMonth');
const detailModeRange    = document.getElementById('detailModeRange');
const detailModeAll      = document.getElementById('detailModeAll');
const detailMonthNav     = document.getElementById('detailMonthNav');
const detailRangeNav     = document.getElementById('detailRangeNav');
const detailMonthLabel   = document.getElementById('detailMonthLabel');
const detailPrevMonth    = document.getElementById('detailPrevMonth');
const detailNextMonth    = document.getElementById('detailNextMonth');
const detailRangeStartEl = document.getElementById('detailRangeStart');
const detailRangeEndEl   = document.getElementById('detailRangeEnd');

// ===== 認證 =====
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    showApp(user);
    subscribeRecords();
    subscribeAccounts();
  } else {
    currentUser = null;
    showLogin();
    if (unsubRecords)  { unsubRecords();  unsubRecords  = null; }
    if (unsubAccounts) { unsubAccounts(); unsubAccounts = null; }
    allRecords  = [];
    allAccounts = [];
  }
});

googleLoginBtn.addEventListener('click', async () => {
  try {
    googleLoginBtn.disabled = true;
    googleLoginBtn.textContent = '登入中...';
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (err) {
    console.error(err);
    googleLoginBtn.disabled = false;
    googleLoginBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>使用 Google 帳號登入`;
  }
});

logoutBtn.addEventListener('click', async () => {
  if (confirm('確定要登出嗎？')) await signOut(auth);
});

function showLogin() {
  loginScreen.style.display = 'flex';
  appScreen.style.display   = 'none';
}

function showApp(user) {
  loginScreen.style.display = 'none';
  appScreen.style.display   = 'block';
  if (user.photoURL) {
    userAvatar.src = user.photoURL;
    userAvatar.classList.add('visible');
  }
}

// ===== 頁面切換 =====
navHome.addEventListener('click', () => switchPage('home'));
navAccountsBtn.addEventListener('click', () => switchPage('accounts'));
backToAccountsBtn.addEventListener('click', () => switchPage('accounts'));

function switchPage(page) {
  currentPage = page;
  pageHome.style.display          = page === 'home'          ? 'block' : 'none';
  pageAccounts.style.display      = page === 'accounts'      ? 'block' : 'none';
  pageAccountDetail.style.display = page === 'accountDetail' ? 'block' : 'none';
  navHome.classList.toggle('active',        page === 'home');
  navAccountsBtn.classList.toggle('active', page === 'accounts' || page === 'accountDetail');
  if (page === 'home')          pageTitle.textContent = '我的記帳本';
  if (page === 'accounts')      pageTitle.textContent = '帳戶管理';
  if (page === 'accountDetail') pageTitle.textContent = '帳戶明細';
}

// ===== 帳戶明細 =====
function openAccountDetail(account) {
  detailAccountId   = account.docId;
  detailMode        = 'month';
  detailViewYear    = new Date().getFullYear();
  detailViewMonth   = new Date().getMonth();
  detailIcon.textContent = account.emoji;
  detailName.textContent = account.name;
  detailType.textContent = account.typeName;
  syncDetailModeUI();
  renderAccountDetail(account);
  switchPage('accountDetail');
}

// 切換模式 UI
function syncDetailModeUI() {
  detailModeMonth.classList.toggle('active', detailMode === 'month');
  detailModeRange.classList.toggle('active', detailMode === 'range');
  detailModeAll.classList.toggle('active',   detailMode === 'all');
  detailMonthNav.style.display  = detailMode === 'month' ? 'flex'  : 'none';
  detailRangeNav.style.display  = detailMode === 'range' ? 'flex'  : 'none';
}

// 取得篩選後的記錄
function getDetailFilteredRecords(accountDocId) {
  const all = allRecords.filter(r => r.accountId === accountDocId);
  if (detailMode === 'all') return all;
  if (detailMode === 'month') {
    const ym = `${detailViewYear}-${String(detailViewMonth + 1).padStart(2, '0')}`;
    return all.filter(r => r.date && r.date.startsWith(ym));
  }
  if (detailMode === 'range') {
    const s = detailRangeStart;
    const e = detailRangeEnd;
    return all.filter(r => {
      if (s && r.date < s) return false;
      if (e && r.date > e) return false;
      return true;
    });
  }
  return all;
}

function renderAccountDetail(account) {
  // 目前餘額永遠用全部記錄計算
  const allRecs  = allRecords.filter(r => r.accountId === account.docId);
  const allInc   = allRecs.filter(r => r.type === 'income').reduce((s, r)  => s + r.amount, 0);
  const allExp   = allRecs.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const initBal  = account.balance || 0;
  const curBal   = initBal + allInc - allExp;

  detailBalance.textContent = curBal < 0 ? `-$${formatMoney(Math.abs(curBal))}` : `$${formatMoney(curBal)}`;
  detailBalance.style.color     = curBal >= 0 ? 'white' : '#ffb3b3';

  // 期間收入/支出用篩選後的記錄
  const filtered = getDetailFilteredRecords(account.docId);
  const incTotal = filtered.filter(r => r.type === 'income').reduce((s, r)  => s + r.amount, 0);
  const expTotal = filtered.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  detailIncome.textContent  = `+$${formatMoney(incTotal)}`;
  detailExpense.textContent = `-$${formatMoney(expTotal)}`;

  // 更新列表標題
  if (detailMode === 'month') {
    detailMonthLabel.textContent = `${detailViewYear}年${detailViewMonth + 1}月`;
    detailListTitle.textContent  = `${detailViewMonth + 1}月明細`;
  } else if (detailMode === 'range') {
    detailListTitle.textContent = '自訂範圍明細';
  } else {
    detailListTitle.textContent = '全部明細';
  }

  // 渲染明細列表
  while (accountDetailList.firstChild) accountDetailList.removeChild(accountDetailList.firstChild);

  if (filtered.length === 0) {
    accountDetailList.appendChild(accountDetailEmpty);
    accountDetailEmpty.style.display = '';
    return;
  }
  accountDetailEmpty.style.display = 'none';

  const groups = {};
  [...filtered].sort((a, b) => b.date.localeCompare(a.date)).forEach(r => {
    if (!groups[r.date]) groups[r.date] = [];
    groups[r.date].push(r);
  });

  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
    const header = document.createElement('div');
    header.className = 'date-group-header';
    header.textContent = formatDateDisplay(date);
    accountDetailList.appendChild(header);

    groups[date].forEach(r => {
      const item = document.createElement('div');
      item.className = 'record-item';
      item.innerHTML = `
        <div class="record-cat-icon ${r.type}-icon">${r.categoryEmoji}</div>
        <div class="record-info">
          <div class="record-cat-name">${r.categoryName}</div>
          <div class="record-meta">${r.note || '無備註'}</div>
        </div>
        <div class="record-right">
          <span class="record-amount ${r.type}">${r.type === 'income' ? '+' : '-'}$${formatMoney(r.amount)}</span>
          <button class="delete-btn" title="刪除">🗑</button>
        </div>
      `;
      item.querySelector('.delete-btn').addEventListener('click', () => {
        if (confirm('確定要刪除這筆記錄嗎？')) deleteRecord(r.docId);
      });
      accountDetailList.appendChild(item);
    });
  });
}

// ===== 帳戶明細頁事件 =====
detailModeMonth.addEventListener('click', () => {
  detailMode = 'month';
  syncDetailModeUI();
  const acc = allAccounts.find(a => a.docId === detailAccountId);
  if (acc) renderAccountDetail(acc);
});

detailModeRange.addEventListener('click', () => {
  detailMode = 'range';
  // 預設今天往前一個月
  const today = new Date();
  const monthAgo = new Date(today);
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  if (!detailRangeStart) {
    detailRangeStartEl.value = formatDate(monthAgo);
    detailRangeStart = detailRangeStartEl.value;
  }
  if (!detailRangeEnd) {
    detailRangeEndEl.value = formatDate(today);
    detailRangeEnd = detailRangeEndEl.value;
  }
  syncDetailModeUI();
  const acc = allAccounts.find(a => a.docId === detailAccountId);
  if (acc) renderAccountDetail(acc);
});

detailModeAll.addEventListener('click', () => {
  detailMode = 'all';
  syncDetailModeUI();
  const acc = allAccounts.find(a => a.docId === detailAccountId);
  if (acc) renderAccountDetail(acc);
});

detailPrevMonth.addEventListener('click', () => {
  detailViewMonth--;
  if (detailViewMonth < 0) { detailViewMonth = 11; detailViewYear--; }
  const acc = allAccounts.find(a => a.docId === detailAccountId);
  if (acc) renderAccountDetail(acc);
});

detailNextMonth.addEventListener('click', () => {
  detailViewMonth++;
  if (detailViewMonth > 11) { detailViewMonth = 0; detailViewYear++; }
  const acc = allAccounts.find(a => a.docId === detailAccountId);
  if (acc) renderAccountDetail(acc);
});

detailRangeStartEl.addEventListener('change', () => {
  detailRangeStart = detailRangeStartEl.value;
  const acc = allAccounts.find(a => a.docId === detailAccountId);
  if (acc) renderAccountDetail(acc);
});

detailRangeEndEl.addEventListener('change', () => {
  detailRangeEnd = detailRangeEndEl.value;
  const acc = allAccounts.find(a => a.docId === detailAccountId);
  if (acc) renderAccountDetail(acc);
});

// ===== Firestore 監聽 — 記帳 =====
function subscribeRecords() {
  if (unsubRecords) unsubRecords();
  const q = query(
    collection(db, 'records'),
    where('uid', '==', currentUser.uid),
    orderBy('date', 'desc'),
    orderBy('createdAt', 'desc')
  );
  unsubRecords = onSnapshot(q, (snap) => {
    allRecords = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    renderAll();
    renderAccountList();
    // 若目前在帳戶明細頁，即時更新
    if (currentPage === 'accountDetail' && detailAccountId) {
      const acc = allAccounts.find(a => a.docId === detailAccountId);
      if (acc) renderAccountDetail(acc);
    }
  }, console.error);
}

// ===== Firestore 監聽 — 帳戶 =====
function subscribeAccounts() {
  if (unsubAccounts) unsubAccounts();
  const q = query(
    collection(db, 'accounts'),
    where('uid', '==', currentUser.uid),
    orderBy('createdAt', 'asc')
  );
  unsubAccounts = onSnapshot(q, (snap) => {
    allAccounts = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    renderAccountList();
    renderAccountSelect();
    // 若目前在帳戶明細頁，即時更新
    if (currentPage === 'accountDetail' && detailAccountId) {
      const acc = allAccounts.find(a => a.docId === detailAccountId);
      if (acc) renderAccountDetail(acc);
    }
  }, console.error);
}

// ===== 月份切換 =====
prevMonthBtn.addEventListener('click', () => changeMonth(-1));
nextMonthBtn.addEventListener('click', () => changeMonth(1));

function changeMonth(delta) {
  viewMonth += delta;
  if (viewMonth > 11) { viewMonth = 0;  viewYear++; }
  if (viewMonth < 0)  { viewMonth = 11; viewYear--; }
  renderAll();
}

// ===== 記帳彈窗 =====
openFormBtn.addEventListener('click', openModal);
closeFormBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

function openModal() {
  modalOverlay.classList.add('active');
  setTimeout(() => amountInput.focus(), 300);
}
function closeModal() {
  modalOverlay.classList.remove('active');
}

// ===== 切換收入/支出 =====
btnExpense.addEventListener('click', () => switchType('expense'));
btnIncome.addEventListener('click',  () => switchType('income'));

function switchType(type) {
  currentType = type;
  selectedCategory = null;
  btnExpense.classList.toggle('active', type === 'expense');
  btnIncome.classList.toggle('active',  type === 'income');
  renderCategoryGrid();
}

function renderCategoryGrid() {
  categoryGrid.innerHTML = '';
  CATEGORIES[currentType].forEach(cat => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'cat-item' + (selectedCategory === cat.id ? ' selected' : '');
    item.innerHTML = `<span class="cat-emoji">${cat.emoji}</span><span>${cat.name}</span>`;
    item.addEventListener('click', () => { selectedCategory = cat.id; renderCategoryGrid(); });
    categoryGrid.appendChild(item);
  });
}

// ===== 帳戶下拉選單（記帳表單用）=====
function renderAccountSelect() {
  const prev = accountSelect.value;
  accountSelect.innerHTML = '<option value="">— 不指定帳戶 —</option>';
  allAccounts.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.docId;
    opt.textContent = `${a.emoji} ${a.name}`;
    accountSelect.appendChild(opt);
  });
  if (prev) accountSelect.value = prev;
}

// ===== 日期 =====
function setDefaultDate() {
  dateInput.value = formatDate(new Date());
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateDisplay(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}月${parseInt(d)}日`;
}

// ===== 提交記帳 =====
recordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const amount = parseFloat(amountInput.value);
  if (!amount || amount <= 0) { shakeEl(amountInput.parentElement); return; }
  if (!selectedCategory)      { shakeEl(categoryGrid); return; }

  const cat = CATEGORIES[currentType].find(c => c.id === selectedCategory);
  const selAccId = accountSelect.value;
  const selAcc   = allAccounts.find(a => a.docId === selAccId);

  submitBtn.disabled = true;
  submitBtn.textContent = '儲存中...';
  try {
    await addDoc(collection(db, 'records'), {
      uid:           currentUser.uid,
      type:          currentType,
      amount,
      categoryId:    selectedCategory,
      categoryName:  cat.name,
      categoryEmoji: cat.emoji,
      accountId:     selAccId || null,
      accountName:   selAcc ? selAcc.name : null,
      date:          dateInput.value,
      note:          noteInput.value.trim(),
      createdAt:     serverTimestamp(),
    });
    resetForm();
    closeModal();
  } catch (err) {
    console.error(err);
    alert('儲存失敗，請確認網路連線');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '記下來！';
  }
});

function resetForm() {
  amountInput.value = '';
  noteInput.value   = '';
  accountSelect.value = '';
  selectedCategory  = null;
  currentType       = 'expense';
  btnExpense.classList.add('active');
  btnIncome.classList.remove('active');
  setDefaultDate();
  renderCategoryGrid();
}

async function deleteRecord(docId) {
  try {
    await deleteDoc(doc(db, 'records', docId));
  } catch (err) { console.error(err); alert('刪除失敗'); }
}

// ===== 帳戶彈窗 =====
openAccountFormBtn.addEventListener('click', () => openAccountModal());
closeAccountFormBtn.addEventListener('click', closeAccountModal);
accountModalOverlay.addEventListener('click', (e) => {
  if (e.target === accountModalOverlay) closeAccountModal();
});

function openAccountModal(account = null) {
  accountEditId.value = account ? account.docId : '';
  accountModalTitle.textContent = account ? '編輯帳戶' : '新增帳戶';
  accountNameInput.value    = account ? account.name    : '';
  accountBalanceInput.value = account ? account.balance : '';
  accountNoteInput.value    = account ? account.note    : '';
  selectedAccountType       = account ? account.typeId  : null;
  renderAccountTypeGrid();
  accountModalOverlay.classList.add('active');
  setTimeout(() => accountNameInput.focus(), 300);
}

function closeAccountModal() {
  accountModalOverlay.classList.remove('active');
  selectedAccountType = null;
}

// ===== 帳戶類型格子 =====
function renderAccountTypeGrid() {
  accountTypeGrid.innerHTML = '';
  ACCOUNT_TYPES.forEach(t => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'cat-item' + (selectedAccountType === t.id ? ' selected' : '');
    item.innerHTML = `<span class="cat-emoji">${t.emoji}</span><span>${t.name}</span>`;
    item.addEventListener('click', () => { selectedAccountType = t.id; renderAccountTypeGrid(); });
    accountTypeGrid.appendChild(item);
  });
}

// ===== 提交帳戶 =====
accountForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedAccountType) { shakeEl(accountTypeGrid); return; }

  const name    = accountNameInput.value.trim();
  const balance = parseFloat(accountBalanceInput.value) || 0;
  const note    = accountNoteInput.value.trim();
  const typeObj = ACCOUNT_TYPES.find(t => t.id === selectedAccountType);
  const editId  = accountEditId.value;

  accountSubmitBtn.disabled = true;
  accountSubmitBtn.textContent = '儲存中...';

  try {
    if (editId) {
      await updateDoc(doc(db, 'accounts', editId), {
        typeId: selectedAccountType,
        emoji:  typeObj.emoji,
        typeName: typeObj.name,
        name, balance, note,
      });
    } else {
      await addDoc(collection(db, 'accounts'), {
        uid:      currentUser.uid,
        typeId:   selectedAccountType,
        emoji:    typeObj.emoji,
        typeName: typeObj.name,
        name, balance, note,
        createdAt: serverTimestamp(),
      });
    }
    closeAccountModal();
  } catch (err) {
    console.error(err);
    alert('儲存失敗');
  } finally {
    accountSubmitBtn.disabled = false;
    accountSubmitBtn.textContent = '儲存帳戶';
  }
});

async function deleteAccount(docId) {
  try {
    await deleteDoc(doc(db, 'accounts', docId));
  } catch (err) { console.error(err); alert('刪除失敗'); }
}

// ===== 計算帳戶動態餘額 =====
// 所有帳戶統一：初始餘額 + 收入 - 支出
// 信用卡初始餘額應輸入負數（例如已欠 5000 就輸入 -5000），
// 每次支出讓餘額更負，還款（收入）讓餘額回正，餘額為負代表目前欠款
function calcAccountBalance(account) {
  const recs = allRecords.filter(r => r.accountId === account.docId);
  const inc  = recs.filter(r => r.type === 'income').reduce((s, r)  => s + r.amount, 0);
  const exp  = recs.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  return (account.balance || 0) + inc - exp;
}

// ===== 渲染帳戶列表 =====
function renderAccountList() {
  while (accountList.firstChild) accountList.removeChild(accountList.firstChild);

  if (allAccounts.length === 0) {
    accountList.appendChild(accountEmptyState);
    accountEmptyState.style.display = '';
    accountsNetWorth.textContent       = '$0';
    accountsTotalAsset.textContent     = '$0';
    accountsTotalLiability.textContent = '$0';
    return;
  }

  accountEmptyState.style.display = 'none';

  // 資產帳戶：餘額為正才算資產
  // 信用卡：餘額為負代表欠款（負債），餘額為正代表已還清有溢繳
  let totalAsset     = 0;
  let totalLiability = 0;
  allAccounts.forEach(a => {
    const bal = calcAccountBalance(a);
    if (a.typeId === 'credit') {
      if (bal < 0) totalLiability += Math.abs(bal); // 欠款累計到負債
      else         totalAsset     += bal;            // 溢繳算資產
    } else {
      totalAsset += bal;
    }
  });
  // 淨資產 = 資產 - 負債
  const netWorth = totalAsset - totalLiability;

  accountsNetWorth.textContent       = `$${formatMoney(netWorth)}`;
  accountsNetWorth.style.color       = netWorth < 0 ? '#ffb3b3' : 'white';
  accountsTotalAsset.textContent     = `$${formatMoney(totalAsset)}`;
  accountsTotalLiability.textContent = `$${formatMoney(totalLiability)}`;

  // 依類型分組顯示
  const groups = {};
  allAccounts.forEach(a => {
    const key = a.typeName || '其他';
    if (!groups[key]) groups[key] = [];
    groups[key].push(a);
  });

  Object.entries(groups).forEach(([typeName, accounts]) => {
    const header = document.createElement('div');
    header.className = 'date-group-header';
    header.textContent = typeName;
    accountList.appendChild(header);

    accounts.forEach(a => {
      const curBal   = calcAccountBalance(a);
      const balColor = curBal < 0 ? 'var(--red-main)' : 'var(--purple-main)';
      const balText  = curBal < 0
        ? `-$${formatMoney(Math.abs(curBal))}`
        : `$${formatMoney(curBal)}`;

      const item = document.createElement('div');
      item.className = 'account-item';
      item.style.cursor = 'pointer';
      item.innerHTML = `
        <div class="account-type-icon">${a.emoji}</div>
        <div class="account-info">
          <div class="account-name">${a.name}</div>
          ${a.note ? `<div class="account-note">${a.note}</div>` : ''}
        </div>
        <div class="account-right">
          <span class="account-balance" style="color:${balColor}">${balText}</span>
          <div class="account-actions">
            <button class="edit-btn" title="編輯">✏️</button>
            <button class="delete-btn" title="刪除">🗑</button>
          </div>
        </div>
      `;
      item.addEventListener('click', (e) => {
        if (!e.target.closest('.account-actions')) openAccountDetail(a);
      });
      item.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openAccountModal(a);
      });
      item.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`確定要刪除「${a.name}」嗎？`)) deleteAccount(a.docId);
      });
      accountList.appendChild(item);
    });
  });
}

// ===== 渲染記帳 =====
function renderAll() {
  renderMonthLabel();
  renderSummary();
  renderList();
}

function renderMonthLabel() {
  currentMonthLabel.textContent = `${viewYear}年${viewMonth + 1}月`;
}

function getMonthRecords() {
  const ym = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  return allRecords.filter(r => r.date && r.date.startsWith(ym));
}

function renderSummary() {
  const recs    = getMonthRecords();
  const income  = recs.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const expense = recs.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const balance = income - expense;
  totalIncome.textContent  = `$${formatMoney(income)}`;
  totalExpense.textContent = `$${formatMoney(expense)}`;
  totalBalance.textContent = `$${formatMoney(balance)}`;
  totalBalance.style.color = balance >= 0 ? 'var(--purple-main)' : 'var(--red-main)';
}

function renderList() {
  const recs = getMonthRecords();
  while (recordList.firstChild) recordList.removeChild(recordList.firstChild);

  if (recs.length === 0) {
    recordList.appendChild(emptyState);
    emptyState.style.display = '';
    return;
  }
  emptyState.style.display = 'none';

  const groups = {};
  recs.forEach(r => {
    if (!groups[r.date]) groups[r.date] = [];
    groups[r.date].push(r);
  });

  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
    const header = document.createElement('div');
    header.className = 'date-group-header';
    header.textContent = formatDateDisplay(date);
    recordList.appendChild(header);

    groups[date].forEach(r => {
      const item = document.createElement('div');
      item.className = 'record-item';
      const metaText = [r.accountName, r.note].filter(Boolean).join(' · ') || '無備註';
      item.innerHTML = `
        <div class="record-cat-icon ${r.type}-icon">${r.categoryEmoji}</div>
        <div class="record-info">
          <div class="record-cat-name">${r.categoryName}</div>
          <div class="record-meta">${metaText}</div>
        </div>
        <div class="record-right">
          <span class="record-amount ${r.type}">${r.type === 'income' ? '+' : '-'}$${formatMoney(r.amount)}</span>
          <button class="delete-btn" title="刪除">🗑</button>
        </div>
      `;
      item.querySelector('.delete-btn').addEventListener('click', () => {
        if (confirm('確定要刪除這筆記錄嗎？')) deleteRecord(r.docId);
      });
      recordList.appendChild(item);
    });
  });
}

function formatMoney(n) {
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

function shakeEl(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shake 0.3s ease';
}

// ===== shake 動畫 =====
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%,100%{transform:translateX(0)}
    20%{transform:translateX(-6px)}
    40%{transform:translateX(6px)}
    60%{transform:translateX(-4px)}
    80%{transform:translateX(4px)}
  }
`;
document.head.appendChild(shakeStyle);

// ===== 初始化 =====
setDefaultDate();
renderCategoryGrid();
renderAccountTypeGrid();
renderMonthLabel();
