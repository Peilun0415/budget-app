import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  limit,
  runTransaction,
  writeBatch
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
  { id: 'loan',     emoji: '🏦', name: '貸款' },
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
let seedingCategories = false;
let categoriesSeededFlagSynced = false;
let unsubTemplates  = null;
let unsubRecurring  = null;
let allRecords     = [];
let allAccounts    = [];
let allCategories  = [];
let allTemplates   = [];
let allRecurring   = [];
let allBudgets     = []; // { docId, type:'month'|'category', amount, categoryId?, categoryName?, categoryEmoji? }
let unsubBudgets   = null;
let editingCatBudgetId = null; // 目前編輯的類別預算 docId
let allProjects    = [];
let unsubProjects  = null;
let currentProjectId = null; // 目前查看的專案 docId
let projectSearchKeyword = '';
let splitMode      = 'equal'; // 'equal' | 'custom'
/** 專案記帳快取（key = projectId），不與 allRecords 合併，僅在專案頁使用 */
let sharedProjectRecords = {};
let unsubSharedProjectRecords = null;
/** 目前 shared records 訂閱的專案 ID 集合（避免每次 projects 更新都重訂閱導致結算區重繪） */
let sharedProjectRecordIdsKey = '';
let tempRewardActivities = []; // 專案 modal 中暫存的回饋活動
let tempEditorUids = [];           // 專案 modal 中暫存的邀請編輯 UID
let tempEditorEmails = [];        // 對應的 email（儲存用）
let tempEditorDisplayNames = [];  // 對應的顯示名稱（列表顯示用）

function getProjectMemberEntries(proj) {
  if (!proj) return [];
  const entries = [];
  const ownerLabel = (proj.ownerDisplayName || '專案建立者').trim();

  const pushEntry = (uid, label) => {
    if (!uid) return;
    const cleanLabel = (label ?? '').trim();
    if (!cleanLabel) return;
    if (entries.some(e => e.uid === uid)) return;
    entries.push({ uid, label: cleanLabel });
  };

  // 1) 先用 uid 架構來源（新/完整資料）
  if (proj.uid) pushEntry(proj.uid, ownerLabel);
  (proj.editorUids || []).forEach((uid, idx) => {
    if (!uid) return;
    const label = (proj.editorDisplayNames?.[idx] || proj.editorEmails?.[idx] || uid).trim();
    pushEntry(uid, label);
  });

  // 2) 補上舊資料：proj.members 可能只有名稱，沒有 uid
  const selfAliases = [
    currentUser?.displayName,
    currentUser?.email,
  ].map(v => (v ?? '').trim()).filter(Boolean);

  (proj.members || []).forEach(m => {
    const name = (m ?? '').trim();
    if (!name) return;
    if (name === '我') {
      if (proj.uid) pushEntry(proj.uid, ownerLabel);
      else pushEntry(`legacy:__owner__`, ownerLabel);
      return;
    }
    // 若這個名稱已存在於 entries，直接跳過
    if (entries.some(e => e.label === name)) return;

    // 若剛好對得上目前登入者的名稱/Email，就用真實 currentUser.uid
    if (currentUser?.uid && selfAliases.includes(name)) {
      const label = (currentUser.displayName || currentUser.email || name).trim();
      pushEntry(currentUser.uid, label);
      return;
    }

    // 其他 uid 不存在的成員，使用 synthetic uid 確保同一名稱能被穩定解析
    pushEntry(`legacy:${name}`, name);
  });

  return entries;
}

function getProjectMemberLabelByUid(proj, uid) {
  if (!uid) return '未命名成員';
  const hit = getProjectMemberEntries(proj).find(m => m.uid === uid);
  return hit?.label || uid;
}

function resolveProjectMemberUid(proj, value, fallbackUid = null) {
  if (!value) return fallbackUid;
  // 舊資料相容：proj.members 可能存的是字面「我」
  if (value === '我' && proj?.uid) return proj.uid;
  const members = getProjectMemberEntries(proj);
  const byUid = members.find(m => m.uid === value);
  if (byUid) return byUid.uid;
  const byLabel = members.find(m => m.label === value);
  if (byLabel) return byLabel.uid;
  return fallbackUid;
}

function getMemberLabel(member, proj) {
  if (!proj) return member;
  const uid = resolveProjectMemberUid(proj, member);
  return uid ? getProjectMemberLabelByUid(proj, uid) : member;
}

function getRecordCreatorLabel(record, proj = null) {
  if (!record) return '使用者';
  const uid = record.uid || '';
  if (uid && uid === currentUser?.uid) {
    return (currentUser?.displayName || currentUser?.email || '使用者').trim() || '使用者';
  }
  if (proj) {
    if (uid && uid === proj.uid) {
      return (proj.ownerDisplayName || '專案建立者').trim();
    }
    const idx = (proj.editorUids || []).indexOf(uid);
    if (idx >= 0) {
      return (proj.editorDisplayNames?.[idx] || proj.editorEmails?.[idx] || '專案成員').trim();
    }
  }
  return '使用者';
}

function resolveRecordSplitPayerUid(record, proj = null) {
  if (!record) return null;
  if (record.splitPayerUid) return record.splitPayerUid;
  if (record.uid && !record.splitPayer) return record.uid;
  const targetProj = proj || (record.projectId ? allProjects.find(p => p.docId === record.projectId) : null);
  return resolveProjectMemberUid(targetProj, record.splitPayer, record.uid || null);
}

function getCurrentUserSplitUid(record) {
  if (!record?.splitData?.length) return currentUser?.uid || null;
  const proj = record.projectId ? allProjects.find(p => p.docId === record.projectId) : null;
  const uidHit = record.splitData.find(s => s.uid && s.uid === currentUser?.uid);
  if (uidHit) return uidHit.uid;
  const members = getProjectMemberEntries(proj);
  const aliases = members.filter(m => m.uid === currentUser?.uid).map(m => m.label);
  const nameHit = record.splitData.find(s => s.name && aliases.includes(s.name));
  if (nameHit) return currentUser?.uid || null;
  if (record.uid === currentUser?.uid) return currentUser?.uid || null;
  return null;
}

function getCurrentUserMemberUid(proj) {
  if (!proj) return currentUser?.uid || null;
  return resolveProjectMemberUid(
    proj,
    currentUser?.uid,
    currentUser?.uid || null
  );
}

function getCurrentUserMemberLabel(proj) {
  const uid = getCurrentUserMemberUid(proj);
  if (!uid) return (currentUser?.displayName || currentUser?.email || '使用者');
  return getProjectMemberLabelByUid(proj, uid);
}

function getCurrentUserSplitPayerLabel(record) {
  const proj = record?.projectId ? allProjects.find(p => p.docId === record.projectId) : null;
  const uid = resolveRecordSplitPayerUid(record, proj);
  if (uid && proj) return getProjectMemberLabelByUid(proj, uid);
  if (uid && uid === currentUser?.uid) return (currentUser?.displayName || currentUser?.email || '使用者');
  return record?.splitPayer || '使用者';
}

function getCurrentUserSplitShare(record) {
  const uid = getCurrentUserSplitUid(record);
  if (!uid) return 0;
  return getMemberShareTwd(record, uid, record?.projectId ? allProjects.find(p => p.docId === record.projectId) : null);
}

function isLegacySelfLabel(value) {
  return value === '我';
}

function resolveLegacySelfToUid(value, proj, fallbackUid) {
  if (isLegacySelfLabel(value)) return fallbackUid || currentUser?.uid || null;
  return resolveProjectMemberUid(proj, value, fallbackUid);
}

function normalizeSplitMemberUid(splitItem, proj, fallbackUid = null) {
  if (!splitItem) return null;
  if (splitItem.uid) return splitItem.uid;
  return resolveLegacySelfToUid(splitItem.name, proj, fallbackUid);
}

function normalizeSplitPayerUid(record, proj, fallbackUid = null) {
  if (!record) return null;
  if (record.splitPayerUid) return record.splitPayerUid;
  return resolveLegacySelfToUid(record.splitPayer, proj, fallbackUid || record.uid || null);
}

function hasSplitForCurrentUser(record) {
  const uid = getCurrentUserSplitUid(record);
  if (!uid || !record?.splitData?.length) return false;
  return record.splitData.some(s => normalizeSplitMemberUid(s, record.projectId ? allProjects.find(p => p.docId === record.projectId) : null) === uid);
}

function isCurrentUserSplitPayerByUid(record) {
  const payerUid = resolveRecordSplitPayerUid(record);
  return !!payerUid && payerUid === currentUser?.uid;
}

function isCurrentUserSplitPayer(record) {
  return isCurrentUserSplitPayerByUid(record);
}

function getCurrentUserSplitName(record) {
  const uid = getCurrentUserSplitUid(record);
  if (!uid) return (currentUser?.displayName || currentUser?.email || '使用者');
  const proj = record.projectId ? allProjects.find(p => p.docId === record.projectId) : null;
  if (proj) return getProjectMemberLabelByUid(proj, uid);
  return (currentUser?.displayName || currentUser?.email || uid);
}
// 固定收支彈窗暫存的分類選擇
let recSelectedCategory    = null;
let recSelectedSubCategory = null;
let currentPage = 'home';
let detailAccountId  = null;   // 目前查看明細的帳戶 ID
let detailMode       = 'month'; // 'month' | 'range' | 'all'
let detailViewYear   = new Date().getFullYear();
let detailViewMonth  = new Date().getMonth();
let detailRangeStart = '';
let detailRangeEnd   = '';
let suppressForeignAutoConvert = false;
let lastAutoFilledAmount = null;
let fxRatesToTwd = {};
let fxRatesDate = '';
let fxRatesUpdatedAt = '';
let fxRatesPromise = null;

const FX_CACHE_KEY = 'budgetweb.fx.latest.v1';
const FX_SUPPORTED_CURRENCIES = ['USD', 'JPY', 'EUR', 'KRW', 'HKD', 'GBP', 'AUD', 'SGD', 'THB', 'CNY'];
const FX_ZERO_DECIMAL_CURRENCIES = new Set(['TWD', 'JPY', 'KRW']);

try {
  const raw = localStorage.getItem(FX_CACHE_KEY);
  if (raw) {
    const cached = JSON.parse(raw);
    fxRatesToTwd = cached?.rates || {};
    fxRatesDate = cached?.date || '';
    fxRatesUpdatedAt = cached?.updatedAt || '';
  }
} catch (err) {
  console.warn('讀取匯率快取失敗', err);
}

// ===== DOM — 通用 =====
const loginScreen    = document.getElementById('loginScreen');
const appScreen      = document.getElementById('appScreen');
const googleLoginBtn  = document.getElementById('googleLoginBtn');
const logoutBtn       = document.getElementById('logoutBtn');
const userAvatar      = document.getElementById('userAvatar');
const userAvatarFallback = document.getElementById('userAvatarFallback');
const settingsAccountName = document.getElementById('settingsAccountName');
const settingsAccountSub  = document.getElementById('settingsAccountSub');
const guestLoginBtn   = document.getElementById('guestLoginBtn');
const guestNameInput  = document.getElementById('guestNameInput');
const guestPassInput  = document.getElementById('guestPassInput');
const guestLoginWarn  = document.getElementById('guestLoginWarn');
const guestTabLogin   = document.getElementById('guestTabLogin');
const guestTabRegister = document.getElementById('guestTabRegister');
let   guestMode       = 'login'; // 'login' | 'register'
const pageTitle      = document.getElementById('pageTitle');
const pageHome       = document.getElementById('pageHome');
const pageAccounts   = document.getElementById('pageAccounts');
const pageReport     = document.getElementById('pageReport');
const navHome        = document.getElementById('navHome');
const navReportBtn   = document.getElementById('navReport');
const navAccountsBtn = document.getElementById('navAccounts');

// ===== DOM — 記帳 =====
const modalOverlay      = document.getElementById('modalOverlay');
const recordModalTitle  = document.getElementById('recordModalTitle');
const recordEditId      = document.getElementById('recordEditId');
const deleteRecordBtn   = document.getElementById('deleteRecordBtn');
const openFormBtn   = document.getElementById('openFormBtn');
const closeFormBtn  = document.getElementById('closeFormBtn');
const recordForm    = document.getElementById('recordForm');
const recordModalEditor    = document.getElementById('recordModalEditor');
const recordReadOnlyPanel  = document.getElementById('recordReadOnlyPanel');
const recordReadOnlyBody   = document.getElementById('recordReadOnlyBody');
const btnExpense    = document.getElementById('btnExpense');
const btnIncome     = document.getElementById('btnIncome');
const btnTransfer   = document.getElementById('btnTransfer');
const accountGroup  = document.getElementById('accountGroup');
const transferGroup = document.getElementById('transferGroup');
const transferFrom        = document.getElementById('transferFrom');
const transferTo          = document.getElementById('transferTo');
const exchangeToggleBtn   = document.getElementById('exchangeToggleBtn');
let   exchangeOn          = false; // 換匯開關狀態
const exchangeAmountGroup = document.getElementById('exchangeAmountGroup');
const exchangeAmountInput = document.getElementById('exchangeAmount');
const exchangeHint        = document.getElementById('exchangeHint');
const categoryGrid     = document.getElementById('categoryGrid');
const catPickBtn       = document.getElementById('catPickBtn');
const catPickEmoji     = document.getElementById('catPickEmoji');
const catPickName      = document.getElementById('catPickName');
const catPickerOverlay = document.getElementById('catPickerOverlay');
const closeCatPickerBtn = document.getElementById('closeCatPickerBtn');
const catPickerParents = document.getElementById('catPickerParents');
const catPickerSubs    = document.getElementById('catPickerSubs');
const amountInput      = document.getElementById('amount');
const amountLabelEl    = document.querySelector('label[for="amount"]');
const amountInputWrap  = document.getElementById('amountInputWrap');
const amountCurrencySign = amountInputWrap?.querySelector('.currency-sign');
const calcToggleBtn    = document.getElementById('calcToggleBtn');
const calcKeyboard     = document.getElementById('calcKeyboard');
const calcExpressionEl = document.getElementById('calcExpression');

// 讓點擊「金額」區塊（包含圖示/貨幣符號）時直接聚焦 amount，開啟數字鍵盤
amountInputWrap?.addEventListener('pointerdown', (e) => {
  if (!amountInput) return;
  // 若已點到 input 本體，交由原本行為處理即可
  if (e.target && e.target.closest && e.target.closest('#amount')) return;
  // 若點到計算機切換鍵，不要強制開啟輸入鍵盤
  if (e.target && e.target.closest && e.target.closest('#calcToggleBtn')) return;
  // 只放行 amount 的編輯，其他 input 仍由 modal lock 機制鎖住
  amountInput.readOnly = false;
  amountInput.focus();
});
const dateInput     = document.getElementById('date');
const noteInput            = document.getElementById('note');
const foreignAmountGroup   = document.getElementById('foreignAmountGroup');
const foreignToggleBtn     = document.getElementById('foreignToggleBtn');
const foreignToggleLabel   = document.getElementById('foreignToggleLabel');
const foreignAmountRow     = document.getElementById('foreignAmountRow');
const foreignCurrencyInput = document.getElementById('foreignCurrency');
const foreignAmountInput   = document.getElementById('foreignAmount');
const foreignClearBtn      = document.getElementById('foreignClearBtn');
const foreignRateHint      = document.createElement('div');
foreignRateHint.id = 'foreignRateHint';
Object.assign(foreignRateHint.style, {
  display: 'none',
  marginTop: '6px',
  fontSize: '12px',
  color: 'var(--text-mid)',
  lineHeight: '1.5',
});
foreignAmountRow.insertAdjacentElement('afterend', foreignRateHint);

function resetForeignAmountUI({ clearValues = false } = {}) {
  foreignAmountRow.style.display = 'none';
  foreignToggleLabel.textContent = '＋ 外幣金額';
  foreignRateHint.style.display = 'none';
  foreignRateHint.textContent = '';
  if (clearValues) {
    foreignCurrencyInput.value = '';
    foreignAmountInput.value = '';
  }
}

foreignToggleBtn.addEventListener('click', () => {
  if (isForeignPrimaryMode()) {
    syncForeignAccountUI();
    return;
  }
  const open = foreignAmountRow.style.display !== 'none';
  if (open) {
    resetForeignAmountUI({ clearValues: isSelectedForeignAccount() });
  } else {
    foreignAmountRow.style.display = '';
    foreignToggleLabel.textContent = '− 外幣金額';
  }
  if (open) {
    foreignCurrencyInput.value = '';
    foreignAmountInput.value   = '';
  }
  syncForeignAccountUI();
});

foreignClearBtn.addEventListener('click', () => {
  if (!isSelectedForeignAccount()) {
    foreignCurrencyInput.value = '';
    resetForeignAmountUI();
  }
  foreignAmountInput.value   = '';
  maybeAutoConvertForeignIncome();
  syncForeignAccountUI();
});
const submitBtn     = document.getElementById('submitBtn');
const saveTplBtn          = document.getElementById('saveTplBtn');
const duplicateRecordBtn  = document.getElementById('duplicateRecordBtn');
const openTplListBtn  = document.getElementById('openTplListBtn');
const tplListOverlay  = document.getElementById('tplListOverlay');
const closeTplListBtn = document.getElementById('closeTplListBtn');
const tplList         = document.getElementById('tplList');
const tplEmpty        = document.getElementById('tplEmpty');
const tplNameOverlay  = document.getElementById('tplNameOverlay');
const closeTplNameBtn = document.getElementById('closeTplNameBtn');
const tplNameInput    = document.getElementById('tplNameInput');
const confirmSaveTplBtn = document.getElementById('confirmSaveTplBtn');
const tplNameModalTitle = document.getElementById('tplNameModalTitle');
/** 正在編輯的範本 docId；null 表示新增 */
let tplEditingId = null;
const accountSelect = document.getElementById('accountSelect');
const recordList    = document.getElementById('recordList');
const emptyState    = document.getElementById('emptyState');
const searchInput    = document.getElementById('searchInput');
const searchClearBtn = document.getElementById('searchClearBtn');
const searchBarWrap  = document.getElementById('searchBarWrap');
const listTitle      = document.getElementById('listTitle');
const homeMonthNav   = document.getElementById('homeMonthNav');
const homeSummary    = document.getElementById('homeSummary');
const homeFilterBtn  = document.getElementById('homeFilterBtn');
const homeFilterOverlay = document.getElementById('homeFilterOverlay');
const closeHomeFilterBtn = document.getElementById('closeHomeFilterBtn');
const clearHomeFilterBtn = document.getElementById('clearHomeFilterBtn');
const applyHomeFilterBtn = document.getElementById('applyHomeFilterBtn');
const homeFilterTypeChips = document.getElementById('homeFilterTypeChips');
const homeFilterCategoryList = document.getElementById('homeFilterCategoryList');
const homeFilterAccountList = document.getElementById('homeFilterAccountList');
const homeFilterDateFromEl = document.getElementById('homeFilterDateFrom');
const homeFilterDateToEl = document.getElementById('homeFilterDateTo');
let   searchKeyword  = '';
let   homeFilter = {
  types: [],
  categoryIds: [],
  accountIds: [],
  dateFrom: '',
  dateTo: '',
};
let homeFilterDateFromPicker = null;
let homeFilterDateToPicker = null;
const totalIncome   = document.getElementById('totalIncome');
const totalExpense  = document.getElementById('totalExpense');
const totalBalance  = document.getElementById('totalBalance');
const summaryTrendBadge = document.getElementById('summaryTrendBadge');
const currentMonthLabel = document.getElementById('currentMonthLabel');
const prevMonthBtn  = document.getElementById('prevMonth');
const nextMonthBtn  = document.getElementById('nextMonth');
const homeTodayBtn  = document.getElementById('homeTodayBtn');

// ===== DOM — 帳戶 =====
const accountModalOverlay  = document.getElementById('accountModalOverlay');
const openAccountFormBtn   = document.getElementById('openAccountFormBtn');
const closeAccountFormBtn  = document.getElementById('closeAccountFormBtn');
const accountForm          = document.getElementById('accountForm');
const accountTypeGrid      = document.getElementById('accountTypeGrid');
const accountNameInput     = document.getElementById('accountName');
const accountBalanceInput  = document.getElementById('accountBalance');
const accountNoteInput     = document.getElementById('accountNote');
const accountCurrencyInput      = document.getElementById('accountCurrency');
const accountIncludeInTotal     = document.getElementById('accountIncludeInTotal');
const accountSubmitBtn     = document.getElementById('accountSubmitBtn');
const accountEditId        = document.getElementById('accountEditId');
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
const detailRewardPeriod = document.getElementById('detailRewardPeriod');

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
const detailTodayBtn     = document.getElementById('detailTodayBtn');
const detailRangeStartEl = document.getElementById('detailRangeStart');
const detailRangeEndEl   = document.getElementById('detailRangeEnd');
const billingCycleBar    = document.getElementById('billingCycleBar');
const billingCycleBtn    = document.getElementById('billingCycleBtn');
const accountDetailAddRecordBtn = document.getElementById('accountDetailAddRecordBtn');

// ===== DOM — 專案 =====
const pageProjects          = document.getElementById('pageProjects');
const pageProjectDetail     = document.getElementById('pageProjectDetail');
const navProjectsBtn        = document.getElementById('navProjects');
const addProjectBtn         = document.getElementById('addProjectBtn');
const projectList           = document.getElementById('projectList');
const projectEmpty          = document.getElementById('projectEmpty');
const projectModalOverlay   = document.getElementById('projectModalOverlay');
const projectModalTitle     = document.getElementById('projectModalTitle');
const closeProjectModalBtn  = document.getElementById('closeProjectModalBtn');
const projectForm           = document.getElementById('projectForm');
const projectNameInput      = document.getElementById('projectNameInput');
const projectMembersInput   = document.getElementById('projectMembersInput');
const projectCurrencySelect = document.getElementById('projectCurrencySelect');
const projectRateToTwdInput = document.getElementById('projectRateToTwdInput');
const projectInviteEditorsWrap = document.getElementById('projectInviteEditorsWrap');
const projectInviteEmailInput = document.getElementById('projectInviteEmailInput');
const projectInviteBtn = document.getElementById('projectInviteBtn');
const projectEditorsList = document.getElementById('projectEditorsList');
const projectDateRangeInput = document.getElementById('projectDateRangeInput');
const projectStartInput     = document.getElementById('projectStartInput');
const projectEndInput       = document.getElementById('projectEndInput');
const projectEditId         = document.getElementById('projectEditId');
const projectSubmitBtn      = document.getElementById('projectSubmitBtn');
const deleteProjectBtn      = document.getElementById('deleteProjectBtn');
const projectDetailName     = document.getElementById('projectDetailName');
const projectDetailDates    = document.getElementById('projectDetailDates');
const projectDetailMembers  = document.getElementById('projectDetailMembers');
const projectSettleSummary  = document.getElementById('projectSettleSummary');
const projectRecordList     = document.getElementById('projectRecordList');
const projectRecordSectionTitle = document.getElementById('projectRecordSectionTitle');
const projectSearchInput    = document.getElementById('projectSearchInput');
const projectSearchClearBtn = document.getElementById('projectSearchClearBtn');
const projectActiveBar      = document.getElementById('projectActiveBar');
const projectActiveTitle    = document.getElementById('projectActiveTitle');
const projectActiveHint     = document.getElementById('projectActiveHint');
const projectActiveToggle   = document.getElementById('projectActiveToggle');
const projectActiveToggleWrap = document.getElementById('projectActiveToggleWrap');
const projectEditBtn        = document.getElementById('projectEditBtn');
const projectReportBtn      = document.getElementById('projectReportBtn');
const projectReportModalOverlay = document.getElementById('projectReportModalOverlay');
const closeProjectReportModalBtn = document.getElementById('closeProjectReportModalBtn');
const projectReportMemberSelect = document.getElementById('projectReportMemberSelect');
const projectReportPayerSelect = document.getElementById('projectReportPayerSelect');
const projectReportCheckAll = document.getElementById('projectReportCheckAll');
const projectReportTableBody = document.getElementById('projectReportTableBody');
const projectReportTotalAmount = document.getElementById('projectReportTotalAmount');
const exportProjectReportCsvBtn = document.getElementById('exportProjectReportCsvBtn');

let currentReportRecs = [];
const recordProjectSelect   = document.getElementById('recordProjectSelect');
const recordProjectGroup    = document.getElementById('recordProjectGroup');
const recordProjectToggle   = document.getElementById('recordProjectToggle');
const recordProjectSelectWrap = document.getElementById('recordProjectSelectWrap');
const rewardActivityGroup   = document.getElementById('rewardActivityGroup');
const rewardActivityChecklist = document.getElementById('rewardActivityChecklist');
const rewardActivityClearBtn = document.getElementById('rewardActivityClearBtn');
const rewardActivityModalOverlay   = document.getElementById('rewardActivityModalOverlay');
const rewardActivityModalList     = document.getElementById('rewardActivityModalList');
const addRewardInModalBtn         = document.getElementById('addRewardInModalBtn');
const saveRewardActivityBtn       = document.getElementById('saveRewardActivityBtn');
const closeRewardActivityModalBtn = document.getElementById('closeRewardActivityModalBtn');
const projectRewardSection  = document.getElementById('projectRewardSection');
const projectRewardList     = document.getElementById('projectRewardList');
const projectRewardManageBtn = document.getElementById('projectRewardManageBtn');
const splitGroup            = document.getElementById('splitGroup');
const splitEnableToggle     = document.getElementById('splitEnableToggle');
const splitDetail           = document.getElementById('splitDetail');
const splitPayer            = document.getElementById('splitPayer');
const splitEqualToggle      = document.getElementById('splitEqualToggle');
const splitSelectAll        = document.getElementById('splitSelectAll');
const splitMemberList       = document.getElementById('splitMemberList');
const splitCard             = document.getElementById('splitCard');

// ===== DOM — 分類管理 =====
const pageCategories    = document.getElementById('pageCategories');
const pageSettings      = document.getElementById('pageSettings');
const pageRecurring     = document.getElementById('pageRecurring');
const pageBudget        = document.getElementById('pageBudget');
const navSettingsBtn    = document.getElementById('navSettings');
const backToTopBtn      = document.getElementById('backToTopBtn');
const fabAddRecordBtn   = document.getElementById('fabAddRecordBtn');
const goBudgetBtn       = document.getElementById('goBudget');
const goRecurringBtn    = document.getElementById('goRecurring');
const goCategoriesBtn   = document.getElementById('goCategories');
const goDefaultDebitAccountBtn = document.getElementById('goDefaultDebitAccount');
const defaultDebitAccountOverlay = document.getElementById('defaultDebitAccountOverlay');
const defaultDebitAccountSelect = document.getElementById('defaultDebitAccountSelect');
const defaultDebitAccountDesc = document.getElementById('defaultDebitAccountDesc');
const closeDefaultDebitAccountBtn = document.getElementById('closeDefaultDebitAccountBtn');
const saveDefaultDebitAccountBtn = document.getElementById('saveDefaultDebitAccountBtn');
// 主頁預算小卡 DOM
const homeBudgetWidget     = document.getElementById('homeBudgetWidget');
const homeBudgetContent    = document.getElementById('homeBudgetContent');
// 語音記帳 DOM
const voiceBtn             = document.getElementById('voiceBtn');
const voiceToast           = document.getElementById('voiceToast');
const voiceToastText       = document.getElementById('voiceToastText');
const homeBudgetMoreBtn    = document.getElementById('homeBudgetMoreBtn');
// 預算 DOM
const editMonthBudgetBtn   = document.getElementById('editMonthBudgetBtn');
const budgetMonthEmpty     = document.getElementById('budgetMonthEmpty');
const budgetMonthInfo      = document.getElementById('budgetMonthInfo');
const budgetMonthSpent     = document.getElementById('budgetMonthSpent');
const budgetMonthLimit     = document.getElementById('budgetMonthLimit');
const budgetMonthBar       = document.getElementById('budgetMonthBar');
const budgetMonthPct       = document.getElementById('budgetMonthPct');
const monthBudgetOverlay   = document.getElementById('monthBudgetOverlay');
const closeMonthBudgetBtn  = document.getElementById('closeMonthBudgetBtn');
const monthBudgetInput     = document.getElementById('monthBudgetInput');
const saveMonthBudgetBtn   = document.getElementById('saveMonthBudgetBtn');
const deleteMonthBudgetBtn = document.getElementById('deleteMonthBudgetBtn');
const excludeCatGrid       = document.getElementById('excludeCatGrid');
const addCatBudgetBtn      = document.getElementById('addCatBudgetBtn');
const catBudgetList        = document.getElementById('catBudgetList');
const catBudgetEmpty       = document.getElementById('catBudgetEmpty');
const catBudgetOverlay     = document.getElementById('catBudgetOverlay');
const catBudgetModalTitle  = document.getElementById('catBudgetModalTitle');
const closeCatBudgetBtn    = document.getElementById('closeCatBudgetBtn');
const catBudgetCatGrid     = document.getElementById('catBudgetCatGrid');
const catBudgetAmtInput    = document.getElementById('catBudgetAmtInput');
const saveCatBudgetBtn     = document.getElementById('saveCatBudgetBtn');
const deleteCatBudgetBtn   = document.getElementById('deleteCatBudgetBtn');
const clearAllDataBtn      = document.getElementById('clearAllDataBtn');
const exportDataBtn        = document.getElementById('exportDataBtn');
const exportModalOverlay   = document.getElementById('exportModalOverlay');
const closeExportModalBtn  = document.getElementById('closeExportModalBtn');
const exportCsvBtn         = document.getElementById('exportCsvBtn');
const exportJsonBtn        = document.getElementById('exportJsonBtn');
const exportIncludeIds     = document.getElementById('exportIncludeIds');
const clearDataOverlay     = document.getElementById('clearDataOverlay');
const closeClearDataBtn    = document.getElementById('closeClearDataBtn');
const clearDataConfirmInput = document.getElementById('clearDataConfirmInput');
const clearDataProgress    = document.getElementById('clearDataProgress');
const confirmClearDataBtn  = document.getElementById('confirmClearDataBtn');
const cancelClearDataBtn   = document.getElementById('cancelClearDataBtn');
const recurringList     = document.getElementById('recurringList');
const recurringEmpty    = document.getElementById('recurringEmpty');
const openRecurringFormBtn  = document.getElementById('openRecurringFormBtn');
const recurringModalOverlay = document.getElementById('recurringModalOverlay');
const closeRecurringFormBtn = document.getElementById('closeRecurringFormBtn');
const recurringForm         = document.getElementById('recurringForm');
const recurringModalTitle   = document.getElementById('recurringModalTitle');
const recBtnExpense   = document.getElementById('recBtnExpense');
const recBtnIncome    = document.getElementById('recBtnIncome');
const recBtnTransfer  = document.getElementById('recBtnTransfer');
const recNameInput    = document.getElementById('recName');
const recAmountInput      = document.getElementById('recAmount');
const recAmountInputWrap  = document.getElementById('recAmountInputWrap');
const recAmountRow        = document.getElementById('recAmountRow');
const recCalcToggleBtn    = document.getElementById('recCalcToggleBtn');
const recCalcKeyboard     = document.getElementById('recCalcKeyboard');
const recCalcExpressionEl = document.getElementById('recCalcExpression');
const recCatPickBtn   = document.getElementById('recCatPickBtn');
const recCatPickEmoji = document.getElementById('recCatPickEmoji');
const recCatPickName  = document.getElementById('recCatPickName');
const recAccountGroup = document.getElementById('recAccountGroup');
const recAccountSel   = document.getElementById('recAccount');
const recTransferGroup = document.getElementById('recTransferGroup');
const recTransferFrom  = document.getElementById('recTransferFrom');
const recTransferTo    = document.getElementById('recTransferTo');
const recFreqN        = document.getElementById('recFreqN');
const recFreqUnit     = document.getElementById('recFreqUnit');
const recWeekdayGroup   = document.getElementById('recWeekdayGroup');
const recWeekdayPicker  = document.getElementById('recWeekdayPicker');
const recMonthdayGroup  = document.getElementById('recMonthdayGroup');
const recMonthdayPicker = document.getElementById('recMonthdayPicker');
const recYeardayGroup   = document.getElementById('recYeardayGroup');
const recYearMonth      = document.getElementById('recYearMonth');
const recYearDay        = document.getElementById('recYearDay');
const recStartDate    = document.getElementById('recStartDate');
const recNoteInput    = document.getElementById('recNote');
const recEditIdInput  = document.getElementById('recEditId');
const recDeleteBtn    = document.getElementById('recDeleteBtn');
const recSubmitBtn    = document.getElementById('recSubmitBtn');
let recCalcRaw  = '';
let recCalcExpr = '';
// navCategoriesBtn 已被移除，保留變數避免後面程式碼報錯
const navCategoriesBtn  = null;
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
const splashScreen = document.getElementById('splashScreen');
function hideSplash() {
  splashScreen.classList.add('hidden');
}

let initialLoadStatus = {
  records: false,
  accounts: false,
  categories: false,
  templates: false,
  recurring: false,
  budgets: false,
  projects: false
};

let initialLoadTimeout = null;

function checkInitialLoad() {
  if (
    initialLoadStatus.records &&
    initialLoadStatus.accounts &&
    initialLoadStatus.categories &&
    initialLoadStatus.templates &&
    initialLoadStatus.recurring &&
    initialLoadStatus.budgets &&
    initialLoadStatus.projects
  ) {
    if (initialLoadTimeout) {
      clearTimeout(initialLoadTimeout);
      initialLoadTimeout = null;
    }
    hideSplash();
  }
}

function resetInitialLoad() {
  initialLoadStatus = {
    records: false,
    accounts: false,
    categories: false,
    templates: false,
    recurring: false,
    budgets: false,
    projects: false
  };
  if (initialLoadTimeout) clearTimeout(initialLoadTimeout);
  // 最多等待 5 秒，避免因為網路或權限問題卡在載入畫面
  initialLoadTimeout = setTimeout(() => {
    console.warn('Initial load timeout, hiding splash screen.');
    hideSplash();
  }, 5000);
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    resetInitialLoad();
    currentUser = user;
    // 寫入/更新 users 集合，供專案邀請時以 email 查詢
    const email = (user.email || '').trim().toLowerCase();
    const displayName = (user.displayName || user.email || '').trim() || '使用者';
    if (email) {
      setDoc(doc(db, 'users', user.uid), { uid: user.uid, email, displayName }, { merge: true }).catch(() => {});
    }
    showApp(user);
    subscribeRecords();
    subscribeAccounts();
    subscribeCategories();
    subscribeTemplates();
    subscribeRecurring();
    subscribeBudgets();
    subscribeProjects();
  } else {
    hideSplash();
    currentUser = null;
    showLogin();
    if (unsubRecords)     { unsubRecords();     unsubRecords     = null; }
    if (unsubAccounts)    { unsubAccounts();    unsubAccounts    = null; }
    if (unsubCategories)  { unsubCategories();  unsubCategories  = null; }
    if (unsubTemplates)   { unsubTemplates();   unsubTemplates   = null; }
    if (unsubRecurring)   { unsubRecurring();   unsubRecurring   = null; }
    if (unsubBudgets)     { unsubBudgets();     unsubBudgets     = null; }
    if (unsubProjects)    { unsubProjects();    unsubProjects    = null; }
    allRecords    = [];
    allAccounts   = [];
    allTemplates  = [];
    allRecurring  = [];
    categoriesSeededFlagSynced = false;
    allCategories = [];
    allBudgets    = [];
    allProjects   = [];
    sharedProjectRecords = {};
    sharedProjectRecordIdsKey = '';
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

// ===== 訪客登入（暱稱 + 密碼）=====
guestTabLogin.addEventListener('click', () => setGuestMode('login'));
guestTabRegister.addEventListener('click', () => setGuestMode('register'));

function setGuestMode(mode) {
  guestMode = mode;
  guestTabLogin.classList.toggle('active', mode === 'login');
  guestTabRegister.classList.toggle('active', mode === 'register');
  guestLoginBtn.textContent = mode === 'login' ? '登入' : '註冊';
  guestLoginWarn.textContent = '';
}

guestLoginBtn.addEventListener('click', () => doGuestAuth());
guestPassInput.addEventListener('keydown', e => { if (e.key === 'Enter') doGuestAuth(); });

async function doGuestAuth() {
  const name = guestNameInput.value.trim();
  const pass = guestPassInput.value;

  if (!name) {
    guestLoginWarn.textContent = '請輸入暱稱';
    guestNameInput.focus();
    return;
  }
  if (pass.length < 6) {
    guestLoginWarn.textContent = '密碼至少需要 6 位';
    guestPassInput.focus();
    return;
  }

  // 暱稱轉成合法 email 格式
  const email = `${encodeURIComponent(name).toLowerCase()}@guest.app`;
  guestLoginWarn.textContent = '';
  guestLoginBtn.disabled = true;
  guestLoginBtn.textContent = guestMode === 'login' ? '登入中...' : '註冊中...';

  try {
    if (guestMode === 'register') {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
    } else {
      await signInWithEmailAndPassword(auth, email, pass);
    }
  } catch (err) {
    console.error(err);
    const code = err.code;
    if (code === 'auth/email-already-in-use') {
      guestLoginWarn.textContent = '此暱稱已被註冊，請直接登入或換一個暱稱';
    } else if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      guestLoginWarn.textContent = '暱稱或密碼錯誤，或尚未註冊';
    } else if (code === 'auth/wrong-password') {
      guestLoginWarn.textContent = '密碼錯誤';
    } else {
      guestLoginWarn.textContent = `登入失敗（${code}）`;
    }
  } finally {
    guestLoginBtn.disabled = false;
    guestLoginBtn.textContent = guestMode === 'login' ? '登入' : '註冊';
  }
}

function showLogin() {
  loginScreen.style.display = 'flex';
  appScreen.style.display   = 'none';
  guestNameInput.value = '';
  guestPassInput.value = '';
  guestLoginWarn.textContent = '';
  setGuestMode('login');
}

function showApp(user) {
  loginScreen.style.display = 'none';
  appScreen.style.display   = 'block';

  const isNickname = !user.photoURL && user.displayName;
  const displayName = user.displayName || user.email || '使用者';
  if (settingsAccountName) settingsAccountName.textContent = displayName;
  if (settingsAccountSub) {
    if (isNickname) {
      settingsAccountSub.textContent = '訪客帳號';
    } else if (user.email && user.displayName) {
      settingsAccountSub.textContent = user.email;
    } else {
      settingsAccountSub.textContent = user.email ? '' : '已登入';
    }
  }

  userAvatar?.classList.remove('visible');
  userAvatarFallback?.classList.remove('hidden');
  if (user.photoURL && userAvatar) {
    userAvatar.src = user.photoURL;
    userAvatar.classList.add('visible');
    userAvatarFallback?.classList.add('hidden');
  }
}

// ===== 頁面切換：pushState 與 popstate（明細／專案／設定子頁可用「上一頁」；離開時自動清歷程）=====
const HIST_STATE_ACCOUNT_DETAIL  = 'accountDetail';
const HIST_STATE_PROJECT_DETAIL  = 'projectDetail';
const HIST_STATE_SETTINGS_SUB   = 'settingsSub';
const HIST_STATE_BUDGET_FROM_HOME = 'budgetFromHome';

let _histNavPending = null;
let pushedFromSettings = false;
let pushedBudgetFromHome = false;

function goToAccountsList() {
  const st = history.state;
  if (st && st._page === HIST_STATE_ACCOUNT_DETAIL && st.accountId) {
    history.back();
    return;
  }
  switchPage('accounts');
}

function goToProjectsList() {
  const st = history.state;
  if (st && st._page === HIST_STATE_PROJECT_DETAIL && st.projectId) {
    history.back();
    return;
  }
  switchPage('projects');
}

function goToSettingsFromSub() {
  if (history.state?._page === HIST_STATE_SETTINGS_SUB) {
    history.back();
    return;
  }
  switchPage('settings');
}

function goToHomeFromBudget() {
  if (history.state?._page === HIST_STATE_BUDGET_FROM_HOME) {
    history.back();
    return;
  }
  switchPage('home');
}

function navigateToPage(page) {
  const st = history.state;
  if (st && st._page === HIST_STATE_ACCOUNT_DETAIL && st.accountId) {
    if (page === 'accounts' && currentPage === 'accountDetail') {
      goToAccountsList();
      return;
    }
    if (page === 'accountDetail' || page === 'accounts') {
      switchPage(page);
      return;
    }
    _histNavPending = { page };
    history.back();
    return;
  }
  if (st && st._page === HIST_STATE_PROJECT_DETAIL && st.projectId) {
    if (page === 'projects' && currentPage === 'projectDetail') {
      goToProjectsList();
      return;
    }
    if (page === 'projectDetail' || page === 'projects') {
      switchPage(page);
      return;
    }
    _histNavPending = { page };
    history.back();
    return;
  }
  if (st && st._page === HIST_STATE_SETTINGS_SUB && st.sub) {
    if (page === 'settings' && ['budget', 'recurring', 'categories'].includes(currentPage)) {
      goToSettingsFromSub();
      return;
    }
    if (page === st.sub) {
      switchPage(page);
      return;
    }
    if (['budget', 'recurring', 'categories'].includes(page) && page !== st.sub) {
      try {
        history.replaceState({ _page: HIST_STATE_SETTINGS_SUB, sub: page }, '', location.href);
      } catch { /* empty */ }
      pushedFromSettings = true;
      switchPage(page);
      return;
    }
    if (!['settings', 'budget', 'recurring', 'categories'].includes(page)) {
      _histNavPending = { page };
      history.back();
      return;
    }
    switchPage(page);
    return;
  }
  if (st && st._page === HIST_STATE_BUDGET_FROM_HOME) {
    if (page === 'home' && currentPage === 'budget') {
      goToHomeFromBudget();
      return;
    }
    if (page === 'budget') {
      switchPage('budget');
      return;
    }
    _histNavPending = { page };
    history.back();
    return;
  }
  switchPage(page);
}

navHome.addEventListener('click', () => navigateToPage('home'));
navAccountsBtn.addEventListener('click', () => {
  if (currentPage === 'accountDetail') goToAccountsList();
  else navigateToPage('accounts');
});
navReportBtn.addEventListener('click', () => navigateToPage('report'));
navSettingsBtn.addEventListener('click', () => {
  if (['budget', 'recurring', 'categories'].includes(currentPage) && history.state?._page === HIST_STATE_SETTINGS_SUB) {
    goToSettingsFromSub();
    return;
  }
  navigateToPage('settings');
});
backToAccountsBtn.addEventListener('click', () => goToAccountsList());

window.addEventListener('popstate', (e) => {
  if (_histNavPending) {
    const p = _histNavPending.page;
    _histNavPending = null;
    pushedFromSettings = false;
    pushedBudgetFromHome = false;
    switchPage(p);
    return;
  }
  const st = e.state;
  if (st && st._page === HIST_STATE_ACCOUNT_DETAIL && st.accountId) {
    const acc = allAccounts.find(a => a.docId === st.accountId);
    if (acc) {
      showAccountDetailView(acc);
    } else {
      switchPage('accounts');
    }
    return;
  }
  if (st && st._page === HIST_STATE_PROJECT_DETAIL && st.projectId) {
    const proj = allProjects.find(p => p.docId === st.projectId);
    if (proj) {
      showProjectDetailView(proj);
    } else {
      switchPage('projects');
    }
    return;
  }
  if (st && st._page === HIST_STATE_SETTINGS_SUB && st.sub) {
    pushedFromSettings = true;
    if (['budget', 'recurring', 'categories'].includes(st.sub)) {
      switchPage(st.sub);
    } else {
      switchPage('settings');
    }
    return;
  }
  if (st && st._page === HIST_STATE_BUDGET_FROM_HOME) {
    pushedBudgetFromHome = true;
    switchPage('budget');
    return;
  }
  if (currentPage === 'accountDetail') {
    switchPage('accounts');
    return;
  }
  if (currentPage === 'projectDetail') {
    switchPage('projects');
    return;
  }
  if (['budget', 'recurring', 'categories'].includes(currentPage) && pushedFromSettings) {
    pushedFromSettings = false;
    switchPage('settings');
    return;
  }
  if (currentPage === 'budget' && pushedBudgetFromHome) {
    pushedBudgetFromHome = false;
    switchPage('home');
    return;
  }
});

// 回到頂部 / 新增記帳浮動按鈕：捲動超過閾值時顯示，停止捲動 2 秒後隱藏
const BACK_TO_TOP_THRESHOLD = 300;
const FLOATING_BTN_IDLE_HIDE_MS = 2000;
let floatingBtnScrollActive = false;
let floatingBtnHideTimer = null;

function shouldShowBackToTop() {
  return window.scrollY > BACK_TO_TOP_THRESHOLD;
}

function shouldShowFabAddRecord() {
  return shouldShowBackToTop() && (currentPage === 'home' || currentPage === 'accountDetail');
}

function applyFloatingBtnVisibility() {
  if (backToTopBtn) {
    backToTopBtn.classList.toggle('visible', floatingBtnScrollActive && shouldShowBackToTop());
  }
  if (fabAddRecordBtn) {
    fabAddRecordBtn.classList.toggle('visible', floatingBtnScrollActive && shouldShowFabAddRecord());
  }
}

function clearFloatingBtnHideTimer() {
  if (floatingBtnHideTimer) {
    clearTimeout(floatingBtnHideTimer);
    floatingBtnHideTimer = null;
  }
}

function scheduleFloatingBtnHide() {
  clearFloatingBtnHideTimer();
  if (!shouldShowBackToTop()) return;
  floatingBtnHideTimer = setTimeout(() => {
    floatingBtnScrollActive = false;
    applyFloatingBtnVisibility();
    floatingBtnHideTimer = null;
  }, FLOATING_BTN_IDLE_HIDE_MS);
}

function onFloatingBtnScroll() {
  if (shouldShowBackToTop()) {
    floatingBtnScrollActive = true;
    applyFloatingBtnVisibility();
    scheduleFloatingBtnHide();
  } else {
    clearFloatingBtnHideTimer();
    floatingBtnScrollActive = false;
    applyFloatingBtnVisibility();
  }
}

function resetFloatingBtns() {
  clearFloatingBtnHideTimer();
  floatingBtnScrollActive = false;
  if (backToTopBtn) backToTopBtn.classList.remove('visible');
  if (fabAddRecordBtn) fabAddRecordBtn.classList.remove('visible');
}

window.addEventListener('scroll', onFloatingBtnScroll, { passive: true });
if (backToTopBtn) {
  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}
if (fabAddRecordBtn) {
  fabAddRecordBtn.addEventListener('click', () => {
    if (currentPage === 'accountDetail' && detailAccountId) {
      openModal(null, { presetAccountId: detailAccountId });
    } else {
      openModal();
    }
  });
}
onFloatingBtnScroll();

function switchPage(page) {
  // 切換頁面時捲回頂部
  window.scrollTo({ top: 0, behavior: 'instant' });
  resetFloatingBtns();

  // 離開記帳頁時清除搜尋
  if (page !== 'home' && searchKeyword) {
    searchInput.value = '';
    searchKeyword = '';
    searchClearBtn.style.display = 'none';
    applySearchMode(false);
    updateHomeSearchFilterIcons();
  }
  currentPage = page;
  if (page === 'accounts') detailAccountId = null;
  if (page === 'projects') currentProjectId = null;
  pageHome.style.display          = page === 'home'          ? 'block' : 'none';
  pageAccounts.style.display      = page === 'accounts'      ? 'block' : 'none';
  pageAccountDetail.style.display = page === 'accountDetail' ? 'block' : 'none';
  pageCategories.style.display    = page === 'categories'    ? 'block' : 'none';
  pageSettings.style.display      = page === 'settings'      ? 'block' : 'none';
  pageRecurring.style.display     = page === 'recurring'     ? 'block' : 'none';
  pageBudget.style.display        = page === 'budget'        ? 'block' : 'none';
  pageReport.style.display        = page === 'report'        ? 'block' : 'none';
  pageProjects.style.display      = page === 'projects'      ? 'block' : 'none';
  pageProjectDetail.style.display = page === 'projectDetail' ? 'block' : 'none';
  navHome.classList.toggle('active',        page === 'home');
  navAccountsBtn.classList.toggle('active', page === 'accounts' || page === 'accountDetail');
  navProjectsBtn.classList.toggle('active', page === 'projects' || page === 'projectDetail');
  navReportBtn.classList.toggle('active',   page === 'report');
  navSettingsBtn.classList.toggle('active', page === 'settings' || page === 'categories' || page === 'recurring' || page === 'budget');
  if (page === 'home')          pageTitle.textContent = '貓貓記帳';
  if (page === 'accounts')      pageTitle.textContent = '帳戶管理';
  if (page === 'accountDetail') pageTitle.textContent = '帳戶明細';
  if (page === 'categories')    pageTitle.textContent = '分類管理';
  if (page === 'settings')      pageTitle.textContent = '設定';
  if (page === 'recurring')     pageTitle.textContent = '固定收支';
  if (page === 'budget')        pageTitle.textContent = '預算管理';
  if (page === 'report')        pageTitle.textContent = '報表';
  if (page === 'projects')      pageTitle.textContent = '專案';
  if (page === 'projectDetail') {
    const proj = allProjects.find(p => p.docId === currentProjectId);
    pageTitle.textContent = proj ? proj.name : '專案詳情';
  }
  if (page === 'home')          renderHomeBudget();
  if (page === 'accounts' || page === 'accountDetail') scheduleAccountsRefresh();
  if (page === 'settings')      renderDefaultDebitAccountSelect();
  if (page === 'categories')    renderCategoryMgmtList();
  if (page === 'recurring')     renderRecurringList();
  if (page === 'budget')        renderBudgetPage();
  if (page === 'report')        renderReport();
  if (page === 'projects')      renderProjectList();
  if (page === 'projectDetail') renderProjectDetail();
}

// ===== 主頁預算小卡（從主頁進預算時 push 一層，上一頁可回主頁）=====
homeBudgetMoreBtn.addEventListener('click', () => {
  if (currentPage !== 'settings') pushedFromSettings = false;
  if (currentPage === 'home') {
    switchPage('budget');
    try {
      history.pushState({ _page: HIST_STATE_BUDGET_FROM_HOME }, '', location.href);
    } catch { /* empty */ }
    pushedBudgetFromHome = true;
    return;
  }
  navigateToPage('budget');
});

// ===== 設定頁按鈕（從設定進入子頁時 push 一層，上一頁可回設定）=====
goBudgetBtn.addEventListener('click', () => {
  if (currentPage === 'settings') {
    try {
      history.pushState({ _page: HIST_STATE_SETTINGS_SUB, sub: 'budget' }, '', location.href);
    } catch { /* empty */ }
    pushedFromSettings = true;
  } else {
    pushedFromSettings = false;
  }
  switchPage('budget');
});
goRecurringBtn.addEventListener('click', () => {
  if (currentPage === 'settings') {
    try {
      history.pushState({ _page: HIST_STATE_SETTINGS_SUB, sub: 'recurring' }, '', location.href);
    } catch { /* empty */ }
    pushedFromSettings = true;
  } else {
    pushedFromSettings = false;
  }
  switchPage('recurring');
});
goCategoriesBtn.addEventListener('click', () => {
  if (currentPage === 'settings') {
    try {
      history.pushState({ _page: HIST_STATE_SETTINGS_SUB, sub: 'categories' }, '', location.href);
    } catch { /* empty */ }
    pushedFromSettings = true;
  } else {
    pushedFromSettings = false;
  }
  switchPage('categories');
});

if (exportDataBtn) {
  const openExportModal = () => exportModalOverlay?.classList.add('active');
  const closeExportModal = () => exportModalOverlay?.classList.remove('active');
  exportDataBtn.addEventListener('click', openExportModal);
  closeExportModalBtn?.addEventListener('click', closeExportModal);
  exportModalOverlay?.addEventListener('click', (e) => { if (e.target === exportModalOverlay) closeExportModal(); });

  const downloadFile = (filename, mime, content) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const normalizeForExport = (r) => {
    const proj = r.projectId ? allProjects.find(p => p.docId === r.projectId) : null;
    return {
      id: r.docId || '',
      date: r.date || '',
      type: r.type || '',
      amount: r.amount ?? null,
      accountId: r.accountId || '',
      accountName: r.accountName || '',
      categoryId: r.categoryId || '',
      categoryName: r.categoryName || '',
      subCategoryId: r.subCategoryId || '',
      subCategoryName: r.subCategoryName || '',
      note: r.note || '',
      projectId: r.projectId || '',
      projectName: proj?.name || '',
      foreignCurrency: r.foreignCurrency || '',
      foreignAmount: r.foreignAmount ?? null,
      splitPayer: r.splitPayer || '',
      splitPayerUid: r.splitPayerUid || '',
      splitData: r.splitData || null,
      isSettlement: !!r.isSettlement,
      settlementProjectId: r.settlementProjectId || '',
      createdAtSeconds: r.createdAt?.seconds ?? null,
    };
  };

  exportJsonBtn?.addEventListener('click', () => {
    const includeIds = !!exportIncludeIds?.checked;
    const fullRows = allRecords.map(normalizeForExport);
    const rows = includeIds
      ? fullRows
      : fullRows.map(({ id, accountId, categoryId, subCategoryId, projectId, settlementProjectId, createdAtSeconds, ...rest }) => rest);
    const json = JSON.stringify(rows, null, 2);
    const ts = new Date().toISOString().slice(0, 10);
    downloadFile(`records-${ts}.json`, 'application/json;charset=utf-8', json);
  });

  exportCsvBtn?.addEventListener('click', () => {
    const includeIds = !!exportIncludeIds?.checked;
    const fullRows = allRecords.map(normalizeForExport);
    const rows = includeIds
      ? fullRows
      : fullRows.map(({ id, accountId, categoryId, subCategoryId, projectId, settlementProjectId, createdAtSeconds, ...rest }) => rest);
    const baseHeaders = [
      'date','type','amount','accountName',
      'categoryName','subCategoryName',
      'note','projectName','foreignCurrency','foreignAmount',
      'splitPayer','splitPayerUid','splitData','isSettlement'
    ];
    const idHeaders = ['id','accountId','categoryId','subCategoryId','projectId','settlementProjectId','createdAtSeconds'];
    const headers = includeIds ? [...idHeaders, ...baseHeaders] : baseHeaders;
    const escapeCell = (v) => {
      if (v == null) return '';
      const s = typeof v === 'string' ? v : JSON.stringify(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      headers.join(','),
      ...rows.map(row => headers.map(h => escapeCell(row[h])).join(',')),
    ];
    const csv = lines.join('\r\n');
    const ts = new Date().toISOString().slice(0, 10);
    downloadFile(`records-${ts}.csv`, 'text/csv;charset=utf-8', csv);
  });
}

// ===== 清除所有資料 =====
clearAllDataBtn.addEventListener('click', () => {
  clearDataConfirmInput.value = '';
  clearDataProgress.style.display = 'none';
  confirmClearDataBtn.disabled = false;
  clearDataOverlay.classList.add('active');
});

const closeClearModal = () => clearDataOverlay.classList.remove('active');
closeClearDataBtn.addEventListener('click', closeClearModal);
cancelClearDataBtn.addEventListener('click', closeClearModal);
clearDataOverlay.addEventListener('click', (e) => { if (e.target === clearDataOverlay) closeClearModal(); });

confirmClearDataBtn.addEventListener('click', async () => {
  if (clearDataConfirmInput.value.trim() !== '確認刪除') {
    clearDataConfirmInput.focus();
    clearDataConfirmInput.style.borderColor = 'var(--red-main)';
    setTimeout(() => clearDataConfirmInput.style.borderColor = '', 1500);
    return;
  }

  confirmClearDataBtn.disabled = true;
  clearDataProgress.style.display = '';

  // 設 flag 防止 subscribeCategories 在刪除後自動補回預設分類
  window._clearingData = true;

  const collections = ['records', 'accounts', 'categories', 'templates', 'recurring', 'budgets'];
  for (const col of collections) {
    const q = query(collection(db, col), where('uid', '==', currentUser.uid));
    const snap = await new Promise((res, rej) => {
      const unsub = onSnapshot(q, (s) => { unsub(); res(s); }, rej);
    });
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, col, d.id))));
  }

  window._clearingData = false;

  if (currentUser?.uid) {
    await setDoc(doc(db, 'users', currentUser.uid), { defaultCategoriesSeeded: false }, { merge: true });
  }

  clearDataProgress.textContent = '✅ 已清除完成';
  setTimeout(() => {
    closeClearModal();
    clearDataProgress.textContent = '刪除中...';
  }, 1200);
});

// ===== 預算管理 =====
function subscribeBudgets() {
  const q = query(collection(db, 'budgets'), where('uid', '==', currentUser.uid));
  unsubBudgets = onSnapshot(q, snap => {
    allBudgets = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    if (currentPage === 'budget') renderBudgetPage();
    if (currentPage === 'home')   renderHomeBudget();
    
    if (!initialLoadStatus.budgets) {
      initialLoadStatus.budgets = true;
      checkInitialLoad();
    }
  });
}

// ===== 專案訂閱（自己建立的 + 被邀請的）=====
function subscribeProjects() {
  const qOwn = query(collection(db, 'projects'), where('uid', '==', currentUser.uid));
  const qInvited = query(collection(db, 'projects'), where('editorUids', 'array-contains', currentUser.uid));

  const mergeAndApply = (ownSnap, invitedSnap) => {
    const prevById = new Map(allProjects.map(p => [p.docId, p]));
    const byId = new Map();
    (ownSnap?.docs || []).forEach(d => byId.set(d.id, { docId: d.id, ...d.data() }));
    (invitedSnap?.docs || []).forEach(d => { if (!byId.has(d.id)) byId.set(d.id, { docId: d.id, ...d.data() }); });
    allProjects = Array.from(byId.values())
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    if (currentPage === 'projects') renderProjectList();
    if (currentPage === 'projectDetail') {
      const prev = prevById.get(currentProjectId);
      const next = allProjects.find(p => p.docId === currentProjectId);
      // 僅開關狀態變更時，不要整頁重繪（避免結算區閃爍）
      if (prev && next && isProjectDetailContentUnchanged(prev, next)) {
        updateProjectActiveUI(next);
      } else {
        renderProjectDetail();
      }
    }
    updateRecordProjectSelect();
    subscribeSharedProjectRecords();
    
    if (!initialLoadStatus.projects) {
      initialLoadStatus.projects = true;
      checkInitialLoad();
    }
  };

  let ownSnap = null, invitedSnap = null;
  const maybeApply = () => { if (ownSnap && invitedSnap) mergeAndApply(ownSnap, invitedSnap); };

  const unsubOwn = onSnapshot(qOwn, snap => { ownSnap = snap; maybeApply(); });
  const unsubInvited = onSnapshot(qInvited, snap => { invitedSnap = snap; maybeApply(); });
  unsubProjects = () => {
    unsubOwn();
    unsubInvited();
    if (unsubSharedProjectRecords) {
      unsubSharedProjectRecords();
      unsubSharedProjectRecords = null;
    }
    sharedProjectRecordIdsKey = '';
  };
}

function subscribeSharedProjectRecords() {
  const projectIds = allProjects.map(p => p.docId).filter(Boolean);
  const ids = projectIds.slice(0, 30); // Firestore 'in' 最多 30
  const nextKey = ids.slice().sort().join(',');
  // 專案集合沒變就不要撕掉重訂，否則 onSnapshot 會再觸發整頁 renderProjectDetail
  if (nextKey === sharedProjectRecordIdsKey && unsubSharedProjectRecords) return;

  if (unsubSharedProjectRecords) { unsubSharedProjectRecords(); unsubSharedProjectRecords = null; }
  sharedProjectRecordIdsKey = nextKey;

  if (ids.length === 0) {
    sharedProjectRecords = {};
    if (currentPage === 'projects') renderProjectList();
    if (currentPage === 'projectDetail') renderProjectDetail();
    return;
  }
  const q = query(collection(db, 'records'), where('projectId', 'in', ids));
  unsubSharedProjectRecords = onSnapshot(q, snap => {
    const byProject = {};
    ids.forEach(id => { byProject[id] = []; });
    snap.docs.forEach(d => {
      const r = normalizeTransferRecordShape({ docId: d.id, ...d.data() });
      if (r.projectId && byProject[r.projectId]) byProject[r.projectId].push(r);
    });
    sharedProjectRecords = byProject;
    if (currentPage === 'projects') renderProjectList();
    if (currentPage === 'projectDetail') renderProjectDetail();
  });
}

// ===== 頁面切換（專案） =====
navProjectsBtn.addEventListener('click', () => {
  if (currentPage === 'projectDetail') goToProjectsList();
  else navigateToPage('projects');
});

// ===== 專案列表 =====
function renderProjectList() {
  Array.from(projectList.children).forEach(el => {
    if (!el.classList.contains('project-empty')) el.remove();
  });
  if (allProjects.length === 0) {
    projectEmpty.style.display = '';
    return;
  }
  projectEmpty.style.display = 'none';
  allProjects.forEach(proj => {
    const card = document.createElement('div');
    const active = isProjectActive(proj);
    card.className = 'project-card' + (active ? '' : ' is-closed');
    const members = (proj.members || []).map(m => getMemberLabel(m, proj)).join('、');
    const dateStr = proj.startDate && proj.endDate
      ? `${proj.startDate} ～ ${proj.endDate}`
      : proj.startDate || '';
    // 計算此專案的總花費
    const total = calcProjectTotal(proj);
    card.innerHTML = `
      <div class="project-card-main">
        <div class="project-card-name-row">
          <div class="project-card-name">${proj.name}</div>
          ${active ? '' : '<span class="project-card-badge is-closed">已結束</span>'}
        </div>
        ${dateStr ? `<div class="project-card-date">📅 ${dateStr}</div>` : ''}
        ${members ? `<div class="project-card-members">👥 ${members}</div>` : ''}
      </div>
      <div class="project-card-right">
        <div class="project-card-amount">$${formatMoney(total)}</div>
        <div class="project-card-amount-label">總花費</div>
      </div>`;
    card.addEventListener('click', () => openProjectDetail(proj));
    projectList.appendChild(card);
  });
}

/**
 * 取得某專案底下的所有記帳（自己建立的用 allRecords，被邀請的用 sharedProjectRecords）。
 */
function getProjectRecords(proj) {
  if (!proj?.docId) return [];
  const fromQuery = sharedProjectRecords[proj.docId] || [];
  if (fromQuery.length > 0) return fromQuery;
  // fallback：避免查詢尚未完成時畫面短暫為空
  return allRecords.filter(r => r.projectId === proj.docId);
}

function findRecordById(docId) {
  if (!docId) return null;
  const mine = allRecords.find(r => r.docId === docId);
  if (mine) return mine;
  for (const pid of Object.keys(sharedProjectRecords || {})) {
    const rec = (sharedProjectRecords[pid] || []).find(r => r.docId === docId);
    if (rec) return rec;
  }
  return null;
}

function canModifyRecord(record) {
  return !!record && record.uid === currentUser?.uid;
}

function isTransferRecord(record) {
  if (!record) return false;
  if (record.type === 'transfer') return true;
  // 相容舊資料：有 transfer 關聯欄位時仍視為轉帳記錄
  return !!(record.transferId || (record.transferFromId && record.transferToId));
}

/** 轉帳「轉出」且來源為信用卡（代墊收回等情境計入支出） */
function isCreditCardTransferOut(record) {
  if (!isTransferRecord(record) || record.accountId !== record.transferFromId) return false;
  const fromAcc = allAccounts.find(a => a.docId === record.transferFromId);
  return fromAcc?.typeId === 'credit';
}

function normalizeTransferRecordShape(record) {
  if (!record) return record;
  if (!isTransferRecord(record)) return record;
  return { ...record, type: 'transfer' };
}

function getTransferPairRecords(record) {
  if (!record?.transferId) return record ? [record] : [];
  const pool = [...allRecords];
  for (const pid of Object.keys(sharedProjectRecords || {})) {
    pool.push(...(sharedProjectRecords[pid] || []));
  }
  const seen = new Set();
  const paired = [];
  pool.forEach(r => {
    if (r?.transferId !== record.transferId || !r?.docId || seen.has(r.docId)) return;
    seen.add(r.docId);
    paired.push(r);
  });
  return paired.length ? paired : [record];
}

/** 從轉帳配對中拆出轉出／轉入側（優先靠 accountId，相容舊 expense/income） */
function pickTransferOutIn(paired, fallback = null) {
  const list = Array.isArray(paired) ? paired.filter(Boolean) : [];
  const outRec = list.find(r => r.accountId && r.accountId === r.transferFromId)
    || list.find(r => r.type === 'expense')
    || list[0]
    || fallback
    || null;
  const inRec = list.find(r => r.accountId && r.accountId === r.transferToId)
    || list.find(r => r.type === 'income')
    || (list.length > 1 ? list.find(r => r.docId !== outRec?.docId) : null)
    || null;
  return { outRec, inRec };
}

/**
 * 原子寫入一組轉帳（轉出＋轉入），避免只成功一半造成銀行側沒有到帳。
 * 編輯時若缺轉入側會自動補建。
 */
async function commitTransferPair({
  editId = null,
  fromId,
  toId,
  fromAcc = null,
  toAcc = null,
  fromAmount,
  toAmount,
  date,
  note = '',
  exchangeRate = null,
  isExchange = false,
  transferIdHint = null,
  displayNameBase = null,
  recurringId = null,
}) {
  const transferId = transferIdHint
    || (editId ? (findRecordById(editId)?.transferId || null) : null)
    || `tf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const shared = {
    uid: currentUser.uid,
    type: 'transfer',
    date,
    note: note || '',
    transferId,
    transferFromId: fromId,
    transferToId: toId,
    exchangeRate: exchangeRate || null,
    displayEmoji: isExchange ? '💱' : '🔄',
    categoryId: null,
    categoryName: null,
  };
  if (recurringId) shared.recurringId = recurringId;

  const outPayload = {
    ...shared,
    amount: fromAmount,
    accountId: fromId,
    accountName: fromAcc?.name || null,
    displayName: displayNameBase
      || (isExchange ? `換匯 → ${toAcc?.name || ''}` : `轉帳 → ${toAcc?.name || ''}`),
  };
  const inPayload = {
    ...shared,
    amount: toAmount,
    accountId: toId,
    accountName: toAcc?.name || null,
    displayName: displayNameBase
      || (isExchange ? `換匯 ← ${fromAcc?.name || ''}` : `轉帳 ← ${fromAcc?.name || ''}`),
  };

  const batch = writeBatch(db);
  let outRec = null;
  let inRec = null;

  if (editId) {
    const rec = findRecordById(editId) || allRecords.find(r => r.docId === editId);
    const paired = getTransferPairRecords(rec || { transferId, docId: editId });
    ({ outRec, inRec } = pickTransferOutIn(paired, rec));
  }

  if (outRec?.docId) {
    batch.update(doc(db, 'records', outRec.docId), outPayload);
  } else {
    const outRef = doc(collection(db, 'records'));
    batch.set(outRef, { ...outPayload, createdAt: serverTimestamp() });
  }

  if (inRec?.docId) {
    batch.update(doc(db, 'records', inRec.docId), inPayload);
  } else {
    // 缺轉入側（歷史半斷資料）→ 補建，否則目標帳戶餘額不會對
    const inRef = doc(collection(db, 'records'));
    batch.set(inRef, { ...inPayload, createdAt: serverTimestamp() });
  }

  await batch.commit();
  return transferId;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function recordReadonlyRow(label, text) {
  const t = text == null || text === '' ? '—' : String(text);
  return `<div class="record-readonly-row"><span class="record-readonly-label">${escapeHtml(label)}</span><span class="record-readonly-val">${escapeHtml(t)}</span></div>`;
}

function getRecordAccountDisplayName(accountId, recordForHint) {
  if (!accountId) return '—';
  const acc = allAccounts.find(a => a.docId === accountId);
  if (acc?.name) return acc.name;
  if (recordForHint?.accountId === accountId && recordForHint.accountName) return recordForHint.accountName;
  return '?';
}

function getTransferFromToLabelsForReadOnly(record) {
  const paired = getTransferPairRecords(record);
  const { outRec, inRec } = pickTransferOutIn(paired, record);
  const fromId = outRec?.transferFromId || record.transferFromId;
  const toId = outRec?.transferToId || record.transferToId;
  const fromName = getRecordAccountDisplayName(fromId, outRec);
  const toName = getRecordAccountDisplayName(toId, inRec || record);
  return { outRec, inRec, fromName, toName };
}

function getRewardActivityLabels(proj, record) {
  const acts = proj?.rewardActivities || [];
  const ids = record.rewardActivityIds || (record.rewardActivityId ? [record.rewardActivityId] : []);
  if (!ids.length) return '';
  return ids.map(id => acts.find(a => a.id === id)?.name).filter(Boolean).join('、');
}

function buildProjectRecordReadOnlyHtml(record, proj) {
  if (!record || !proj) return recordReadonlyRow('提示', '無法顯示此筆資料');
  const rows = [];
  rows.push(recordReadonlyRow('建立者', getRecordCreatorLabel(record, proj)));

  if (isTransferRecord(record)) {
    const { outRec, inRec, fromName, toName } = getTransferFromToLabelsForReadOnly(record);
    const dn = (outRec?.displayName || record.displayName || '');
    const typeLabel = dn.includes('換匯') ? '換匯轉帳' : '轉帳';
    rows.push(recordReadonlyRow('類型', typeLabel));
    rows.push(recordReadonlyRow('從 → 到', `${fromName} → ${toName}`));
    const baseOut = outRec || record;
    const outAmt = getProjectRecordTwdAmount(baseOut, proj);
    rows.push(recordReadonlyRow('轉出金額（台幣）', `$${formatMoney(outAmt)}`));
    if (inRec && inRec.amount !== baseOut.amount) {
      const inAmt = getProjectRecordTwdAmount(inRec, proj);
      rows.push(recordReadonlyRow('到帳金額（台幣）', `$${formatMoney(inAmt)}`));
      if (outAmt > 0) {
        rows.push(recordReadonlyRow('匯率約', `1 : ${(inAmt / outAmt).toFixed(4)}`));
      }
    }
  } else {
    const typeLabel = record.type === 'income' ? '收入' : record.type === 'expense' ? '支出' : (record.type || '—');
    rows.push(recordReadonlyRow('類型', typeLabel));
    const emoji = record.displayEmoji || record.categoryEmoji || '📦';
    const name = record.displayName || record.categoryName || '其他';
    rows.push(recordReadonlyRow('分類', `${emoji} ${name}`));
    const amt = getProjectRecordTwdAmount(record, proj);
    const sign = record.type === 'income' ? '+' : '−';
    rows.push(recordReadonlyRow('金額（台幣）', `${sign}$${formatMoney(amt)}`));
    if (record.foreignCurrency && record.foreignAmount != null) {
      rows.push(recordReadonlyRow('外幣', `${record.foreignCurrency} ${formatMoneyByCurrency(record.foreignAmount, record.foreignCurrency)}`));
    }
    const accName = record.accountId
      ? (allAccounts.find(a => a.docId === record.accountId)?.name || record.accountName || '—')
      : '無';
    rows.push(recordReadonlyRow('帳戶', accName));
  }

  rows.push(recordReadonlyRow('日期', formatDateDisplay(record.date || '')));

  const noteRaw = (record.note || '').trim();
  rows.push(recordReadonlyRow('備註', noteRaw || '—'));

  rows.push(recordReadonlyRow('所屬專案', proj.name || '—'));

  const rewardText = getRewardActivityLabels(proj, record);
  if (rewardText) rows.push(recordReadonlyRow('回饋活動', rewardText));

  if (record.splitPayer && record.splitData?.length) {
    rows.push(recordReadonlyRow('付款人', getCurrentUserSplitPayerLabel(record)));
    const splitLines = record.splitData.map(s => {
      const uid = normalizeSplitMemberUid(s, proj, record.uid || null);
      const label = uid ? getProjectMemberLabelByUid(proj, uid) : (s.name || '—');
      const share = uid ? getMemberShareTwd(record, uid, proj) : (parseFloat(s.amount) || 0);
      return `${label}：$${formatMoney(share)}`;
    }).join('\n');
    rows.push(recordReadonlyRow('分攤', splitLines));
  }

  if (record.isSettlement) rows.push(recordReadonlyRow('註記', '結清相關紀錄'));

  return rows.join('');
}

function showRecordModalEditorMode() {
  if (recordReadOnlyPanel) recordReadOnlyPanel.style.display = 'none';
  if (recordModalEditor) recordModalEditor.style.display = '';
  if (openTplListBtn) openTplListBtn.style.display = '';
}

function showRecordModalReadOnlyMode() {
  if (recordReadOnlyPanel) recordReadOnlyPanel.style.display = 'block';
  if (recordModalEditor) recordModalEditor.style.display = 'none';
  if (openTplListBtn) openTplListBtn.style.display = 'none';
}

function openProjectRecordReadOnlyView(record, proj) {
  if (!record || !proj) return;
  recordModalTitle.textContent = '記帳詳情';
  if (recordReadOnlyBody) recordReadOnlyBody.innerHTML = buildProjectRecordReadOnlyHtml(record, proj);
  showRecordModalReadOnlyMode();
  modalOverlay.classList.add('active');
}

/**
 * 專案情境下該筆記錄的台幣金額（顯示／加總用）。
 * 若專案有設匯率且記錄幣別相符，用專案匯率換算；否則用儲存的 amount。
 */
function getProjectRecordTwdAmount(record, project) {
  if (!record) return 0;
  if (project?.currency && (project.rateToTwd ?? 0) > 0 &&
      record.foreignCurrency === project.currency && (record.foreignAmount != null)) {
    return Math.round(record.foreignAmount * project.rateToTwd);
  }
  return record.amount ?? 0;
}

/** 報表篩選下拉 value 與真實 UID 對齊（舊專案「我」可能為 legacy:__owner__） */
function resolveProjectReportFilterMemberUid(proj, filterUid) {
  if (filterUid == null || filterUid === '') return null;
  if (filterUid === 'legacy:__owner__') return proj?.uid || currentUser?.uid || null;
  return filterUid;
}

/**
 * 專案報表「成員」篩選用金額：
 * 1. 有分攤（splitData）：該成員在分攤列中的金額（getMemberShareTwd）。
 * 2. 無分攤：僅當篩選成員＝建立者（record.uid）時為整筆金額，否則 0。
 */
function getProjectReportMemberShareTwd(r, memberUid, proj) {
  if (!r || !memberUid) return 0;
  const canonical = resolveProjectReportFilterMemberUid(proj, memberUid) || memberUid;
  if (r.splitData?.length) {
    return getMemberShareTwd(r, canonical, proj);
  }
  return canonical === r.uid ? getProjectRecordTwdAmount(r, proj) : 0;
}

/** 專案報表「付款人」欄：有分攤顯示付款人；無分攤顯示建立者於專案中的名稱 */
function getProjectReportPayerColumnText(record, proj) {
  if (record.splitData?.length) return getCurrentUserSplitPayerLabel(record);
  const uid = record.uid;
  if (uid && proj) return getProjectMemberLabelByUid(proj, uid);
  return getRecordCreatorLabel(record, proj);
}

function isProjectExpenseLikeRecord(record) {
  if (!record) return false;
  if (record.type === 'expense') return true;
  return isTransferRecord(record) && record.accountId === record.transferFromId;
}

function calcProjectTotal(proj) {
  return getProjectRecords(proj)
    .filter(isProjectExpenseLikeRecord)
    .reduce((s, r) => s + getProjectRecordTwdAmount(r, proj), 0);
}

addProjectBtn.addEventListener('click', () => openProjectModal());

let projectDateRangePicker = null;

function openProjectModal(proj = null) {
  projectEditId.value          = proj ? proj.docId : '';
  projectModalTitle.textContent = proj ? '編輯專案' : '新增專案';
  projectNameInput.value       = proj ? proj.name : '';
  projectMembersInput.value    = proj
    ? (proj.members || [])
        .filter(m => {
          const mm = (m ?? '').trim();
          if (!mm) return false;
          if (mm === '我') return false;
          if (mm === (proj.ownerDisplayName || '').trim()) return false;
          return true;
        })
        .join('、')
    : '';
  projectStartInput.value      = proj?.startDate || '';
  projectEndInput.value        = proj?.endDate   || '';
  if (projectCurrencySelect) projectCurrencySelect.value = proj?.currency || '';
  if (projectRateToTwdInput) projectRateToTwdInput.value = proj?.rateToTwd != null ? String(proj.rateToTwd) : '';
  tempEditorUids = proj ? [...(proj.editorUids || [])] : [];
  tempEditorEmails = proj ? [...(proj.editorEmails || [])] : [];
  tempEditorDisplayNames = proj ? [...(proj.editorDisplayNames || [])] : [];
  if (projectInviteEditorsWrap) {
    projectInviteEditorsWrap.style.display = (!proj || proj.uid === currentUser?.uid) ? '' : 'none';
    renderProjectEditorsList();
  }
  if (projectInviteEmailInput) projectInviteEmailInput.value = '';
  deleteProjectBtn.style.display = proj ? '' : 'none';
  if (projectDateRangePicker) {
    if (proj?.startDate && proj?.endDate) {
      projectDateRangePicker.setDate([proj.startDate, proj.endDate]);
    } else {
      projectDateRangePicker.clear();
    }
  }
  projectModalOverlay.classList.add('active');
}

let rewardActivityModalProjectId = null;

function openRewardActivityModal(proj) {
  if (!proj?.docId) return;
  rewardActivityModalProjectId = proj.docId;
  tempRewardActivities = (proj.rewardActivities || []).map(a => ({ ...a }));
  renderRewardActivityEditor(rewardActivityModalList);
  rewardActivityModalOverlay?.classList.add('active');
}

function closeRewardActivityModal() {
  rewardActivityModalOverlay?.classList.remove('active');
  rewardActivityModalProjectId = null;
}

function renderRewardActivityEditor(container) {
  const listEl = container || rewardActivityModalList;
  if (!listEl) return;
  listEl.innerHTML = '';
  tempRewardActivities.forEach((act, idx) => {
    const row = document.createElement('div');
    row.className = 'reward-edit-row';
    row.innerHTML = `
      <input type="text" class="reward-edit-name form-input" placeholder="活動名稱" value="${act.name || ''}" maxlength="30" />
      <div class="reward-edit-right">
        <input type="number" class="reward-edit-limit form-input" placeholder="刷卡上限金額" value="${act.limit || ''}" min="0" inputmode="decimal" />
        <select class="reward-edit-currency form-select">
          <option value="TWD" ${act.currency === 'TWD' || !act.currency ? 'selected' : ''}>TWD</option>
          <option value="JPY" ${act.currency === 'JPY' ? 'selected' : ''}>JPY</option>
          <option value="USD" ${act.currency === 'USD' ? 'selected' : ''}>USD</option>
          <option value="EUR" ${act.currency === 'EUR' ? 'selected' : ''}>EUR</option>
          <option value="KRW" ${act.currency === 'KRW' ? 'selected' : ''}>KRW</option>
          <option value="HKD" ${act.currency === 'HKD' ? 'selected' : ''}>HKD</option>
        </select>
        <button type="button" class="reward-del-btn" data-idx="${idx}">✕</button>
      </div>
    `;
    row.querySelector('.reward-edit-name').addEventListener('input', e => {
      tempRewardActivities[idx].name = e.target.value;
    });
    row.querySelector('.reward-edit-limit').addEventListener('input', e => {
      tempRewardActivities[idx].limit = parseFloat(e.target.value) || 0;
    });
    row.querySelector('.reward-edit-currency').addEventListener('change', e => {
      tempRewardActivities[idx].currency = e.target.value;
    });
    row.querySelector('.reward-del-btn').addEventListener('click', () => {
      tempRewardActivities.splice(idx, 1);
      renderRewardActivityEditor(listEl);
    });
    listEl.appendChild(row);
  });
}

if (addRewardInModalBtn) {
  addRewardInModalBtn.addEventListener('click', () => {
    tempRewardActivities.push({ id: `r_${Date.now()}`, name: '', limit: 0, currency: 'TWD' });
    renderRewardActivityEditor(rewardActivityModalList);
  });
}

if (saveRewardActivityBtn) {
  saveRewardActivityBtn.addEventListener('click', async () => {
    if (!rewardActivityModalProjectId) return;
    const rewardActivities = tempRewardActivities.filter(a => (a.name || '').trim());
    saveRewardActivityBtn.disabled = true;
    try {
      await updateDoc(doc(db, 'projects', rewardActivityModalProjectId), { rewardActivities });
      closeRewardActivityModal();
      renderProjectDetail();
    } catch (err) {
      console.error(err);
      alert('儲存失敗，請稍後再試');
    } finally {
      saveRewardActivityBtn.disabled = false;
    }
  });
}

if (closeRewardActivityModalBtn) closeRewardActivityModalBtn.addEventListener('click', closeRewardActivityModal);
if (rewardActivityModalOverlay) rewardActivityModalOverlay.addEventListener('click', e => { if (e.target === rewardActivityModalOverlay) closeRewardActivityModal(); });

function renderProjectEditorsList() {
  if (!projectEditorsList) return;
  projectEditorsList.innerHTML = '';
  tempEditorUids.forEach((uid, idx) => {
    const row = document.createElement('div');
    row.className = 'project-editor-row';
    const displayName = tempEditorDisplayNames[idx] || tempEditorEmails[idx] || uid;
    row.innerHTML = `<span class="project-editor-name"></span><button type="button" class="project-editor-remove" data-idx="${idx}">移除</button>`;
    row.querySelector('.project-editor-name').textContent = displayName;
    row.querySelector('.project-editor-remove').addEventListener('click', () => {
      tempEditorUids.splice(idx, 1);
      tempEditorEmails.splice(idx, 1);
      tempEditorDisplayNames.splice(idx, 1);
      renderProjectEditorsList();
    });
    projectEditorsList.appendChild(row);
  });
}

function addInvitedNameToMembersList(displayName) {
  if (!projectMembersInput || !displayName) return;
  const raw = (projectMembersInput.value || '').trim();
  const others = raw.split(/[,，、]/).map(s => s.trim()).filter(Boolean);
  if (others.includes(displayName)) return;
  others.push(displayName);
  projectMembersInput.value = others.join('、');
}

if (projectInviteBtn) {
  projectInviteBtn.addEventListener('click', async () => {
    const raw = (projectInviteEmailInput?.value || '').trim();
    if (!raw) return;
    try {
      let snap;
      if (raw.includes('@')) {
        const email = raw.toLowerCase();
        snap = await getDocs(query(collection(db, 'users'), where('email', '==', email)));
        if (snap.empty) {
          alert('找不到此 Email 的帳號，請對方先用此 Email 登入過本 App 一次');
          return;
        }
      } else {
        const name = raw;
        snap = await getDocs(query(collection(db, 'users'), where('displayName', '==', name)));
        if (snap.empty) {
          alert('找不到此顯示名稱的帳號，請對方先登入過本 App 一次，或改用 Email 邀請');
          return;
        }
        if (snap.size > 1) {
          const emails = snap.docs.map(d => d.data().email || d.id).join('、');
          alert(`有多人使用「${name}」，請改用 Email 邀請：\n${emails}`);
          return;
        }
      }
      const userDoc = snap.docs[0];
      const uid = userDoc.id;
      const data = userDoc.data();
      const email = data.email || '';
      const displayName = (data.displayName || email || uid).trim() || '使用者';
      if (uid === currentUser?.uid) {
        alert('不能邀請自己');
        return;
      }
      if (tempEditorUids.includes(uid)) {
        alert('已邀請過此人了');
        return;
      }
      tempEditorUids.push(uid);
      tempEditorEmails.push(email);
      tempEditorDisplayNames.push(displayName);
      addInvitedNameToMembersList(displayName);
      renderProjectEditorsList();
      if (projectInviteEmailInput) projectInviteEmailInput.value = '';
    } catch (err) {
      console.error(err);
      alert('查詢失敗，請稍後再試');
    }
  });
}

function closeProjectModal() {
  projectModalOverlay.classList.remove('active');
}

closeProjectModalBtn.addEventListener('click', closeProjectModal);
projectModalOverlay.addEventListener('click', e => {
  if (e.target === projectModalOverlay) closeProjectModal();
});

// 旅遊日期範圍選擇器（Flatpickr）
if (projectDateRangeInput) {
  projectDateRangePicker = flatpickr(projectDateRangeInput, {
    mode: 'range',
    dateFormat: 'Y-m-d',
    locale: typeof flatpickr !== 'undefined' && flatpickr.l10ns?.zh_tw ? 'zh_tw' : 'default',
    allowInput: false,
    appendTo: document.body,
    onOpen(selectedDates, dateStr, instance) {
      requestAnimationFrame(() => {
        const el = instance.calendarContainer;
        const input = instance.input;
        if (!el || !input) return;
        const rect = input.getBoundingClientRect();
        el.style.position = 'fixed';
        el.style.left = rect.left + 'px';
        el.style.top = (rect.bottom + 4) + 'px';
        el.style.right = 'auto';
        el.style.width = ''; // 日曆用預設寬度，不設 100%
      });
    },
    onChange(selectedDates) {
      if (selectedDates.length >= 1) {
        projectStartInput.value = selectedDates[0] ? selectedDates[0].toISOString().slice(0, 10) : '';
      }
      if (selectedDates.length >= 2) {
        projectEndInput.value = selectedDates[1] ? selectedDates[1].toISOString().slice(0, 10) : '';
      }
      if (selectedDates.length === 0) {
        projectStartInput.value = '';
        projectEndInput.value = '';
      }
    },
  });
}

projectForm.addEventListener('submit', async e => {
  e.preventDefault();
  const name    = projectNameInput.value.trim();
  const ownerDisplayName = (currentUser?.displayName || currentUser?.email || '專案建立者').trim() || '專案建立者';
  const others  = projectMembersInput.value.split(/[,，、]/).map(s => s.trim()).filter(s => s && s !== ownerDisplayName);
  const members = [ownerDisplayName, ...others];
  const startDate = projectStartInput.value || null;
  const endDate   = projectEndInput.value   || null;
  const editId    = projectEditId.value;
  const currency = projectCurrencySelect?.value?.trim() || null;
  const rateToTwd = projectRateToTwdInput?.value ? parseFloat(projectRateToTwdInput.value) : null;
  const rewardActivities = editId ? (allProjects.find(p => p.docId === editId)?.rewardActivities || []) : [];
  projectSubmitBtn.disabled = true;
  try {
    const payload = { name, members, startDate, endDate, rewardActivities, ownerDisplayName };
    if (currency && rateToTwd != null && rateToTwd > 0) {
      payload.currency = currency;
      payload.rateToTwd = rateToTwd;
    } else {
      payload.currency = null;
      payload.rateToTwd = null;
    }
    payload.editorUids = tempEditorUids || [];
    payload.editorEmails = tempEditorEmails || [];
    payload.editorDisplayNames = tempEditorDisplayNames || [];
    if (editId) {
      await updateDoc(doc(db, 'projects', editId), payload);
    } else {
      await addDoc(collection(db, 'projects'), {
        uid: currentUser.uid, ...payload,
        active: true,
        createdAt: serverTimestamp(),
      });
    }
    closeProjectModal();
  } catch (err) { console.error(err); alert('儲存失敗'); }
  finally { projectSubmitBtn.disabled = false; }
});

deleteProjectBtn.addEventListener('click', async () => {
  const editId = projectEditId.value;
  if (!editId) return;

  // 查詢該專案底下所有記錄（含協作者的），刪除專案時一併移除
  const q = query(collection(db, 'records'), where('projectId', '==', editId));
  const snap = await getDocs(q);
  const count = snap.size;

  const msg = count > 0
    ? `確定要刪除此專案？\n\n此專案共有 ${count} 筆記帳記錄，刪除後將一併移除，無法復原。`
    : '確定要刪除此專案？\n\n此專案目前沒有記帳記錄。';

  if (!confirm(msg)) return;

  const batch = [];
  snap.forEach(d => batch.push(deleteDoc(doc(db, 'records', d.id))));
  await Promise.all(batch);

  // 刪除專案本身
  await deleteDoc(doc(db, 'projects', editId));
  closeProjectModal();
  switchPage('projects');
  try {
    if (history.state?._page === HIST_STATE_PROJECT_DETAIL) {
      history.replaceState(null, '', location.href);
    }
  } catch { /* empty */ }
});

// ===== 專案詳情 =====
function showProjectDetailView(proj) {
  currentProjectId = proj.docId;
  projectSearchKeyword = '';
  if (projectSearchInput) projectSearchInput.value = '';
  if (projectSearchClearBtn) projectSearchClearBtn.style.display = 'none';
  renderProjectDetail();
  switchPage('projectDetail');
}
function openProjectDetail(proj) {
  showProjectDetailView(proj);
  try {
    history.pushState(
      { _page: HIST_STATE_PROJECT_DETAIL, projectId: proj.docId },
      '',
      location.href
    );
  } catch { /* empty */ }
}

/** 未設定 active 的舊專案視為進行中 */
function isProjectActive(proj) {
  return proj?.active !== false;
}

/** 詳情頁內容是否與 active 無關的欄位都沒變（用於避免開關觸發結算區重繪） */
function isProjectDetailContentUnchanged(prev, next) {
  if (!prev || !next || prev.docId !== next.docId) return false;
  const keys = [
    'name', 'members', 'startDate', 'endDate', 'currency', 'rateToTwd',
    'settled', 'rewardActivities', 'editorUids', 'editorEmails',
    'editorDisplayNames', 'ownerDisplayName', 'uid',
  ];
  return keys.every(k => JSON.stringify(prev[k] ?? null) === JSON.stringify(next[k] ?? null));
}

function updateProjectActiveUI(proj) {
  if (!projectActiveBar || !proj) return;
  const active = isProjectActive(proj);
  const isOwner = proj.uid === currentUser?.uid;
  projectActiveBar.classList.toggle('is-closed', !active);
  if (projectActiveTitle) {
    projectActiveTitle.textContent = active ? '專案進行中' : '專案已結束';
  }
  const hintText = isOwner
    ? (active ? '關閉後，新增記帳時不會出現此專案' : '重新開啟後，即可再次選入新增記帳')
    : (active ? '進行中的專案' : '已結束的專案不會出現在新增記帳選單');
  if (projectActiveHint) projectActiveHint.textContent = hintText;
  if (projectActiveBar) projectActiveBar.title = hintText;
  if (projectActiveToggle) {
    projectActiveToggle.checked = active;
    projectActiveToggle.disabled = !isOwner;
  }
  if (projectActiveToggleWrap) {
    projectActiveToggleWrap.style.display = isOwner ? '' : 'none';
  }
}

function matchesProjectSearch(r, kw, proj) {
  if (!kw) return true;
  const q = kw.toLowerCase();
  const payerUid = normalizeSplitPayerUid(r, proj, r.uid || null);
  const payerLabel = payerUid ? getProjectMemberLabelByUid(proj, payerUid) : '';
  const fields = [
    r.note,
    r.categoryName,
    r.subCategoryName,
    r.displayName,
    r.accountName,
    payerLabel,
    getRecordCreatorLabel(r, proj),
    r.foreignCurrency,
  ];
  return fields.some(f => f && String(f).toLowerCase().includes(q));
}

function renderProjectDetail() {
  const proj = allProjects.find(p => p.docId === currentProjectId);
  if (!proj) return;

  if (projectEditBtn) projectEditBtn.style.display = proj.uid === currentUser?.uid ? '' : 'none';
  if (projectDetailName) projectDetailName.textContent = proj.name;
  const dateStr = proj.startDate && proj.endDate
    ? `${proj.startDate} ～ ${proj.endDate}`
    : proj.startDate || '未設定日期';
  projectDetailDates.textContent = `📅 ${dateStr}`;
  projectDetailMembers.textContent = proj.members?.length
    ? `👥 ${proj.members.map(m => getMemberLabel(m, proj)).join('、')}` : '';

  updateProjectActiveUI(proj);

  // 此專案的所有支出記錄（含被邀請專案時他人記的；專案轉帳轉出也計入）
  const allRecs = getProjectRecords(proj).filter(isProjectExpenseLikeRecord);

  // 結算／回饋用完整資料，不受搜尋影響
  renderProjectSettle(proj, allRecs);
  renderProjectReward(proj, allRecs);
  renderProjectRecordList(proj, allRecs);
}

function renderProjectRecordList(proj, allRecs) {
  const kw = projectSearchKeyword.trim();
  const recs = kw ? allRecs.filter(r => matchesProjectSearch(r, kw, proj)) : allRecs;

  if (projectRecordSectionTitle) {
    if (kw) {
      projectRecordSectionTitle.textContent = `搜尋「${kw}」的結果（${recs.length}）`;
      projectRecordSectionTitle.classList.add('searching');
    } else {
      projectRecordSectionTitle.textContent = '花費明細';
      projectRecordSectionTitle.classList.remove('searching');
    }
  }

  projectRecordList.innerHTML = '';
  if (recs.length === 0) {
    projectRecordList.innerHTML = kw
      ? `<div class="project-empty">找不到「${kw}」的相關花費</div>`
      : '<div class="project-empty">還沒有相關記帳記錄</div>';
    return;
  }
  const sorted = [...recs].sort((a, b) => {
    const dCmp = (b.date || '').localeCompare(a.date || '');
    if (dCmp !== 0) return dCmp;
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });
  const groups = {};
  sorted.forEach(r => {
    const d = r.date || '';
    if (!groups[d]) groups[d] = [];
    groups[d].push(r);
  });
  Object.keys(groups).sort((a, b) => b.localeCompare(a)).forEach(date => {
    projectRecordList.appendChild(buildDateHeader(date, groups[date], null, proj));
    groups[date].forEach(r => {
      const item = document.createElement('div');
      item.className = 'project-record-item project-record-item-clickable';
      const recTwd = getProjectRecordTwdAmount(r, proj);
      const n = r.splitData?.length || 0;
      const firstUid = n ? normalizeSplitMemberUid(r.splitData[0], proj, r.uid || null) : null;
      const firstAmt = firstUid ? getMemberShareTwd(r, firstUid, proj) : 0;
      const isEqual = n > 1 && r.splitData.every(s => {
        const uid = normalizeSplitMemberUid(s, proj, r.uid || null);
        return uid ? getMemberShareTwd(r, uid, proj) === firstAmt : false;
      });
      const payerUid = normalizeSplitPayerUid(r, proj, r.uid || null);
      const payerLabel = payerUid ? getProjectMemberLabelByUid(proj, payerUid) : '';
      const splitSummary = r.splitPayer && n > 0
        ? (isEqual ? `${payerLabel} 付 · ${n}人 各 $${formatMoney(firstAmt)}` : `${payerLabel} 付 · ${n}人分攤`)
        : '';
      const foreignLine = r.foreignAmount && r.foreignCurrency ? `${r.foreignCurrency} ${formatMoney(r.foreignAmount)}` : '';
      const creatorText = `建立者：${getRecordCreatorLabel(r, proj)}`;
      const isCreator = canModifyRecord(r);
      item.innerHTML = `
        <div class="project-rec-left">
          <span class="project-rec-emoji">${r.displayEmoji || r.categoryEmoji || '📦'}</span>
          <div class="project-rec-info">
            <div class="project-rec-name">${r.displayName || r.categoryName || '其他'}</div>
            <div class="project-rec-meta">${r.note || ''}</div>
            ${splitSummary ? `<div class="project-rec-split-summary">${splitSummary}</div>` : ''}
          </div>
        </div>
        <div class="project-rec-right">
          <div class="project-rec-amount-wrap">
            <span class="project-rec-amount">-$${formatMoney(recTwd)}</span>
            ${foreignLine ? `<span class="project-rec-foreign">${foreignLine}</span>` : ''}
          </div>
          <div class="project-rec-badge">
            <span class="project-rec-edit-icon ${isCreator ? '' : 'is-hidden'}">✏️</span>
            <span class="project-rec-creator ${isCreator ? 'is-hidden' : ''}">${creatorText}</span>
          </div>
        </div>
        `;
      item.addEventListener('click', () => {
        if (canModifyRecord(r)) openModal(r);
        else openProjectRecordReadOnlyView(r, proj);
      });
      projectRecordList.appendChild(item);
    });
  });
}

function renderProjectSettle(proj, recs) {
  const members = getProjectMemberEntries(proj);
  const isSettled = !!(proj.settled?.all);

  // 共同花費 / 個人自費分開（專案情境下用專案匯率換算的台幣）
  const sharedRecs  = recs.filter(r => r.splitPayer && r.splitData?.length > 0);
  const selfRecs    = recs.filter(r => !r.splitPayer || !r.splitData?.length);
  const sharedTotal = sharedRecs.reduce((s, r) => s + getProjectRecordTwdAmount(r, proj), 0);
  // 個人自費應該是「目前登入者」自己的自費（沒有 split 的那種）
  const viewerUid = currentUser?.uid || null;
  const selfTotal = viewerUid
    ? selfRecs
      .filter(r => r.uid === viewerUid)
      .reduce((s, r) => s + getProjectRecordTwdAmount(r, proj), 0)
    : 0;

  // 計算每人淨額（正 = 別人欠他，負 = 他欠別人）
  let myNet = 0;
  let memberTableHtml = '';
  if (members.length >= 2 && sharedRecs.length > 0) {
    const paid = {}, owed = {};
    members.forEach(m => { paid[m.uid] = 0; owed[m.uid] = 0; });
    sharedRecs.forEach(r => {
      const payer = normalizeSplitPayerUid(r, proj, r.uid || null);
      if (paid[payer] !== undefined) paid[payer] += getProjectRecordTwdAmount(r, proj);
      r.splitData.forEach(s => {
        const uid = normalizeSplitMemberUid(s, proj, r.uid || null);
        if (uid && owed[uid] !== undefined) owed[uid] += getMemberShareTwd(r, uid, proj);
      });
    });
    myNet = Math.round((paid[currentUser?.uid] || 0) - (owed[currentUser?.uid] || 0));

    // 每人明細表格
    memberTableHtml = `<div class="settle-member-table">
      <div class="settle-member-table-header">
        <span>成員</span><span>付出</span><span>應付</span><span>淨額</span>
      </div>
      ${members.map(m => {
        const label = m.label;
        const n = Math.round((paid[m.uid] || 0) - (owed[m.uid] || 0));
        const cls = n > 0 ? 'positive' : n < 0 ? 'negative' : '';
        const netStr = n > 0 ? `+$${formatMoney(n)}` : n < 0 ? `-$${formatMoney(Math.abs(n))}` : '$0';
        return `<div class="settle-member-table-row">
          <span class="settle-m-name">${label}</span>
          <span class="settle-m-val">$${formatMoney(Math.round(paid[m.uid] || 0))}</span>
          <span class="settle-m-val">$${formatMoney(Math.round(owed[m.uid] || 0))}</span>
          <span class="settle-m-net ${cls}">${netStr}</span>
        </div>`;
      }).join('')}
    </div>`;
  }


  // 結清按鈕（只有有淨額且為專案建立者時才顯示）
  const isOwner = proj.uid === currentUser?.uid;
  const canSettle = isOwner && !isSettled && myNet !== 0 && members.length >= 2 && sharedRecs.length > 0;
  const canUnsettle = isOwner && isSettled;
  const settleBtnHtml = canSettle
    ? `<button class="settle-all-btn" id="settleAllBtn">結清</button>`
    : '';
  const unsettleBtnHtml = canUnsettle
    ? `<button class="settle-all-btn settle-cancel-btn" id="unsettleAllBtn">取消結清</button>`
    : '';

  projectSettleSummary.innerHTML = `
    <div class="settle-overview">
      <div class="settle-overview-row">
        <span>共同花費</span><span>$${formatMoney(sharedTotal)}</span>
      </div>
      <div class="settle-overview-row self">
        <span>個人自費</span><span>$${formatMoney(selfTotal)}</span>
      </div>
    </div>
    ${memberTableHtml}
    ${settleBtnHtml}
    ${unsettleBtnHtml}`;

  document.getElementById('settleAllBtn')?.addEventListener('click', async () => {
    if (!isOwner || isSettled) return;
    const step1 = confirm('確定要進行「結清」嗎？\n\n此操作會新增結清的收入/支出紀錄並標記為已結清。');
    if (!step1) return;
    const step2 = confirm('最後一次確認：真的要結清嗎？此操作無法在不修改資料的情況下自動撤回。');
    if (!step2) return;
    await doSettle(proj, recs, myNet);
  });

  document.getElementById('unsettleAllBtn')?.addEventListener('click', async () => {
    if (!isOwner) return;
    const step1 = confirm('確定要「取消結清」嗎？\n\n此操作會刪除結清產生的收入/支出紀錄。');
    if (!step1) return;
    const step2 = confirm('最後一次確認：真的要取消結清嗎？');
    if (!step2) return;
    await doUnsettle(proj);
  });
}


// 結清：一次處理所有跟目前登入者相關的結清
async function doSettle(proj, recs, myNet) {
  const today = new Date().toISOString().slice(0, 10);
  const writes = [];

  if (myNet < 0) {
    // 我欠別人 → 找出別人付、我有份額的記錄，各自產生一筆支出（帶原分類）
    const mySharedRecs = recs.filter(r =>
      !isCurrentUserSplitPayer(r) &&
      hasSplitForCurrentUser(r)
    );
    mySharedRecs.forEach(r => {
      const myUid = currentUser?.uid;
      const myShare = myUid ? getMemberShareTwd(r, myUid, proj) : 0;
      if (myShare <= 0) return;
      writes.push(addDoc(collection(db, 'records'), {
        uid: currentUser.uid,
        type: 'expense',
        amount: myShare,
        date: today,
        note: `${proj.name} 結清`,
        accountId: r.accountId || null,
        accountName: r.accountName || null,
        categoryId: r.categoryId || null,
        categoryName: r.categoryName || null,
        subCategoryId: r.subCategoryId || null,
        subCategoryName: r.subCategoryName || null,
        displayEmoji: r.displayEmoji || r.categoryEmoji || '💸',
        displayName: r.displayName || r.categoryName || '結清',
        isSettlement: true,
        settlementProjectId: proj.docId,
        createdAt: serverTimestamp(),
      }));
    });
  } else if (myNet > 0) {
    // 別人欠我 → 產生一筆結算收入（帳戶餘額對上，報表排除）
    writes.push(addDoc(collection(db, 'records'), {
      uid: currentUser.uid,
      type: 'income',
      amount: myNet,
      date: today,
      note: `${proj.name} 結清`,
      accountId: null,
      accountName: null,
      categoryId: null,
      categoryName: '結算收入',
      displayEmoji: '💰',
      displayName: '旅遊結清收入',
      isSettlement: true,
      settlementProjectId: proj.docId,
      createdAt: serverTimestamp(),
    }));
  }

  await Promise.all(writes);
  await updateDoc(doc(db, 'projects', proj.docId), { 'settled.all': true });
}

// 取消結清：刪除由結清產生的紀錄，並把專案狀態還原
async function doUnsettle(proj) {
  if (!proj?.docId) return;
  const myUid = currentUser?.uid || null;
  if (!myUid) return;

  try {
    // 先只查「我自己」的 records，避免 query 掛到你無法讀取的文件而被權限擋住
    const q = query(collection(db, 'records'), where('uid', '==', myUid));
    const snap = await getDocs(q);

    // 再在 client 端篩出「此專案」的結清紀錄
    const toDelete = snap.docs
      .map(d => ({ id: d.id, data: d.data() }))
      .filter(({ data }) => !!data?.isSettlement && data?.settlementProjectId === proj.docId)
      .map(({ id }) => id);

    if (toDelete.length > 0) {
      const batch = [];
      toDelete.forEach(id => batch.push(deleteDoc(doc(db, 'records', id))));
      await Promise.all(batch);
    }

    // 還原專案狀態
    await updateDoc(doc(db, 'projects', proj.docId), { 'settled.all': false });
  } catch (err) {
    console.error(err);
    alert(`取消結清失敗：${err?.message || '請檢查 Firestore 權限規則'}`);
  }
}

function renderProjectReward(proj, recs) {
  if (!projectRewardSection) return;
  projectRewardSection.style.display = '';
  const acts = (proj.rewardActivities || []).filter(a => a.name);
  projectRewardList.innerHTML = '';
  if (acts.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'project-reward-empty';
    empty.textContent = '尚無回饋活動，點「管理回饋活動」新增';
    projectRewardList.appendChild(empty);
    return;
  }
  acts.forEach(act => {
    const currency  = act.currency || 'TWD';
    // 回饋追蹤：
    //   活動幣別為 TWD → 用台幣金額
    //   活動幣別為外幣 → 只計入幣別相符的外幣金額，無外幣記錄不計入
    const spent = recs
      .filter(r => {
        if (Array.isArray(r.rewardActivityIds)) return r.rewardActivityIds.includes(act.id);
        return r.rewardActivityId === act.id; // 舊資料相容
      })
      .reduce((s, r) => {
        if (currency === 'TWD') return s + getProjectRecordTwdAmount(r, proj);
        if (r.foreignAmount && r.foreignCurrency === currency) return s + r.foreignAmount;
        return s; // 幣別不符，跳過
      }, 0);
    const limit     = act.limit || 0;
    const remaining = limit - spent;
    const pct       = limit > 0 ? Math.min(Math.round(spent / limit * 100), 100) : 0;
    const over      = limit > 0 && spent > limit;
    const warn      = pct >= 80 && !over;

    const card = document.createElement('div');
    card.className = 'reward-track-card';
    card.innerHTML = `
      <div class="reward-track-header">
        <span class="reward-track-name">${act.name}</span>
        <span class="reward-track-currency">${currency}</span>
        ${over ? '<span class="reward-track-badge over">已達上限</span>' : warn ? '<span class="reward-track-badge warn">⚠️ 接近上限</span>' : ''}
      </div>
      <div class="reward-track-bar-wrap">
        <div class="reward-track-bar${over ? ' over' : warn ? ' warn' : ''}" style="width:${pct}%"></div>
      </div>
      <div class="reward-track-nums">
        <span class="reward-track-spent">已刷 ${formatMoney(Math.round(spent))}</span>
        <span class="reward-track-remain${over ? ' over' : ''}">
          ${over ? `超出 ${formatMoney(Math.round(spent - limit))}` : `剩餘 ${formatMoney(Math.round(remaining))}`} / ${formatMoney(limit)}
        </span>
      </div>
    `;
    projectRewardList.appendChild(card);
  });
}

projectEditBtn.addEventListener('click', () => {
  const proj = allProjects.find(p => p.docId === currentProjectId);
  if (proj) openProjectModal(proj);
});

projectSearchInput?.addEventListener('input', () => {
  projectSearchKeyword = projectSearchInput.value;
  if (projectSearchClearBtn) {
    projectSearchClearBtn.style.display = projectSearchKeyword ? '' : 'none';
  }
  const proj = allProjects.find(p => p.docId === currentProjectId);
  if (!proj) return;
  const allRecs = getProjectRecords(proj).filter(isProjectExpenseLikeRecord);
  renderProjectRecordList(proj, allRecs);
});

projectSearchClearBtn?.addEventListener('click', () => {
  if (projectSearchInput) projectSearchInput.value = '';
  projectSearchKeyword = '';
  if (projectSearchClearBtn) projectSearchClearBtn.style.display = 'none';
  const proj = allProjects.find(p => p.docId === currentProjectId);
  if (!proj) return;
  const allRecs = getProjectRecords(proj).filter(isProjectExpenseLikeRecord);
  renderProjectRecordList(proj, allRecs);
  projectSearchInput?.focus();
});

projectActiveToggle?.addEventListener('change', async () => {
  const proj = allProjects.find(p => p.docId === currentProjectId);
  if (!proj || proj.uid !== currentUser?.uid) {
    if (projectActiveToggle) projectActiveToggle.checked = isProjectActive(proj);
    return;
  }
  const nextActive = !!projectActiveToggle.checked;
  projectActiveToggle.disabled = true;
  try {
    await updateDoc(doc(db, 'projects', proj.docId), { active: nextActive });
    // onSnapshot 會刷新列表／詳情；此處先樂觀更新 UI
    proj.active = nextActive;
    updateProjectActiveUI(proj);
    updateRecordProjectSelect();
  } catch (err) {
    console.error(err);
    alert('更新專案狀態失敗');
    projectActiveToggle.checked = isProjectActive(proj);
  } finally {
    projectActiveToggle.disabled = false;
  }
});

if (projectRewardManageBtn) {
  projectRewardManageBtn.addEventListener('click', () => {
    const proj = allProjects.find(p => p.docId === currentProjectId);
    if (proj) openRewardActivityModal(proj);
  });
}

if (projectReportBtn) {
  projectReportBtn.addEventListener('click', () => {
    const proj = allProjects.find(p => p.docId === currentProjectId);
    if (proj) openProjectReportModal(proj);
  });
}

function openProjectReportModal(proj) {
  const members = getProjectMemberEntries(proj);
  projectReportMemberSelect.innerHTML = '<option value="">全部成員</option>';
  projectReportPayerSelect.innerHTML = '<option value="">全部</option>';
  members.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.uid;
    opt.textContent = m.label;
    projectReportMemberSelect.appendChild(opt);
    
    const payerOpt = document.createElement('option');
    payerOpt.value = m.uid;
    payerOpt.textContent = m.label;
    projectReportPayerSelect.appendChild(payerOpt);
  });
  
  currentReportRecs = getProjectRecords(proj).filter(isProjectExpenseLikeRecord);
  
  projectReportMemberSelect.onchange = () => renderProjectReportTable(proj);
  projectReportPayerSelect.onchange = () => renderProjectReportTable(proj);
  projectReportCheckAll.onchange = () => {
    const cbs = projectReportTableBody.querySelectorAll('.report-row-cb');
    cbs.forEach(cb => cb.checked = projectReportCheckAll.checked);
    calculateProjectReportTotal();
  };
  
  renderProjectReportTable(proj);
  projectReportModalOverlay.classList.add('active');
}

if (closeProjectReportModalBtn) {
  closeProjectReportModalBtn.addEventListener('click', () => {
    projectReportModalOverlay.classList.remove('active');
  });
}
if (projectReportModalOverlay) {
  projectReportModalOverlay.addEventListener('click', (e) => {
    if (e.target === projectReportModalOverlay) projectReportModalOverlay.classList.remove('active');
  });
}

function renderProjectReportTable(proj) {
  const filterUidRaw = projectReportMemberSelect.value;
  const filterUid = filterUidRaw
    ? (resolveProjectReportFilterMemberUid(proj, filterUidRaw) || filterUidRaw)
    : '';
  const filterPayerRaw = projectReportPayerSelect.value;
  const filterPayerUid = filterPayerRaw
    ? (resolveProjectReportFilterMemberUid(proj, filterPayerRaw) || filterPayerRaw)
    : '';
  projectReportTableBody.innerHTML = '';
  
  const sorted = [...currentReportRecs].sort((a, b) => {
    const dCmp = (b.date || '').localeCompare(a.date || '');
    if (dCmp !== 0) return dCmp;
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });
  
  sorted.forEach(r => {
    if (filterPayerUid) {
      const payerUid = resolveRecordSplitPayerUid(r, proj);
      if (payerUid !== filterPayerUid) return;
    }
    
    let rowTwd = 0;
    
    if (filterUid) {
      const share = getProjectReportMemberShareTwd(r, filterUid, proj);
      if (share <= 0) return;
      rowTwd = share;
    } else {
      rowTwd = getProjectRecordTwdAmount(r, proj);
    }
    
    const tr = document.createElement('tr');
    
    const tdCb = document.createElement('td');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'report-row-cb';
    cb.checked = true;
    cb.onchange = () => calculateProjectReportTotal();
    cb.dataset.amount = rowTwd;
    tdCb.appendChild(cb);
    
    const tdDate = document.createElement('td');
    tdDate.textContent = r.date || '';
    
    const tdItem = document.createElement('td');
    const emoji = r.displayEmoji || r.categoryEmoji || '📦';
    const name = r.displayName || r.categoryName || '其他';
    tdItem.textContent = `${emoji} ${name}`;
    
    const tdNote = document.createElement('td');
    tdNote.textContent = r.note || '';

    const tdFx = document.createElement('td');
    tdFx.className = 'num-col';
    if (r.foreignCurrency && r.foreignCurrency !== 'TWD' && r.foreignAmount != null) {
      tdFx.textContent = `${r.foreignCurrency} ${formatMoneyByCurrency(r.foreignAmount, r.foreignCurrency)}`;
    } else {
      tdFx.textContent = '';
    }
    
    const tdTwd = document.createElement('td');
    tdTwd.className = 'num-col';
    tdTwd.textContent = `$${formatMoney(rowTwd)}`;
    
    const tdPayer = document.createElement('td');
    tdPayer.textContent = getProjectReportPayerColumnText(r, proj);
    
    tr.appendChild(tdCb);
    tr.appendChild(tdDate);
    tr.appendChild(tdItem);
    tr.appendChild(tdNote);
    tr.appendChild(tdFx);
    tr.appendChild(tdTwd);
    tr.appendChild(tdPayer);
    
    projectReportTableBody.appendChild(tr);
  });
  
  projectReportCheckAll.checked = true;
  calculateProjectReportTotal();
}

function calculateProjectReportTotal() {
  const cbs = projectReportTableBody.querySelectorAll('.report-row-cb:checked');
  let total = 0;
  cbs.forEach(cb => {
    total += parseFloat(cb.dataset.amount) || 0;
  });
  if (projectReportTotalAmount) projectReportTotalAmount.textContent = `$${formatMoney(total)}`;
}

if (exportProjectReportCsvBtn) {
  exportProjectReportCsvBtn.addEventListener('click', () => {
    const proj = allProjects.find(p => p.docId === currentProjectId);
    const projName = proj ? proj.name : '專案';
    const filterUid = projectReportMemberSelect.value;
    const filterMemberName = filterUid ? projectReportMemberSelect.options[projectReportMemberSelect.selectedIndex].textContent : '全部成員';
    
    // 從表格抓取已勾選的列
    const rows = Array.from(projectReportTableBody.querySelectorAll('tr')).filter(tr => {
      const cb = tr.querySelector('.report-row-cb');
      return cb && cb.checked;
    });

    if (rows.length === 0) {
      alert('請至少勾選一筆資料匯出');
      return;
    }

    const headers = ['消費日期', '消費項目', '備註', '外幣', '台幣', '付款人'];
    const escapeCell = (v) => {
      if (v == null) return '';
      const s = String(v).trim();
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    let totalTwd = 0;
    const csvData = rows.map(tr => {
      const tds = tr.querySelectorAll('td');
      // tds[1] = 日期, tds[2] = 項目, tds[3] = 備註, tds[4] = 外幣, tds[5] = 台幣, tds[6] = 付款人
      const twdVal = (tds[5]?.textContent || '').replace(/[$,]/g, '');
      totalTwd += parseFloat(twdVal) || 0;
      return [
        tds[1]?.textContent || '',
        tds[2]?.textContent || '',
        tds[3]?.textContent || '',
        tds[4]?.textContent || '',
        twdVal,
        tds[6]?.textContent || ''
      ];
    });

    // 加上總計列，直接寫入加總後的數字
    csvData.push(['', '', '總計', '', String(totalTwd), '']);

    const lines = [
      headers.join(','),
      ...csvData.map(row => row.map(escapeCell).join(','))
    ];
    
    const csv = '\uFEFF' + lines.join('\r\n'); // BOM
    const ts = new Date().toISOString().slice(0, 10);
    const filename = `${projName}_${filterMemberName}_報表_${ts}.csv`;
    
    // 下載檔案
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

// ===== 記帳 modal 的專案選單 =====
function ensureRecordProjectOption(projectId) {
  if (!projectId || !recordProjectSelect) return;
  if ([...recordProjectSelect.options].some(o => o.value === projectId)) return;
  const p = allProjects.find(x => x.docId === projectId);
  if (!p) return;
  const opt = document.createElement('option');
  opt.value = p.docId;
  opt.textContent = isProjectActive(p) ? p.name : `${p.name}（已結束）`;
  recordProjectSelect.appendChild(opt);
}

/** 僅在「加入專案」開啟時回傳目前選中的專案 id */
function getSelectedRecordProjectId() {
  if (!recordProjectToggle?.checked) return '';
  return recordProjectSelect?.value || '';
}

function syncRecordProjectToggleUI() {
  const on = !!recordProjectToggle?.checked;
  if (recordProjectSelectWrap) {
    recordProjectSelectWrap.style.display = on ? '' : 'none';
  }
  updateSplitGroupVisibility();
  updateRewardActivitySelect();
}

function setRecordProjectEnabled(enabled, projectId = '') {
  if (recordProjectToggle) recordProjectToggle.checked = !!enabled;
  if (recordProjectSelect && enabled) {
    if (projectId && [...recordProjectSelect.options].some(o => o.value === projectId)) {
      recordProjectSelect.value = projectId;
    } else if (recordProjectSelect.options.length) {
      recordProjectSelect.selectedIndex = 0;
    }
  }
  syncRecordProjectToggleUI();
}

function updateRecordProjectSelect() {
  const prev = recordProjectSelect.value;
  const wasOn = !!recordProjectToggle?.checked;
  recordProjectSelect.innerHTML = '';
  allProjects.filter(isProjectActive).forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.docId;
    opt.textContent = p.name;
    recordProjectSelect.appendChild(opt);
  });
  if (prev && [...recordProjectSelect.options].some(o => o.value === prev)) {
    recordProjectSelect.value = prev;
  } else if (recordProjectSelect.options.length) {
    recordProjectSelect.selectedIndex = 0;
  }
  // 開關為來源；若已無可用專案則關閉
  if (recordProjectToggle) {
    recordProjectToggle.checked = wasOn && recordProjectSelect.options.length > 0;
  }
  syncRecordProjectToggleUI();
}

recordProjectToggle?.addEventListener('change', () => {
  if (recordProjectToggle.checked && recordProjectSelect && !recordProjectSelect.value
      && recordProjectSelect.options.length) {
    recordProjectSelect.selectedIndex = 0;
  }
  syncRecordProjectToggleUI();
});

recordProjectSelect.addEventListener('change', () => {
  updateSplitGroupVisibility();
  updateRewardActivitySelect();
});

function updateRewardActivitySelect(savedIds = []) {
  const projId = getSelectedRecordProjectId();
  const proj   = allProjects.find(p => p.docId === projId);
  const acts   = proj?.rewardActivities?.filter(a => a.name) || [];
  if (!projId || acts.length === 0) {
    rewardActivityGroup.style.display = 'none';
    if (rewardActivityChecklist) rewardActivityChecklist.innerHTML = '';
    return;
  }
  rewardActivityGroup.style.display = '';
  if (rewardActivityChecklist) rewardActivityChecklist.innerHTML = '';
  const idSet = new Set(Array.isArray(savedIds) ? savedIds : (savedIds ? [savedIds] : []));
  acts.forEach(a => {
    const row = document.createElement('label');
    row.className = 'reward-activity-item';
    row.innerHTML = `
      <input type="checkbox" class="reward-activity-cb" value="${a.id}" ${idSet.has(a.id) ? 'checked' : ''} />
      <span class="reward-activity-label">${a.name}（上限 ${a.currency || 'TWD'} ${formatMoney(a.limit)}）</span>
    `;
    rewardActivityChecklist?.appendChild(row);
  });
}

function getSelectedRewardActivityIds() {
  if (!rewardActivityChecklist) return [];
  return [...rewardActivityChecklist.querySelectorAll('.reward-activity-cb:checked')].map(el => el.value);
}

if (rewardActivityClearBtn) {
  rewardActivityClearBtn.addEventListener('click', () => {
    rewardActivityChecklist?.querySelectorAll('.reward-activity-cb').forEach(cb => { cb.checked = false; });
  });
}

function updateSplitGroupVisibility(record = null) {
  const projId = getSelectedRecordProjectId();
  const proj   = allProjects.find(p => p.docId === projId);
  if (!proj || getProjectMemberEntries(proj).length < 2) {
    splitGroup.style.display = 'none';
    return;
  }
  splitGroup.style.display = '';
  renderSplitUI(proj, record);
}

function renderSplitUI(proj, record = null) {
  const members = getProjectMemberEntries(proj);
  const savedSplits = record?.splitData ?? null;

  // 付款人：有明確儲存值則還原；否則（含新紀錄）預設為目前登入者
  let selectedPayerUid = null;
  if (record) {
    if (record.splitPayerUid && members.some(m => m.uid === record.splitPayerUid)) {
      selectedPayerUid = record.splitPayerUid;
    } else if (record.splitPayer || record.splitPayerUid) {
      const resolved = normalizeSplitPayerUid(record, proj, record?.uid || null);
      if (resolved && members.some(m => m.uid === resolved)) selectedPayerUid = resolved;
    }
  }

  const hasSplit = !!(savedSplits && savedSplits.length > 0);
  if (splitEnableToggle) splitEnableToggle.checked = hasSplit;
  if (splitDetail) splitDetail.style.display = hasSplit ? '' : 'none';

  let restoreCustom = false;
  if (savedSplits && savedSplits.length > 1) {
    const amounts = savedSplits.map(s => s.amount);
    restoreCustom = amounts.some(a => a !== amounts[0]);
  }

  splitPayer.innerHTML = '';
  members.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.uid;
    opt.textContent = m.label;
    splitPayer.appendChild(opt);
  });
  if (selectedPayerUid) {
    splitPayer.value = selectedPayerUid;
  } else if (currentUser?.uid && members.some(m => m.uid === currentUser.uid)) {
    splitPayer.value = currentUser.uid;
  }

  splitMode = restoreCustom ? 'custom' : 'equal';
  splitEqualToggle.checked = !restoreCustom;

  const savedMemberUids = savedSplits ? savedSplits.map(s => normalizeSplitMemberUid(s, proj)).filter(Boolean) : null;
  const hasSavedMemberSelection = !!(savedMemberUids && savedMemberUids.length > 0);

  splitMemberList.innerHTML = '';
  members.forEach((m, i) => {
    // 無儲存的分攤成員時：預設全選（與「全選」勾選一致）；有儲存則依紀錄還原
    const shouldCheck = hasSavedMemberSelection ? savedMemberUids.includes(m.uid) : true;
    const savedAmt = savedSplits?.find(s => normalizeSplitMemberUid(s, proj) === m.uid)?.amount ?? '';
    const row = document.createElement('label');
    row.className = 'split-card-row';
    row.innerHTML = `
      <input type="checkbox" class="split-member-cb" data-member-uid="${m.uid}" ${shouldCheck ? 'checked' : ''} />
      <span class="split-card-name">${m.label}</span>
      <div class="amount-input-wrap split-card-input-wrap">
        <span class="currency-sign">$</span>
        <input type="number" class="split-card-amount" data-member-uid="${m.uid}" placeholder="0" inputmode="decimal" value="${savedAmt}" />
      </div>`;
    row.querySelector('.split-member-cb').addEventListener('change', syncSelectAllAndAmounts);
    row.querySelector('.split-card-amount').addEventListener('input', syncEqualAmounts);
    splitMemberList.appendChild(row);
  });

  splitSelectAll.checked = hasSavedMemberSelection
    ? (members.length > 0 && members.every(m => savedMemberUids.includes(m.uid)))
    : (members.length > 0);
  splitSelectAll.addEventListener('change', () => {
    splitMemberList.querySelectorAll('.split-member-cb').forEach(cb => {
      cb.checked = splitSelectAll.checked;
    });
    syncEqualAmounts();
  });

  syncEqualAmounts();
}

function syncSelectAllAndAmounts() {
  const cbs = splitMemberList.querySelectorAll('.split-member-cb');
  splitSelectAll.checked = cbs.length > 0 && [...cbs].every(cb => cb.checked);
  syncEqualAmounts();
}

function syncEqualAmounts() {
  const amount = parseFloat(document.getElementById('amount').value) || 0;
  const checked = getCheckedMembers();
  if (checked.length === 0) return;
  const each = Math.round(amount / checked.length);
  if (splitEqualToggle.checked) {
    splitMemberList.querySelectorAll('.split-card-amount').forEach(inp => {
      if (inp.closest('label').querySelector('.split-member-cb').checked) {
        inp.value = each;
        inp.readOnly = true;
      } else {
        inp.readOnly = false;
      }
    });
  } else {
    splitMemberList.querySelectorAll('.split-card-amount').forEach(inp => {
      inp.readOnly = false;
    });
  }
}

splitPayer.addEventListener('change', () => syncEqualAmounts());

if (splitEnableToggle && splitDetail) {
  splitEnableToggle.addEventListener('change', () => {
    splitDetail.style.display = splitEnableToggle.checked ? '' : 'none';
    if (splitEnableToggle.checked) syncEqualAmounts();
  });
}

splitEqualToggle.addEventListener('change', () => {
  splitMode = splitEqualToggle.checked ? 'equal' : 'custom';
  syncEqualAmounts();
});

function getCheckedMembers() {
  return [...splitMemberList.querySelectorAll('.split-member-cb:checked')].map(el => el.dataset.memberUid);
}

/**
 * 取得某成員在該筆記錄中「應付／分攤」的台幣金額。
 * 外幣記錄時 splitData 可能存的是原幣份額，依 record 台幣金額按比例換算。
 * 可傳入 project：專案情境下用專案匯率換算的台幣作為基準。
 */
function getMemberShareTwd(r, memberUid, project = null) {
  if (!r.splitData?.length) return 0;
  const total = r.splitData.reduce((a, s) => a + s.amount, 0);
  if (total === 0) return 0;
  const s = r.splitData.find(x => normalizeSplitMemberUid(x, project, r.uid || null) === memberUid);
  if (!s) return 0;
  const baseAmount = project ? getProjectRecordTwdAmount(r, project) : (r.amount ?? 0);
  if (r.foreignAmount != null && r.foreignCurrency) {
    return Math.round(baseAmount * (s.amount / total));
  }
  return s.amount;
}

function getSplitData(amountToSplit) {
  const projId = getSelectedRecordProjectId();
  const proj   = allProjects.find(p => p.docId === projId);
  if (!proj || splitGroup.style.display === 'none') return { splitPayer: null, splitPayerUid: null, splitData: null };
  if (splitEnableToggle && !splitEnableToggle.checked) return { splitPayer: null, splitPayerUid: null, splitData: null };

  const members = getCheckedMembers();
  const amount  = amountToSplit ?? (parseFloat(document.getElementById('amount').value) || 0);
  let splits = [];
  if (splitMode === 'equal') {
    const each = Math.round(amount / members.length);
    splits = members.map(uid => ({ uid, name: getProjectMemberLabelByUid(proj, uid), amount: each }));
  } else {
    splits = members.map(uid => {
      const inp = splitMemberList.querySelector(`input.split-card-amount[data-member-uid="${uid}"]`);
      return { uid, name: getProjectMemberLabelByUid(proj, uid), amount: parseFloat(inp?.value) || 0 };
    });
  }
  return {
    splitPayer: getProjectMemberLabelByUid(proj, splitPayer.value),
    splitPayerUid: splitPayer.value || null,
    splitData: splits
  };
}

function renderBudgetPage() {
  renderMonthBudget();
  renderCatBudgetList();
}

function renderMonthBudget() {
  const budget = allBudgets.find(b => b.type === 'month');
  if (!budget) {
    budgetMonthEmpty.style.display = '';
    budgetMonthInfo.style.display  = 'none';
    deleteMonthBudgetBtn.style.display = 'none';
    return;
  }
  budgetMonthEmpty.style.display = 'none';
  budgetMonthInfo.style.display  = '';

  // 計算本月支出（排除指定類別）
  const now = new Date();
  const ym  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const excluded = budget.excludedCategoryIds || [];
  const spent = allRecords
    .filter(r => {
      if (r.type !== 'expense' || !r.date?.startsWith(ym)) return false;
      if (r.splitPayer && !isCurrentUserSplitPayer(r) && !r.isSettlement) return false;
      if (r.subCategoryId && excluded.includes(`${r.categoryId}::${r.subCategoryId}`)) return false;
      if (!r.subCategoryId && excluded.includes(r.categoryId)) return false;
      return true;
    })
    .reduce((s, r) => s + getReportAmount(r), 0);

  const limit = budget.amount;
  const pct   = limit > 0 ? Math.min(Math.round(spent / limit * 100), 100) : 0;
  const over  = spent > limit;
  const warn  = pct >= 80;

  budgetMonthSpent.textContent = `$${formatMoney(spent)}`;
  budgetMonthSpent.style.color = over ? 'var(--red-main)' : warn ? '#e8830a' : 'var(--text-dark)';
  budgetMonthLimit.textContent = `$${formatMoney(limit)}`;
  budgetMonthBar.style.width   = `${pct}%`;
  budgetMonthBar.className     = `budget-progress-bar${over ? ' danger' : warn ? ' warning' : ''}`;
  const pctLabel = over ? `已超支 $${formatMoney(spent - limit)}` : `已使用 ${pct}%`;
  budgetMonthPct.textContent   = pctLabel;
  budgetMonthPct.className     = `budget-month-pct${over ? ' danger' : warn ? ' warning' : ''}`;
}

function renderCatBudgetList() {
  const catBudgets = allBudgets.filter(b => b.type === 'category');
  catBudgetEmpty.style.display = catBudgets.length === 0 ? '' : 'none';

  // 清除舊項目（保留 empty）
  Array.from(catBudgetList.children).forEach(el => {
    if (!el.classList.contains('budget-empty')) el.remove();
  });
  if (catBudgets.length === 0) return;

  // 計算今年各類別/子分類支出
  const thisYear = new Date().getFullYear();
  const yearPrefix = `${thisYear}-`;
  const spentMap = {};
  allRecords
    .filter(r => {
      if (r.type !== 'expense' || !r.date?.startsWith(yearPrefix)) return false;
      if (r.splitPayer && !isCurrentUserSplitPayer(r) && !r.isSettlement) return false;
      return true;
    })
    .forEach(r => {
      // 主分類 key
      const catKey = r.categoryId || '__none__';
      spentMap[catKey] = (spentMap[catKey] || 0) + getReportAmount(r);
      // 子分類 key（格式同排除：catId::subId）
      if (r.subCategoryId) {
        const subKey = `${r.categoryId}::${r.subCategoryId}`;
        spentMap[subKey] = (spentMap[subKey] || 0) + getReportAmount(r);
      }
    });

  catBudgets.forEach(b => {
    // 支援多選 categoryItems，或舊格式單選
    const items = b.categoryItems?.length
      ? b.categoryItems
      : [{ catId: b.categoryId, subId: b.subCategoryId || null, emoji: b.subCategoryEmoji || b.categoryEmoji || '📦', label: b.subCategoryName ? `${b.categoryName}・${b.subCategoryName}` : b.categoryName }];

    const spent = items.reduce((sum, ci) => {
      const key = ci.subId ? `${ci.catId}::${ci.subId}` : ci.catId;
      return sum + (spentMap[key] || 0);
    }, 0);

    const limit = b.amount;
    const pct   = limit > 0 ? Math.min(Math.round(spent / limit * 100), 100) : 0;
    const over  = spent > limit;
    const warn  = pct >= 80;

    // 顯示名稱：多選時用第一項 emoji + 所有 label 合併
    const displayEmoji = items[0]?.emoji || '📦';
    const displayName  = items.length > 1
      ? items.map(i => i.label).join('、')
      : (items[0]?.label || '未知分類');

    const item = document.createElement('div');
    item.className = 'cat-budget-item';
    item.innerHTML = `
      <div class="cat-budget-emoji">${displayEmoji}</div>
      <div class="cat-budget-info">
        <div class="cat-budget-name">${displayName}</div>
        <div class="cat-budget-bar-row">
          <div class="cat-budget-progress-wrap">
            <div class="cat-budget-progress-bar${over ? ' danger' : warn ? ' warning' : ''}" style="width:${pct}%"></div>
          </div>
          <span class="cat-budget-pct${over ? ' danger' : warn ? ' warning' : ''}">${pct}%</span>
        </div>
      </div>
      <div class="cat-budget-amount">
        <span style="color:${over ? 'var(--red-main)' : warn ? '#e8830a' : 'var(--text-dark)'}">$${formatMoney(spent)}</span>
        <div style="font-size:11px;color:var(--text-light);margin-top:2px">/ $${formatMoney(limit)}</div>
      </div>
    `;
    item.addEventListener('click', () => openCatBudgetModal(b));
    catBudgetList.appendChild(item);
  });
}

// 月預算 modal
editMonthBudgetBtn.addEventListener('click', () => {
  const budget = allBudgets.find(b => b.type === 'month');
  monthBudgetInput.value = budget ? budget.amount : '';
  deleteMonthBudgetBtn.style.display = budget ? '' : 'none';
  renderExcludeCatGrid(budget?.excludedCategoryIds || []);
  monthBudgetOverlay.classList.add('active');
});
const closeMonthBudgetModal = () => monthBudgetOverlay.classList.remove('active');
closeMonthBudgetBtn.addEventListener('click', closeMonthBudgetModal);
monthBudgetOverlay.addEventListener('click', e => { if (e.target === monthBudgetOverlay) closeMonthBudgetModal(); });

function renderExcludeCatGrid(excluded = []) {
  excludeCatGrid.innerHTML = '';
  const expCats = allCategories.filter(c => c.type === 'expense');

  expCats.forEach(cat => {
    if (cat.subs && cat.subs.length > 0) {
      // 有子分類 → 可折疊群組
      const anyChecked = cat.subs.some(s => excluded.includes(`${cat.docId}::${s.docId}`));
      const group = document.createElement('div');
      group.className = 'exclude-group';

      // 群組標題（點擊展開/收合）
      const header = document.createElement('div');
      header.className = 'exclude-group-header';
      header.innerHTML = `
        <span class="exclude-group-emoji">${cat.emoji}</span>
        <span class="exclude-group-name">${cat.name}</span>
        ${anyChecked ? `<span class="exclude-group-badge">${cat.subs.filter(s => excluded.includes(`${cat.docId}::${s.docId}`)).length}</span>` : ''}
        <span class="exclude-group-arrow">›</span>`;

      const body = document.createElement('div');
      body.className = 'exclude-group-body';

      cat.subs.forEach(sub => {
        const id = `${cat.docId}::${sub.docId}`;
        const checked = excluded.includes(id);
        const item = document.createElement('label');
        item.className = 'exclude-cat-item' + (checked ? ' checked' : '');
        item.innerHTML = `
          <input type="checkbox" value="${id}" ${checked ? 'checked' : ''} />
          <span class="exclude-cat-emoji">${sub.emoji || cat.emoji}</span>
          <span class="exclude-cat-name">${sub.name}</span>`;
        item.querySelector('input').addEventListener('change', () => {
          item.classList.toggle('checked', item.querySelector('input').checked);
          // 更新 badge
          const checkedCount = body.querySelectorAll('input:checked').length;
          const badge = header.querySelector('.exclude-group-badge');
          if (checkedCount > 0) {
            if (badge) badge.textContent = checkedCount;
            else header.querySelector('.exclude-group-arrow').insertAdjacentHTML('beforebegin',
              `<span class="exclude-group-badge">${checkedCount}</span>`);
          } else if (badge) badge.remove();
        });
        body.appendChild(item);
      });

      header.addEventListener('click', () => {
        group.classList.toggle('open');
      });

      group.appendChild(header);
      group.appendChild(body);
      excludeCatGrid.appendChild(group);
    } else {
      // 無子分類 → 直接顯示
      const checked = excluded.includes(cat.docId);
      const item = document.createElement('label');
      item.className = 'exclude-cat-item' + (checked ? ' checked' : '');
      item.innerHTML = `
        <input type="checkbox" value="${cat.docId}" ${checked ? 'checked' : ''} />
        <span class="exclude-cat-emoji">${cat.emoji}</span>
        <span class="exclude-cat-name">${cat.name}</span>`;
      item.querySelector('input').addEventListener('change', () => {
        item.classList.toggle('checked', item.querySelector('input').checked);
      });
      excludeCatGrid.appendChild(item);
    }
  });
}

function getExcludedCategoryIds() {
  return [...excludeCatGrid.querySelectorAll('input[type=checkbox]:checked')]
    .map(el => el.value);
}

saveMonthBudgetBtn.addEventListener('click', async () => {
  const amount = parseInt(monthBudgetInput.value, 10);
  if (!amount || amount <= 0) { monthBudgetInput.focus(); return; }
  const excludedCategoryIds = getExcludedCategoryIds();
  const existing = allBudgets.find(b => b.type === 'month');
  if (existing) {
    await updateDoc(doc(db, 'budgets', existing.docId), { amount, excludedCategoryIds });
  } else {
    await addDoc(collection(db, 'budgets'), { uid: currentUser.uid, type: 'month', amount, excludedCategoryIds });
  }
  closeMonthBudgetModal();
});

deleteMonthBudgetBtn.addEventListener('click', async () => {
  const existing = allBudgets.find(b => b.type === 'month');
  if (existing && confirm('確定要刪除月預算設定？')) {
    await deleteDoc(doc(db, 'budgets', existing.docId));
    closeMonthBudgetModal();
  }
});

// 類別預算 modal
// 多選陣列：[{ catId, subId, emoji, label }, ...]
let catBudgetSelectedItems = [];

// 將選取項目轉成唯一 key
function catItemKey(catId, subId) {
  return subId ? `${catId}::${subId}` : catId;
}

function isCatItemSelected(catId, subId) {
  return catBudgetSelectedItems.some(i => catItemKey(i.catId, i.subId) === catItemKey(catId, subId));
}

function toggleCatItem(catId, subId, emoji, label) {
  const key = catItemKey(catId, subId);
  const idx = catBudgetSelectedItems.findIndex(i => catItemKey(i.catId, i.subId) === key);
  if (idx >= 0) {
    catBudgetSelectedItems.splice(idx, 1);
  } else {
    catBudgetSelectedItems.push({ catId, subId, emoji, label });
  }
  renderCatBudgetCatGrid();
  renderCatBudgetSelectedTags();
}

function openCatBudgetModal(budget = null) {
  editingCatBudgetId = budget?.docId || null;
  catBudgetModalTitle.textContent = budget ? '編輯類別預算' : '新增類別預算';
  catBudgetAmtInput.value = budget ? budget.amount : '';
  deleteCatBudgetBtn.style.display = budget ? '' : 'none';

  // 還原已選項目（支援舊格式單選 & 新格式多選）
  if (budget?.categoryItems) {
    catBudgetSelectedItems = budget.categoryItems.map(ci => ({
      catId: ci.catId, subId: ci.subId || null,
      emoji: ci.emoji, label: ci.label,
    }));
  } else if (budget?.categoryId) {
    // 舊格式相容
    catBudgetSelectedItems = [{
      catId:  budget.categoryId,
      subId:  budget.subCategoryId || null,
      emoji:  budget.subCategoryEmoji || budget.categoryEmoji || '📦',
      label:  budget.subCategoryName
        ? `${budget.categoryName}・${budget.subCategoryName}`
        : budget.categoryName,
    }];
  } else {
    catBudgetSelectedItems = [];
  }

  renderCatBudgetCatGrid();
  renderCatBudgetSelectedTags();
  catBudgetOverlay.classList.add('active');
}

// 已選標籤列
function renderCatBudgetSelectedTags() {
  let tagsEl = catBudgetCatGrid.parentElement.querySelector('.cat-budget-selected-tags');
  if (!tagsEl) {
    tagsEl = document.createElement('div');
    tagsEl.className = 'cat-budget-selected-tags';
    catBudgetCatGrid.parentElement.insertBefore(tagsEl, catBudgetCatGrid);
  }
  if (catBudgetSelectedItems.length === 0) {
    tagsEl.innerHTML = '<span class="cat-budget-tags-hint">尚未選擇分類</span>';
    return;
  }
  tagsEl.innerHTML = catBudgetSelectedItems.map(i =>
    `<span class="cat-budget-tag">${i.emoji} ${i.label} <span class="cat-budget-tag-x" data-key="${catItemKey(i.catId, i.subId)}">✕</span></span>`
  ).join('');
  tagsEl.querySelectorAll('.cat-budget-tag-x').forEach(x => {
    x.addEventListener('click', e => {
      e.stopPropagation();
      const key = x.dataset.key;
      catBudgetSelectedItems = catBudgetSelectedItems.filter(i => catItemKey(i.catId, i.subId) !== key);
      renderCatBudgetCatGrid();
      renderCatBudgetSelectedTags();
    });
  });
}

function renderCatBudgetCatGrid() {
  catBudgetCatGrid.innerHTML = '';
  const expCats = allCategories.filter(c => c.type === 'expense');

  expCats.forEach(cat => {
    if (cat.subs && cat.subs.length > 0) {
      const isAnySel = isCatItemSelected(cat.docId, null) || cat.subs.some(s => isCatItemSelected(cat.docId, s.docId));
      const selCount = (isCatItemSelected(cat.docId, null) ? 1 : 0) + cat.subs.filter(s => isCatItemSelected(cat.docId, s.docId)).length;
      const group = document.createElement('div');
      group.className = 'exclude-group' + (isAnySel ? ' open' : '');

      const header = document.createElement('div');
      header.className = 'exclude-group-header';
      header.innerHTML = `
        <span class="exclude-group-emoji">${cat.emoji}</span>
        <span class="exclude-group-name">${cat.name}</span>
        ${isAnySel ? `<span class="exclude-group-badge">${selCount}</span>` : ''}
        <span class="exclude-group-arrow">›</span>`;
      header.addEventListener('click', () => group.classList.toggle('open'));

      const body = document.createElement('div');
      body.className = 'exclude-group-body';

      // 主分類本身（全部子項目合計）
      const isParentSel = isCatItemSelected(cat.docId, null);
      const parentItem = document.createElement('div');
      parentItem.className = 'cat-budget-pick-item cat-budget-pick-parent' + (isParentSel ? ' selected' : '');
      parentItem.innerHTML = `<span>${cat.emoji}</span><span>${cat.name}（全部）</span>`;
      parentItem.addEventListener('click', () => toggleCatItem(cat.docId, null, cat.emoji, cat.name));
      body.appendChild(parentItem);

      cat.subs.forEach(sub => {
        const isSel = isCatItemSelected(cat.docId, sub.docId);
        const item = document.createElement('div');
        item.className = 'cat-budget-pick-item' + (isSel ? ' selected' : '');
        item.innerHTML = `<span>${sub.emoji || cat.emoji}</span><span>${sub.name}</span>`;
        item.addEventListener('click', () => {
          const label = `${cat.name}・${sub.name}`;
          toggleCatItem(cat.docId, sub.docId, sub.emoji || cat.emoji, label);
        });
        body.appendChild(item);
      });

      group.appendChild(header);
      group.appendChild(body);
      catBudgetCatGrid.appendChild(group);
    } else {
      const isSel = isCatItemSelected(cat.docId, null);
      const item = document.createElement('div');
      item.className = 'cat-budget-pick-item' + (isSel ? ' selected' : '');
      item.innerHTML = `<span>${cat.emoji}</span><span>${cat.name}</span>`;
      item.addEventListener('click', () => toggleCatItem(cat.docId, null, cat.emoji, cat.name));
      catBudgetCatGrid.appendChild(item);
    }
  });
}

addCatBudgetBtn.addEventListener('click', () => openCatBudgetModal());
const closeCatBudgetModal = () => { catBudgetOverlay.classList.remove('active'); editingCatBudgetId = null; };
closeCatBudgetBtn.addEventListener('click', closeCatBudgetModal);
catBudgetOverlay.addEventListener('click', e => { if (e.target === catBudgetOverlay) closeCatBudgetModal(); });

saveCatBudgetBtn.addEventListener('click', async () => {
  const amount = parseInt(catBudgetAmtInput.value, 10);
  if (!amount || amount <= 0) { catBudgetAmtInput.focus(); return; }
  if (catBudgetSelectedItems.length === 0) { shakeEl(catBudgetCatGrid); return; }

  // 新格式：categoryItems 陣列，同時保留第一項的舊欄位供相容
  const first = catBudgetSelectedItems[0];
  const firstCat = allCategories.find(c => c.docId === first.catId);
  const firstSub = first.subId ? firstCat?.subs?.find(s => s.docId === first.subId) : null;

  const data = {
    uid: currentUser.uid,
    type: 'category',
    amount,
    categoryItems: catBudgetSelectedItems.map(i => ({
      catId: i.catId, subId: i.subId || null,
      emoji: i.emoji, label: i.label,
    })),
    // 相容舊欄位（取第一項）
    categoryId:       firstCat?.docId   || null,
    categoryName:     firstCat?.name    || '',
    categoryEmoji:    firstCat?.emoji   || '📦',
    subCategoryId:    firstSub?.docId   || null,
    subCategoryName:  firstSub?.name    || null,
    subCategoryEmoji: firstSub?.emoji   || null,
  };

  if (editingCatBudgetId) {
    await updateDoc(doc(db, 'budgets', editingCatBudgetId), data);
  } else {
    await addDoc(collection(db, 'budgets'), data);
  }
  closeCatBudgetModal();
});

deleteCatBudgetBtn.addEventListener('click', async () => {
  if (editingCatBudgetId && confirm('確定要刪除此類別預算？')) {
    await deleteDoc(doc(db, 'budgets', editingCatBudgetId));
    closeCatBudgetModal();
  }
});

// ===== 帳戶明細 =====

/**
 * 計算信用卡本期帳單的起訖日
 * 結算日 billingDay：每月 N 號結帳
 * 基準週期 = 上個結算日+1 到 本次結算日；再整體往回一個月（與常見帳單閱讀區間對齊）
 */
function calcBillingCycle(billingDay) {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed

  // 本月結算日（可能還沒到）
  const thisMonthEnd = new Date(y, m, billingDay);
  let endDate, startDate;

  if (today <= thisMonthEnd) {
    // 今天還沒超過本月結算日 → 本期結束 = 本月結算日，開始 = 上月結算日+1
    endDate   = thisMonthEnd;
    startDate = new Date(y, m - 1, billingDay + 1);
  } else {
    // 今天已超過本月結算日 → 本期結束 = 下月結算日，開始 = 本月結算日+1
    endDate   = new Date(y, m + 1, billingDay);
    startDate = new Date(y, m, billingDay + 1);
  }

  // 起訖一律再往回一個月
  startDate.setMonth(startDate.getMonth() - 1);
  endDate.setMonth(endDate.getMonth() - 1);

  return { start: toDateStr(startDate), end: toDateStr(endDate) };
}

const REWARD_PERIOD_CALENDAR = 'calendar';
const REWARD_PERIOD_BILLING = 'billing';

function getRewardPeriodModeLabel(mode) {
  return mode === REWARD_PERIOD_BILLING ? '帳單週期' : '日曆月';
}

function getCurrentCalendarMonthRange() {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  return {
    start: toDateStr(new Date(y, m, 1)),
    end: toDateStr(new Date(y, m + 1, 0)),
  };
}

function getAccountRewardPeriodRange(account) {
  const mode = account?.rewardPeriodMode || REWARD_PERIOD_CALENDAR;
  if (mode === REWARD_PERIOD_BILLING && account?.billingDay) {
    return calcBillingCycle(account.billingDay);
  }
  return getCurrentCalendarMonthRange();
}

function updateAccountDetailRewardPeriod(account) {
  if (!detailRewardPeriod) return;
  if (account?.typeId !== 'credit') {
    detailRewardPeriod.style.display = 'none';
    detailRewardPeriod.textContent = '';
    return;
  }
  const mode = account.rewardPeriodMode || REWARD_PERIOD_CALENDAR;
  if (mode === REWARD_PERIOD_BILLING && !account.billingDay) {
    detailRewardPeriod.textContent = '回饋計算：帳單週期（請設定結算日）';
  } else {
    const range = getAccountRewardPeriodRange(account);
    detailRewardPeriod.textContent =
      `回饋計算：${getRewardPeriodModeLabel(mode)}（${range.start} ～ ${range.end}）`;
  }
  detailRewardPeriod.style.display = '';
}

function showAccountDetailView(account) {
  detailAccountId   = account.docId;
  detailViewYear    = new Date().getFullYear();
  detailViewMonth   = new Date().getMonth();
  detailIcon.textContent = account.emoji;
  detailName.textContent = account.name;
  detailType.textContent = account.typeName;
  updateAccountDetailRewardPeriod(account);

  // 信用卡且有設結算日 → 自動切換到本期帳單範圍
  if (account.typeId === 'credit' && account.billingDay) {
    const cycle = calcBillingCycle(account.billingDay);
    detailMode        = 'range';
    detailRangeStart  = cycle.start;
    detailRangeEnd    = cycle.end;
    detailRangeStartEl.value = cycle.start;
    detailRangeEndEl.value   = cycle.end;
    billingCycleBar.style.display = '';
  } else {
    detailMode = 'month';
    billingCycleBar.style.display = 'none';
  }

  syncDetailModeUI();
  renderAccountDetail(account);
  switchPage('accountDetail');
}

function openAccountDetail(account) {
  showAccountDetailView(account);
  try {
    history.pushState(
      { _page: HIST_STATE_ACCOUNT_DETAIL, accountId: account.docId },
      '',
      location.href
    );
  } catch { /* 極少數環境 */ }
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
  updateAccountDetailRewardPeriod(account);
  const detailCurrency = account.currency || 'TWD';
  const detailPrefix = account.currency ? `${account.currency} ` : '$';
  // 目前餘額永遠用全部記錄計算（含轉帳）
  const curBal = calcAccountBalance(account);
  detailBalance.textContent = formatSignedMoneyByCurrency(curBal, detailCurrency, detailPrefix);
  detailBalance.style.color = curBal >= 0 ? 'white' : '#ffb3b3';

  // 期間收入/支出用篩選後的記錄（轉入不算收入；信用卡期間支出含轉出）
  const filtered = getDetailFilteredRecords(account.docId);
  const incTotal = filtered.filter(r => r.type === 'income').reduce((s, r)  => s + getAccountRecordAmount(account, r), 0);
  const expTotal = sumAccountPeriodExpense(filtered, account);
  detailIncome.textContent  = `+${detailPrefix}${formatMoneyByCurrency(incTotal, detailCurrency)}`;
  detailExpense.textContent = `-${detailPrefix}${formatMoneyByCurrency(expTotal, detailCurrency)}`;

  // 更新列表標題
  if (detailMode === 'month') {
    detailMonthLabel.textContent = `${detailViewYear}年${detailViewMonth + 1}月`;
    detailListTitle.textContent  = `${detailViewMonth + 1}月明細`;
    const now = new Date();
    const isCurrent = detailViewYear === now.getFullYear() && detailViewMonth === now.getMonth();
    if (detailTodayBtn) detailTodayBtn.style.display = isCurrent ? 'none' : '';
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
    accountDetailList.appendChild(buildDateHeader(date, groups[date], account));

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

// 本期帳單快捷按鈕
billingCycleBtn.addEventListener('click', () => {
  const acc = allAccounts.find(a => a.docId === detailAccountId);
  if (!acc?.billingDay) return;
  const cycle = calcBillingCycle(acc.billingDay);
  detailMode = 'range';
  detailRangeStart = cycle.start;
  detailRangeEnd   = cycle.end;
  detailRangeStartEl.value = cycle.start;
  detailRangeEndEl.value   = cycle.end;
  syncDetailModeUI();
  renderAccountDetail(acc);
});

if (accountDetailAddRecordBtn) {
  accountDetailAddRecordBtn.addEventListener('click', () => {
    if (!detailAccountId) return;
    openModal(null, { presetAccountId: detailAccountId });
  });
}

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

detailTodayBtn?.addEventListener('click', () => {
  const now = new Date();
  detailViewYear = now.getFullYear();
  detailViewMonth = now.getMonth();
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
    allRecords = snap.docs.map(d => normalizeTransferRecordShape({ docId: d.id, ...d.data() }));
    renderAll();
    renderAccountList();
    scheduleAccountsRefresh();
    // 若目前在帳戶明細頁，即時更新
    if (currentPage === 'accountDetail' && detailAccountId) {
      const acc = allAccounts.find(a => a.docId === detailAccountId);
      if (acc) renderAccountDetail(acc);
    }
    if (!initialLoadStatus.records) {
      initialLoadStatus.records = true;
      checkInitialLoad();
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
    scheduleAccountsRefresh();
    renderAccountSelect();
    renderDefaultDebitAccountSelect();
    renderAll();
    // 若目前在帳戶明細頁，即時更新
    if (currentPage === 'accountDetail' && detailAccountId) {
      const acc = allAccounts.find(a => a.docId === detailAccountId);
      if (acc) renderAccountDetail(acc);
    }
    if (!initialLoadStatus.accounts) {
      initialLoadStatus.accounts = true;
      checkInitialLoad();
    }
  }, console.error);
}

// ===== Firestore 監聽 — 分類 =====
async function userHasAnyData(uid) {
  const ownedCollections = ['records', 'accounts', 'categories', 'templates', 'recurring', 'budgets'];
  for (const col of ownedCollections) {
    const snap = await getDocs(query(
      collection(db, col),
      where('uid', '==', uid),
      limit(1)
    ));
    if (!snap.empty) return true;
  }
  const ownProjects = await getDocs(query(
    collection(db, 'projects'),
    where('uid', '==', uid),
    limit(1)
  ));
  if (!ownProjects.empty) return true;
  const invitedProjects = await getDocs(query(
    collection(db, 'projects'),
    where('editorUids', 'array-contains', uid),
    limit(1)
  ));
  return !invitedProjects.empty;
}

function applyCategoriesData(parents) {
  allCategories = parents;
  if (currentPage === 'categories') renderCategoryMgmtList();
  if (!selectedCategory) setDefaultCategory();
  renderAll();
  if (!initialLoadStatus.categories) {
    initialLoadStatus.categories = true;
    checkInitialLoad();
  }
}

/** 以 Firestore 交易確保預設分類只會被建立一次（跨分頁／多裝置） */
async function claimDefaultCategoriesSeed(uid) {
  try {
    return await runTransaction(db, async (transaction) => {
      const userRef = doc(db, 'users', uid);
      const userSnap = await transaction.get(userRef);
      if (userSnap.exists() && userSnap.data().defaultCategoriesSeeded) return false;
      transaction.set(userRef, { uid, defaultCategoriesSeeded: true }, { merge: true });
      return true;
    });
  } catch (err) {
    console.error('claimDefaultCategoriesSeed failed', err);
    return false;
  }
}

async function handleEmptyCategoriesSnapshot() {
  const uid = currentUser?.uid;
  if (!uid) return;

  const shouldSeed = await claimDefaultCategoriesSeed(uid);
  if (!shouldSeed) {
    const recheck = await getDocs(query(
      collection(db, 'categories'),
      where('uid', '==', uid),
      limit(1)
    ));
    if (!recheck.empty) return;
    const hasData = await userHasAnyData(uid);
    if (hasData) applyCategoriesData([]);
    return;
  }

  try {
    await seedDefaultCategories();
  } catch (err) {
    console.error('seedDefaultCategories failed', err);
    await setDoc(doc(db, 'users', uid), { defaultCategoriesSeeded: false }, { merge: true });
  }
}

function subscribeCategories() {
  if (unsubCategories) unsubCategories();
  // 只用 where，排序在 client 端做，避免需要建複合索引
  const q = query(
    collection(db, 'categories'),
    where('uid', '==', currentUser.uid)
  );
  unsubCategories = onSnapshot(q, async (snap) => {
    const docs = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    // 若使用者尚無分類，且帳戶完全沒有任何資料時才寫入預設值
    if (docs.length === 0) {
      if (window._clearingData) return;
      // 等待伺服器確認，避免本機快取暫時為空就誤建預設分類
      if (snap.metadata.fromCache) return;
      if (seedingCategories) return;

      seedingCategories = true;
      try {
        await handleEmptyCategoriesSnapshot();
      } finally {
        seedingCategories = false;
      }
      return; // onSnapshot 會再次觸發
    }
    // 已有分類：標記為已種子，避免日後誤判為新帳號
    if (currentUser?.uid && !categoriesSeededFlagSynced) {
      categoriesSeededFlagSynced = true;
      setDoc(doc(db, 'users', currentUser.uid), { defaultCategoriesSeeded: true }, { merge: true }).catch(() => {});
    }
    // 組裝：主分類 + 子分類
    const parents = docs.filter(d => !d.parentId)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    parents.forEach(p => {
      p.subs = docs.filter(d => d.parentId === p.docId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });
    applyCategoriesData(parents);
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

// ===== Firestore 監聽 — 範本 =====
function subscribeTemplates() {
  if (unsubTemplates) unsubTemplates();
  const q = query(
    collection(db, 'templates'),
    where('uid', '==', currentUser.uid)
  );
  unsubTemplates = onSnapshot(q, (snap) => {
    allTemplates = snap.docs
      .map(d => ({ docId: d.id, ...d.data() }))
      .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
      
    if (!initialLoadStatus.templates) {
      initialLoadStatus.templates = true;
      checkInitialLoad();
    }
  }, console.error);
}

// ===== 範本 UI =====
let tplActiveType = 'expense';

openTplListBtn.addEventListener('click', () => {
  // 預設 tab 與目前記帳類型一致
  const curType = document.querySelector('.type-btn.active')?.dataset.type || 'expense';
  tplActiveType = curType;
  document.querySelectorAll('.tpl-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.type === tplActiveType);
  });
  renderTplList();
  tplListOverlay.classList.add('active');
});
closeTplListBtn.addEventListener('click', () => { tplListOverlay.classList.remove('active'); });
tplListOverlay.addEventListener('click', (e) => { if (e.target === tplListOverlay) tplListOverlay.classList.remove('active'); });

document.querySelectorAll('.tpl-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    tplActiveType = tab.dataset.type;
    document.querySelectorAll('.tpl-tab').forEach(t => t.classList.toggle('active', t === tab));
    renderTplList();
  });
});

closeTplNameBtn.addEventListener('click', () => { tplNameOverlay.classList.remove('active'); });
tplNameOverlay.addEventListener('click', (e) => { if (e.target === tplNameOverlay) tplNameOverlay.classList.remove('active'); });

function syncSaveTplBtnLabel() {
  const editingTpl = !!tplEditingId;
  if (saveTplBtn) {
    saveTplBtn.textContent = editingTpl ? '更新範本' : '儲存為範本';
    saveTplBtn.classList.toggle('submit-btn', editingTpl);
    saveTplBtn.classList.toggle('save-tpl-btn', !editingTpl);
  }
  if (submitBtn) {
    submitBtn.style.display = editingTpl ? 'none' : '';
    if (submitBtn.parentElement) {
      submitBtn.parentElement.style.display = editingTpl ? 'none' : '';
    }
  }
  if (duplicateRecordBtn) duplicateRecordBtn.style.display = editingTpl ? 'none' : '';
  if (openTplListBtn) openTplListBtn.style.display = editingTpl ? 'none' : '';
  if (editingTpl && recordModalTitle) {
    recordModalTitle.textContent = '更新範本';
  }
}

function openTplNameModal({ editId = null, name = '' } = {}) {
  tplEditingId = editId || null;
  tplNameInput.value = name || '';
  if (tplNameModalTitle) tplNameModalTitle.textContent = editId ? '編輯範本' : '儲存為範本';
  if (confirmSaveTplBtn) confirmSaveTplBtn.textContent = editId ? '更新' : '儲存';
  syncSaveTplBtnLabel();
  tplNameOverlay.classList.add('active');
  setTimeout(() => tplNameInput.focus(), 50);
}

function clearTplEditing() {
  const wasEditingTpl = !!tplEditingId;
  tplEditingId = null;
  if (tplNameModalTitle) tplNameModalTitle.textContent = '儲存為範本';
  if (confirmSaveTplBtn) confirmSaveTplBtn.textContent = '儲存';
  syncSaveTplBtnLabel();
  // 離開範本編輯且非編輯既有記帳時，標題回到新增
  if (wasEditingTpl && recordModalTitle && !recordEditId?.value) {
    recordModalTitle.textContent = '新增記帳';
  }
}

saveTplBtn.addEventListener('click', () => {
  const editing = tplEditingId ? allTemplates.find(t => t.docId === tplEditingId) : null;
  openTplNameModal({
    editId: tplEditingId,
    name: editing?.name || '',
  });
});

/** 保留表單內容，改為新增一筆（清除編輯 id，送出時會新增而非更新） */
function duplicateCurrentFormAsNewRecord() {
  recordEditId.value = '';
  clearTplEditing();
  recordModalTitle.textContent = '新增記帳';
  submitBtn.textContent = '記下來！';
  if (deleteRecordBtn) deleteRecordBtn.style.display = 'none';
  setDefaultDate();
  syncForeignAccountUI();
  void maybeAutoConvertForeignIncome();
}

if (duplicateRecordBtn) {
  duplicateRecordBtn.addEventListener('click', () => duplicateCurrentFormAsNewRecord());
}

confirmSaveTplBtn.addEventListener('click', saveCurrentAsTemplate);
tplNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveCurrentAsTemplate(); });

async function saveCurrentAsTemplate() {
  const name = tplNameInput.value.trim();
  if (!name) { tplNameInput.focus(); return; }

  const type = document.querySelector('.type-btn.active')?.dataset.type || 'expense';
  const amountVal = parseFloat(document.getElementById('amount').value) || 0;
  const noteVal   = noteInput.value.trim();

  const tplData = {
    uid:  currentUser.uid,
    name,
    type,
    amount:    amountVal,
    note:      noteVal,
  };

  if (type === 'transfer') {
    tplData.transferFromId = transferFrom.value || '';
    tplData.transferToId   = transferTo.value   || '';
  } else {
    const tplParent = allCategories.find(c => c.docId === selectedCategory) || null;
    const tplSub    = tplParent?.subs?.find(s => s.docId === selectedSubCategory) || null;
    tplData.categoryId      = tplParent?.docId   || null;
    tplData.categoryName    = tplParent?.name     || '';
    tplData.categoryEmoji   = tplParent?.emoji    || '';
    tplData.subCategoryId   = tplSub?.docId       || null;
    tplData.subCategoryName = tplSub?.name        || '';
    tplData.accountId       = accountSelect.value          || '';
  }

  if (tplEditingId) {
    await updateDoc(doc(db, 'templates', tplEditingId), tplData);
  } else {
    const existing = allTemplates.find(t => t.name === name && t.type === type);
    if (existing) {
      await updateDoc(doc(db, 'templates', existing.docId), { ...tplData, createdAt: serverTimestamp() });
    } else {
      await addDoc(collection(db, 'templates'), { ...tplData, createdAt: serverTimestamp() });
    }
  }
  tplNameOverlay.classList.remove('active');
  tplListOverlay.classList.remove('active');
  clearTplEditing();
}

function renderTplList() {
  tplList.innerHTML = '';
  const filtered = allTemplates.filter(t => t.type === tplActiveType);
  if (filtered.length === 0) {
    tplEmpty.style.display = '';
    return;
  }
  tplEmpty.style.display = 'none';

  filtered.forEach(tpl => {
    const item = document.createElement('div');
    item.className = 'tpl-item';

    const icon = tpl.type === 'transfer' ? '🔄' : (tpl.categoryEmoji || '📦');
    const descParts = [];
    if (tpl.type === 'transfer') {
      const fromAcc = allAccounts.find(a => a.docId === tpl.transferFromId);
      const toAcc   = allAccounts.find(a => a.docId === tpl.transferToId);
      descParts.push(`${fromAcc?.name || '?'} → ${toAcc?.name || '?'}`);
    } else {
      if (tpl.categoryName) {
        descParts.push(tpl.subCategoryName ? `${tpl.categoryName} / ${tpl.subCategoryName}` : tpl.categoryName);
      }
      const acc = allAccounts.find(a => a.docId === tpl.accountId);
      if (acc) descParts.push(acc.name);
    }
    if (tpl.note) descParts.push(`「${tpl.note}」`);

    const amountDisplay = tpl.amount
      ? `$${tpl.amount.toLocaleString()}`
      : '不帶金額';
    const amountClass = tpl.amount ? tpl.type : 'none';

    item.innerHTML = `
      <div class="tpl-item-icon">${icon}</div>
      <div class="tpl-item-info">
        <div class="tpl-item-name">${tpl.name}</div>
        <div class="tpl-item-desc">${descParts.join('・')}</div>
      </div>
      <div class="tpl-item-amount ${amountClass}">${amountDisplay}</div>
      <div class="tpl-item-actions">
        <button type="button" class="tpl-edit-btn" data-id="${tpl.docId}" title="編輯範本" aria-label="編輯範本">
          <i class="bi bi-pencil" aria-hidden="true"></i>
        </button>
        <button type="button" class="tpl-delete-btn" data-id="${tpl.docId}" title="刪除範本" aria-label="刪除範本">
          <i class="bi bi-trash" aria-hidden="true"></i>
        </button>
      </div>
    `;

    item.querySelector('.tpl-edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      // 先回到記帳表單編輯內容，確認時再透過「更新範本」寫回
      applyTemplate(tpl, { keepEditing: true });
      tplEditingId = tpl.docId;
      syncSaveTplBtnLabel();
    });

    item.querySelector('.tpl-delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`刪除範本「${tpl.name}」？`)) return;
      await deleteDoc(doc(db, 'templates', tpl.docId));
      if (tplEditingId === tpl.docId) clearTplEditing();
      renderTplList();
    });

    item.addEventListener('click', (e) => {
      if (e.target.closest('.tpl-edit-btn, .tpl-delete-btn, .tpl-item-actions')) return;
      applyTemplate(tpl);
    });

    tplList.appendChild(item);
  });
}

function applyTemplate(tpl, { keepEditing = false } = {}) {
  tplListOverlay.classList.remove('active');
  if (!keepEditing) clearTplEditing();

  // 切換類型
  switchType(tpl.type);

  // 金額
  if (tpl.amount) {
    calcRaw  = String(tpl.amount);
    calcExpr = String(tpl.amount);
    amountInput.value = String(tpl.amount);
    calcExpressionEl.textContent = '';
  }

  // 備註
  noteInput.value = tpl.note || '';

  if (tpl.type === 'transfer') {
    if (tpl.transferFromId) transferFrom.value = tpl.transferFromId;
    if (tpl.transferToId)   transferTo.value   = tpl.transferToId;
  } else {
    // 帳戶
    if (tpl.accountId) accountSelect.value = tpl.accountId;

    // 分類
    if (tpl.categoryId) {
      const parent = allCategories.find(c => c.docId === tpl.categoryId);
      if (parent) {
        selectedCategory = parent.docId;
        const sub = tpl.subCategoryId
          ? parent.subs?.find(s => s.docId === tpl.subCategoryId) || null
          : null;
        selectedSubCategory = sub ? sub.docId : null;
        updateCatPickBtn(parent, sub);
      }
    }
  }
}

// ===== Firestore 監聽 — 固定收支 =====
function subscribeRecurring() {
  if (unsubRecurring) unsubRecurring();
  const q = query(
    collection(db, 'recurring'),
    where('uid', '==', currentUser.uid)
  );
  unsubRecurring = onSnapshot(q, (snap) => {
    allRecurring = snap.docs
      .map(d => ({ docId: d.id, ...d.data() }))
      .sort((a, b) => (a.createdAt?.seconds ?? 0) - (b.createdAt?.seconds ?? 0));
    if (currentPage === 'recurring') renderRecurringList();
    // 登入後自動觸發到期項目
    processRecurringItems();
    
    if (!initialLoadStatus.recurring) {
      initialLoadStatus.recurring = true;
      checkInitialLoad();
    }
  }, console.error);
}

// ===== 固定收支：日期計算工具 =====
// 根據頻率設定，從今天起算第一個符合的執行日
function calcFirstDate(unit, freqWeekday, freqMonthday, freqYearMonth, freqYearDay) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (unit === 'day') {
    return toDateStr(today);
  }

  if (unit === 'week') {
    if (freqWeekday == null) return toDateStr(today);
    const d = new Date(today);
    const diff = (freqWeekday - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + (diff === 0 ? 0 : diff));
    return toDateStr(d);
  }

  if (unit === 'month') {
    if (freqMonthday == null) return toDateStr(today);
    const d = new Date(today);
    if (freqMonthday === 'last') {
      // 本月最後一天
      d.setDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
      if (d < today) {
        // 已過，跳到下個月最後一天
        d.setMonth(d.getMonth() + 1);
        d.setDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
      }
    } else {
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(freqMonthday, lastDay));
      if (d < today) {
        d.setMonth(d.getMonth() + 1);
        const lastDay2 = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(freqMonthday, lastDay2));
      }
    }
    return toDateStr(d);
  }

  if (unit === 'year') {
    if (!freqYearMonth || !freqYearDay) return toDateStr(today);
    const d = new Date(today);
    d.setMonth(freqYearMonth - 1);
    const lastDay = new Date(d.getFullYear(), freqYearMonth, 0).getDate();
    d.setDate(Math.min(freqYearDay, lastDay));
    if (d < today) d.setFullYear(d.getFullYear() + 1);
    return toDateStr(d);
  }

  return toDateStr(today);
}

// 計算下一次執行日
// item 用於取得 freqWeekday / freqMonthday / freqYearMonth / freqYearDay
function addInterval(dateStr, n, unit, item) {
  const d = new Date(dateStr + 'T00:00:00');

  if (unit === 'day') {
    d.setDate(d.getDate() + n);

  } else if (unit === 'week') {
    d.setDate(d.getDate() + n * 7);
    // 若有指定星期幾，跳到下一個符合的星期
    if (item?.freqWeekday != null) {
      const target = item.freqWeekday; // 0=日,1=一...6=六
      while (d.getDay() !== target) d.setDate(d.getDate() + 1);
    }

  } else if (unit === 'month') {
    d.setMonth(d.getMonth() + n);
    if (item?.freqMonthday != null) {
      if (item.freqMonthday === 'last') {
        // 當月最後一天
        d.setDate(new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate());
      } else {
        const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(Math.min(item.freqMonthday, lastDay));
      }
    } else {
      // 沒有指定號數：防止月份溢位
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      if (d.getDate() > lastDay) d.setDate(lastDay);
    }

  } else if (unit === 'year') {
    d.setFullYear(d.getFullYear() + n);
    if (item?.freqYearMonth && item?.freqYearDay) {
      d.setMonth(item.freqYearMonth - 1);
      const lastDay = new Date(d.getFullYear(), item.freqYearMonth, 0).getDate();
      d.setDate(Math.min(item.freqYearDay, lastDay));
    }
  }

  return toDateStr(d);
}

function toDateStr(date) {
  // 用本地時間避免 UTC 時差造成日期偏移
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function todayStr() {
  return toDateStr(new Date());
}

// ===== 固定收支：自動觸發 =====
async function processRecurringItems() {
  const today = todayStr();
  for (const item of allRecurring) {
    if (!item.enabled) continue;
    let nextDate = item.nextDate || item.startDate;
    if (!nextDate || nextDate > today) continue;

    // 找到對應帳戶
    const acc     = allAccounts.find(a => a.docId === item.accountId);
    const fromAcc = allAccounts.find(a => a.docId === item.transferFromId);
    const toAcc   = allAccounts.find(a => a.docId === item.transferToId);

    // 連續補齊所有到期的執行次數
    while (nextDate <= today) {
      if (item.type === 'transfer') {
        // 轉帳：原子寫入兩筆（轉出 + 轉入）
        const transferId = `rec_${item.docId}_${nextDate}`;
        await commitTransferPair({
          fromId: item.transferFromId || null,
          toId: item.transferToId || null,
          fromAcc,
          toAcc,
          fromAmount: item.amount,
          toAmount: item.amount,
          date: nextDate,
          note: item.note || '',
          transferIdHint: transferId,
          recurringId: item.docId,
        });
      } else {
        await addDoc(collection(db, 'records'), {
          uid:          currentUser.uid,
          type:         item.type,
          amount:       item.amount,
          date:         nextDate,
          note:         item.note || '',
          accountId:    item.accountId   || null,
          accountName:  acc?.name        || null,
          categoryId:   item.categoryId  || null,
          categoryName: item.categoryName || null,
          categoryEmoji:item.categoryEmoji || null,
          subCategoryId:   item.subCategoryId   || null,
          subCategoryName: item.subCategoryName || null,
          displayEmoji: item.categoryEmoji || '🔁',
          displayName:  item.categoryName  || item.name,
          recurringId:  item.docId,
          createdAt:    serverTimestamp(),
        });
      }
      nextDate = addInterval(nextDate, item.freqN, item.freqUnit, item);
    }

    // 更新下次執行日
    await updateDoc(doc(db, 'recurring', item.docId), { nextDate });
  }
}

// ===== 固定收支：渲染列表 =====
function renderRecurringList() {
  recurringList.innerHTML = '';
  if (allRecurring.length === 0) {
    recurringEmpty.style.display = '';
    return;
  }
  recurringEmpty.style.display = 'none';

  allRecurring.forEach(item => {
    const div = document.createElement('div');
    div.className = 'recurring-item';

    const isTransfer = item.type === 'transfer';
    const emoji = isTransfer ? '🔄' : (item.categoryEmoji || '🔁');
    const nextDate = item.nextDate || item.startDate || '—';
    const freqLabel = `每 ${item.freqN} ${{'day':'天','week':'週','month':'月','year':'年'}[item.freqUnit] || '月'}`;
    let accLabel = '';
    if (isTransfer) {
      const fromName = allAccounts.find(a => a.docId === item.transferFromId)?.name || '?';
      const toName   = allAccounts.find(a => a.docId === item.transferToId)?.name   || '?';
      accLabel = `${fromName} → ${toName}`;
    } else {
      accLabel = allAccounts.find(a => a.docId === item.accountId)?.name || '';
    }
    const meta = [freqLabel, accLabel, item.note].filter(Boolean).join(' · ');
    const catLabel = !isTransfer && item.categoryName
      ? (item.subCategoryName ? `${item.categoryName} - ${item.subCategoryName}` : item.categoryName)
      : '';
    const amountLabel = isTransfer
      ? `$${item.amount.toLocaleString()}`
      : `${item.type === 'income' ? '+' : '-'}$${item.amount.toLocaleString()}`;

    div.style.cursor = 'pointer';
    div.innerHTML = `
      <div class="recurring-item-icon">${emoji}</div>
      <div class="recurring-item-info">
        <div class="recurring-item-name">${item.name}</div>
        ${catLabel ? `<div class="recurring-item-cat">${catLabel}</div>` : ''}
        <div class="recurring-item-meta">${meta}</div>
        <span class="recurring-next-badge">下次：${nextDate}</span>
      </div>
      <div class="recurring-item-right">
        <span class="recurring-item-amount ${item.type}">
          ${amountLabel}
        </span>
        <label class="recurring-toggle" title="開啟/關閉">
          <input type="checkbox" ${item.enabled ? 'checked' : ''} data-id="${item.docId}" />
          <span class="recurring-toggle-slider"></span>
        </label>
      </div>
    `;

    div.querySelector('.recurring-toggle input').addEventListener('change', async (e) => {
      e.stopPropagation();
      await updateDoc(doc(db, 'recurring', item.docId), { enabled: e.target.checked });
    });

    div.querySelector('.recurring-toggle').addEventListener('click', (e) => e.stopPropagation());

    div.addEventListener('click', () => openRecurringModal(item));

    recurringList.appendChild(div);
  });
}

// ===== 固定收支：彈窗 =====
let recCurrentType = 'expense';

function switchRecType(type) {
  recCurrentType = type;
  recBtnExpense.classList.toggle('active',  type === 'expense');
  recBtnIncome.classList.toggle('active',   type === 'income');
  recBtnTransfer.classList.toggle('active', type === 'transfer');
  const isTransfer = type === 'transfer';
  recCatPickBtn.style.display        = isTransfer ? 'none' : '';
  recAccountGroup.style.display      = isTransfer ? 'none' : '';
  recTransferGroup.style.display     = isTransfer ? '' : 'none';
  if (!isTransfer) {
    const defaultCat = allCategories.find(c => c.type === type);
    if (defaultCat) {
      recSelectedCategory    = defaultCat;
      recSelectedSubCategory = defaultCat.subs?.[0] || null;
      updateRecCatPickBtn();
    }
  }
}

function openRecurringModal(item = null) {
  recurringForm.reset();
  recEditIdInput.value = '';
  recDeleteBtn.style.display = 'none';
  recSelectedCategory    = null;
  recSelectedSubCategory = null;
  switchRecType('expense');
  renderRecAccountSelect();
  renderRecTransferSelects();

  // 重置計算機
  recCalcRaw  = '';
  recCalcExpr = '';
  recAmountInput.value = '';
  recCalcExpressionEl.textContent = '';
  recCalcKeyboard.style.display = 'none';

  recFreqN.value = '1';
  recFreqUnit.value = 'month';
  syncRecFreqUI('month', null);

  if (item) {
    recurringModalTitle.textContent = '編輯固定項目';
    recEditIdInput.value = item.docId;
    recDeleteBtn.style.display = '';
    switchRecType(item.type || 'expense');
    recNameInput.value = item.name || '';
    const amt = item.amount || 0;
    recCalcRaw  = String(amt);
    recCalcExpr = String(amt);
    recAmountInput.value = String(amt);
    recNoteInput.value   = item.note   || '';
    recFreqN.value       = item.freqN  || 1;
    recFreqUnit.value = item.freqUnit || 'month';
    syncRecFreqUI(item.freqUnit || 'month', item);
    if (item.type === 'transfer') {
      if (item.transferFromId) recTransferFrom.value = item.transferFromId;
      if (item.transferToId)   recTransferTo.value   = item.transferToId;
    } else {
      if (item.accountId) recAccountSel.value = item.accountId;
      if (item.categoryId) {
        const parent = allCategories.find(c => c.docId === item.categoryId);
        if (parent) {
          recSelectedCategory = parent;
          recSelectedSubCategory = item.subCategoryId
            ? (parent.subs?.find(s => s.docId === item.subCategoryId) || null)
            : null;
          updateRecCatPickBtn();
        }
      }
    }
  } else {
    recurringModalTitle.textContent = '新增固定項目';
  }

  recurringModalOverlay.classList.add('active');
}

// ===== 頻率 UI 同步 =====
function syncRecFreqUI(unit, item) {
  recWeekdayGroup.style.display  = unit === 'week'  ? '' : 'none';
  recMonthdayGroup.style.display = unit === 'month' ? '' : 'none';
  recYeardayGroup.style.display  = unit === 'year'  ? '' : 'none';

  if (unit === 'week') {
    renderRecWeekdayPicker(item?.freqWeekday ?? null);
  } else if (unit === 'month') {
    renderRecMonthdayPicker(item?.freqMonthday ?? null);
  } else if (unit === 'year') {
    const m = item?.freqYearMonth ?? 1;
    recYearMonth.value = m;
    renderRecYearDaySelect(m, item?.freqYearDay ?? null);
  }
}

function renderRecWeekdayPicker(selected) {
  recWeekdayPicker.querySelectorAll('.weekday-btn').forEach(btn => {
    btn.classList.toggle('active', String(btn.dataset.day) === String(selected));
  });
}

function renderRecMonthdayPicker(selected) {
  recMonthdayPicker.innerHTML = '';
  for (let d = 1; d <= 31; d++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'monthday-btn' + (d === selected ? ' active' : '');
    btn.textContent = d;
    btn.dataset.day = d;
    btn.addEventListener('click', () => {
      recMonthdayPicker.querySelectorAll('.monthday-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    recMonthdayPicker.appendChild(btn);
  }
  // 最後一天選項
  const lastBtn = document.createElement('button');
  lastBtn.type = 'button';
  lastBtn.className = 'monthday-btn last-day' + (selected === 'last' ? ' active' : '');
  lastBtn.textContent = '月底';
  lastBtn.dataset.day = 'last';
  lastBtn.addEventListener('click', () => {
    recMonthdayPicker.querySelectorAll('.monthday-btn').forEach(b => b.classList.remove('active'));
    lastBtn.classList.add('active');
  });
  recMonthdayPicker.appendChild(lastBtn);
}

function renderRecYearDaySelect(month, selectedDay) {
  const daysInMonth = new Date(2000, month, 0).getDate();
  recYearDay.innerHTML = '';
  for (let d = 1; d <= daysInMonth; d++) {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = `${d} 日`;
    if (d === selectedDay) opt.selected = true;
    recYearDay.appendChild(opt);
  }
}

recFreqUnit.addEventListener('change', () => {
  syncRecFreqUI(recFreqUnit.value, null);
});

recYearMonth.addEventListener('change', () => {
  renderRecYearDaySelect(parseInt(recYearMonth.value), null);
});

recWeekdayPicker.querySelectorAll('.weekday-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    recWeekdayPicker.querySelectorAll('.weekday-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

function renderRecAccountSelect() {
  recAccountSel.innerHTML = '';
  const sorted = [...allAccounts].sort((a, b) => {
    const tDiff = (a.typeOrder ?? 999) - (b.typeOrder ?? 999);
    return tDiff !== 0 ? tDiff : (a.order ?? 0) - (b.order ?? 0);
  });
  sorted.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.docId;
    opt.textContent = `${acc.emoji || ''} ${acc.name}`.trim();
    recAccountSel.appendChild(opt);
  });
}

function renderRecTransferSelects() {
  const sorted = [...allAccounts].sort((a, b) => {
    const tDiff = (a.typeOrder ?? 999) - (b.typeOrder ?? 999);
    return tDiff !== 0 ? tDiff : (a.order ?? 0) - (b.order ?? 0);
  });
  const prevFrom = recTransferFrom.value;
  const prevTo   = recTransferTo.value;
  [recTransferFrom, recTransferTo].forEach(sel => {
    sel.innerHTML = '';
    sorted.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc.docId;
      opt.textContent = `${acc.emoji || ''} ${acc.name}`.trim();
      sel.appendChild(opt);
    });
  });
  // 還原選擇，或預設轉入選第二個帳戶
  if (prevFrom) recTransferFrom.value = prevFrom;
  if (prevTo)   recTransferTo.value   = prevTo;
  else if (sorted.length >= 2) recTransferTo.value = sorted[1].docId;
}

function updateRecCatPickBtn() {
  if (recSelectedCategory) {
    recCatPickEmoji.textContent = recSelectedSubCategory?.emoji || recSelectedCategory.emoji || '📦';
    if (recSelectedSubCategory) {
      recCatPickName.innerHTML = `${recSelectedCategory.name}<br><span class="cat-pick-sub-label">${recSelectedSubCategory.name}</span>`;
    } else {
      recCatPickName.innerHTML = recSelectedCategory.name;
    }
  } else {
    recCatPickEmoji.textContent = '📦';
    recCatPickName.innerHTML    = '選擇分類';
  }
}

openRecurringFormBtn.addEventListener('click', () => openRecurringModal());
closeRecurringFormBtn.addEventListener('click', () => recurringModalOverlay.classList.remove('active'));
recurringModalOverlay.addEventListener('click', (e) => {
  if (e.target === recurringModalOverlay) recurringModalOverlay.classList.remove('active');
});

// ===== 固定收支計算機 =====
recCalcToggleBtn.addEventListener('click', () => {
  const show = recCalcKeyboard.style.display === 'none';
  recCalcKeyboard.style.display = show ? 'block' : 'none';
  recAmountInputWrap.classList.toggle('calc-active', show);
});

recAmountInput.addEventListener('focus', () => {
  recCalcKeyboard.style.display = 'block';
  recAmountInputWrap.classList.add('calc-active');
});

recCalcKeyboard.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-rec-val],[data-rec-action]');
  if (!btn) return;
  const val    = btn.dataset.recVal;
  const action = btn.dataset.recAction;
  if (val !== undefined) recCalcAppend(val);
  else if (action === 'clear')     recCalcClear();
  else if (action === 'backspace') recCalcBackspace();
  else if (action === 'equal')     recCalcEqual();
});

recAmountInput.addEventListener('keydown', (e) => {
  const allowed = ['0','1','2','3','4','5','6','7','8','9','.','%','+','-','*','/'];
  if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); recCalcEqual(); return; }
  if (e.key === 'Backspace') { e.preventDefault(); recCalcBackspace(); return; }
  if (e.key === 'Escape')    { recCalcKeyboard.style.display = 'none'; return; }
  if (!allowed.includes(e.key)) { e.preventDefault(); return; }
  e.preventDefault();
  const sym = e.key === '*' ? '×' : e.key === '/' ? '÷' : e.key === '-' ? '−' : e.key;
  recCalcAppend(sym);
});

function recCalcAppend(sym) {
  const op = sym === '÷' ? '/' : sym === '×' ? '*' : sym === '−' ? '-' : sym;
  const isOp = ['+','-','*','/','÷','×','−','%'].includes(sym);
  if (isOp && recCalcRaw === '') return;
  if (sym === '.' && recCalcRaw.split(/[\+\-\*\/]/).pop().includes('.')) return;
  recCalcRaw  += op;
  recCalcExpr += sym;
  recAmountInput.value = recCalcExpr;
  recCalcExpressionEl.textContent = '';
}

function recCalcClear() {
  recCalcRaw = ''; recCalcExpr = '';
  recAmountInput.value = '';
  recCalcExpressionEl.textContent = '';
}

function recCalcBackspace() {
  if (!recCalcRaw) return;
  recCalcRaw  = recCalcRaw.slice(0, -1);
  recCalcExpr = recCalcExpr.slice(0, -1);
  recAmountInput.value = recCalcExpr;
  recCalcExpressionEl.textContent = '';
}

function recCalcEqual() {
  if (!recCalcRaw) return;
  try {
    const expr = recCalcRaw.replace(/(\d+\.?\d*)%/g, '($1/100)');
    const result = Function('"use strict"; return (' + expr + ')')();
    if (!isFinite(result)) { recCalcClear(); return; }
    const rounded = Math.round(result * 100) / 100;
    recCalcExpressionEl.textContent = recCalcExpr + ' =';
    recCalcExpr = String(rounded);
    recCalcRaw  = String(rounded);
    recAmountInput.value = recCalcExpr;
  } catch {
    recCalcExpressionEl.textContent = '格式錯誤';
    recCalcRaw = ''; recCalcExpr = '';
    recAmountInput.value = '';
  }
}

recBtnExpense.addEventListener('click',  () => switchRecType('expense'));
recBtnIncome.addEventListener('click',   () => switchRecType('income'));
recBtnTransfer.addEventListener('click', () => switchRecType('transfer'));

// 固定收支的分類選擇：重用現有的 catPickerOverlay
recCatPickBtn.addEventListener('click', () => {
  // 暫時切換 picker 模式為固定收支
  window._recCatPickMode = true;
  openCatPicker(recCurrentType);
});

recurringForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  // 手機上 modal 的 input 可能被鎖成 readonly，送出前先解鎖以確保讀得到值
  recurringModalOverlay.querySelectorAll('input, textarea').forEach(el => { el.readOnly = false; });
  const name   = recNameInput.value.trim();
  const isTransfer = recCurrentType === 'transfer';

  // 與新增記帳一致：若算式尚未按 =，擋住儲存
  if (/[\+\-\*\/]/.test(recCalcRaw) && recCalcRaw !== recCalcExpr) {
    recCalcExpressionEl.textContent = '請先按 = 完成計算';
    recCalcExpressionEl.style.color = 'var(--red-main)';
    shakeEl(recAmountInputWrap);
    return;
  }
  recCalcExpressionEl.style.color = '';

  // 金額：統一使用計算機輸入框，必要時用顯示欄位當 fallback（手機觸控可能未同步）
  let amount = parseFloat(recCalcRaw);
  if (!amount || amount <= 0) amount = parseFloat(recAmountInput.value) || 0;

  if (!name) { shakeEl(recNameInput); return; }
  if (!amount || amount <= 0) { shakeEl(recAmountInputWrap); return; }

  // 轉帳：與新增記帳一致，檢查轉出/轉入帳戶
  if (isTransfer) {
    const fromId = recTransferFrom.value;
    const toId   = recTransferTo.value;
    if (!fromId || !toId) { shakeEl(recTransferGroup); return; }
    if (fromId === toId) {
      shakeEl(recTransferGroup);
      alert('轉出與轉入帳戶不能相同');
      return;
    }
  } else {
    if (!recAccountSel.value) { shakeEl(recAccountGroup); return; }
    if (!recSelectedCategory) { shakeEl(recCatPickBtn); return; }
  }

  const freqN    = parseInt(recFreqN.value) || 1;
  const freqUnit = recFreqUnit.value;
  const editId   = recEditIdInput.value;

  // 讀取頻率細節
  let freqWeekday   = null;
  let freqMonthday  = null;
  let freqYearMonth = null;
  let freqYearDay   = null;
  if (freqUnit === 'week') {
    const activeDay = recWeekdayPicker.querySelector('.weekday-btn.active');
    freqWeekday = activeDay ? parseInt(activeDay.dataset.day) : null;
  } else if (freqUnit === 'month') {
    const activeDay = recMonthdayPicker.querySelector('.monthday-btn.active');
    freqMonthday = activeDay ? (activeDay.dataset.day === 'last' ? 'last' : parseInt(activeDay.dataset.day)) : null;
  } else if (freqUnit === 'year') {
    freqYearMonth = parseInt(recYearMonth.value);
    freqYearDay   = parseInt(recYearDay.value);
  }

  // 根據頻率設定自動計算第一次（或下次）執行日
  const computedNextDate = calcFirstDate(freqUnit, freqWeekday, freqMonthday, freqYearMonth, freqYearDay);

  const data = {
    uid:      currentUser.uid,
    type:     recCurrentType,
    name,
    amount,
    freqN,
    freqUnit,
    freqWeekday,
    freqMonthday,
    freqYearMonth,
    freqYearDay,
    note:     recNoteInput.value.trim(),
    // 支出/收入欄位
    accountId:       isTransfer ? null : (recAccountSel.value || null),
    categoryId:      isTransfer ? null : (recSelectedCategory?.docId      || null),
    categoryName:    isTransfer ? null : (recSelectedCategory?.name       || null),
    categoryEmoji:   isTransfer ? null : (recSelectedCategory?.emoji      || null),
    subCategoryId:   isTransfer ? null : (recSelectedSubCategory?.docId   || null),
    subCategoryName: isTransfer ? null : (recSelectedSubCategory?.name    || null),
    // 轉帳欄位
    transferFromId: isTransfer ? (recTransferFrom.value || null) : null,
    transferToId:   isTransfer ? (recTransferTo.value   || null) : null,
    enabled: true,
  };

  recSubmitBtn.disabled = true;
  recSubmitBtn.textContent = '儲存中...';
  try {
    if (editId) {
      // 編輯時：若頻率設定改變，重新計算下次執行日
      const existing = allRecurring.find(r => r.docId === editId);
      const freqChanged = existing && (
        existing.freqUnit !== freqUnit ||
        existing.freqWeekday !== freqWeekday ||
        existing.freqMonthday !== freqMonthday ||
        existing.freqYearMonth !== freqYearMonth ||
        existing.freqYearDay !== freqYearDay
      );
      if (freqChanged) data.nextDate = computedNextDate;
      await updateDoc(doc(db, 'recurring', editId), data);
    } else {
      data.nextDate  = computedNextDate;
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, 'recurring'), data);
    }
    recurringModalOverlay.classList.remove('active');
  } catch (err) {
    console.error(err);
    alert('儲存失敗，請確認網路連線');
  } finally {
    recSubmitBtn.disabled = false;
    recSubmitBtn.textContent = '儲存';
  }
});

recDeleteBtn.addEventListener('click', async () => {
  const editId = recEditIdInput.value;
  if (!editId) return;
  const item = allRecurring.find(r => r.docId === editId);
  if (!confirm(`刪除「${item?.name || '此項目'}」？`)) return;
  await deleteDoc(doc(db, 'recurring', editId));
  recurringModalOverlay.classList.remove('active');
});

// ===== 月份切換 =====
prevMonthBtn.addEventListener('click', () => changeMonth(-1));
nextMonthBtn.addEventListener('click', () => changeMonth(1));
homeTodayBtn?.addEventListener('click', () => {
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
  renderAll();
});

function hasActiveHomeFilter() {
  return homeFilter.types.length > 0
    || homeFilter.categoryIds.length > 0
    || homeFilter.accountIds.length > 0
    || !!homeFilter.dateFrom
    || !!homeFilter.dateTo;
}

function updateHomeSearchFilterIcons() {
  homeFilterBtn?.classList.toggle('active', hasActiveHomeFilter());
}

function applySearchMode(isSearching) {
  homeMonthNav.style.display = isSearching ? 'none' : '';
  homeSummary.style.display  = isSearching ? 'none' : '';
  if (isSearching && homeBudgetWidget) homeBudgetWidget.style.display = 'none';
  updateHomeSearchFilterIcons();
}

searchInput.addEventListener('input', () => {
  searchKeyword = searchInput.value;
  searchClearBtn.style.display = searchKeyword ? '' : 'none';
  applySearchMode(!!searchKeyword.trim());
  if (!searchKeyword.trim()) renderHomeBudget();
  updateHomeSearchFilterIcons();
  renderList();
});
searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchKeyword = '';
  searchClearBtn.style.display = 'none';
  applySearchMode(false);
  renderHomeBudget();
  updateHomeSearchFilterIcons();
  searchInput.focus();
  renderList();
});

function changeMonth(delta) {
  viewMonth += delta;
  if (viewMonth > 11) { viewMonth = 0;  viewYear++; }
  if (viewMonth < 0)  { viewMonth = 11; viewYear--; }
  renderAll();
}

function initHomeFilterDatePickers() {
  if (typeof flatpickr !== 'function') return;
  const locale = flatpickr.l10ns?.zh_tw ? 'zh_tw' : 'default';
  const common = {
    locale,
    dateFormat: 'Y-m-d',
    allowInput: false,
    disableMobile: true,
  };
  if (!homeFilterDateFromPicker && homeFilterDateFromEl) {
    homeFilterDateFromPicker = flatpickr(homeFilterDateFromEl, {
      ...common,
      onChange(selectedDates) {
        if (homeFilterDateToPicker && selectedDates[0]) {
          homeFilterDateToPicker.set('minDate', selectedDates[0]);
        }
      },
    });
  }
  if (!homeFilterDateToPicker && homeFilterDateToEl) {
    homeFilterDateToPicker = flatpickr(homeFilterDateToEl, {
      ...common,
      onChange(selectedDates) {
        if (homeFilterDateFromPicker && selectedDates[0]) {
          homeFilterDateFromPicker.set('maxDate', selectedDates[0]);
        }
      },
    });
  }
}

function populateHomeFilterLists() {
  if (homeFilterCategoryList) {
    const cats = [...allCategories].sort((a, b) => {
      if (a.type !== b.type) return a.type === 'expense' ? -1 : 1;
      return (a.order ?? 0) - (b.order ?? 0);
    });
    if (!cats.length) {
      homeFilterCategoryList.innerHTML = '<div class="home-filter-check-empty">尚無分類</div>';
    } else {
      homeFilterCategoryList.innerHTML = cats.map(c => `
        <label class="home-filter-check-item">
          <input type="checkbox" value="${c.docId}" ${homeFilter.categoryIds.includes(c.docId) ? 'checked' : ''} />
          <span>${c.emoji || ''} ${c.name}</span>
        </label>
      `).join('');
    }
  }
  if (homeFilterAccountList) {
    const accs = [...allAccounts].sort((a, b) => {
      const tDiff = (a.typeOrder ?? 999) - (b.typeOrder ?? 999);
      if (tDiff !== 0) return tDiff;
      return (a.order ?? 0) - (b.order ?? 0);
    });
    if (!accs.length) {
      homeFilterAccountList.innerHTML = '<div class="home-filter-check-empty">尚無帳戶</div>';
    } else {
      homeFilterAccountList.innerHTML = accs.map(a => `
        <label class="home-filter-check-item">
          <input type="checkbox" value="${a.docId}" ${homeFilter.accountIds.includes(a.docId) ? 'checked' : ''} />
          <span>${a.emoji || ''} ${a.name}</span>
        </label>
      `).join('');
    }
  }
  homeFilterTypeChips?.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.checked = homeFilter.types.includes(cb.value);
  });
  initHomeFilterDatePickers();
  homeFilterDateFromPicker?.setDate(homeFilter.dateFrom || null, false);
  homeFilterDateToPicker?.setDate(homeFilter.dateTo || null, false);
  if (homeFilter.dateFrom) homeFilterDateToPicker?.set('minDate', homeFilter.dateFrom);
  else homeFilterDateToPicker?.set('minDate', null);
  if (homeFilter.dateTo) homeFilterDateFromPicker?.set('maxDate', homeFilter.dateTo);
  else homeFilterDateFromPicker?.set('maxDate', null);
}

function openHomeFilterModal() {
  populateHomeFilterLists();
  homeFilterOverlay?.classList.add('active');
}

function closeHomeFilterModal() {
  homeFilterOverlay?.classList.remove('active');
}

function readHomeFilterDraftFromModal() {
  const types = [...(homeFilterTypeChips?.querySelectorAll('input:checked') || [])].map(el => el.value);
  const categoryIds = [...(homeFilterCategoryList?.querySelectorAll('input:checked') || [])].map(el => el.value);
  const accountIds = [...(homeFilterAccountList?.querySelectorAll('input:checked') || [])].map(el => el.value);
  const dateFrom = homeFilterDateFromEl?.value || '';
  const dateTo = homeFilterDateToEl?.value || '';
  return { types, categoryIds, accountIds, dateFrom, dateTo };
}

function clearHomeFilterDraftInModal() {
  homeFilterTypeChips?.querySelectorAll('input').forEach(cb => { cb.checked = false; });
  homeFilterCategoryList?.querySelectorAll('input').forEach(cb => { cb.checked = false; });
  homeFilterAccountList?.querySelectorAll('input').forEach(cb => { cb.checked = false; });
  homeFilterDateFromPicker?.clear();
  homeFilterDateToPicker?.clear();
  homeFilterDateFromPicker?.set('maxDate', null);
  homeFilterDateToPicker?.set('minDate', null);
}

homeFilterBtn?.addEventListener('click', openHomeFilterModal);
closeHomeFilterBtn?.addEventListener('click', closeHomeFilterModal);
homeFilterOverlay?.addEventListener('click', (e) => {
  if (e.target === homeFilterOverlay) closeHomeFilterModal();
});
clearHomeFilterBtn?.addEventListener('click', () => {
  clearHomeFilterDraftInModal();
  homeFilter = { types: [], categoryIds: [], accountIds: [], dateFrom: '', dateTo: '' };
  updateHomeSearchFilterIcons();
  closeHomeFilterModal();
  renderList();
});
applyHomeFilterBtn?.addEventListener('click', () => {
  homeFilter = readHomeFilterDraftFromModal();
  updateHomeSearchFilterIcons();
  closeHomeFilterModal();
  renderList();
});

// ===== 記帳彈窗 =====
openFormBtn.addEventListener('click', () => openModal());
closeFormBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(); });

deleteRecordBtn.addEventListener('click', async () => {
  const editId = recordEditId.value;
  if (!editId) return;
  const target = findRecordById(editId);
  if (!canModifyRecord(target)) {
    alert('只有建立這筆記帳的人可以刪除');
    return;
  }
  if (confirm('確定要刪除這筆記錄嗎？')) {
    await deleteRecord(editId);
    closeModal();
  }
});

function openModal(record = null, newRecordOptions = null) {
  showRecordModalEditorMode();
  if (record) {
    if (!canModifyRecord(record)) {
      alert('只有建立這筆記帳的人可以修改或刪除');
      return;
    }
    recordEditId.value = record.docId;
    const transferRecord = isTransferRecord(record);
    recordModalTitle.textContent = transferRecord ? '編輯轉帳' : '編輯記帳';
    submitBtn.textContent = '儲存修改';
    deleteRecordBtn.style.display = 'block';
    switchType(transferRecord ? 'transfer' : record.type);
    let formRecord = record;
    if (transferRecord) {
      const { outRec, inRec } = pickTransferOutIn(getTransferPairRecords(record), record);
      formRecord = outRec || record;

      transferFrom.value = formRecord.transferFromId || record.transferFromId || '';
      transferTo.value   = formRecord.transferToId   || record.transferToId   || '';

      const hasExchangeFlag = (outRec?.exchangeRate != null) || (inRec?.exchangeRate != null) || (record.exchangeRate != null);
      const hasDifferentAmount = !!inRec && (inRec.amount !== outRec.amount);
      if (inRec && (hasExchangeFlag || hasDifferentAmount)) {
        setExchangeOn(true);
        exchangeAmountInput.value = inRec.amount != null ? String(inRec.amount) : '';
        setTimeout(updateExchangeHint, 0);
      } else if (!inRec && hasExchangeFlag && (outRec?.amount > 0)) {
        // 兼容舊資料：若另一筆遺失，至少用匯率還原到帳金額給使用者確認
        const rate = outRec?.exchangeRate ?? record.exchangeRate;
        const restored = rate > 0 ? +(outRec.amount * rate).toFixed(2) : null;
        if (restored && restored > 0) {
          setExchangeOn(true);
          exchangeAmountInput.value = String(restored);
          setTimeout(updateExchangeHint, 0);
        } else {
          setExchangeOn(false);
        }
      } else {
        setExchangeOn(false);
      }
    } else {
      selectedCategory    = record.categoryId    || null;
      selectedSubCategory = record.subCategoryId || null;
      const parentCat = allCategories.find(c => c.docId === selectedCategory) || null;
      const subCat    = parentCat?.subs?.find(s => s.docId === selectedSubCategory) || null;
      updateCatPickBtn(parentCat, subCat);
      accountSelect.value = record.accountId || '';
    }
    const editAcc = allAccounts.find(a => a.docId === (formRecord.accountId || ''));
    const editPrimaryAmount = editAcc?.currency
      ? (formRecord.foreignAmount ?? formRecord.amount)
      : formRecord.amount;
    calcExpr = String(editPrimaryAmount);
    calcRaw  = String(editPrimaryAmount);
    amountInput.value = calcExpr;
    dateInput.value   = formRecord.date;
    noteInput.value   = formRecord.note || '';
    foreignCurrencyInput.value = formRecord.foreignCurrency || '';
    foreignAmountInput.value   = formRecord.foreignAmount   || '';
    if (!editAcc?.currency && (formRecord.foreignCurrency || formRecord.foreignAmount)) {
      foreignAmountRow.style.display = '';
      foreignToggleLabel.textContent = '− 外幣金額';
    }
    // 還原專案與分攤
    ensureRecordProjectOption(formRecord.projectId);
    setRecordProjectEnabled(!!formRecord.projectId, formRecord.projectId || '');
    updateRewardActivitySelect(formRecord.rewardActivityIds || (formRecord.rewardActivityId ? [formRecord.rewardActivityId] : []));
    updateSplitGroupVisibility(formRecord);
  } else {
    // 每次開「新增」都對齊今天（避免分頁久未重整仍停留在上次載入的日期）
    setDefaultDate();
    recordEditId.value = '';
    recordModalTitle.textContent = '新增記帳';
    submitBtn.textContent = '記下來！';
    deleteRecordBtn.style.display = 'none';
    const preset = newRecordOptions?.presetAccountId;
    const presetOk = preset && allAccounts.some(a => a.docId === preset);
    const defaultAcc = allAccounts.find(a => a.isDefault);
    const fallbackId = defaultAcc ? defaultAcc.docId : (allAccounts[0]?.docId || '');
    const chosenId   = presetOk ? preset : fallbackId;
    accountSelect.value = chosenId;
    if (currentType === 'transfer' && chosenId) {
      transferFrom.value = chosenId;
      if (transferTo.value === chosenId) {
        const alt = allAccounts.find(a => a.docId !== chosenId);
        if (alt) transferTo.value = alt.docId;
      }
    }
    setRecordProjectEnabled(false);
  }
  syncForeignAccountUI();
  void maybeAutoConvertForeignIncome();
  modalOverlay.classList.add('active');
}

function closeModal() {
  modalOverlay.classList.remove('active');
  showRecordModalEditorMode();
  resetForm();
}

// ===== 切換收入/支出/轉帳 =====
btnExpense.addEventListener('click',  () => switchType('expense'));
btnIncome.addEventListener('click',   () => switchType('income'));
btnTransfer.addEventListener('click', () => switchType('transfer'));

function switchType(type) {
  const prevType = currentType;
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
  // 轉帳不需要外幣欄位
  foreignAmountGroup.style.display = isTransfer ? 'none' : '';

  if (!isTransfer) {
    setDefaultCategory();
    // 切換到非轉帳時重置換匯
    setExchangeOn(false);
  }
  if (prevType === 'income' && type === 'expense') {
    resetForeignAmountUI({ clearValues: true });
  }
  syncForeignAccountUI();
  void maybeAutoConvertForeignIncome();
}

// 換匯開關控制函式
function setExchangeOn(val) {
  exchangeOn = val;
  exchangeAmountGroup.style.display = val ? '' : 'none';
  exchangeToggleBtn.classList.toggle('active', val);
  if (!val) {
    exchangeAmountInput.value = '';
    exchangeHint.textContent  = '';
  }
}

// 換匯 toggle 按鈕
exchangeToggleBtn.addEventListener('click', () => setExchangeOn(!exchangeOn));

// 換匯匯率提示（輸入到帳金額時即時計算）
function updateExchangeHint() {
  const fromAmt = parseFloat(amountInput.value) || 0;
  const toAmt   = parseFloat(exchangeAmountInput.value) || 0;
  if (!exchangeOn || fromAmt <= 0 || toAmt <= 0) {
    exchangeHint.textContent = '';
    return;
  }
  const rate = (toAmt / fromAmt).toFixed(4);
  exchangeHint.textContent = `匯率約 1 : ${rate}`;
}
exchangeAmountInput.addEventListener('input', updateExchangeHint);
amountInput.addEventListener('input', () => {
  updateExchangeHint();
  if (splitGroup.style.display !== 'none') syncEqualAmounts();
});

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

function openCatPicker(forceType = null) {
  renderCatPickerParents(forceType);
  catPickerOverlay.classList.add('active');
}

function closeCatPicker() {
  catPickerOverlay.classList.remove('active');
  window._recCatPickMode = false;
}

// 渲染左欄主分類
function renderCatPickerParents(forceType = null) {
  catPickerParents.innerHTML = '';
  catPickerSubs.innerHTML = '';
  const typeToShow = forceType || currentType;
  const parents = allCategories.filter(c => c.type === typeToShow);

  // 若目前已選主分類，預先展開對應子分類
  const curSelCat = window._recCatPickMode ? recSelectedCategory?.docId : selectedCategory;
  let activeParent = parents.find(c => c.docId === curSelCat) || parents[0] || null;

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

  // 允許在選擇分類時直接新增主分類（放在最下面）
  const addParentBtn = document.createElement('button');
  addParentBtn.type = 'button';
  addParentBtn.className = 'cat-picker-action-btn';
  addParentBtn.textContent = '＋ 新增主分類';
  addParentBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    catSelectedType = typeToShow;
    openCatModal(null, null);
  });
  catPickerParents.appendChild(addParentBtn);

  if (activeParent) renderCatPickerSubs(activeParent);
}

// 渲染右欄子分類（純文字，無 emoji）
function renderCatPickerSubs(parentCat) {
  catPickerSubs.innerHTML = '';

  if (parentCat.subs && parentCat.subs.length > 0) {
    parentCat.subs.forEach(sub => {
      const isRecMode = window._recCatPickMode;
      const curSub = isRecMode ? recSelectedSubCategory?.docId : selectedSubCategory;
      const item = document.createElement('div');
      item.className = 'cat-picker-sub' + (curSub === sub.docId ? ' selected' : '');
      item.innerHTML = sub.emoji
        ? `<span class="cat-picker-sub-emoji">${sub.emoji}</span><span>${sub.name}</span>`
        : sub.name;
      item.addEventListener('click', () => {
        if (window._recCatPickMode) {
          recSelectedCategory    = parentCat;
          recSelectedSubCategory = sub;
          updateRecCatPickBtn();
          window._recCatPickMode = false;
        } else {
          selectedCategory    = parentCat.docId;
          selectedSubCategory = sub.docId;
          updateCatPickBtn(parentCat, sub);
        }
        closeCatPicker();
      });
      catPickerSubs.appendChild(item);
    });
  }

  // 允許在選擇分類時直接新增子分類（放在最下面）
  const addSubBtn = document.createElement('button');
  addSubBtn.type = 'button';
  addSubBtn.className = 'cat-picker-action-btn';
  addSubBtn.textContent = '＋ 新增子分類';
  addSubBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!parentCat) return;
    catSelectedType = parentCat.type || currentType;
    openCatModal(null, parentCat);
  });
  catPickerSubs.appendChild(addSubBtn);
}

// 更新金額列上的分類按鈕顯示
function updateCatPickBtn(parentCat, subCat) {
  if (!parentCat) {
    catPickEmoji.textContent = '📦';
    catPickName.innerHTML    = '選擇分類';
    return;
  }
  catPickEmoji.textContent = (subCat?.emoji) || parentCat.emoji;
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

  // 記帳用：多一個「無」選項（專案中別人支出等）
  const optNone = document.createElement('option');
  optNone.value = '';
  optNone.textContent = '無';
  accountSelect.appendChild(optNone);

  const sortedAccounts = [...allAccounts].sort((a, b) => {
    const tDiff = (a.typeOrder ?? 999) - (b.typeOrder ?? 999);
    if (tDiff !== 0) return tDiff;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  sortedAccounts.forEach(a => {
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

  // 還原選擇；選過「無」時保留，否則預設扣款帳戶或第一個
  if (prev === '') accountSelect.value = '';
  else if (prev) accountSelect.value = prev;
  else if (allAccounts.length > 0) {
    const defaultAcc = allAccounts.find(a => a.isDefault);
    accountSelect.value = defaultAcc ? defaultAcc.docId : allAccounts[0].docId;
  }

  if (prevFrom) transferFrom.value = prevFrom;
  else if (allAccounts.length > 0) transferFrom.value = allAccounts[0].docId;

  if (prevTo)   transferTo.value = prevTo;
  else if (allAccounts.length > 1) transferTo.value = allAccounts[1].docId;
  else if (allAccounts.length > 0) transferTo.value = allAccounts[0].docId;

  syncForeignAccountUI();
}

// ===== 設定頁：預設扣款帳戶 =====
function getDefaultDebitAccountLabel() {
  const defaultAcc = allAccounts.find(a => a.isDefault);
  if (defaultAcc) return `${defaultAcc.emoji} ${defaultAcc.name}`;
  return '不指定（使用第一個帳戶）';
}

function updateDefaultDebitAccountDesc() {
  if (!defaultDebitAccountDesc) return;
  defaultDebitAccountDesc.textContent = getDefaultDebitAccountLabel();
}

function renderDefaultDebitAccountSelect() {
  updateDefaultDebitAccountDesc();
  if (!defaultDebitAccountSelect) return;
  const defaultAcc = allAccounts.find(a => a.isDefault);
  const preferred = defaultAcc?.docId || '';

  defaultDebitAccountSelect.innerHTML = '';
  const optNone = document.createElement('option');
  optNone.value = '';
  optNone.textContent = '不指定（使用第一個帳戶）';
  defaultDebitAccountSelect.appendChild(optNone);

  const sortedAccounts = [...allAccounts].sort((a, b) => {
    const tDiff = (a.typeOrder ?? 999) - (b.typeOrder ?? 999);
    if (tDiff !== 0) return tDiff;
    return (a.order ?? 0) - (b.order ?? 0);
  });
  sortedAccounts.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.docId;
    opt.textContent = `${a.emoji} ${a.name}`;
    defaultDebitAccountSelect.appendChild(opt);
  });

  defaultDebitAccountSelect.value =
    preferred && allAccounts.some(a => a.docId === preferred) ? preferred : '';
}

function openDefaultDebitAccountModal() {
  renderDefaultDebitAccountSelect();
  defaultDebitAccountOverlay?.classList.add('active');
}

function closeDefaultDebitAccountModal() {
  defaultDebitAccountOverlay?.classList.remove('active');
}

async function setDefaultDebitAccount(accountId) {
  if (!currentUser) return;
  const updates = allAccounts
    .filter(a => !!a.isDefault !== (!!accountId && a.docId === accountId))
    .map(a => updateDoc(doc(db, 'accounts', a.docId), {
      isDefault: (accountId && a.docId === accountId) ? true : null,
    }));
  if (!updates.length) return;
  await Promise.all(updates);
}

goDefaultDebitAccountBtn?.addEventListener('click', openDefaultDebitAccountModal);
closeDefaultDebitAccountBtn?.addEventListener('click', closeDefaultDebitAccountModal);
defaultDebitAccountOverlay?.addEventListener('click', (e) => {
  if (e.target === defaultDebitAccountOverlay) closeDefaultDebitAccountModal();
});
saveDefaultDebitAccountBtn?.addEventListener('click', async () => {
  const nextId = defaultDebitAccountSelect?.value || '';
  saveDefaultDebitAccountBtn.disabled = true;
  saveDefaultDebitAccountBtn.textContent = '儲存中...';
  try {
    await setDefaultDebitAccount(nextId);
    updateDefaultDebitAccountDesc();
    closeDefaultDebitAccountModal();
  } catch (err) {
    console.error(err);
    alert('更新預設扣款帳戶失敗');
  } finally {
    saveDefaultDebitAccountBtn.disabled = false;
    saveDefaultDebitAccountBtn.textContent = '儲存';
  }
});

accountSelect.addEventListener('change', () => {
  syncForeignAccountUI();
  void maybeAutoConvertForeignIncome();
});

foreignCurrencyInput.addEventListener('change', () => {
  void maybeAutoConvertForeignIncome(true);
});

foreignAmountInput.addEventListener('input', () => {
  // foreignAmount 變動時，無論 amount 是否已經有數字，都要跟著外幣金額換算更新
  void maybeAutoConvertForeignIncome(true);
});

// ===== 日期 =====
function setDefaultDate() {
  dateInput.value = formatDate(new Date());
}

function formatDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDateDisplay(dateStr) {
  if (!dateStr || !dateStr.includes('-')) return dateStr || '';
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  const thisYear = new Date().getFullYear();
  if (y < thisYear) return `${y}年${m}月${d}日`;
  return `${m}月${d}日`;
}

// ===== 提交記帳（新增 / 編輯）=====
recordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  // 範本編輯模式：不建立記帳，改走更新範本
  if (tplEditingId) {
    saveTplBtn?.click();
    return;
  }
  // 若算式尚未按 =，擋住儲存
  if (/[+\-*/]/.test(calcRaw)) {
    calcExpressionEl.textContent = '請先按 = 完成計算';
    calcExpressionEl.style.color = 'var(--red-main)';
    shakeEl(amountInput.parentElement);
    return;
  }
  calcExpressionEl.style.color = '';
  const inputAmount = parseFloat(calcRaw) || parseFloat(amountInput.value);
  if (!inputAmount || inputAmount <= 0) { shakeEl(amountInput.parentElement); return; }

  const editId = recordEditId.value;
  submitBtn.disabled = true;
  submitBtn.textContent = '儲存中...';

  try {
    if (editId) {
      const target = findRecordById(editId);
      if (!canModifyRecord(target)) {
        alert('只有建立這筆記帳的人可以修改');
        return;
      }
    }

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

      // 換匯：到帳金額可與轉出金額不同（需為有效正數）
      const rawExchangeAmount = parseFloat(exchangeAmountInput.value);
      const isExchange = exchangeOn;
      if (isExchange) {
        if (!(rawExchangeAmount > 0)) {
          shakeEl(exchangeAmountInput.parentElement || exchangeAmountGroup);
          alert('已開啟換匯，請輸入大於 0 的到帳金額');
          return;
        }
      }
      const toAmount = isExchange ? rawExchangeAmount : inputAmount;
      const exchangeRate = isExchange && inputAmount > 0 ? +(toAmount / inputAmount).toFixed(6) : null;

      await commitTransferPair({
        editId: editId || null,
        fromId,
        toId,
        fromAcc,
        toAcc,
        fromAmount: inputAmount,
        toAmount,
        date,
        note,
        exchangeRate,
        isExchange,
      });
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
    const accountCurrency = selAcc?.currency || null;
    const manualForeignCurrency = foreignCurrencyInput.value || null;
    const manualForeignAmount = foreignAmountInput.value ? (parseFloat(foreignAmountInput.value) || null) : null;
    const isForeignPrimary = !!accountCurrency;
    const primaryForeignAmount = isForeignPrimary ? inputAmount : manualForeignAmount;
    let amount = inputAmount;

    if (isForeignPrimary) {
      const projId = getSelectedRecordProjectId();
      const proj = projId ? (allProjects || []).find(p => p.docId === projId) : null;
      const useProjectRate = proj?.currency === accountCurrency && proj?.rateToTwd != null && proj.rateToTwd > 0;
      if (useProjectRate) {
        amount = Math.round(inputAmount * proj.rateToTwd);
      } else {
        const converted = await getConvertedTwdAmount(accountCurrency, inputAmount);
        if (!converted) {
          alert('目前無法取得匯率，請稍後再試');
          return;
        }
        amount = converted.twdAmount;
      }
    }

    const { splitPayer: sp, splitPayerUid: spUid, splitData: sd } = getSplitData(isForeignPrimary ? amount : undefined);
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
      foreignCurrency:  accountCurrency || manualForeignCurrency,
      foreignAmount:    primaryForeignAmount,
      projectId:          getSelectedRecordProjectId() || null,
      rewardActivityId:   null, // 舊欄位停用，保留相容讀取
      rewardActivityIds:  getSelectedRewardActivityIds(),
      splitPayer:         sp || null,
      splitPayerUid:      spUid || null,
      splitData:          sd || null,
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
  foreignCurrencyInput.value = '';
  foreignAmountInput.value   = '';
  foreignAmountRow.style.display = 'none';
  foreignToggleLabel.textContent = '＋ 外幣金額';
  foreignCurrencyInput.disabled = false;
  foreignRateHint.style.display = 'none';
  foreignRateHint.textContent = '';
  lastAutoFilledAmount = null;
  setExchangeOn(false);
  recordModalTitle.textContent = '新增記帳';
  submitBtn.textContent = '記下來！';
  if (recordProjectToggle) recordProjectToggle.checked = false;
  if (recordProjectSelectWrap) recordProjectSelectWrap.style.display = 'none';
  if (recordProjectSelect?.options.length) recordProjectSelect.selectedIndex = 0;
  clearTplEditing();
  rewardActivityGroup.style.display = 'none';
  if (rewardActivityChecklist) rewardActivityChecklist.innerHTML = '';
  splitGroup.style.display = 'none';
  splitMode = 'equal';
  if (splitEqualToggle) splitEqualToggle.checked = true;
  // 回到支出模式（會自動切換 UI 顯示）
  switchType('expense');
  setDefaultDate();
  resetCalc();
}

async function deleteRecord(docId) {
  try {
    const rec = findRecordById(docId);
    if (!canModifyRecord(rec)) {
      alert('只有建立這筆記帳的人可以刪除');
      return;
    }
    if (rec?.transferId) {
      // 轉帳：一併刪除兩筆關聯（用 batch 確保一致）
      const paired = getTransferPairRecords(rec);
      const batch = writeBatch(db);
      paired.forEach(r => {
        if (r?.docId) batch.delete(doc(db, 'records', r.docId));
      });
      if (!paired.some(r => r.docId === docId)) {
        batch.delete(doc(db, 'records', docId));
      }
      await batch.commit();
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

const billingDayGroup   = document.getElementById('billingDayGroup');
const accountBillingDay = document.getElementById('accountBillingDay');
const rewardPeriodGroup = document.getElementById('rewardPeriodGroup');
const accountRewardPeriod = document.getElementById('accountRewardPeriod');

// 填入 1~31 選項
for (let d = 1; d <= 31; d++) {
  const opt = document.createElement('option');
  opt.value = d;
  opt.textContent = `${d} 號`;
  accountBillingDay.appendChild(opt);
}

function openAccountModal(account = null) {
  accountEditId.value = account ? account.docId : '';
  accountNameInput.value     = account ? account.name     : '';
  accountBalanceInput.value  = account ? account.balance  : '';
  accountNoteInput.value     = account ? account.note     : '';
  accountCurrencyInput.value      = account?.currency ?? '';
  accountIncludeInTotal.checked   = account ? (account.includeInTotal !== false) : true;
  accountBillingDay.value         = account?.billingDay ?? '';
  accountRewardPeriod.value       = account?.rewardPeriodMode || REWARD_PERIOD_CALENDAR;
  selectedAccountType       = account ? account.typeId  : null;
  renderAccountTypeGrid();
  updateCreditCardFieldsVisibility();
  accountModalOverlay.classList.add('active');
}

const accountBalanceLabel = document.getElementById('accountBalanceLabel');

function updateCreditCardFieldsVisibility() {
  const isCredit = selectedAccountType === 'credit';
  billingDayGroup.style.display = isCredit ? '' : 'none';
  rewardPeriodGroup.style.display = isCredit ? '' : 'none';
  // 動態更新餘額說明
  if (selectedAccountType === 'credit') {
    accountBalanceLabel.textContent = '初始餘額（信用卡欠款請輸入負數，例：-5000）';
  } else if (selectedAccountType === 'loan') {
    accountBalanceLabel.textContent = '貸款金額（請輸入負數，例：房貸100萬填 -1000000）';
  } else {
    accountBalanceLabel.textContent = '初始餘額';
  }
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
    item.addEventListener('click', () => { selectedAccountType = t.id; renderAccountTypeGrid(); updateCreditCardFieldsVisibility(); });
    accountTypeGrid.appendChild(item);
  });
}

// ===== 提交帳戶 =====
accountForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedAccountType) { shakeEl(accountTypeGrid); return; }

  const name            = accountNameInput.value.trim();
  const balance         = parseFloat(accountBalanceInput.value) || 0;
  const note            = accountNoteInput.value.trim();
  const currency        = accountCurrencyInput.value || null;
  const includeInTotal  = accountIncludeInTotal.checked;
  const billingDay = selectedAccountType === 'credit' && accountBillingDay.value
    ? parseInt(accountBillingDay.value) : null;
  const rewardPeriodMode = selectedAccountType === 'credit'
    ? (accountRewardPeriod.value || REWARD_PERIOD_CALENDAR)
    : null;
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
        name, balance, note, billingDay, rewardPeriodMode, currency, includeInTotal,
      });
    } else {
      const maxOrder = allAccounts.reduce((m, a) => Math.max(m, a.order ?? 0), 0);
      await addDoc(collection(db, 'accounts'), {
        uid:      currentUser.uid,
        typeId:   selectedAccountType,
        emoji:    typeObj.emoji,
        typeName: typeObj.name,
        name, balance, note, billingDay, rewardPeriodMode, currency, includeInTotal,
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
  // 若是從「選擇分類」彈窗新增，先關掉 picker（z-index 較高），避免新增表單被蓋住
  if (catPickerOverlay?.classList.contains('active')) {
    window._catPickerWasActive = true;
    catPickerOverlay.classList.remove('active');
  } else {
    window._catPickerWasActive = false;
  }

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
}

function closeCatModal() {
  catModalOverlay.classList.remove('active');
  // 新增/編輯完成後若原本是在「選擇分類」流程，回到 picker
  if (window._catPickerWasActive) {
    window._catPickerWasActive = false;
    openCatPicker();
  }
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
  const inc  = recs.filter(r => r.type === 'income').reduce((s, r)  => s + getAccountRecordAmount(account, r), 0);
  const exp  = recs.filter(r => r.type === 'expense').reduce((s, r) => s + getAccountRecordAmount(account, r), 0);
  // 轉帳：轉入 +amount，轉出 -amount
  const transferIn  = recs.filter(r => r.type === 'transfer' && r.transferToId   === account.docId).reduce((s, r) => s + r.amount, 0);
  const transferOut = recs.filter(r => r.type === 'transfer' && r.transferFromId === account.docId).reduce((s, r) => s + r.amount, 0);
  return (account.balance || 0) + inc - exp + transferIn - transferOut;
}

// ===== 渲染帳戶列表 =====
function renderAccountList() {
  while (accountList.firstChild) accountList.removeChild(accountList.firstChild);
  const existingFxBar = document.getElementById('fxSummaryBar');
  if (existingFxBar) existingFxBar.remove();

  if (allAccounts.length === 0) {
    accountList.appendChild(accountEmptyState);
    accountEmptyState.style.display = '';
    accountsNetWorth.textContent       = '$0';
    accountsTotalAsset.textContent     = '$0';
    accountsTotalLiability.textContent = '$0';
    return;
  }

  accountEmptyState.style.display = 'none';

  // 信用卡、貸款：餘額為負代表欠款（負債），餘額為正代表已還清有溢繳
  const LIABILITY_TYPES = ['credit', 'loan'];
  let totalAsset     = 0;
  let totalLiability = 0;
  const fxSummary = {}; // { USD: { net, twdNet, rate }, ... }
  allAccounts.forEach(a => {
    const bal = calcAccountBalance(a);
    const included = a.includeInTotal !== false;
    if (!included) return; // 不計入總資產，直接跳過

    if (a.currency) {
      const signedNet = (LIABILITY_TYPES.includes(a.typeId) && bal < 0) ? -Math.abs(bal) : bal;
      const rateToTwd = getLatestFxRate(a.currency);
      if (!fxSummary[a.currency]) fxSummary[a.currency] = { net: 0, twdNet: 0, rate: rateToTwd };
      fxSummary[a.currency].net += signedNet;
      if (rateToTwd) {
        fxSummary[a.currency].twdNet += signedNet * rateToTwd;
        if (signedNet < 0) totalLiability += Math.abs(signedNet * rateToTwd);
        else totalAsset += signedNet * rateToTwd;
      }
      return;
    }
    if (LIABILITY_TYPES.includes(a.typeId)) {
      if (bal < 0) totalLiability += Math.abs(bal);
      else         totalAsset     += bal;
    } else {
      totalAsset += bal;
    }
  });
  // 淨資產 = 資產 - 負債（台幣 + 依最新匯率換算之外幣）
  const netWorth = totalAsset - totalLiability;

  accountsNetWorth.textContent       = `$${formatMoney(netWorth)}`;
  accountsNetWorth.style.color       = netWorth < 0 ? '#ffb3b3' : 'white';
  accountsTotalAsset.textContent     = `$${formatMoney(totalAsset)}`;
  accountsTotalLiability.textContent = `$${formatMoney(totalLiability)}`;

  // 外幣帳戶參考列（插入在總覽卡片下方）
  const fxEntries = Object.entries(fxSummary);
  if (fxEntries.length > 0) {
    const updatedText = getFxUpdatedText();
    const bar = document.createElement('div');
    bar.id = 'fxSummaryBar';
    bar.className = 'fx-summary-bar';
    bar.innerHTML = `
      <div class="fx-summary-head">
        <div class="fx-summary-label">外幣帳戶換算</div>
        <div class="fx-summary-meta">${updatedText ? `匯率更新 ${updatedText}` : '依最新匯率換算'}</div>
      </div>
      <div class="fx-summary-grid">
        ${fxEntries.map(([cur, { net, twdNet, rate }]) => {
        const nativeText = `${cur} ${net < 0 ? '-' : ''}${formatMoneyByCurrency(Math.abs(net), cur)}`;
        if (rate) {
          return `
            <div class="fx-summary-item">
              <div class="fx-summary-native">${nativeText}</div>
              <div class="fx-summary-twd">≈ ${twdNet < 0 ? '-' : ''}$${formatMoney(Math.abs(twdNet))}</div>
            </div>
          `;
        }
        return `
          <div class="fx-summary-item">
            <div class="fx-summary-native">${nativeText}</div>
            <div class="fx-summary-pending">待匯率</div>
          </div>
        `;
      }).join('')}
      </div>
    `;
    // 插在 accountList 前
    accountList.parentNode.insertBefore(bar, accountList);
  }

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
      const balPrefix = a.currency ? a.currency + ' ' : '$';
      const balText  = curBal < 0
        ? `-${balPrefix}${a.currency ? formatMoneyByCurrency(Math.abs(curBal), a.currency) : formatMoney(Math.abs(curBal))}`
        : `${balPrefix}${a.currency ? formatMoneyByCurrency(curBal, a.currency) : formatMoney(curBal)}`;

      const item = document.createElement('div');
      item.className = 'account-item';
      item.dataset.docId = a.docId;
      item.innerHTML = `
        <span class="drag-handle item-drag-handle" title="拖曳排序">⠿</span>
        <div class="account-type-icon">${a.emoji}</div>
        <div class="account-info">
          <div class="account-name">
            ${a.name}
            ${a.currency ? `<span class="account-currency-tag">${a.currency}</span>` : ''}
            ${a.includeInTotal === false ? `<span class="account-exclude-tag">不計入</span>` : ''}
          </div>
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
  renderHomeBudget();
  renderList();
  applySearchMode(!!searchKeyword.trim());
  updateHomeSearchFilterIcons();
}

function renderMonthLabel() {
  currentMonthLabel.textContent = `${viewYear}年${viewMonth + 1}月`;
  const now = new Date();
  const isCurrent = viewYear === now.getFullYear() && viewMonth === now.getMonth();
  if (homeTodayBtn) homeTodayBtn.style.display = isCurrent ? 'none' : '';
}

function getMonthRecordsFor(year, month) {
  const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
  return allRecords.filter(r => {
    if (!r.date || !r.date.startsWith(ym)) return false;
    if (r.splitPayer && !isCurrentUserSplitPayer(r) && !r.isSettlement) return false;
    return true;
  });
}

function getMonthRecords() {
  return getMonthRecordsFor(viewYear, viewMonth);
}

function calcMonthIncomeExpense(recs) {
  const income  = recs.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const expenseBase = recs.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const transferExpense = recs
    .filter(r => isTransferRecord(r) && r.accountId === r.transferFromId)
    .filter(r => r.projectId || isCreditCardTransferOut(r))
    .reduce((s, r) => s + (r.amount || 0), 0);
  const expense = expenseBase + transferExpense;
  return { income, expense, balance: income - expense };
}

function renderSummary() {
  const { income, expense, balance } = calcMonthIncomeExpense(getMonthRecords());
  totalIncome.textContent  = `NT$ ${formatMoney(income)}`;
  totalExpense.textContent = `NT$ ${formatMoney(expense)}`;
  totalBalance.textContent = `NT$ ${formatMoney(balance)}`;
  totalBalance.style.color = '';

  if (!summaryTrendBadge) return;
  let prevYear = viewYear;
  let prevMonth = viewMonth - 1;
  if (prevMonth < 0) {
    prevMonth = 11;
    prevYear -= 1;
  }
  const prevBalance = calcMonthIncomeExpense(getMonthRecordsFor(prevYear, prevMonth)).balance;
  if (prevBalance === 0) {
    summaryTrendBadge.hidden = true;
    summaryTrendBadge.textContent = '';
    return;
  }
  const pct = Math.round(((balance - prevBalance) / Math.abs(prevBalance)) * 100);
  summaryTrendBadge.hidden = false;
  summaryTrendBadge.textContent = `${pct > 0 ? '+' : ''}${pct}%`;
  summaryTrendBadge.classList.toggle('down', pct < 0);
  summaryTrendBadge.classList.toggle('up', pct >= 0);
}

function renderHomeBudget() {
  if (searchKeyword.trim()) {
    homeBudgetWidget.style.display = 'none';
    return;
  }
  const monthBudget = allBudgets.find(b => b.type === 'month');
  const catBudgets  = allBudgets.filter(b => b.type === 'category');
  if (!monthBudget && catBudgets.length === 0) {
    homeBudgetWidget.style.display = 'none';
    return;
  }
  homeBudgetWidget.style.display = '';

  const now            = new Date();
  const isCurrentMonth = (viewYear === now.getFullYear() && viewMonth === now.getMonth());
  const ym             = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const thisYear       = now.getFullYear();

  // 水平進度列產生器
  function makeTankCard(opts) {
    const { icon, label, spent, limit, pct, over } = opts;
    const fillPct   = Math.min(Math.max(pct, 0), 100);
    const remaining = limit - spent;
    const barClass  = over ? 'over' : (pct >= 80 ? 'warn' : '');
    const statusTxt = over
      ? `超支 $${formatMoney(spent - limit)}`
      : `${pct}%`;
    const remainTxt = over
      ? `已花 $${formatMoney(spent)}`
      : `剩 $${formatMoney(remaining)}`;
    return `
      <div class="hb-row${over ? ' is-over' : ''}">
        <div class="hb-row-head">
          <div class="hb-row-title">
            <span class="hb-row-icon">${icon}</span>
            <span class="hb-row-label">${label}</span>
          </div>
          <div class="hb-row-meta">
            <span class="hb-row-remain${over ? ' over' : ''}">${remainTxt}</span>
            <span class="hb-row-limit">/ $${formatMoney(limit)}</span>
          </div>
          <span class="hb-row-pct${over ? ' over' : ''}">${statusTxt}</span>
        </div>
        <div class="hb-bar-track">
          <div class="hb-bar-fill ${barClass}" style="width:${fillPct}%"></div>
        </div>
      </div>`;
  }

  let html = '<div class="hb-list">';

  // ── 月預算 ──
  if (monthBudget) {
    const excluded = monthBudget.excludedCategoryIds || [];
    const spent = allRecords
      .filter(r => {
        if (r.type !== 'expense' || !r.date?.startsWith(ym)) return false;
        if (r.splitPayer && !isCurrentUserSplitPayer(r) && !r.isSettlement) return false;
        if (r.subCategoryId && excluded.includes(`${r.categoryId}::${r.subCategoryId}`)) return false;
        if (!r.subCategoryId && excluded.includes(r.categoryId)) return false;
        return true;
      })
      .reduce((s, r) => s + getReportAmount(r), 0);
    const limit = monthBudget.amount;
    const pct   = limit > 0 ? Math.min(Math.round(spent / limit * 100), 100) : 0;
    const over  = spent > limit;
    const monthLabel = isCurrentMonth ? '本月預算' : `${viewMonth + 1}月預算`;
    html += makeTankCard({ icon: '💰', label: monthLabel, spent, limit, pct, over });
  }

  // ── 類別預算（最多顯示 4 項）──
  if (catBudgets.length > 0) {
    const yearPrefix = `${thisYear}-`;
    const spentMap = {};
    allRecords
      .filter(r => {
        if (r.type !== 'expense' || !r.date?.startsWith(yearPrefix)) return false;
        if (r.splitPayer && !isCurrentUserSplitPayer(r) && !r.isSettlement) return false;
        return true;
      })
      .forEach(r => {
        const catKey = r.categoryId || '__none__';
        spentMap[catKey] = (spentMap[catKey] || 0) + getReportAmount(r);
        if (r.subCategoryId) {
          const subKey = `${r.categoryId}::${r.subCategoryId}`;
          spentMap[subKey] = (spentMap[subKey] || 0) + getReportAmount(r);
        }
      });

    const sorted = [...catBudgets]
      .map(b => {
        const items = b.categoryItems?.length
          ? b.categoryItems
          : [{ catId: b.categoryId, subId: b.subCategoryId || null, emoji: b.subCategoryEmoji || b.categoryEmoji || '📦', label: b.subCategoryName ? `${b.categoryName}・${b.subCategoryName}` : b.categoryName }];
        const spent = items.reduce((sum, ci) => {
          const key = ci.subId ? `${ci.catId}::${ci.subId}` : ci.catId;
          return sum + (spentMap[key] || 0);
        }, 0);
        const pct = b.amount > 0 ? Math.round(spent / b.amount * 100) : 0;
        return { ...b, spent, pct, over: spent > b.amount, _items: items };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4);

    sorted.forEach(b => {
      const displayIcon  = b._items[0]?.emoji || '📦';
      const displayLabel = b._items.length > 1
        ? b._items.map(i => i.label).join('、')
        : (b._items[0]?.label || '未知');
      html += makeTankCard({
        icon: displayIcon,
        label: displayLabel,
        spent: b.spent,
        limit: b.amount,
        pct: Math.min(b.pct, 100),
        over: b.over,
      });
    });

    const extraCount = catBudgets.length - sorted.length;
    if (extraCount > 0) {
      html += `<div class="hb-extra-row">還有 ${extraCount} 項…</div>`;
    }
  }

  html += '</div>';
  homeBudgetContent.innerHTML = html;
}

function matchesSearch(r, kw) {
  if (!kw) return true;
  const q = kw.toLowerCase().trim();
  const fromAccObj = allAccounts.find(a => a.docId === r.transferFromId);
  const toAccObj   = allAccounts.find(a => a.docId === r.transferToId);
  const fields = [
    r.note,
    r.categoryName,
    r.subCategoryName,
    r.accountName,
    r.displayName,
    fromAccObj?.name,
    toAccObj?.name,
  ];
  if (fields.some(f => f && f.toLowerCase().includes(q))) return true;

  // 金額搜尋：去掉千分位／貨幣符號後做數字字串 includes
  const qDigits = q.replace(/[^\d.]/g, '');
  if (qDigits) {
    const amountStrs = [
      String(r.amount ?? ''),
      r.foreignAmount != null ? String(r.foreignAmount) : '',
    ].filter(Boolean);
    if (amountStrs.some(s => s.replace(/[^\d.]/g, '').includes(qDigits))) return true;
  }
  return false;
}

function matchesHomeFilter(r) {
  if (homeFilter.types.length && !homeFilter.types.includes(r.type)) return false;

  if (homeFilter.categoryIds.length) {
    if (r.type === 'transfer') {
      // 有選分類時，轉帳僅在類型有勾選「轉帳」時保留
      if (!homeFilter.types.includes('transfer')) return false;
    } else {
      const catOk = homeFilter.categoryIds.includes(r.categoryId)
        || homeFilter.categoryIds.includes(r.subCategoryId);
      if (!catOk) return false;
    }
  }

  if (homeFilter.accountIds.length) {
    const accIds = [r.accountId, r.transferFromId, r.transferToId].filter(Boolean);
    if (!accIds.some(id => homeFilter.accountIds.includes(id))) return false;
  }

  if (homeFilter.dateFrom || homeFilter.dateTo) {
    if (!r.date) return false;
    if (homeFilter.dateFrom && r.date < homeFilter.dateFrom) return false;
    if (homeFilter.dateTo && r.date > homeFilter.dateTo) return false;
  }
  return true;
}

function renderList() {
  const kw = searchKeyword.trim();
  const hasDateRange = !!(homeFilter.dateFrom || homeFilter.dateTo);

  // 有自訂時間範圍：全資料再依區間；有關鍵字且無日期：跨月；否則當月
  let recs;
  if (hasDateRange) {
    recs = allRecords;
  } else if (kw) {
    recs = allRecords;
  } else {
    recs = getMonthRecords();
  }

  // 更新標題
  if (kw || hasActiveHomeFilter()) {
    const parts = [];
    if (kw) parts.push(`搜尋「${kw}」`);
    if (hasActiveHomeFilter()) parts.push('已篩選');
    listTitle.textContent = `${parts.join('・')}的結果`;
    listTitle.classList.add('searching');
  } else {
    listTitle.textContent = '本月明細';
    listTitle.classList.remove('searching');
  }

  while (recordList.firstChild) recordList.removeChild(recordList.firstChild);

  // 轉帳只保留「轉出」那筆，避免重複顯示
  // 分攤記錄：若付款人不是「我」則不顯示在主頁（屬於別人代墊，在專案頁查看）
  let displayRecs = recs.filter(r => {
    if (r.isSettlement) return true;
    if (r.type === 'transfer') return r.accountId === r.transferFromId;
    if (r.splitPayer && !isCurrentUserSplitPayer(r)) return false;
    return true;
  });

  displayRecs = displayRecs.filter(matchesHomeFilter);
  if (kw) displayRecs = displayRecs.filter(r => matchesSearch(r, kw));

  if (displayRecs.length === 0) {
    recordList.appendChild(emptyState);
    emptyState.style.display = '';
    emptyState.querySelector('p').innerHTML = (kw || hasActiveHomeFilter())
      ? (kw ? `找不到「${kw}」的相關記錄` : '沒有符合篩選條件的記錄')
      : '還沒有記帳喔！<br>點上方按鈕開始記帳吧～';
    return;
  }
  emptyState.style.display = 'none';

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

function getRecordAccountCurrency(r) {
  const acc = r.accountId ? allAccounts.find(a => a.docId === r.accountId) : null;
  return acc?.currency || r.foreignCurrency || null;
}

function isForeignAccountRecord(r) {
  return !!getRecordAccountCurrency(r);
}

function getCurrencyFractionDigits(currency) {
  return FX_ZERO_DECIMAL_CURRENCIES.has(currency || 'TWD') ? 0 : 2;
}

function formatMoneyByCurrency(n, currency = 'TWD') {
  const digits = getCurrencyFractionDigits(currency);
  return Number(n || 0).toLocaleString('zh-TW', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatSignedMoneyByCurrency(n, currency = 'TWD', prefix = '$') {
  const abs = formatMoneyByCurrency(Math.abs(n), currency);
  return n < 0 ? `-${prefix}${abs}` : `${prefix}${abs}`;
}

function getStoredFxRateInfo() {
  return {
    date: fxRatesDate,
    rates: fxRatesToTwd,
    updatedAt: fxRatesUpdatedAt,
  };
}

function saveStoredFxRateInfo(date, rates, updatedAt) {
  fxRatesDate = date;
  fxRatesToTwd = rates;
  fxRatesUpdatedAt = updatedAt;
  try {
    localStorage.setItem(FX_CACHE_KEY, JSON.stringify({ date, rates, updatedAt }));
  } catch (err) {
    console.warn('寫入匯率快取失敗', err);
  }
}

function getTodayKey() {
  return formatDate(new Date());
}

function getLatestFxRate(currency) {
  if (!currency || currency === 'TWD') return 1;
  return fxRatesToTwd[currency] || null;
}

function getFxUpdatedText() {
  if (!fxRatesUpdatedAt) return '';
  const dt = new Date(fxRatesUpdatedAt);
  if (Number.isNaN(dt.getTime())) return '';
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

async function ensureTodayFxRates(force = false) {
  const today = getTodayKey();
  if (!force && fxRatesDate === today && Object.keys(fxRatesToTwd).length) {
    return fxRatesToTwd;
  }
  if (fxRatesPromise) return fxRatesPromise;

  fxRatesPromise = fetch('https://open.er-api.com/v6/latest/TWD')
    .then(async res => {
      if (!res.ok) throw new Error(`FX ${res.status}`);
      const data = await res.json();
      const sourceRates = data?.rates || {};
      const normalized = { TWD: 1 };
      FX_SUPPORTED_CURRENCIES.forEach(currency => {
        const rate = sourceRates[currency];
        if (typeof rate === 'number' && rate > 0) {
          normalized[currency] = 1 / rate;
        }
      });
      saveStoredFxRateInfo(today, normalized, new Date().toISOString());
      return normalized;
    })
    .catch(err => {
      console.warn('取得匯率失敗，改用快取', err);
      if (Object.keys(fxRatesToTwd).length) return fxRatesToTwd;
      throw err;
    })
    .finally(() => {
      fxRatesPromise = null;
    });

  return fxRatesPromise;
}

function getSelectedAccount() {
  return allAccounts.find(a => a.docId === accountSelect.value) || null;
}

function isSelectedForeignAccount() {
  return !!getSelectedAccount()?.currency;
}

function isForeignPrimaryMode(account = getSelectedAccount()) {
  return !!account?.currency && currentType !== 'transfer';
}

function getPrimaryAmountValue() {
  return parseFloat(calcRaw) || parseFloat(amountInput.value) || 0;
}

function updatePrimaryAmountUI() {
  const acc = getSelectedAccount();
  const isForeignPrimary = isForeignPrimaryMode(acc);
  const currency = acc?.currency || 'TWD';
  if (amountLabelEl) {
    amountLabelEl.textContent = isForeignPrimary ? `${currency} 金額` : '金額';
  }
  if (amountCurrencySign) {
    amountCurrencySign.textContent = isForeignPrimary ? currency : '$';
  }
  amountInput.placeholder = isForeignPrimary && !FX_ZERO_DECIMAL_CURRENCIES.has(currency) ? '0.00' : '0';
}

async function getConvertedTwdAmount(currency, foreignAmount) {
  const rates = await ensureTodayFxRates();
  const rateToTwd = rates[currency];
  if (!(rateToTwd > 0)) return null;
  return {
    rateToTwd,
    twdAmount: Math.round(foreignAmount * rateToTwd),
  };
}

function getAccountRecordAmount(account, record) {
  if (record.type === 'transfer') return record.amount || 0;
  if (account?.currency) {
    if (typeof record.foreignAmount === 'number') return record.foreignAmount;
    return record.amount || 0;
  }
  return record.amount || 0;
}

/** 帳戶明細「期間／當日支出」：一般支出；信用卡另含轉出；首頁含所有信用卡轉出 */
function sumAccountPeriodExpense(records, account) {
  let total = records
    .filter(r => r.type === 'expense')
    .reduce((s, r) => s + getAccountRecordAmount(account, r), 0);
  if (account?.typeId === 'credit') {
    total += records
      .filter(r => r.type === 'transfer' && r.transferFromId === account.docId)
      .reduce((s, r) => s + getAccountRecordAmount(account, r), 0);
  } else if (!account) {
    total += records
      .filter(r => isCreditCardTransferOut(r))
      .reduce((s, r) => s + (r.amount || 0), 0);
  }
  return total;
}

function setCalcAmountValue(value, { autoFilled = false, suppressAutoConvert = false } = {}) {
  const normalized = value == null || value === '' ? '' : String(value);
  calcRaw = normalized;
  calcExpr = normalized;
  amountInput.value = normalized;
  calcExpressionEl.textContent = '';
  lastAutoFilledAmount = autoFilled ? normalized : null;
  suppressForeignAutoConvert = suppressAutoConvert;
  handleAmountChanged();
  suppressForeignAutoConvert = false;
}

function markAmountAsManualEdit() {
  lastAutoFilledAmount = null;
}

function scheduleAccountsRefresh() {
  if (!allAccounts.some(a => a.currency)) return;
  ensureTodayFxRates().then(() => {
    renderAccountList();
    if (currentPage === 'accountDetail' && detailAccountId) {
      const acc = allAccounts.find(a => a.docId === detailAccountId);
      if (acc) renderAccountDetail(acc);
    }
  }).catch(() => {});
}

async function maybeAutoConvertForeignIncome(force = false) {
  const acc = getSelectedAccount();
  if (currentType === 'transfer') {
    updateForeignRateHint();
    return;
  }

  const foreignPrimary = isForeignPrimaryMode(acc);
  const currency = foreignPrimary ? acc?.currency : (foreignCurrencyInput.value || '');
  const foreignAmount = foreignPrimary ? getPrimaryAmountValue() : (parseFloat(foreignAmountInput.value) || 0);

  if (!currency || !(foreignAmount > 0)) {
    updateForeignRateHint();
    return;
  }

  try {
    const converted = await getConvertedTwdAmount(currency, foreignAmount);
    if (!converted) {
      updateForeignRateHint({ currency, mode: foreignPrimary ? 'foreign-account' : 'base-account' });
      return;
    }

    if (!foreignPrimary) {
      const currentAmount = amountInput.value.trim();
      const shouldAutofill = force || !currentAmount || (lastAutoFilledAmount != null && currentAmount === lastAutoFilledAmount);
      if (shouldAutofill) {
        setCalcAmountValue(converted.twdAmount, { autoFilled: true, suppressAutoConvert: true });
      }
    }

    updateForeignRateHint({
      currency,
      rateToTwd: converted.rateToTwd,
      twdAmount: converted.twdAmount,
      mode: foreignPrimary ? 'foreign-account' : 'base-account',
    });
  } catch {
    updateForeignRateHint({ currency, mode: foreignPrimary ? 'foreign-account' : 'base-account' });
  }
}

function updateForeignRateHint({ currency = '', rateToTwd = null, twdAmount = null, mode = null } = {}) {
  if (!currency || currency === 'TWD' || !mode) {
    foreignRateHint.style.display = 'none';
    foreignRateHint.textContent = '';
    return;
  }

  const effectiveRate = rateToTwd || getLatestFxRate(currency);
  if (!(effectiveRate > 0)) {
    foreignRateHint.style.display = '';
    foreignRateHint.textContent = `${currency} 匯率暫時取不到，請先手動填寫${mode === 'foreign-account' ? '原幣金額' : '台幣金額'}。`;
    return;
  }

  const updated = getFxUpdatedText();
  const rateText = `1 ${currency} ≈ NT$${effectiveRate.toFixed(4)}`;
  const amountText = twdAmount != null ? `，約 NT$${formatMoney(twdAmount)}` : '';
  const actionText = mode === 'foreign-account'
    ? '外幣帳戶會用原幣記帳，系統自動換算台幣報表金額。'
    : '台幣帳戶可附帶外幣資訊，系統會自動換算台幣，可手動修改。';
  foreignRateHint.style.display = '';
  foreignRateHint.textContent = `${rateText}${amountText}。${actionText}${updated ? ` 匯率更新：${updated}` : ''}`;
}

function syncForeignAccountUI() {
  updatePrimaryAmountUI();

  if (currentType === 'transfer') {
    foreignAmountGroup.style.display = 'none';
    resetForeignAmountUI();
    return;
  }

  const acc = getSelectedAccount();
  const isForeign = !!acc?.currency;
  const foreignPrimary = isForeignPrimaryMode(acc);

  if (foreignPrimary) {
    foreignAmountGroup.style.display = 'none';
    foreignCurrencyInput.value = acc.currency;
    foreignCurrencyInput.disabled = true;
    foreignAmountInput.value = '';
    foreignAmountRow.style.display = 'none';
    foreignToggleLabel.textContent = '＋ 外幣金額';
    if (!getLatestFxRate(acc.currency)) {
      ensureTodayFxRates().then(() => maybeAutoConvertForeignIncome(true)).catch(() => updateForeignRateHint({ currency: acc.currency, mode: 'foreign-account' }));
    } else {
      updateForeignRateHint({ currency: acc.currency, mode: 'foreign-account' });
    }
    return;
  }

  if (currentType === 'income' && !isForeign) {
    foreignAmountGroup.style.display = 'none';
    resetForeignAmountUI({ clearValues: true });
    foreignCurrencyInput.disabled = false;
    return;
  }

  foreignAmountGroup.style.display = '';
  foreignCurrencyInput.disabled = false;
  const shouldKeepOpen = foreignAmountRow.style.display !== 'none' || !!foreignAmountInput.value || !!foreignCurrencyInput.value;
  if (!shouldKeepOpen) {
    resetForeignAmountUI({ clearValues: true });
    return;
  }

  foreignAmountRow.style.display = '';
  foreignToggleLabel.textContent = '− 外幣金額';
  if (foreignCurrencyInput.value) {
    updateForeignRateHint({ currency: foreignCurrencyInput.value, mode: 'base-account' });
  } else {
    updateForeignRateHint();
  }
}

/** 若記錄有外幣，回傳「（USD 100.25）」格式的小字標註，否則回傳空字串 */
function foreignHint(r) {
  const accountCurrency = getRecordAccountCurrency(r);
  if (accountCurrency) {
    const foreignAmt = typeof r.foreignAmount === 'number' ? r.foreignAmount : r.amount;
    return `<span class="foreign-hint">（${accountCurrency} ${formatMoneyByCurrency(foreignAmt, accountCurrency)}）</span>`;
  }
  if (!r.foreignAmount || !r.foreignCurrency) return '';
  return `<span class="foreign-hint">（${r.foreignCurrency} ${formatMoneyByCurrency(r.foreignAmount, r.foreignCurrency)}）</span>`;
}

// ===== 建立記帳卡片（記帳列表 & 帳戶明細共用）=====
function buildRecordItem(r) {
  const item = document.createElement('div');
  item.className = 'record-item-wrapper';

  const content = document.createElement('div');
  content.className = 'record-item record-item-clickable';

  if (isTransferRecord(r)) {
    // 轉帳：顯示「A → B」，金額藍字
    // 優先從 allAccounts 找（即時名稱），找不到則從 displayName 解析，最後才顯示 ?
    const fromAccObj = allAccounts.find(a => a.docId === r.transferFromId);
    const toAccObj   = allAccounts.find(a => a.docId === r.transferToId);
    const parsedTo   = r.displayName?.replace(/^轉帳 → /, '');
    const parsedFrom = r.displayName?.replace(/^轉帳 ← /, '');
    const fromName = fromAccObj?.name || (r.accountId === r.transferFromId ? r.accountName : parsedFrom) || '?';
    const toName   = toAccObj?.name   || (r.accountId === r.transferToId   ? r.accountName : parsedTo)   || '?';
    const metaText = r.note || '無備註';
    content.innerHTML = `
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
    const accLabel  = r.accountId ? (r.accountName || '') : '無';
    const metaText  = [accLabel, r.note].filter(Boolean).join(' · ') || '無備註';
    const dispEmoji = r.displayEmoji || r.categoryEmoji || '📦';
    const dispName  = r.displayName  || r.categoryName  || '其他';
    content.innerHTML = `
      <div class="record-cat-icon ${r.type}-icon">${dispEmoji}</div>
      <div class="record-info">
        <div class="record-cat-name">${dispName}</div>
        <div class="record-meta">${metaText}</div>
      </div>
      <div class="record-right">
        <div class="record-amount-wrap">
          <span class="record-amount ${r.type}">${r.type === 'income' ? '+' : '-'}$${formatMoney(r.amount)}</span>
          ${foreignHint(r)}
        </div>
        <span class="record-edit-hint">›</span>
      </div>
    `;
  }
  
  // 點擊編輯
  content.addEventListener('click', (e) => {
    // 若正在滑動，不觸發點擊
    if (content.dataset.isSwiping === 'true') return;
    openModal(r);
  });

  // 刪除按鈕
  const deleteBtn = document.createElement('div');
  deleteBtn.className = 'record-item-delete';
  deleteBtn.textContent = '刪除';
  deleteBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!canModifyRecord(r)) {
      alert('只有建立這筆記帳的人可以刪除');
      return;
    }
    if (confirm('確定要刪除這筆記錄嗎？')) {
      await deleteRecord(r.docId);
    } else {
      // 取消刪除時，把卡片滑回去
      content.style.transform = 'translateX(0)';
      content.dataset.isSwiped = 'false';
    }
  });

  item.appendChild(deleteBtn);
  item.appendChild(content);

  // 實作滑動刪除邏輯
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isSwiping = false;
  let isVerticalScroll = false;
  const SWIPE_THRESHOLD = 60; // 滑動多少距離才顯示刪除按鈕

  content.addEventListener('touchstart', (e) => {
    // 關閉其他已展開的卡片
    document.querySelectorAll('.record-item[data-is-swiped="true"]').forEach(el => {
      if (el !== content) {
        el.style.transform = 'translateX(0)';
        el.dataset.isSwiped = 'false';
      }
    });

    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    currentX = startX;
    currentY = startY;
    isSwiping = true;
    isVerticalScroll = false;
    content.style.transition = 'none'; // 滑動時取消動畫，讓跟隨手指更順暢
    content.dataset.isSwiping = 'false';
  }, { passive: true });

  content.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    currentX = e.touches[0].clientX;
    currentY = e.touches[0].clientY;
    const diffX = currentX - startX;
    const diffY = currentY - startY;
    
    // 如果垂直滑動距離大於水平滑動，且還沒被判定為水平滑動，則視為頁面滾動
    if (!isVerticalScroll && Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) {
      isVerticalScroll = true;
      content.style.transform = content.dataset.isSwiped === 'true' ? 'translateX(-80px)' : 'translateX(0)';
    }
    
    if (isVerticalScroll) return; // 如果是垂直滾動，就不處理水平滑動
    
    // 如果已經是展開狀態
    if (content.dataset.isSwiped === 'true') {
      if (diffX > 0) { // 往右滑（收起）
        content.dataset.isSwiping = 'true';
        let moveX = -80 + diffX;
        if (moveX > 0) moveX = 0;
        content.style.transform = `translateX(${moveX}px)`;
      }
    } else {
      if (diffX < 0) { // 往左滑（展開）
        content.dataset.isSwiping = 'true';
        let moveX = diffX;
        if (moveX < -100) moveX = -100; // 限制最大滑動距離
        content.style.transform = `translateX(${moveX}px)`;
      }
    }
  }, { passive: true });

  content.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    isSwiping = false;
    content.style.transition = 'transform 0.3s ease, background 0.15s';
    
    if (isVerticalScroll) {
      // 垂直滾動時，恢復原本狀態
      content.style.transform = content.dataset.isSwiped === 'true' ? 'translateX(-80px)' : 'translateX(0)';
      return;
    }

    const diffX = currentX - startX;
    // 如果沒有滑動距離，視為點擊
    if (Math.abs(diffX) < 10) {
      currentX = 0;
      return;
    }

    if (content.dataset.isSwiped === 'true') {
      if (diffX > 30) {
        content.style.transform = 'translateX(0)';
        content.dataset.isSwiped = 'false';
      } else {
        content.style.transform = 'translateX(-80px)';
      }
    } else {
      if (diffX < -SWIPE_THRESHOLD) {
        content.style.transform = 'translateX(-80px)';
        content.dataset.isSwiped = 'true';
      } else {
        content.style.transform = 'translateX(0)';
        content.dataset.isSwiped = 'false';
      }
    }
    currentX = 0;
    
    // 延遲重置 isSwiping 狀態，避免觸發 click
    setTimeout(() => {
      content.dataset.isSwiping = 'false';
    }, 50);
  });

  return item;
}

// ===== 建立日期分組標題（含當日小計）=====
function buildDateHeader(date, dayRecs, account = null, project = null) {
  const summaryCurrency = account?.currency || 'TWD';
  const summaryPrefix = account?.currency ? `${account.currency} ` : '$';
  const inc = project
    ? dayRecs.filter(r => r.type === 'income').reduce((s, r) => s + getProjectRecordTwdAmount(r, project), 0)
    : dayRecs.filter(r => r.type === 'income').reduce((s, r) => s + getAccountRecordAmount(account, r), 0);
  const exp = project
    ? dayRecs.filter(isProjectExpenseLikeRecord).reduce((s, r) => s + getProjectRecordTwdAmount(r, project), 0)
    : sumAccountPeriodExpense(dayRecs, account);

  const header = document.createElement('div');
  header.className = 'date-group-header';

  const dateSpan = document.createElement('span');
  dateSpan.textContent = formatDateDisplay(date);

  const summarySpan = document.createElement('span');
  summarySpan.className = 'date-group-summary';

  const net = inc - exp;
  const netText = net === 0
    ? `${summaryPrefix}${formatMoneyByCurrency(0, summaryCurrency)}`
    : net > 0
      ? `+${summaryPrefix}${formatMoneyByCurrency(net, summaryCurrency)}`
      : `-${summaryPrefix}${formatMoneyByCurrency(Math.abs(net), summaryCurrency)}`;
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

function handleAmountChanged() {
  // 外幣換匯提示
  if (typeof updateExchangeHint === 'function') {
    updateExchangeHint();
  }
  if (!suppressForeignAutoConvert) {
    void maybeAutoConvertForeignIncome();
  }
  // 專案分帳：均分時同步更新各成員金額
  if (splitGroup && splitGroup.style.display !== 'none' && typeof syncEqualAmounts === 'function') {
    syncEqualAmounts();
  }
}

function updateCalcDisplay() {
  amountInput.value   = calcExpr || '';
  calcExpressionEl.textContent = '';
  handleAmountChanged();
}

function calcAppend(val) {
  markAmountAsManualEdit();
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
    handleAmountChanged();
  } catch {
    calcExpressionEl.textContent = '格式錯誤';
    calcExpr = '';
    calcRaw  = '';
    amountInput.value = '';
  }
}

function calcBackspace() {
  markAmountAsManualEdit();
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
  markAmountAsManualEdit();
  calcExpr = '';
  calcRaw  = '';
  calcExpressionEl.textContent = '';
  amountInput.value = '';
  handleAmountChanged();
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

// ===== 報表 =====
let reportYear  = new Date().getFullYear();
let reportMonth = new Date().getMonth();
let reportType  = 'expense';   // 'expense' | 'income'
let reportTab   = 'category';  // 'category' | 'trend'
// drill-down 狀態：null = 主分類層, string = 已選主分類 docId
let reportDrillCatId    = null;
let reportDrillCatColor = '#5B9BD5';
let catView = 'month'; // 'month' | 'year'
let trendMeta = 'expense'; // 'expense' | 'income' | 'balance'
let pieChartInstance = null;
let barChartInstance = null;

// DOM
const reportMonthLabel   = document.getElementById('reportMonthLabel');
const reportPrevMonth    = document.getElementById('reportPrevMonth');
const reportNextMonth    = document.getElementById('reportNextMonth');
const reportTodayBtn     = document.getElementById('reportTodayBtn');
const reportTypeBtnExp   = document.getElementById('reportTypeBtnExpense');
const reportTypeBtnInc   = document.getElementById('reportTypeBtnIncome');
const reportBreadcrumb   = document.getElementById('reportBreadcrumb');
const reportBreadcrumbBack  = document.getElementById('reportBreadcrumbBack');
const reportBreadcrumbLabel = document.getElementById('reportBreadcrumbLabel');
const reportCategoryList = document.getElementById('reportCategoryList');
const categoryChartEmpty = document.getElementById('categoryChartEmpty');
const catViewBtnMonth    = document.getElementById('catViewBtnMonth');
const catViewBtnYear     = document.getElementById('catViewBtnYear');
const reportPeriodBarCat = document.getElementById('reportPeriodBarCat');
const trendYearNav       = document.getElementById('trendYearNav');
const trendYearLabel     = document.getElementById('trendYearLabel');
const trendPrevYearBtn   = document.getElementById('trendPrevYear');
const trendNextYearBtn   = document.getElementById('trendNextYear');
const trendTodayBtn      = document.getElementById('trendTodayBtn');
const trendMetaBtnExpense = document.getElementById('trendMetaBtnExpense');
const trendMetaBtnIncome  = document.getElementById('trendMetaBtnIncome');
const trendMetaBtnBalance = document.getElementById('trendMetaBtnBalance');
const trendMetaBtns = [trendMetaBtnExpense, trendMetaBtnIncome, trendMetaBtnBalance];
const trendYearStats = document.getElementById('trendYearStats');
const trendMonthList = document.getElementById('trendMonthList');
const reportTabCategory  = document.getElementById('reportTabCategory');
const reportTabTrend     = document.getElementById('reportTabTrend');
const reportFilterInfoBtn = document.getElementById('reportFilterInfoBtn');
const reportFilterOverlay = document.getElementById('reportFilterOverlay');
const reportFilterCloseBtn = document.getElementById('reportFilterCloseBtn');
// reportTabWealth 宣告在 renderReportWealth 區塊

// 月份切換
reportPrevMonth.addEventListener('click', () => {
  const isYearView = reportTab === 'trend' || (reportTab === 'category' && catView === 'year');
  if (isYearView) {
    reportYear--;
  } else {
    reportMonth--;
    if (reportMonth < 0) { reportMonth = 11; reportYear--; }
  }
  reportDrillCatId = null;
  renderReport();
});
reportNextMonth.addEventListener('click', () => {
  const isYearView = reportTab === 'trend' || (reportTab === 'category' && catView === 'year');
  if (isYearView) {
    reportYear++;
  } else {
    reportMonth++;
    if (reportMonth > 11) { reportMonth = 0; reportYear++; }
  }
  reportDrillCatId = null;
  renderReport();
});

reportTodayBtn?.addEventListener('click', () => {
  const now = new Date();
  reportYear = now.getFullYear();
  reportMonth = now.getMonth();
  reportDrillCatId = null;
  renderReport();
});

// 支出/收入/結餘切換
[
  [trendMetaBtnExpense, 'expense'],
  [trendMetaBtnIncome,  'income'],
  [trendMetaBtnBalance, 'balance'],
].forEach(([btn, val]) => {
  btn.addEventListener('click', () => {
    trendMeta = val;
    trendMetaBtns.forEach(b => b.classList.toggle('active', b === btn));
    renderReportTrend();
  });
});

// 趨勢年份切換
trendPrevYearBtn.addEventListener('click', () => { reportYear--; renderReport(); });
trendNextYearBtn.addEventListener('click', () => { reportYear++; renderReport(); });
trendTodayBtn?.addEventListener('click', () => {
  reportYear = new Date().getFullYear();
  renderReport();
});

// 報表過濾說明小視窗
if (reportFilterInfoBtn) {
  reportFilterInfoBtn.addEventListener('click', () => { reportFilterOverlay?.classList.add('active'); });
}
if (reportFilterCloseBtn) {
  reportFilterCloseBtn.addEventListener('click', () => { reportFilterOverlay?.classList.remove('active'); });
}
if (reportFilterOverlay) {
  reportFilterOverlay.addEventListener('click', (e) => { if (e.target === reportFilterOverlay) reportFilterOverlay.classList.remove('active'); });
}

// Tab 切換
document.querySelectorAll('.report-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    reportTab = btn.dataset.tab;
    document.querySelectorAll('.report-tab').forEach(b => b.classList.toggle('active', b === btn));
    reportTabCategory.style.display = reportTab === 'category' ? '' : 'none';
    reportTabTrend.style.display    = reportTab === 'trend'    ? '' : 'none';
    if (reportTabWealth) reportTabWealth.style.display = reportTab === 'wealth' ? '' : 'none';
    // 切回類別 tab 時，重設為月模式
    if (reportTab === 'category') {
      catView = 'month';
      catViewBtnMonth.classList.add('active');
      catViewBtnYear.classList.remove('active');
    }
    reportDrillCatId = null;
    if (reportTab === 'wealth') renderReportWealth();
    else renderReport();
  });
});

// 支出/收入切換
reportTypeBtnExp.addEventListener('click', () => {
  reportType = 'expense';
  reportTypeBtnExp.classList.add('active');
  reportTypeBtnInc.classList.remove('active');
  reportDrillCatId = null;
  renderReportCategory();
});
reportTypeBtnInc.addEventListener('click', () => {
  reportType = 'income';
  reportTypeBtnInc.classList.add('active');
  reportTypeBtnExp.classList.remove('active');
  reportDrillCatId = null;
  renderReportCategory();
});

// 月/年切換
catViewBtnMonth.addEventListener('click', () => {
  catView = 'month';
  catViewBtnMonth.classList.add('active');
  catViewBtnYear.classList.remove('active');
  reportDrillCatId = null;
  renderReport();
});
catViewBtnYear.addEventListener('click', () => {
  catView = 'year';
  catViewBtnYear.classList.add('active');
  catViewBtnMonth.classList.remove('active');
  reportDrillCatId = null;
  renderReport();
});

// 返回上一層
reportBreadcrumbBack.addEventListener('click', () => {
  reportDrillCatId = null;
  renderReportCategory();
});

function getMonthRecordsByYM(year, month) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return allRecords.filter(r => {
    if (!r.date?.startsWith(prefix) || r.type === 'transfer') return false;
    // 報表＝主頁明細：別人付款、我有份額的記錄在結清前不會出現在主頁，也不計入報表
    if (r.splitPayer && !isCurrentUserSplitPayer(r) && !r.isSettlement) return false;
    // 報表只排除結清「收入」，結清「支出」仍顯示（方便對帳、看錢花到哪）
    if (r.isSettlement && r.type === 'income') return false;
    return true;
  });
}

/**
 * 取得報表用的「有效金額」。
 * 若記錄有 splitData（分攤），取「我」的份額；
 * 否則回傳原始金額。
 * 帳戶餘額計算仍使用原始金額，只有報表分析使用此函數。
 */
function getReportAmount(r) {
  if (r.splitData && r.splitData.length > 0) {
    const uid = getCurrentUserSplitUid(r);
    if (!uid) return 0;
    return getMemberShareTwd(r, uid, r.projectId ? allProjects.find(p => p.docId === r.projectId) : null);
  }
  return r.amount;
}

function renderReport() {
  if (reportTab === 'wealth') { renderReportWealth(); return; }
  const now = new Date();
  const isYearView = reportTab === 'trend' || (reportTab === 'category' && catView === 'year');
  if (isYearView) {
    reportMonthLabel.textContent = `${reportYear} 年`;
  } else {
    reportMonthLabel.textContent = `${reportYear} 年 ${reportMonth + 1} 月`;
  }
  // 月份列只在類別分析 Tab 顯示
  if (reportPeriodBarCat) {
    reportPeriodBarCat.style.display = reportTab === 'category' ? '' : 'none';
  }
  if (reportTodayBtn && reportTab === 'category') {
    const isCurrent = isYearView
      ? reportYear === now.getFullYear()
      : (reportYear === now.getFullYear() && reportMonth === now.getMonth());
    reportTodayBtn.textContent = isYearView ? '今年' : '今天';
    reportTodayBtn.style.display = isCurrent ? 'none' : '';
  }
  // 年份列只在趨勢 Tab 顯示
  if (trendYearNav) {
    trendYearNav.style.display = reportTab === 'trend' ? '' : 'none';
    trendYearLabel.textContent = `${reportYear} 年`;
  }
  if (trendTodayBtn && reportTab === 'trend') {
    trendTodayBtn.style.display = reportYear === now.getFullYear() ? 'none' : '';
  }
  if (reportTab === 'category') renderReportCategory();
  else renderReportTrend();
}

// ===== 類別分析 =====
function getCatViewRecords() {
  if (catView === 'year') {
    const prefix = `${reportYear}-`;
    return allRecords.filter(r => {
      if (!r.date?.startsWith(prefix) || r.type === 'transfer') return false;
      if (r.splitPayer && !isCurrentUserSplitPayer(r) && !r.isSettlement) return false;
      if (r.isSettlement && r.type === 'income') return false;
      return true;
    });
  }
  return getMonthRecordsByYM(reportYear, reportMonth);
}

function renderReportCategory() {
  const recs = getCatViewRecords().filter(r => r.type === reportType);
  const total = recs.reduce((s, r) => s + getReportAmount(r), 0);

  // 更新麵包屑
  if (reportDrillCatId) {
    const cat = allCategories.find(c => c.docId === reportDrillCatId);
    reportBreadcrumb.style.display = '';
    reportBreadcrumbLabel.textContent = cat ? `${cat.emoji} ${cat.name}` : '';
  } else {
    reportBreadcrumb.style.display = 'none';
  }

  if (reportDrillCatId) {
    renderDrillDown(recs, total);
  } else {
    renderMainCategories(recs, total);
  }
}

function renderMainCategories(recs, total) {
  // 依主分類彙總
  const catMap = {};
  recs.forEach(r => {
    const key = r.categoryId || '__none__';
    if (!catMap[key]) {
      catMap[key] = {
        id: key,
        name: r.categoryName || '未分類',
        emoji: r.categoryEmoji || '📦',
        amount: 0,
      };
    }
    catMap[key].amount += getReportAmount(r);
  });

  const cats = Object.values(catMap).sort((a, b) => b.amount - a.amount);

  // 圓餅圖
  renderPieChart(cats, total);

  // 列表
  reportCategoryList.innerHTML = '';
  if (cats.length === 0) return;

  cats.forEach((cat, idx) => {
    const pct   = total > 0 ? Math.round(cat.amount / total * 100) : 0;
    const color = PIE_COLORS[idx % PIE_COLORS.length];
    const hasSubs = allCategories.find(c => c.docId === cat.id)?.subs?.length > 0;
    const item = document.createElement('div');
    item.className = `report-cat-item ${reportType}${hasSubs ? '' : ' no-drill'}`;
    item.innerHTML = `
      <div class="report-cat-emoji" style="background:${color}22;color:${color}">${cat.emoji}</div>
      <div class="report-cat-info">
        <div class="report-cat-top">
          <div class="report-cat-name">${cat.name}</div>
          <div class="report-cat-amount ${reportType}">NT$ ${formatMoney(cat.amount)}</div>
        </div>
        <div class="report-cat-bar-wrap">
          <div class="report-cat-bar" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>
      <div class="report-cat-percent">${pct}%</div>
      ${hasSubs || cat.id !== '__none__' ? '<div class="report-cat-arrow">›</div>' : ''}
    `;
    if (cat.id !== '__none__') {
      item.addEventListener('click', () => {
        reportDrillCatId    = cat.id;
        reportDrillCatColor = color;
        renderReportCategory();
      });
    }
    reportCategoryList.appendChild(item);
  });
}

function renderDrillDown(recs, totalAll) {
  const catRecs = recs.filter(r => r.categoryId === reportDrillCatId);
  const catTotal = catRecs.reduce((s, r) => s + getReportAmount(r), 0);

  // 依子分類彙總
  const subMap = {};
  catRecs.forEach(r => {
    const key = r.subCategoryId || '__none__';
    if (!subMap[key]) {
      subMap[key] = {
        id: key,
        name: r.subCategoryName || r.categoryName || '其他',
        amount: 0,
        records: [],
      };
    }
    subMap[key].amount += getReportAmount(r);
    subMap[key].records.push(r);
  });

  const subs = Object.values(subMap).sort((a, b) => b.amount - a.amount);
  const cat  = allCategories.find(c => c.docId === reportDrillCatId);

  // 圓餅圖（子分類）
  renderPieChart(subs.map(s => ({ ...s, emoji: cat?.emoji || '📦' })), catTotal);

  reportCategoryList.innerHTML = '';

  if (subs.length === 0) return;

  // 若只有一個子分類（或無子分類），直接顯示明細
  const showDirectRecords = subs.length === 1 && subs[0].id === '__none__';

  if (showDirectRecords) {
    renderRecordItems(catRecs);
    return;
  }

  subs.forEach((sub, idx) => {
    const pct   = catTotal > 0 ? Math.round(sub.amount / catTotal * 100) : 0;
    const color = PIE_COLORS[idx % PIE_COLORS.length];
    const item  = document.createElement('div');
    item.className = `report-cat-item ${reportType}`;
    item.innerHTML = `
      <div class="report-cat-emoji" style="background:${color}22;color:${color}">${sub.emoji || cat?.emoji || '📦'}</div>
      <div class="report-cat-info">
        <div class="report-cat-top">
          <div class="report-cat-name">${sub.name}</div>
          <div class="report-cat-amount ${reportType}">NT$ ${formatMoney(sub.amount)}</div>
        </div>
        <div class="report-cat-bar-wrap">
          <div class="report-cat-bar" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>
      <div class="report-cat-percent">${pct}%</div>
      <div class="report-cat-arrow">›</div>
    `;
    item.addEventListener('click', () => {
      // 展開該子分類的明細
      renderSubRecordDetail(item, sub.records, sub.name);
    });
    reportCategoryList.appendChild(item);
  });
}

function renderSubRecordDetail(parentItem, records, subName) {
  // 移除舊的展開區塊
  const existing = parentItem.nextElementSibling;
  if (existing?.classList.contains('report-sub-detail')) {
    existing.remove();
    parentItem.querySelector('.report-cat-arrow').textContent = '›';
    return;
  }
  // 收起其他展開的
  document.querySelectorAll('.report-sub-detail').forEach(el => el.remove());
  document.querySelectorAll('.report-cat-arrow').forEach(el => el.textContent = '›');

  parentItem.querySelector('.report-cat-arrow').textContent = '‹';
  const wrap = document.createElement('div');
  wrap.className = 'report-sub-detail';
  records.sort((a, b) => b.date.localeCompare(a.date)).forEach(r => {
    const effAmt = getReportAmount(r);
    const splitHint = effAmt !== r.amount ? `<span class="report-split-hint">（全額 $${formatMoney(r.amount)}）</span>` : '';
    const el = document.createElement('div');
    el.className = 'report-record-item';
    el.innerHTML = `
      <div class="report-record-date">${r.date.slice(5)}</div>
      <div class="report-record-note">${r.note || r.displayName || r.categoryName || '—'}${splitHint}</div>
      <div class="report-record-amount-wrap">
        <div class="report-record-amount ${r.type}">$${formatMoney(effAmt)}</div>
        ${foreignHint(r)}
      </div>
    `;
    wrap.appendChild(el);
  });
  parentItem.after(wrap);
}

function renderRecordItems(records) {
  records.sort((a, b) => b.date.localeCompare(a.date)).forEach(r => {
    const effAmt = getReportAmount(r);
    const splitHint = effAmt !== r.amount ? `<span class="report-split-hint">（全額 $${formatMoney(r.amount)}）</span>` : '';
    const el = document.createElement('div');
    el.className = 'report-record-item';
    el.innerHTML = `
      <div class="report-record-date">${r.date.slice(5)}</div>
      <div class="report-record-note">${r.note || r.displayName || r.categoryName || '—'}${splitHint}</div>
      <div class="report-record-amount-wrap">
        <div class="report-record-amount ${r.type}">$${formatMoney(effAmt)}</div>
        ${foreignHint(r)}
      </div>
    `;
    reportCategoryList.appendChild(el);
  });
}

// ===== 圓餅圖 =====
const PIE_COLORS = [
  '#4E8F7C','#38A884','#F27D6D','#86B7E8','#FFD5C7',
  '#7BA89A','#5CB89A','#E8A090','#A8C8E8','#E8C4B0',
  '#6B9E8C','#4DBA90','#D98B7C','#9BBFE0','#C9A090',
];

// 圓餅圖：圖例點選會切換各筆資料的可見性；加總須排除已隱藏扇形（Chart.getDataVisibility）
function getDoughnutVisibleDataTotal(chart) {
  const ds = chart.data.datasets[0];
  if (!ds?.data?.length) return 0;
  let sum = 0;
  ds.data.forEach((val, i) => {
    if (chart.getDataVisibility(i) !== false) sum += Number(val) || 0;
  });
  return sum;
}

// 圓餅圖中間顯示總額的 plugin
const doughnutCenterPlugin = {
  id: 'doughnutCenter',
  afterDraw(chart) {
    if (chart.config.type !== 'doughnut') return;
    const { ctx, chartArea: { left, right, top, bottom } } = chart;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const total = getDoughnutVisibleDataTotal(chart);
    const label = chart.config.options.plugins?.doughnutCenter?.label ?? '';

    ctx.save();
    // 標籤（小字）
    ctx.font = '500 12px system-ui, sans-serif';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, cy - 12);
    // 金額（大字）
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillStyle = '#333';
    ctx.fillText(`$${formatMoney(total)}`, cx, cy + 8);
    ctx.restore();
  },
};
Chart.register(doughnutCenterPlugin);

function renderPieChart(items, total) {
  categoryChartEmpty.style.display = items.length === 0 ? '' : 'none';

  if (pieChartInstance) { pieChartInstance.destroy(); pieChartInstance = null; }
  if (items.length === 0) return;

  const centerLabel = reportType === 'expense' ? '總支出' : '總收入';
  const ctx = document.getElementById('categoryPieChart').getContext('2d');
  pieChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: items.map(c => c.name),
      datasets: [{
        data: items.map(c => c.amount),
        backgroundColor: PIE_COLORS.slice(0, items.length),
        borderWidth: 2,
        borderColor: '#fff',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '62%',
      plugins: {
        legend: { position: 'right', labels: { font: { size: 12 }, boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const visTotal = getDoughnutVisibleDataTotal(ctx.chart);
              const pct = visTotal > 0 ? Math.round(ctx.parsed / visTotal * 100) : 0;
              return ` $${formatMoney(ctx.parsed)}（${pct}%）`;
            },
          },
        },
        doughnutCenter: { total, label: centerLabel },
      },
    },
  });
}

// ===== 收支趨勢 =====
function renderReportTrend() {
  // 12 個月資料
  const monthData = Array.from({ length: 12 }, (_, m) => {
    const recs    = getMonthRecordsByYM(reportYear, m).filter(r => r.type !== 'transfer');
    const income  = recs.filter(r => r.type === 'income').reduce((s, r) => s + getReportAmount(r), 0);
    const expense = recs.filter(r => r.type === 'expense').reduce((s, r) => s + getReportAmount(r), 0);
    return { month: m, income, expense, balance: income - expense, recs };
  });

  const labels   = monthData.map(d => `${d.month + 1}月`);
  const incomes  = monthData.map(d => d.income);
  const expenses = monthData.map(d => d.expense);
  const balances = monthData.map(d => d.balance);

  // 長條圖
  buildBarChart(labels, incomes, expenses, balances);

  // 年統計
  renderTrendYearStats(incomes, expenses, balances);

  // 月份明細列表
  renderTrendMonthList(monthData);
}

function buildBarChart(labels, incomes, expenses, balances) {
  if (barChartInstance) { barChartInstance.destroy(); barChartInstance = null; }
  const ctx = document.getElementById('trendBarChart').getContext('2d');

  let datasets = [];
  if (trendMeta === 'income') {
    datasets = [{ label: '收入', data: incomes, backgroundColor: 'rgba(46,204,113,0.75)', borderRadius: 4 }];
  } else if (trendMeta === 'expense') {
    datasets = [{ label: '支出', data: expenses.map(v => -v), backgroundColor: 'rgba(231,76,60,0.75)', borderRadius: 4 }];
  } else {
    // balance：正綠負紅
    datasets = [{
      label: '結餘',
      data: balances,
      backgroundColor: balances.map(v => v >= 0 ? 'rgba(46,204,113,0.75)' : 'rgba(231,76,60,0.75)'),
      borderRadius: 4,
    }];
  }

  const yTickFmt = v => {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(1)}萬`;
    if (abs >= 1000)  return `${sign}${(abs / 1000).toFixed(0)}k`;
    return v;
  };

  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => {
              const v = c.parsed.y;
              return ` ${v < 0 ? '-' : '+'}$${formatMoney(Math.abs(v))}`;
            },
          },
        },
      },
      scales: {
        y: {
          ticks: { callback: yTickFmt, font: { size: 11 } },
          grid: { color: c => c.tick.value === 0 ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' },
        },
        x: { ticks: { font: { size: 12 } } },
      },
    },
  });
}

function renderTrendYearStats(incomes, expenses, balances) {
  const totalInc = incomes.reduce((s, v) => s + v, 0);
  const totalExp = expenses.reduce((s, v) => s + v, 0);
  const totalBal = totalInc - totalExp;
  const balClass = totalBal >= 0 ? 'positive' : 'negative';

  trendYearStats.innerHTML = `
    <div class="trend-year-stats-title">${reportYear} 年統計</div>
    <div class="trend-year-stats-row">
      <div class="trend-year-stat-item">
        <div class="trend-year-stat-label">年收入</div>
        <div class="trend-year-stat-val income">+$${formatMoney(totalInc)}</div>
      </div>
      <div class="trend-year-stat-item">
        <div class="trend-year-stat-label">年支出</div>
        <div class="trend-year-stat-val expense">-$${formatMoney(totalExp)}</div>
      </div>
      <div class="trend-year-stat-item">
        <div class="trend-year-stat-label">年結餘</div>
        <div class="trend-year-stat-val balance ${balClass}">${totalBal >= 0 ? '+' : ''}$${formatMoney(Math.abs(totalBal))}</div>
      </div>
    </div>
  `;
}

// 月份列表（可展開明細）
function renderTrendMonthList(monthData) {
  trendMonthList.innerHTML = '';
  monthData.forEach(({ month, income, expense, balance, recs }) => {
    if (income === 0 && expense === 0) return; // 無資料月份略過

    const balClass = balance >= 0 ? 'positive' : 'negative';
    const row = document.createElement('div');
    row.className = 'trend-month-row';

    let mainVal = '';
    if (trendMeta === 'income')  mainVal = `<span class="trend-month-val income">+$${formatMoney(income)}</span>`;
    else if (trendMeta === 'expense') mainVal = `<span class="trend-month-val expense">-$${formatMoney(expense)}</span>`;
    else mainVal = `<span class="trend-month-val balance ${balClass}">${balance >= 0 ? '+' : ''}$${formatMoney(Math.abs(balance))}</span>`;

    row.innerHTML = `
      <div class="trend-month-header">
        <span class="trend-month-label">${reportYear} 年 ${month + 1} 月</span>
        <div class="trend-month-right">
          ${mainVal}
          <span class="trend-month-arrow">›</span>
        </div>
      </div>
      <div class="trend-month-detail" style="display:none"></div>
    `;

    const header = row.querySelector('.trend-month-header');
    const detail = row.querySelector('.trend-month-detail');
    const arrow  = row.querySelector('.trend-month-arrow');

    header.addEventListener('click', () => {
      const open = detail.style.display !== 'none';
      if (open) {
        detail.style.display = 'none';
        arrow.textContent = '›';
        return;
      }
      // 渲染明細
      detail.innerHTML = '';
      // 篩選依 trendMeta
      const filtered = trendMeta === 'income'  ? recs.filter(r => r.type === 'income')
                      : trendMeta === 'expense' ? recs.filter(r => r.type === 'expense')
                      : recs;
      if (filtered.length === 0) {
        detail.innerHTML = '<div class="trend-detail-empty">無資料</div>';
      } else {
        filtered.sort((a, b) => b.date.localeCompare(a.date)).forEach(r => {
          const effAmt = getReportAmount(r);
          const splitHint = effAmt !== r.amount ? ` <span class="report-split-hint">（全額 $${formatMoney(r.amount)}）</span>` : '';
          const el = document.createElement('div');
          el.className = 'report-record-item';
          const dispName = r.displayName || r.categoryName || '—';
          el.innerHTML = `
            <div class="report-record-date">${r.date.slice(5)}</div>
            <div class="report-record-note">${dispName}${r.note ? ' · ' + r.note : ''}${splitHint}</div>
            <div class="report-record-amount-wrap">
              <div class="report-record-amount ${r.type}">${r.type === 'income' ? '+' : '-'}$${formatMoney(effAmt)}</div>
              ${foreignHint(r)}
            </div>
          `;
          detail.appendChild(el);
        });
      }
      detail.style.display = '';
      arrow.textContent = '‹';
    });

    trendMonthList.appendChild(row);
  });
}

// ===== 資產曲線 =====
let wealthLineChartInstance = null;
let wealthRange = 6; // 6 | 12 | 0(全部)

const wealthLineChartEl = document.getElementById('wealthLineChart');
const wealthChartEmpty  = document.getElementById('wealthChartEmpty');
const wealthSummary     = document.getElementById('wealthSummary');
const wealthMonthList   = document.getElementById('wealthMonthList');
const wealthRange6Btn   = document.getElementById('wealthRange6');
const wealthRange12Btn  = document.getElementById('wealthRange12');
const wealthRangeAllBtn = document.getElementById('wealthRangeAll');
const reportTabWealth   = document.getElementById('reportTabWealth');

[
  [wealthRange6Btn,   6],
  [wealthRange12Btn, 12],
  [wealthRangeAllBtn, 0],
].forEach(([btn, val]) => {
  btn.addEventListener('click', () => {
    wealthRange = val;
    [wealthRange6Btn, wealthRange12Btn, wealthRangeAllBtn].forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderReportWealth();
  });
});

/**
 * 計算每個月底的淨資產快照。
 * 淨資產 = Σ 帳戶初始餘額 + 截至該月底所有收入 - 所有支出
 * 轉帳不影響總資產，信用卡/貸款負餘額算負債。
 */
function calcWealthSnapshots() {
  if (!allRecords.length && !allAccounts.length) return [];

  const LIABILITY_TYPES = ['credit', 'loan'];

  // 所有帳戶初始餘額加總（視帳戶類型決定正負）
  const initialTotal = allAccounts.reduce((sum, a) => {
    if (a.currency) return sum;
    const init = a.balance || 0;
    if (LIABILITY_TYPES.includes(a.typeId)) {
      return sum + (init < 0 ? init : init); // 信用卡初始餘額直接加（通常為0）
    }
    return sum + init;
  }, 0);

  // 找出最早和最晚的記錄日期
  const nonTransfer = allRecords.filter(r => r.type !== 'transfer' && r.date && !isForeignAccountRecord(r));
  if (nonTransfer.length === 0) return [];

  const sortedDates = nonTransfer.map(r => r.date).sort();
  const firstDate = new Date(sortedDates[0]);
  const now = new Date();

  // 產生月份序列（從第一筆記錄的月份到當前月份）
  const months = [];
  let cur = new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  while (cur <= end) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() });
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
  }

  // 計算每月底累積收支
  const snapshots = months.map(({ year, month }) => {
    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-31`;
    const recs = nonTransfer.filter(r => r.date <= monthEnd);
    const totalInc = recs.filter(r => r.type === 'income').reduce((s, r) => s + getReportAmount(r), 0);
    const totalExp = recs.filter(r => r.type === 'expense').reduce((s, r) => s + getReportAmount(r), 0);

    // 當月收支
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthRecs = nonTransfer.filter(r => r.date?.startsWith(prefix));
    const monthInc = monthRecs.filter(r => r.type === 'income').reduce((s, r) => s + getReportAmount(r), 0);
    const monthExp = monthRecs.filter(r => r.type === 'expense').reduce((s, r) => s + getReportAmount(r), 0);

    return {
      year, month,
      wealth: initialTotal + totalInc - totalExp,
      monthInc, monthExp,
      monthBalance: monthInc - monthExp,
    };
  });

  return snapshots;
}

function renderReportWealth() {
  const allSnapshots = calcWealthSnapshots();

  if (allSnapshots.length === 0) {
    wealthChartEmpty.style.display = '';
    if (wealthLineChartInstance) { wealthLineChartInstance.destroy(); wealthLineChartInstance = null; }
    wealthSummary.innerHTML = '';
    wealthMonthList.innerHTML = '';
    return;
  }
  wealthChartEmpty.style.display = 'none';

  // 依範圍裁切
  let snapshots = allSnapshots;
  if (wealthRange > 0) {
    snapshots = allSnapshots.slice(-wealthRange);
  }

  const labels  = snapshots.map(s => `${s.year}-${String(s.month + 1).padStart(2, '0')}`);
  const values  = snapshots.map(s => s.wealth);

  // 判斷整體趨勢顏色
  const first = values[0];
  const last  = values[values.length - 1];
  const trendColor = last >= first ? '#27ae60' : '#e74c3c';
  const trendColorAlpha = last >= first ? 'rgba(39,174,96,0.12)' : 'rgba(231,76,60,0.12)';

  // 折線圖
  if (wealthLineChartInstance) { wealthLineChartInstance.destroy(); wealthLineChartInstance = null; }
  const ctx = wealthLineChartEl.getContext('2d');

  // 漸層填充
  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, last >= first ? 'rgba(39,174,96,0.3)' : 'rgba(231,76,60,0.3)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  const yTickFmt = v => {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 100000000) return `${sign}${(abs / 100000000).toFixed(1)}億`;
    if (abs >= 10000)  return `${sign}${(abs / 10000).toFixed(1)}萬`;
    if (abs >= 1000)   return `${sign}${(abs / 1000).toFixed(0)}k`;
    return `${sign}${abs}`;
  };

  wealthLineChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '淨資產',
        data: values,
        borderColor: trendColor,
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointRadius: snapshots.length <= 12 ? 4 : 2,
        pointHoverRadius: 6,
        pointBackgroundColor: trendColor,
        fill: true,
        tension: 0.35,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => ` 淨資產：$${formatMoney(Math.round(c.parsed.y))}`,
          },
        },
      },
      scales: {
        y: {
          ticks: { callback: yTickFmt, font: { size: 11 } },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        x: {
          ticks: {
            font: { size: 10 },
            maxTicksLimit: 8,
            maxRotation: 30,
          },
        },
      },
    },
  });

  // 統計摘要
  const maxWealth = Math.max(...values);
  const minWealth = Math.min(...values);
  const change    = last - first;
  const changeClass = change >= 0 ? 'income' : 'expense';
  const changeSign  = change >= 0 ? '+' : '';

  wealthSummary.innerHTML = `
    <div class="wealth-summary-title">資產概覽</div>
    <div class="wealth-summary-row">
      <div class="wealth-summary-item">
        <div class="wealth-summary-label">目前淨資產</div>
        <div class="wealth-summary-val" style="color:${trendColor}">$${formatMoney(Math.round(last))}</div>
      </div>
      <div class="wealth-summary-item">
        <div class="wealth-summary-label">期間變化</div>
        <div class="wealth-summary-val ${changeClass}">${changeSign}$${formatMoney(Math.round(Math.abs(change)))}</div>
      </div>
      <div class="wealth-summary-item">
        <div class="wealth-summary-label">最高</div>
        <div class="wealth-summary-val">$${formatMoney(Math.round(maxWealth))}</div>
      </div>
      <div class="wealth-summary-item">
        <div class="wealth-summary-label">最低</div>
        <div class="wealth-summary-val">$${formatMoney(Math.round(minWealth))}</div>
      </div>
    </div>
  `;

  // 月份明細列表（倒序）
  wealthMonthList.innerHTML = '';
  [...snapshots].reverse().forEach((s, idx) => {
    const balClass = s.monthBalance >= 0 ? 'positive' : 'negative';
    const row = document.createElement('div');
    row.className = 'wealth-month-row';
    row.innerHTML = `
      <div class="wealth-month-header">
        <span class="wealth-month-label">${s.year} 年 ${s.month + 1} 月</span>
        <div class="wealth-month-right">
          <span class="wealth-month-net">$${formatMoney(Math.round(s.wealth))}</span>
          <span class="wealth-month-delta ${balClass}">${s.monthBalance >= 0 ? '+' : ''}$${formatMoney(Math.round(Math.abs(s.monthBalance)))}</span>
        </div>
      </div>
      <div class="wealth-month-sub">
        <span class="wealth-sub-inc">收 +$${formatMoney(Math.round(s.monthInc))}</span>
        <span class="wealth-sub-exp">支 -$${formatMoney(Math.round(s.monthExp))}</span>
      </div>
    `;
    wealthMonthList.appendChild(row);
  });
}

// ===== 語音記帳 =====
(function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    voiceBtn.style.display = 'none';
    return;
  }

  const recog = new SpeechRecognition();
  recog.lang = 'zh-TW';
  recog.interimResults = false;
  recog.maxAlternatives = 1;

  let listening  = false;
  let cancelled  = false;

  function showToast(msg) {
    voiceToastText.textContent = msg;
    voiceToast.style.display = '';
  }
  function hideToast() {
    voiceToast.style.display = 'none';
  }

  // ── 中文數字轉阿拉伯數字 ──
  function chineseToNumber(str) {
    const unitMap = { 十: 10, 百: 100, 千: 1000, 萬: 10000, 億: 100000000 };
    const digitMap = { 零: 0, 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5,
                       六: 6, 七: 7, 八: 8, 九: 9 };
    // 先嘗試直接解析阿拉伯數字
    const direct = parseInt(str.replace(/,/g, ''), 10);
    if (!isNaN(direct)) return direct;

    let result = 0;
    let section = 0;
    let current = 0;
    let hasUnit = false;

    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (digitMap[ch] !== undefined) {
        current = digitMap[ch];
        hasUnit = false;
      } else if (unitMap[ch]) {
        const unit = unitMap[ch];
        if (unit === 10 && current === 0 && i === 0) current = 1; // 「十」開頭視為「一十」
        if (unit >= 10000) {
          section = (section + current) * unit;
          result += section;
          section = 0;
        } else {
          section += current * unit;
        }
        current = 0;
        hasUnit = true;
      }
    }
    result += section + current;
    return result || NaN;
  }

  // ── 解析語音文字 ──
  function parseVoiceText(text) {
    text = text.trim();
    const result = { type: 'expense', amount: null, categoryKeyword: '', note: '', date: null, accountId: null };

    // 收入關鍵字
    if (/收入|薪水|薪資|獎金|紅包|退款|退費/.test(text)) {
      result.type = 'income';
    }

    // 日期解析（用本地時間，避免 UTC 時差）
    const today = new Date();
    const localToday = toDateStr(today);
    if (/昨天/.test(text)) {
      const d = new Date(today); d.setDate(d.getDate() - 1);
      result.date = toDateStr(d);
      text = text.replace(/昨天/, '');
    } else if (/前天/.test(text)) {
      const d = new Date(today); d.setDate(d.getDate() - 2);
      result.date = toDateStr(d);
      text = text.replace(/前天/, '');
    } else if (/今天/.test(text)) {
      result.date = localToday;
      text = text.replace(/今天/, '');
    } else {
      // 幾月幾號 / 幾號
      const dateMatch = text.match(/(\d{1,2})月(\d{1,2})號?/) || text.match(/(\d{1,2})號/);
      if (dateMatch) {
        const month = dateMatch[2] ? parseInt(dateMatch[1]) - 1 : today.getMonth();
        const day   = dateMatch[2] ? parseInt(dateMatch[2]) : parseInt(dateMatch[1]);
        const d = new Date(today.getFullYear(), month, day);
        result.date = toDateStr(d);
        text = text.replace(dateMatch[0], '');
      }
    }

    // 帳戶辨識（用帳戶名稱比對）
    for (const acc of allAccounts) {
      if (text.includes(acc.name)) {
        result.accountId = acc.docId;
        text = text.replace(acc.name, '');
        break;
      }
    }

    // 金額解析（支援：200、兩百、200元、兩百塊、200塊錢）
    const amtPatterns = [
      /([0-9,]+)\s*(?:元|塊錢|塊|円)?/,
      /([零一二兩三四五六七八九十百千萬億]+)\s*(?:元|塊錢|塊|円)?/,
    ];
    for (const pat of amtPatterns) {
      const m = text.match(pat);
      if (m) {
        const num = chineseToNumber(m[1]);
        if (!isNaN(num) && num > 0) {
          result.amount = num;
          text = text.replace(m[0], ' ');
          break;
        }
      }
    }

    // 剩餘文字作為分類關鍵字 + 備註
    result.categoryKeyword = text.replace(/\s+/g, ' ').trim();
    return result;
  }

  // ── 依關鍵字找最符合的分類 ──
  function findCategory(keyword, type) {
    if (!keyword) return null;
    const cats = allCategories.filter(c => c.type === type && !c.parentId);
    // 先找子分類完全符合
    for (const cat of cats) {
      for (const sub of (cat.subs || [])) {
        if (keyword.includes(sub.name)) return { parent: cat, sub };
      }
    }
    // 再找主分類
    for (const cat of cats) {
      if (keyword.includes(cat.name)) return { parent: cat, sub: null };
    }
    // 模糊：分類名稱包含在關鍵字裡，或關鍵字包含在分類名稱裡
    for (const cat of cats) {
      if (cat.name.split('').some(ch => keyword.includes(ch))) {
        return { parent: cat, sub: null };
      }
    }
    return null;
  }

  // ── 將解析結果填入表單 ──
  function fillForm(parsed) {
    openModal();
    switchType(parsed.type);

    // 金額
    if (parsed.amount) {
      const val = String(parsed.amount);
      calcRaw  = val;
      calcExpr = val;
      amountInput.value = val;
      calcExpressionEl.textContent = '';
    }

    // 日期
    if (parsed.date) {
      dateInput.value = parsed.date;
    }

    // 帳戶
    if (parsed.accountId) {
      accountSelect.value = parsed.accountId;
    }

    // 分類
    const found = findCategory(parsed.categoryKeyword, parsed.type);
    if (found) {
      selectedCategory    = found.parent.docId;
      selectedSubCategory = found.sub ? found.sub.docId : null;
      updateCatPickBtn(found.parent, found.sub);
      // 把分類名稱從備註關鍵字移除，剩餘當備註
      let note = parsed.categoryKeyword
        .replace(found.parent.name, '')
        .replace(found.sub?.name || '', '')
        .trim();
      noteInput.value = note;
    } else {
      noteInput.value = parsed.categoryKeyword;
    }
  }

  // ── 語音辨識事件 ──
  recog.onstart = () => {
    listening = true;
    cancelled = false;
    voiceBtn.classList.add('listening');
    showToast('聆聽中… 再按一次取消');
  };

  recog.onresult = (e) => {
    if (cancelled) return;
    const text = e.results[0][0].transcript;
    showToast(`「${text}」`);
    setTimeout(() => {
      hideToast();
      const parsed = parseVoiceText(text);
      if (!parsed.amount) {
        showToast('沒聽到金額，請再試一次');
        setTimeout(hideToast, 2500);
        return;
      }
      fillForm(parsed);
    }, 800);
  };

  recog.onerror = (e) => {
    if (cancelled) { hideToast(); return; }
    const msg = e.error === 'not-allowed' ? '請允許麥克風權限'
              : e.error === 'no-speech'   ? '沒有偵測到聲音'
              : '辨識失敗，請再試一次';
    showToast(msg);
    setTimeout(hideToast, 2500);
  };

  recog.onend = () => {
    listening = false;
    voiceBtn.classList.remove('listening');
    if (cancelled) hideToast();
  };

  voiceBtn.addEventListener('click', () => {
    if (listening) {
      cancelled = true;
      recog.stop();
      showToast('已取消');
      setTimeout(hideToast, 1200);
    } else {
      try { recog.start(); } catch { /* 已在執行中 */ }
    }
  });
})();

// 點擊卡片以外的地方時，收起所有已展開的滑動刪除卡片
document.addEventListener('touchstart', (e) => {
  // 如果點擊的目標不是在 record-item-wrapper 內，就收起所有卡片
  if (!e.target.closest('.record-item-wrapper')) {
    document.querySelectorAll('.record-item[data-is-swiped="true"]').forEach(el => {
      el.style.transform = 'translateX(0)';
      el.dataset.isSwiped = 'false';
    });
  }
}, { passive: true });

// PWA：註冊 Service Worker（與 app.js 同目錄，子路徑部署時可正確範圍）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('sw.js', import.meta.url);
    const scope = new URL('./', import.meta.url);
    navigator.serviceWorker.register(swUrl, { scope }).catch(() => {});
  });
}
