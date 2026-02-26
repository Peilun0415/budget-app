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

// ===== 預設分類（首次登入時寫入 Firestore）=====
// 子分類不設 emoji，寫入時沿用主分類 emoji
const DEFAULT_CATEGORIES = [
  // 支出主分類
  { type: 'expense', emoji: '🍜', name: '飲食',      order: 0,  subs: [
    { name: '早餐', order: 0 },
    { name: '午餐', order: 1 },
    { name: '晚餐', order: 2 },
    { name: '消夜', order: 3 },
  ]},
  { type: 'expense', emoji: '🏠', name: '住家',      order: 1,  subs: [
    { name: '日常用品', order: 0 },
    { name: '水費',     order: 1 },
    { name: '電費',     order: 2 },
    { name: '瓦斯',     order: 3 },
    { name: '房租',     order: 4 },
    { name: '房貸',     order: 5 },
    { name: '管理費',   order: 6 },
  ]},
  { type: 'expense', emoji: '📡', name: '電信',      order: 2,  subs: [
    { name: '市內電話費', order: 0 },
    { name: '行動電話費', order: 1 },
    { name: '網路費',     order: 2 },
  ]},
  { type: 'expense', emoji: '🚌', name: '交通',      order: 3,  subs: [
    { name: '加油費', order: 0 },
    { name: '停車費', order: 1 },
    { name: '計程車', order: 2 },
    { name: '火車',   order: 3 },
    { name: '飛機',   order: 4 },
    { name: '高鐵',   order: 5 },
    { name: '悠遊卡', order: 6 },
  ]},
  { type: 'expense', emoji: '🎮', name: '娛樂',      order: 4,  subs: [
    { name: '電影',     order: 0 },
    { name: '數位服務', order: 1 },
    { name: '旅遊',     order: 2 },
    { name: '門票',     order: 3 },
  ]},
  { type: 'expense', emoji: '🛍️', name: '購物',      order: 5,  subs: [
    { name: '服飾',     order: 0 },
    { name: '美妝保養', order: 1 },
    { name: '3C產品',   order: 2 },
    { name: '網路購物', order: 3 },
  ]},
  { type: 'expense', emoji: '🎁', name: '送禮&捐贈', order: 6,  subs: [
    { name: '捐款', order: 0 },
    { name: '送禮', order: 1 },
    { name: '紅包', order: 2 },
  ]},
  { type: 'expense', emoji: '💊', name: '醫療&健康', order: 7,  subs: [
    { name: '門診', order: 0 },
    { name: '藥品', order: 1 },
  ]},
  { type: 'expense', emoji: '💰', name: '金融&保險', order: 8,  subs: [
    { name: '機車保險', order: 0 },
    { name: '汽車保險', order: 1 },
    { name: '手續費',   order: 2 },
    { name: '投資虧損', order: 3 },
  ]},
  { type: 'expense', emoji: '📋', name: '稅金',      order: 9,  subs: [
    { name: '所得稅', order: 0 },
    { name: '房屋稅', order: 1 },
    { name: '牌照稅', order: 2 },
  ]},
  { type: 'expense', emoji: '📦', name: '其他雜項',  order: 10, subs: [
    { name: '賠償罰款', order: 0 },
    { name: '小費',     order: 1 },
  ]},
  // 收入主分類
  { type: 'income',  emoji: '💼', name: '主動收入',  order: 0,  subs: [
    { name: '薪資', order: 0 },
    { name: '獎金', order: 1 },
    { name: '補助', order: 2 },
  ]},
  { type: 'income',  emoji: '📈', name: '被動收入',  order: 1,  subs: [
    { name: '利息',   order: 0 },
    { name: '紅包',   order: 1 },
    { name: '投資獲利', order: 2 },
    { name: '股利',   order: 3 },
    { name: '回饋',   order: 4 },
  ]},
  { type: 'income',  emoji: '🎉', name: '意外收入',  order: 2,  subs: [
    { name: '中獎', order: 0 },
  ]},
];

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
let selectedCategory    = null;   // 主分類 docId
let selectedSubCategory = null;   // 子分類 docId
let selectedAccountType = null;
let viewYear  = new Date().getFullYear();
let viewMonth = new Date().getMonth();
let unsubRecords    = null;
let unsubAccounts   = null;
let unsubCategories = null;
let allRecords     = [];
let allAccounts    = [];
let allCategories  = [];  // 主分類陣列（含 .subs 子陣列）
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
const modalOverlay      = document.getElementById('modalOverlay');
const recordModalTitle  = document.getElementById('recordModalTitle');
const recordEditId      = document.getElementById('recordEditId');
const deleteRecordBtn   = document.getElementById('deleteRecordBtn');
const openFormBtn   = document.getElementById('openFormBtn');
const closeFormBtn  = document.getElementById('closeFormBtn');
const recordForm    = document.getElementById('recordForm');
const btnExpense    = document.getElementById('btnExpense');
const btnIncome     = document.getElementById('btnIncome');
const btnTransfer   = document.getElementById('btnTransfer');
const accountGroup  = document.getElementById('accountGroup');
const transferGroup = document.getElementById('transferGroup');
const transferFrom  = document.getElementById('transferFrom');
const transferTo    = document.getElementById('transferTo');
const categoryGrid     = document.getElementById('categoryGrid');
const catPickBtn       = document.getElementById('catPickBtn');
const catPickEmoji     = document.getElementById('catPickEmoji');
const catPickName      = document.getElementById('catPickName');
const catPickerOverlay = document.getElementById('catPickerOverlay');
const closeCatPickerBtn = document.getElementById('closeCatPickerBtn');
const catPickerParents = document.getElementById('catPickerParents');
const catPickerSubs    = document.getElementById('catPickerSubs');
const amountInput      = document.getElementById('amount');
const calcToggleBtn    = document.getElementById('calcToggleBtn');
const calcKeyboard     = document.getElementById('calcKeyboard');
const calcExpressionEl = document.getElementById('calcExpression');
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

// ===== DOM — 分類管理 =====
const pageCategories    = document.getElementById('pageCategories');
const navCategoriesBtn  = document.getElementById('navCategories');
const categoryMgmtList  = document.getElementById('categoryMgmtList');
const openCatFormBtn    = document.getElementById('openCatFormBtn');
const catTabExpense     = document.getElementById('catTabExpense');
const catTabIncome      = document.getElementById('catTabIncome');
let catMgmtType         = 'expense';  // 目前分類管理頁顯示的 type
const catModalOverlay   = document.getElementById('catModalOverlay');
const closeCatFormBtn   = document.getElementById('closeCatFormBtn');
const catForm           = document.getElementById('catForm');
const catModalTitle     = document.getElementById('catModalTitle');
const catEmojiInput     = document.getElementById('catEmoji');
const catNameInput      = document.getElementById('catName');
const catEditIdInput    = document.getElementById('catEditId');
const catParentIdInput  = document.getElementById('catParentId');
const catIsParentInput  = document.getElementById('catIsParent');
const catParentGroup    = document.getElementById('catParentGroup');
const catParentLabel    = document.getElementById('catParentLabel');
const catSubmitBtn      = document.getElementById('catSubmitBtn');
const deleteCatBtn      = document.getElementById('deleteCatBtn');
let catSelectedType     = 'expense';

// ===== 認證 =====
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    showApp(user);
    subscribeRecords();
    subscribeAccounts();
    subscribeCategories();
  } else {
    currentUser = null;
    showLogin();
    if (unsubRecords)     { unsubRecords();     unsubRecords     = null; }
    if (unsubAccounts)    { unsubAccounts();    unsubAccounts    = null; }
    if (unsubCategories)  { unsubCategories();  unsubCategories  = null; }
    allRecords    = [];
    allAccounts   = [];
    allCategories = [];
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
navCategoriesBtn.addEventListener('click', () => switchPage('categories'));
backToAccountsBtn.addEventListener('click', () => switchPage('accounts'));

function switchPage(page) {
  currentPage = page;
  pageHome.style.display          = page === 'home'          ? 'block' : 'none';
  pageAccounts.style.display      = page === 'accounts'      ? 'block' : 'none';
  pageAccountDetail.style.display = page === 'accountDetail' ? 'block' : 'none';
  pageCategories.style.display    = page === 'categories'    ? 'block' : 'none';
  navHome.classList.toggle('active',        page === 'home');
  navAccountsBtn.classList.toggle('active', page === 'accounts' || page === 'accountDetail');
  navCategoriesBtn.classList.toggle('active', page === 'categories');
  if (page === 'home')          pageTitle.textContent = '我的記帳本';
  if (page === 'accounts')      pageTitle.textContent = '帳戶管理';
  if (page === 'accountDetail') pageTitle.textContent = '帳戶明細';
  if (page === 'categories')    pageTitle.textContent = '分類管理';
  if (page === 'categories')    renderCategoryMgmtList();
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
  // 目前餘額永遠用全部記錄計算（含轉帳）
  const curBal = calcAccountBalance(account);
  detailBalance.textContent = curBal < 0 ? `-$${formatMoney(Math.abs(curBal))}` : `$${formatMoney(curBal)}`;
  detailBalance.style.color = curBal >= 0 ? 'white' : '#ffb3b3';

  // 期間收入/支出用篩選後的記錄（轉帳不計入收支統計）
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
    accountDetailList.appendChild(buildDateHeader(date, groups[date]));

    groups[date].forEach(r => {
      accountDetailList.appendChild(buildRecordItem(r));
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
    allAccounts = snap.docs.map(d => ({ docId: d.id, ...d.data() }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    renderAccountList();
    renderAccountSelect();
    // 若目前在帳戶明細頁，即時更新
    if (currentPage === 'accountDetail' && detailAccountId) {
      const acc = allAccounts.find(a => a.docId === detailAccountId);
      if (acc) renderAccountDetail(acc);
    }
  }, console.error);
}

// ===== Firestore 監聽 — 分類 =====
function subscribeCategories() {
  if (unsubCategories) unsubCategories();
  // 只用 where，排序在 client 端做，避免需要建複合索引
  const q = query(
    collection(db, 'categories'),
    where('uid', '==', currentUser.uid)
  );
  unsubCategories = onSnapshot(q, async (snap) => {
    const docs = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    // 若使用者尚無分類，寫入預設值
    if (docs.length === 0) {
      await seedDefaultCategories();
      return; // onSnapshot 會再次觸發
    }
    // 組裝：主分類 + 子分類
    const parents = docs.filter(d => !d.parentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    parents.forEach(p => {
      p.subs = docs.filter(d => d.parentId === p.docId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });
    allCategories = parents;
    // 若目前在分類管理頁，重新渲染
    if (currentPage === 'categories') renderCategoryMgmtList();
    // 分類載入後，若尚未選分類，設預設值
    if (!selectedCategory) setDefaultCategory();
  }, console.error);
}

async function seedDefaultCategories() {
  const batch = [];
  for (const cat of DEFAULT_CATEGORIES) {
    const parentRef = await addDoc(collection(db, 'categories'), {
      uid:       currentUser.uid,
      type:      cat.type,
      emoji:     cat.emoji,
      name:      cat.name,
      order:     cat.order,
      parentId:  null,
      createdAt: serverTimestamp(),
    });
    for (const sub of cat.subs) {
      batch.push(addDoc(collection(db, 'categories'), {
        uid:       currentUser.uid,
        type:      cat.type,
        emoji:     cat.emoji,   // 子分類沿用主分類 emoji
        name:      sub.name,
        order:     sub.order,
        parentId:  parentRef.id,
        createdAt: serverTimestamp(),
      }));
    }
  }
  await Promise.all(batch);
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
openFormBtn.addEventListener('click', () => openModal());
closeFormBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

deleteRecordBtn.addEventListener('click', async () => {
  const editId = recordEditId.value;
  if (!editId) return;
  if (confirm('確定要刪除這筆記錄嗎？')) {
    await deleteRecord(editId);
    closeModal();
  }
});

function openModal(record = null) {
  if (record) {
    recordEditId.value = record.docId;
    recordModalTitle.textContent = record.type === 'transfer' ? '編輯轉帳' : '編輯記帳';
    submitBtn.textContent = '儲存修改';
    deleteRecordBtn.style.display = 'block';
    switchType(record.type);
    if (record.type === 'transfer') {
      transferFrom.value = record.transferFromId || '';
      transferTo.value   = record.transferToId   || '';
    } else {
      selectedCategory    = record.categoryId    || null;
      selectedSubCategory = record.subCategoryId || null;
      const parentCat = allCategories.find(c => c.docId === selectedCategory) || null;
      const subCat    = parentCat?.subs?.find(s => s.docId === selectedSubCategory) || null;
      updateCatPickBtn(parentCat, subCat);
      accountSelect.value = record.accountId || '';
    }
    calcExpr = String(record.amount);
    calcRaw  = String(record.amount);
    amountInput.value = calcExpr;
    dateInput.value   = record.date;
    noteInput.value   = record.note || '';
  } else {
    recordEditId.value = '';
    recordModalTitle.textContent = '新增記帳';
    submitBtn.textContent = '記下來！';
    deleteRecordBtn.style.display = 'none';
  }
  modalOverlay.classList.add('active');
  setTimeout(() => amountInput.focus(), 300);
}

function closeModal() {
  modalOverlay.classList.remove('active');
  resetForm();
}

// ===== 切換收入/支出/轉帳 =====
btnExpense.addEventListener('click',  () => switchType('expense'));
btnIncome.addEventListener('click',   () => switchType('income'));
btnTransfer.addEventListener('click', () => switchType('transfer'));

function switchType(type) {
  currentType         = type;
  selectedCategory    = null;
  selectedSubCategory = null;
  btnExpense.classList.toggle('active',  type === 'expense');
  btnIncome.classList.toggle('active',   type === 'income');
  btnTransfer.classList.toggle('active', type === 'transfer');

  const isTransfer = type === 'transfer';
  // 分類按鈕、帳戶選擇 ↔ 轉帳帳戶選擇 互換顯示
  catPickBtn.style.display    = isTransfer ? 'none' : '';
  accountGroup.style.display  = isTransfer ? 'none' : '';
  transferGroup.style.display = isTransfer ? '' : 'none';

  if (!isTransfer) setDefaultCategory();
}

// 自動選該 type 第一個主分類的第一個子分類（無子分類則選主分類）
function setDefaultCategory() {
  const parents = allCategories.filter(c => c.type === currentType);
  if (parents.length === 0) {
    selectedCategory    = null;
    selectedSubCategory = null;
    updateCatPickBtn(null, null);
    return;
  }
  const firstParent = parents[0];
  const firstSub    = firstParent.subs && firstParent.subs.length > 0 ? firstParent.subs[0] : null;
  selectedCategory    = firstParent.docId;
  selectedSubCategory = firstSub ? firstSub.docId : null;
  updateCatPickBtn(firstParent, firstSub);
}

// ===== 分類選擇彈窗 =====
catPickBtn.addEventListener('click', () => openCatPicker());
closeCatPickerBtn.addEventListener('click', closeCatPicker);
catPickerOverlay.addEventListener('click', (e) => {
  if (e.target === catPickerOverlay) closeCatPicker();
});

function openCatPicker() {
  renderCatPickerParents();
  catPickerOverlay.classList.add('active');
}

function closeCatPicker() {
  catPickerOverlay.classList.remove('active');
}

// 渲染左欄主分類
function renderCatPickerParents() {
  catPickerParents.innerHTML = '';
  catPickerSubs.innerHTML = '';
  const parents = allCategories.filter(c => c.type === currentType);

  // 若目前已選主分類，預先展開對應子分類
  let activeParent = parents.find(c => c.docId === selectedCategory) || parents[0] || null;

  parents.forEach(cat => {
    const item = document.createElement('div');
    item.className = 'cat-picker-parent' + (cat === activeParent ? ' active' : '');
    item.innerHTML = `<span class="cat-picker-parent-emoji">${cat.emoji}</span><span>${cat.name}</span>`;
    item.addEventListener('click', () => {
      catPickerParents.querySelectorAll('.cat-picker-parent').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      renderCatPickerSubs(cat);
    });
    catPickerParents.appendChild(item);
  });

  if (activeParent) renderCatPickerSubs(activeParent);
}

// 渲染右欄子分類（純文字，無 emoji）
function renderCatPickerSubs(parentCat) {
  catPickerSubs.innerHTML = '';

  if (parentCat.subs && parentCat.subs.length > 0) {
    parentCat.subs.forEach(sub => {
      const item = document.createElement('div');
      item.className = 'cat-picker-sub' +
        (selectedSubCategory === sub.docId ? ' selected' : '');
      item.textContent = sub.name;
      item.addEventListener('click', () => {
        selectedCategory    = parentCat.docId;
        selectedSubCategory = sub.docId;
        updateCatPickBtn(parentCat, sub);
        closeCatPicker();
      });
      catPickerSubs.appendChild(item);
    });
  }
}

// 更新金額列上的分類按鈕顯示
function updateCatPickBtn(parentCat, subCat) {
  if (!parentCat) {
    catPickEmoji.textContent = '📦';
    catPickName.innerHTML    = '選擇分類';
    return;
  }
  catPickEmoji.textContent = parentCat.emoji;
  if (subCat) {
    catPickName.innerHTML = `${parentCat.name}<br><span class="cat-pick-sub-label">${subCat.name}</span>`;
  } else {
    catPickName.innerHTML = parentCat.name;
  }
}

// 舊介面相容（switchType 時重設顯示）
function renderCategoryGrid() {
  // 切換收/支時，若已選分類不屬於新 type，清除
  if (selectedCategory) {
    const cat = allCategories.find(c => c.docId === selectedCategory);
    if (!cat || cat.type !== currentType) {
      selectedCategory    = null;
      selectedSubCategory = null;
      updateCatPickBtn(null, null);
    } else {
      const sub = cat.subs?.find(s => s.docId === selectedSubCategory) || null;
      updateCatPickBtn(cat, sub);
    }
  }
}

// ===== 帳戶下拉選單（記帳表單用）=====
function renderAccountSelect() {
  const prev     = accountSelect.value;
  const prevFrom = transferFrom.value;
  const prevTo   = transferTo.value;

  // 清空重建（避免重複 append）
  accountSelect.innerHTML = '';
  transferFrom.innerHTML  = '';
  transferTo.innerHTML    = '';

  allAccounts.forEach(a => {
    const makeOpt = () => {
      const opt = document.createElement('option');
      opt.value = a.docId;
      opt.textContent = `${a.emoji} ${a.name}`;
      return opt;
    };
    accountSelect.appendChild(makeOpt());
    transferFrom.appendChild(makeOpt());
    transferTo.appendChild(makeOpt());
  });

  // 還原選擇
  if (prev)     accountSelect.value = prev;
  else if (allAccounts.length > 0) accountSelect.value = allAccounts[0].docId;

  if (prevFrom) transferFrom.value = prevFrom;
  else if (allAccounts.length > 0) transferFrom.value = allAccounts[0].docId;

  if (prevTo)   transferTo.value = prevTo;
  else if (allAccounts.length > 1) transferTo.value = allAccounts[1].docId;
  else if (allAccounts.length > 0) transferTo.value = allAccounts[0].docId;
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

// ===== 提交記帳（新增 / 編輯）=====
recordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  // 若算式尚未按 =，擋住儲存
  if (/[+\-*/]/.test(calcRaw)) {
    calcExpressionEl.textContent = '請先按 = 完成計算';
    calcExpressionEl.style.color = 'var(--red-main)';
    shakeEl(amountInput.parentElement);
    return;
  }
  calcExpressionEl.style.color = '';
  const amount = parseFloat(calcRaw) || parseFloat(amountInput.value);
  if (!amount || amount <= 0) { shakeEl(amountInput.parentElement); return; }

  const editId = recordEditId.value;
  submitBtn.disabled = true;
  submitBtn.textContent = '儲存中...';

  try {
    // ===== 轉帳 =====
    if (currentType === 'transfer') {
      const fromId  = transferFrom.value;
      const toId    = transferTo.value;
      const fromAcc = allAccounts.find(a => a.docId === fromId);
      const toAcc   = allAccounts.find(a => a.docId === toId);
      if (!fromId || !toId) { shakeEl(transferGroup); return; }
      if (fromId === toId) {
        shakeEl(transferGroup);
        alert('轉出與轉入帳戶不能相同');
        return;
      }
      const note = noteInput.value.trim();
      const date = dateInput.value;

      if (editId) {
        // 編輯：找到配對的另一筆，一起更新
        const rec = allRecords.find(r => r.docId === editId);
        const paired = rec?.transferId
          ? allRecords.filter(r => r.transferId === rec.transferId)
          : [rec];
        const outRec = paired.find(r => r.type === 'expense') || paired[0];
        const inRec  = paired.find(r => r.type === 'income')  || paired[1];
        const updates = [];
        if (outRec) updates.push(updateDoc(doc(db, 'records', outRec.docId), {
          amount, date, note,
          accountId: fromId, accountName: fromAcc?.name || null,
          transferFromId: fromId, transferToId: toId,
          displayName: `轉帳 → ${toAcc?.name || ''}`,
        }));
        if (inRec) updates.push(updateDoc(doc(db, 'records', inRec.docId), {
          amount, date, note,
          accountId: toId, accountName: toAcc?.name || null,
          transferFromId: fromId, transferToId: toId,
          displayName: `轉帳 ← ${fromAcc?.name || ''}`,
        }));
        await Promise.all(updates);
      } else {
        // 新增：建立兩筆並用同一個 transferId 關聯
        const transferId = `tf_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
        const base = { uid: currentUser.uid, type: 'transfer', amount, date, note,
          transferId, transferFromId: fromId, transferToId: toId,
          displayEmoji: '🔄', categoryId: null, categoryName: null,
          createdAt: serverTimestamp() };
        await Promise.all([
          addDoc(collection(db, 'records'), {
            ...base,
            accountId: fromId, accountName: fromAcc?.name || null,
            displayName: `轉帳 → ${toAcc?.name || ''}`,
          }),
          addDoc(collection(db, 'records'), {
            ...base,
            accountId: toId, accountName: toAcc?.name || null,
            displayName: `轉帳 ← ${fromAcc?.name || ''}`,
          }),
        ]);
      }
      closeModal();
      return;
    }

    // ===== 一般支出 / 收入 =====
    if (!selectedCategory) { shakeEl(catPickBtn); return; }

    const parentCat = allCategories.find(c => c.docId === selectedCategory);
    const subCat = selectedSubCategory && parentCat
      ? (parentCat.subs || []).find(s => s.docId === selectedSubCategory)
      : null;
    const displayEmoji = subCat ? subCat.emoji : (parentCat ? parentCat.emoji : '📦');
    const displayName  = subCat
      ? `${parentCat ? parentCat.name + '・' : ''}${subCat.name}`
      : (parentCat ? parentCat.name : '其他');

    const selAccId = accountSelect.value;
    const selAcc   = allAccounts.find(a => a.docId === selAccId);

    const data = {
      type:             currentType,
      amount,
      categoryId:       selectedCategory,
      categoryName:     parentCat ? parentCat.name : '其他',
      categoryEmoji:    parentCat ? parentCat.emoji : '📦',
      subCategoryId:    selectedSubCategory || null,
      subCategoryName:  subCat ? subCat.name  : null,
      subCategoryEmoji: subCat ? subCat.emoji : null,
      displayEmoji,
      displayName,
      accountId:        selAccId || null,
      accountName:      selAcc ? selAcc.name : null,
      date:             dateInput.value,
      note:             noteInput.value.trim(),
    };
    if (editId) {
      await updateDoc(doc(db, 'records', editId), data);
    } else {
      await addDoc(collection(db, 'records'), {
        uid: currentUser.uid, ...data, createdAt: serverTimestamp(),
      });
    }
    closeModal();
  } catch (err) {
    console.error(err);
    alert('儲存失敗，請確認網路連線');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editId ? '儲存修改' : '記下來！';
  }
});

function resetForm() {
  recordEditId.value  = '';
  amountInput.value   = '';
  noteInput.value     = '';
  recordModalTitle.textContent = '新增記帳';
  submitBtn.textContent = '記下來！';
  // 回到支出模式（會自動切換 UI 顯示）
  switchType('expense');
  setDefaultDate();
  resetCalc();
}

async function deleteRecord(docId) {
  try {
    const rec = allRecords.find(r => r.docId === docId);
    if (rec?.transferId) {
      // 轉帳：刪除兩筆關聯記錄
      const paired = allRecords.filter(r => r.transferId === rec.transferId);
      await Promise.all(paired.map(r => deleteDoc(doc(db, 'records', r.docId))));
    } else {
      await deleteDoc(doc(db, 'records', docId));
    }
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
      const maxOrder = allAccounts.reduce((m, a) => Math.max(m, a.order ?? 0), 0);
      await addDoc(collection(db, 'accounts'), {
        uid:      currentUser.uid,
        typeId:   selectedAccountType,
        emoji:    typeObj.emoji,
        typeName: typeObj.name,
        name, balance, note,
        order:    maxOrder + 1,
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

// ===== 分類管理頁面 =====
// Tab 切換
catTabExpense.addEventListener('click', () => switchCatMgmtType('expense'));
catTabIncome.addEventListener('click',  () => switchCatMgmtType('income'));

function switchCatMgmtType(type) {
  catMgmtType = type;
  catTabExpense.classList.toggle('active', type === 'expense');
  catTabIncome.classList.toggle('active',  type === 'income');
  renderCategoryMgmtList();
}

openCatFormBtn.addEventListener('click', () => {
  // 新增主分類時預設帶入目前 tab 的 type
  catSelectedType = catMgmtType;
  openCatModal(null, null);
});
closeCatFormBtn.addEventListener('click', closeCatModal);
catModalOverlay.addEventListener('click', (e) => { if (e.target === catModalOverlay) closeCatModal(); });

deleteCatBtn.addEventListener('click', async () => {
  const editId    = catEditIdInput.value;
  const isParent  = catIsParentInput.value === 'true';
  if (!editId) return;
  const msg = isParent
    ? '確定要刪除此主分類？底下的子分類也會一併刪除。'
    : '確定要刪除此子分類？';
  if (!confirm(msg)) return;
  try {
    if (isParent) {
      // 刪除所有子分類
      const parent = allCategories.find(c => c.docId === editId);
      if (parent && parent.subs) {
        await Promise.all(parent.subs.map(s => deleteDoc(doc(db, 'categories', s.docId))));
      }
    }
    await deleteDoc(doc(db, 'categories', editId));
    closeCatModal();
  } catch (err) { console.error(err); alert('刪除失敗'); }
});

function openCatModal(catDoc = null, parentDoc = null) {
  // catDoc: 編輯對象（null = 新增）
  // parentDoc: 若新增/編輯子分類，傳入主分類
  const isParent = !parentDoc;
  catIsParentInput.value = isParent ? 'true' : 'false';

  if (catDoc) {
    catModalTitle.textContent = isParent ? '編輯主分類' : '編輯子分類';
    catEditIdInput.value  = catDoc.docId;
    catEmojiInput.value   = catDoc.emoji || '';
    catNameInput.value    = catDoc.name  || '';
    deleteCatBtn.style.display = 'block';
    catSelectedType = catDoc.type || 'expense';
  } else {
    catModalTitle.textContent = isParent ? '新增主分類' : '新增子分類';
    catEditIdInput.value  = '';
    catEmojiInput.value   = parentDoc ? (parentDoc.emoji || '') : '';
    catNameInput.value    = '';
    deleteCatBtn.style.display = 'none';
  }

  if (!isParent && parentDoc) {
    catParentIdInput.value = parentDoc.docId;
    catParentGroup.style.display = '';
    catParentLabel.textContent = `${parentDoc.emoji} ${parentDoc.name}`;
  } else {
    catParentIdInput.value = '';
    catParentGroup.style.display = 'none';
  }

  catModalOverlay.classList.add('active');
  setTimeout(() => catNameInput.focus(), 200);
}

function closeCatModal() {
  catModalOverlay.classList.remove('active');
}

catForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name     = catNameInput.value.trim();
  const emoji    = catEmojiInput.value.trim() || '📦';
  const editId   = catEditIdInput.value;
  const parentId = catParentIdInput.value || null;
  const isParent = catIsParentInput.value === 'true';
  if (!name) { shakeEl(catNameInput); return; }

  catSubmitBtn.disabled = true;
  catSubmitBtn.textContent = '儲存中...';
  try {
    if (editId) {
      await updateDoc(doc(db, 'categories', editId), { emoji, name });
    } else {
      if (isParent) {
        const order = allCategories.filter(c => c.type === catSelectedType).length;
        await addDoc(collection(db, 'categories'), {
          uid: currentUser.uid,
          type: catSelectedType,
          emoji, name,
          order,
          parentId: null,
          createdAt: serverTimestamp(),
        });
      } else {
        const parent = allCategories.find(c => c.docId === parentId);
        const order  = parent ? (parent.subs || []).length : 0;
        await addDoc(collection(db, 'categories'), {
          uid: currentUser.uid,
          type: parent ? parent.type : 'expense',
          emoji, name,
          order,
          parentId,
          createdAt: serverTimestamp(),
        });
      }
    }
    closeCatModal();
  } catch (err) {
    console.error(err);
    alert('儲存失敗');
  } finally {
    catSubmitBtn.disabled = false;
    catSubmitBtn.textContent = '儲存';
  }
});

// ===== 渲染分類管理列表 =====
function renderCategoryMgmtList() {
  categoryMgmtList.innerHTML = '';
  const visible = allCategories.filter(c => c.type === catMgmtType);
  if (visible.length === 0) {
    categoryMgmtList.innerHTML = '<div class="empty-state">尚無分類，點上方按鈕新增</div>';
    return;
  }
  visible.forEach(p => categoryMgmtList.appendChild(buildCatParentItem(p)));
}

function buildCatParentItem(parent) {
  const wrap = document.createElement('div');
  wrap.className = 'cat-parent-item';
  wrap.dataset.docId = parent.docId;

  // 主分類標頭
  const header = document.createElement('div');
  header.className = 'cat-parent-header';
  header.innerHTML = `
    <span class="drag-handle cat-drag" title="拖曳排序">⠿</span>
    <span class="cat-parent-emoji">${parent.emoji}</span>
    <span class="cat-parent-name">${parent.name}</span>
    <div class="cat-parent-actions">
      <button type="button" class="cat-add-sub-btn">＋ 子分類</button>
      <button type="button" class="cat-action-btn cat-edit-btn" title="編輯">✏️</button>
    </div>
    <span class="cat-toggle-arrow open">›</span>
  `;
  header.querySelector('.cat-edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openCatModal(parent, null);
  });
  header.querySelector('.cat-add-sub-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    openCatModal(null, parent);
  });

  // 展開/收合
  const arrow = header.querySelector('.cat-toggle-arrow');
  let subListEl = null;

  header.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    if (subListEl) {
      const isOpen = subListEl.style.display !== 'none';
      subListEl.style.display = isOpen ? 'none' : '';
      arrow.classList.toggle('open', !isOpen);
    }
  });

  wrap.appendChild(header);

  // 子分類列表
  if (parent.subs && parent.subs.length > 0) {
    subListEl = document.createElement('div');
    subListEl.className = 'cat-sub-list';
    parent.subs.forEach(sub => {
      const subItem = document.createElement('div');
      subItem.className = 'cat-sub-item';
      subItem.dataset.docId = sub.docId;
      subItem.innerHTML = `
        <span class="drag-handle cat-sub-drag" title="拖曳排序">⠿</span>
        <span class="cat-sub-emoji">${sub.emoji}</span>
        <span class="cat-sub-name">${sub.name}</span>
        <button type="button" class="cat-action-btn cat-sub-edit-btn" title="編輯">✏️</button>
      `;
      subItem.querySelector('.cat-sub-edit-btn').addEventListener('click', () => {
        openCatModal(sub, parent);
      });
      initCatDragHandle(subItem, subItem.querySelector('.cat-sub-drag'), parent.docId, true);
      subListEl.appendChild(subItem);
    });
    wrap.appendChild(subListEl);
  } else {
    subListEl = null;
  }

  initCatDragHandle(wrap, header.querySelector('.cat-drag'), null, false);
  return wrap;
}

// ===== 分類拖曳排序 =====
let catDragSrc = null;
let catDragIsChild = false;
let catDragParentId = null;

function initCatDragHandle(item, handle, parentId, isChild) {
  if (!handle) return;
  const onStart = () => {
    catDragSrc      = item;
    catDragIsChild  = isChild;
    catDragParentId = parentId;
    item.classList.add('dragging');
  };
  const onMove = (x, y) => {
    const target = getCatItemAt(x, y, isChild, parentId);
    highlightCatDragOver(target);
  };
  const onEnd = (x, y) => {
    const target = getCatItemAt(x, y, isChild, parentId);
    finishCatDrag(target);
  };

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    onStart();
    const mm = (e) => onMove(e.clientX, e.clientY);
    const mu = (e) => {
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
      onEnd(e.clientX, e.clientY);
    };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  });

  handle.addEventListener('touchstart', (e) => {
    e.preventDefault();
    onStart();
    const tm = (e) => { const t = e.touches[0]; onMove(t.clientX, t.clientY); };
    const te = (e) => {
      handle.removeEventListener('touchmove', tm);
      handle.removeEventListener('touchend', te);
      const t = e.changedTouches[0];
      onEnd(t.clientX, t.clientY);
    };
    handle.addEventListener('touchmove', tm, { passive: false });
    handle.addEventListener('touchend', te);
  }, { passive: false });
}

function getCatItemAt(x, y, isChild, parentId) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  if (isChild) return el.closest('.cat-sub-item');
  return el.closest('.cat-parent-item');
}

function highlightCatDragOver(target) {
  document.querySelectorAll('.cat-parent-item.drag-over, .cat-sub-item.drag-over')
    .forEach(el => el.classList.remove('drag-over'));
  if (target && target !== catDragSrc) target.classList.add('drag-over');
}

async function finishCatDrag(target) {
  document.querySelectorAll('.cat-parent-item, .cat-sub-item')
    .forEach(el => el.classList.remove('dragging', 'drag-over'));
  if (!target || target === catDragSrc || !catDragSrc) { catDragSrc = null; return; }

  if (catDragIsChild) {
    // 子分類排序
    const parent = allCategories.find(c => c.docId === catDragParentId);
    if (!parent || !parent.subs) { catDragSrc = null; return; }
    const subList = [...(catDragSrc.closest('.cat-sub-list')?.querySelectorAll('.cat-sub-item') || [])];
    const srcIdx = subList.indexOf(catDragSrc);
    const dstIdx = subList.indexOf(target);
    if (srcIdx === -1 || dstIdx === -1) { catDragSrc = null; return; }
    const ordered = [...parent.subs].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const [moved] = ordered.splice(srcIdx, 1);
    ordered.splice(dstIdx, 0, moved);
    try {
      await Promise.all(ordered.map((s, i) => updateDoc(doc(db, 'categories', s.docId), { order: i })));
    } catch (err) { console.error(err); }
  } else {
    // 主分類排序（同 type）
    const type = allCategories.find(c => c.docId === catDragSrc.dataset.docId)?.type;
    const sameType = [...(categoryMgmtList.querySelectorAll('.cat-parent-item'))];
    const srcIdx = sameType.indexOf(catDragSrc);
    const dstIdx = sameType.indexOf(target);
    if (srcIdx === -1 || dstIdx === -1) { catDragSrc = null; return; }
    const ordered = allCategories.filter(c => c.type === type)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const [moved] = ordered.splice(srcIdx, 1);
    ordered.splice(dstIdx, 0, moved);
    try {
      await Promise.all(ordered.map((c, i) => updateDoc(doc(db, 'categories', c.docId), { order: i })));
    } catch (err) { console.error(err); }
  }
  catDragSrc = null;
}

// ===== 計算帳戶動態餘額 =====
// 所有帳戶統一：初始餘額 + 收入 - 支出
// 信用卡初始餘額應輸入負數（例如已欠 5000 就輸入 -5000），
// 每次支出讓餘額更負，還款（收入）讓餘額回正，餘額為負代表目前欠款
function calcAccountBalance(account) {
  const recs = allRecords.filter(r => r.accountId === account.docId);
  const inc  = recs.filter(r => r.type === 'income').reduce((s, r)  => s + r.amount, 0);
  const exp  = recs.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  // 轉帳：轉入 +amount，轉出 -amount
  const transferIn  = recs.filter(r => r.type === 'transfer' && r.transferToId   === account.docId).reduce((s, r) => s + r.amount, 0);
  const transferOut = recs.filter(r => r.type === 'transfer' && r.transferFromId === account.docId).reduce((s, r) => s + r.amount, 0);
  return (account.balance || 0) + inc - exp + transferIn - transferOut;
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

  // 依 typeOrder → typeName 分組，組內依 order 排序
  const groupMap = {};
  allAccounts.forEach(a => {
    const key = a.typeName || '其他';
    if (!groupMap[key]) groupMap[key] = { typeOrder: a.typeOrder ?? 999, accounts: [] };
    groupMap[key].accounts.push(a);
  });
  // 類別依 typeOrder 排序
  const sortedGroups = Object.entries(groupMap)
    .sort((a, b) => a[1].typeOrder - b[1].typeOrder);

  sortedGroups.forEach(([typeName, { accounts }]) => {
    // 類別標頭（可拖曳整個類別）
    const header = document.createElement('div');
    header.className = 'account-group-header';
    header.dataset.typeName = typeName;
    header.innerHTML = `
      <span class="drag-handle group-drag-handle" title="拖曳移動類別">⠿</span>
      <span class="account-group-label">${typeName}</span>
    `;
    accountList.appendChild(header);

    // 類別容器（包住該類別所有帳戶，方便整組拖曳）
    const groupWrap = document.createElement('div');
    groupWrap.className = 'account-group-wrap';
    groupWrap.dataset.typeName = typeName;

    // 組內依 order 排序
    accounts.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).forEach(a => {
      const curBal   = calcAccountBalance(a);
      const balColor = curBal < 0 ? 'var(--red-main)' : 'var(--purple-main)';
      const balText  = curBal < 0
        ? `-$${formatMoney(Math.abs(curBal))}`
        : `$${formatMoney(curBal)}`;

      const item = document.createElement('div');
      item.className = 'account-item';
      item.dataset.docId = a.docId;
      item.innerHTML = `
        <span class="drag-handle item-drag-handle" title="拖曳排序">⠿</span>
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
        if (!e.target.closest('.account-actions') && !e.target.closest('.drag-handle')) openAccountDetail(a);
      });
      item.querySelector('.edit-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        openAccountModal(a);
      });
      item.querySelector('.delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`確定要刪除「${a.name}」嗎？`)) deleteAccount(a.docId);
      });
      initItemDragHandle(item, item.querySelector('.item-drag-handle'), groupWrap);
      groupWrap.appendChild(item);
    });

    accountList.appendChild(groupWrap);
    initGroupDragHandle(header, groupWrap);
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

  // 轉帳只保留「轉出」那筆（transferFromId === accountId），避免重複顯示
  const displayRecs = recs.filter(r =>
    r.type !== 'transfer' || r.accountId === r.transferFromId
  );

  const groups = {};
  displayRecs.forEach(r => {
    if (!groups[r.date]) groups[r.date] = [];
    groups[r.date].push(r);
  });

  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
    recordList.appendChild(buildDateHeader(date, groups[date]));
    groups[date].forEach(r => {
      recordList.appendChild(buildRecordItem(r));
    });
  });
}

function formatMoney(n) {
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

// ===== 建立記帳卡片（記帳列表 & 帳戶明細共用）=====
function buildRecordItem(r) {
  const item = document.createElement('div');
  item.className = 'record-item record-item-clickable';

  if (r.type === 'transfer') {
    // 轉帳：顯示「A → B」，金額藍字
    const fromName = allAccounts.find(a => a.docId === r.transferFromId)?.name || '?';
    const toName   = allAccounts.find(a => a.docId === r.transferToId)?.name   || '?';
    const metaText = r.note || '無備註';
    item.innerHTML = `
      <div class="record-cat-icon transfer-icon">🔄</div>
      <div class="record-info">
        <div class="record-cat-name">${fromName} → ${toName}</div>
        <div class="record-meta">${metaText}</div>
      </div>
      <div class="record-right">
        <span class="record-amount transfer">$${formatMoney(r.amount)}</span>
        <span class="record-edit-hint">›</span>
      </div>
    `;
  } else {
    const metaText  = [r.accountName, r.note].filter(Boolean).join(' · ') || '無備註';
    const dispEmoji = r.displayEmoji || r.categoryEmoji || '📦';
    const dispName  = r.displayName  || r.categoryName  || '其他';
    item.innerHTML = `
      <div class="record-cat-icon ${r.type}-icon">${dispEmoji}</div>
      <div class="record-info">
        <div class="record-cat-name">${dispName}</div>
        <div class="record-meta">${metaText}</div>
      </div>
      <div class="record-right">
        <span class="record-amount ${r.type}">${r.type === 'income' ? '+' : '-'}$${formatMoney(r.amount)}</span>
        <span class="record-edit-hint">›</span>
      </div>
    `;
  }
  item.addEventListener('click', () => openModal(r));
  return item;
}

// ===== 建立日期分組標題（含當日小計）=====
function buildDateHeader(date, dayRecs) {
  const inc = dayRecs.filter(r => r.type === 'income').reduce((s, r)  => s + r.amount, 0);
  const exp = dayRecs.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);

  const header = document.createElement('div');
  header.className = 'date-group-header';

  const dateSpan = document.createElement('span');
  dateSpan.textContent = formatDateDisplay(date);

  const summarySpan = document.createElement('span');
  summarySpan.className = 'date-group-summary';

  const net = inc - exp;
  const netText = net === 0
    ? `$0`
    : net > 0
      ? `+$${formatMoney(net)}`
      : `-$${formatMoney(Math.abs(net))}`;
  summarySpan.innerHTML = `<span class="${net >= 0 ? 'dgs-income' : 'dgs-expense'}">${netText}</span>`;

  header.appendChild(dateSpan);
  header.appendChild(summarySpan);
  return header;
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

// ===== 帳戶拖曳排序 =====

// ---- 通用拖曳啟動器 ----
function makeDraggable(handle, onMove, onEnd) {
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const mm = (e) => onMove(e.clientX, e.clientY);
    const mu = (e) => {
      document.removeEventListener('mousemove', mm);
      document.removeEventListener('mouseup', mu);
      onEnd(e.clientX, e.clientY);
    };
    document.addEventListener('mousemove', mm);
    document.addEventListener('mouseup', mu);
  });
  handle.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const tm = (e) => { const t = e.touches[0]; onMove(t.clientX, t.clientY); };
    const te = (e) => {
      handle.removeEventListener('touchmove', tm);
      handle.removeEventListener('touchend', te);
      const t = e.changedTouches[0];
      onEnd(t.clientX, t.clientY);
    };
    handle.addEventListener('touchmove', tm, { passive: false });
    handle.addEventListener('touchend', te);
  }, { passive: false });
}

// ---- 類別群組拖曳 ----
let dragSrcGroup = null;

function initGroupDragHandle(header, groupWrap) {
  const handle = header.querySelector('.group-drag-handle');
  if (!handle) return;

  makeDraggable(handle,
    (x, y) => {
      const target = getGroupAt(x, y);
      highlightGroupDragOver(target);
    },
    (x, y) => {
      const target = getGroupAt(x, y);
      finishGroupDrag(header, target);
    }
  );

  handle.addEventListener('mousedown', () => {
    dragSrcGroup = header;
    header.classList.add('dragging');
    groupWrap.classList.add('dragging');
  });
  handle.addEventListener('touchstart', () => {
    dragSrcGroup = header;
    header.classList.add('dragging');
    groupWrap.classList.add('dragging');
  }, { passive: false });
}

function getGroupAt(x, y) {
  const el = document.elementFromPoint(x, y);
  return el ? el.closest('.account-group-header') : null;
}

function highlightGroupDragOver(target) {
  document.querySelectorAll('.account-group-header.drag-over').forEach(el => el.classList.remove('drag-over'));
  if (target && target !== dragSrcGroup) target.classList.add('drag-over');
}

async function finishGroupDrag(srcHeader, targetHeader) {
  document.querySelectorAll('.account-group-header, .account-group-wrap')
    .forEach(el => el.classList.remove('dragging', 'drag-over'));
  dragSrcGroup = null;
  if (!targetHeader || targetHeader === srcHeader) return;

  const allHeaders = [...accountList.querySelectorAll('.account-group-header')];
  const srcIdx = allHeaders.indexOf(srcHeader);
  const dstIdx = allHeaders.indexOf(targetHeader);
  if (srcIdx === -1 || dstIdx === -1) return;

  // 取得目前類別順序
  const typeOrder = allHeaders.map(h => h.dataset.typeName);
  const [moved] = typeOrder.splice(srcIdx, 1);
  typeOrder.splice(dstIdx, 0, moved);

  // 把新的 typeOrder 寫回所有帳戶
  try {
    await Promise.all(allAccounts.map(a => {
      const newTypeOrder = typeOrder.indexOf(a.typeName ?? '其他');
      return updateDoc(doc(db, 'accounts', a.docId), { typeOrder: newTypeOrder });
    }));
  } catch (err) { console.error(err); }
}

// ---- 類別內帳戶項目拖曳 ----
let dragSrcItem = null;

function initItemDragHandle(item, handle, groupWrap) {
  if (!handle) return;

  handle.addEventListener('mousedown', () => {
    dragSrcItem = item;
    item.classList.add('dragging');
  });
  handle.addEventListener('touchstart', () => {
    dragSrcItem = item;
    item.classList.add('dragging');
  }, { passive: false });

  makeDraggable(handle,
    (x, y) => {
      const target = getItemInGroupAt(x, y, groupWrap);
      highlightItemDragOver(target, groupWrap);
    },
    (x, y) => {
      const target = getItemInGroupAt(x, y, groupWrap);
      finishItemDrag(item, target, groupWrap);
    }
  );
}

function getItemInGroupAt(x, y, groupWrap) {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const item = el.closest('.account-item');
  // 只接受同一個 groupWrap 內的項目
  return item && groupWrap.contains(item) ? item : null;
}

function highlightItemDragOver(target, groupWrap) {
  groupWrap.querySelectorAll('.account-item.drag-over').forEach(el => el.classList.remove('drag-over'));
  if (target && target !== dragSrcItem) target.classList.add('drag-over');
}

async function finishItemDrag(srcItem, targetItem, groupWrap) {
  groupWrap.querySelectorAll('.account-item').forEach(el => el.classList.remove('dragging', 'drag-over'));
  dragSrcItem = null;
  if (!targetItem || targetItem === srcItem) return;

  const items = [...groupWrap.querySelectorAll('.account-item')];
  const srcIdx = items.indexOf(srcItem);
  const dstIdx = items.indexOf(targetItem);
  if (srcIdx === -1 || dstIdx === -1) return;

  // 取出該群組的帳戶，依畫面順序重排
  const typeName = groupWrap.dataset.typeName;
  const groupAccounts = allAccounts
    .filter(a => (a.typeName || '其他') === typeName)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const [moved] = groupAccounts.splice(srcIdx, 1);
  groupAccounts.splice(dstIdx, 0, moved);

  try {
    await Promise.all(groupAccounts.map((a, i) =>
      updateDoc(doc(db, 'accounts', a.docId), { order: i })
    ));
  } catch (err) { console.error(err); }
}

// ===== 計算機 =====
let calcExpr = '';   // 目前算式字串（用於顯示）
let calcRaw  = '';   // 實際運算用字串（÷→/ ×→* −→-）

function calcSymbolToOp(sym) {
  if (sym === '÷') return '/';
  if (sym === '×') return '*';
  if (sym === '−') return '-';
  return sym;
}

function updateCalcDisplay() {
  amountInput.value   = calcExpr || '';
  calcExpressionEl.textContent = '';
}

function calcAppend(val) {
  // 只允許數字、小數點、運算符
  if (!/^[0-9+\-−×÷%.]+$/.test(val)) return;
  // 防止連續輸入兩個運算符
  const ops = ['+', '−', '×', '÷', '%'];
  const lastChar = calcExpr.slice(-1);
  if (ops.includes(val) && ops.includes(lastChar)) {
    calcExpr = calcExpr.slice(0, -1);
    calcRaw  = calcRaw.slice(-1) === calcSymbolToOp(lastChar) ? calcRaw.slice(0, -1) : calcRaw;
  }
  // 防止多個小數點
  if (val === '.') {
    const parts = calcExpr.split(/[+\-×÷%]/);
    if (parts[parts.length - 1].includes('.')) return;
  }
  calcExpr += val;
  calcRaw  += calcSymbolToOp(val);
  updateCalcDisplay();
}

function calcEqual() {
  if (!calcRaw) return;
  try {
    // 處理 % 運算：把 "數字%" 轉成 "數字/100"
    const expr = calcRaw.replace(/(\d+\.?\d*)%/g, '($1/100)');
    const result = Function('"use strict"; return (' + expr + ')')();
    if (!isFinite(result)) { calcClear(); return; }
    const rounded = Math.round(result * 100) / 100;
    calcExpressionEl.textContent = calcExpr + ' =';
    calcExpr = String(rounded);
    calcRaw  = String(rounded);
    amountInput.value = calcExpr;
  } catch {
    calcExpressionEl.textContent = '格式錯誤';
    calcExpr = '';
    calcRaw  = '';
    amountInput.value = '';
  }
}

function calcBackspace() {
  if (!calcExpr) return;
  const lastSym = calcExpr.slice(-1);
  calcExpr = calcExpr.slice(0, -1);
  const lastOp = calcRaw.slice(-1);
  // 如果 raw 最後一個字元對應的是符號，一起移除
  if (calcSymbolToOp(lastSym) === lastOp || lastSym === lastOp) {
    calcRaw = calcRaw.slice(0, -1);
  }
  updateCalcDisplay();
}

function calcClear() {
  calcExpr = '';
  calcRaw  = '';
  calcExpressionEl.textContent = '';
  amountInput.value = '';
}

// 電腦鍵盤輸入攔截
amountInput.addEventListener('keydown', (e) => {
  e.preventDefault();
  const key = e.key;
  if (/^[0-9]$/.test(key))         calcAppend(key);
  else if (key === '.')             calcAppend('.');
  else if (key === '+')             calcAppend('+');
  else if (key === '-')             calcAppend('−');
  else if (key === '*')             calcAppend('×');
  else if (key === '/')             calcAppend('÷');
  else if (key === '%')             calcAppend('%');
  else if (key === 'Enter' || key === '=') calcEqual();
  else if (key === 'Backspace')     calcBackspace();
  else if (key === 'Escape' || key === 'Delete') calcClear();
});

// 防止貼上、語音輸入等繞過 keydown 的輸入
amountInput.addEventListener('paste', (e) => e.preventDefault());
amountInput.addEventListener('input', () => {
  // 強制還原成 calcExpr（不允許任何外部修改）
  amountInput.value = calcExpr || '';
});

// 切換計算機顯示
calcToggleBtn.addEventListener('click', () => {
  const isOpen = calcKeyboard.style.display !== 'none';
  calcKeyboard.style.display = isOpen ? 'none' : 'grid';
  calcToggleBtn.classList.toggle('active', !isOpen);
});

// 鍵盤按鈕事件
calcKeyboard.addEventListener('click', (e) => {
  const btn = e.target.closest('.calc-btn');
  if (!btn) return;
  const action = btn.dataset.action;
  const val    = btn.dataset.val;
  if (action === 'clear')     calcClear();
  else if (action === 'backspace') calcBackspace();
  else if (action === 'equal')     calcEqual();
  else if (val)               calcAppend(val);
});

// 重設計算機狀態（在 resetForm 時呼叫）
function resetCalc() {
  calcExpr = '';
  calcRaw  = '';
  calcExpressionEl.textContent = '';
  calcKeyboard.style.display = 'none';
  calcToggleBtn.classList.remove('active');
}

// ===== 初始化 =====
setDefaultDate();
renderCategoryGrid();
renderAccountTypeGrid();
renderMonthLabel();
