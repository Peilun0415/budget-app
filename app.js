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
let splitMode      = 'equal'; // 'equal' | 'custom'
let tempRewardActivities = []; // 專案 modal 中暫存的回饋活動
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

// ===== DOM — 通用 =====
const loginScreen    = document.getElementById('loginScreen');
const appScreen      = document.getElementById('appScreen');
const googleLoginBtn  = document.getElementById('googleLoginBtn');
const logoutBtn       = document.getElementById('logoutBtn');
const userAvatar      = document.getElementById('userAvatar');
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
const saveTplBtn    = document.getElementById('saveTplBtn');
const openTplListBtn  = document.getElementById('openTplListBtn');
const tplListOverlay  = document.getElementById('tplListOverlay');
const closeTplListBtn = document.getElementById('closeTplListBtn');
const tplList         = document.getElementById('tplList');
const tplEmpty        = document.getElementById('tplEmpty');
const tplNameOverlay  = document.getElementById('tplNameOverlay');
const closeTplNameBtn = document.getElementById('closeTplNameBtn');
const tplNameInput    = document.getElementById('tplNameInput');
const confirmSaveTplBtn = document.getElementById('confirmSaveTplBtn');
const accountSelect = document.getElementById('accountSelect');
const recordList    = document.getElementById('recordList');
const emptyState    = document.getElementById('emptyState');
const searchInput    = document.getElementById('searchInput');
const searchClearBtn = document.getElementById('searchClearBtn');
const listTitle      = document.getElementById('listTitle');
const homeMonthNav   = document.getElementById('homeMonthNav');
const homeSummary    = document.getElementById('homeSummary');
let   searchKeyword  = '';
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
const billingCycleBar    = document.getElementById('billingCycleBar');
const billingCycleBtn    = document.getElementById('billingCycleBtn');

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
const projectEditBtn        = document.getElementById('projectEditBtn');
const recordProjectSelect   = document.getElementById('recordProjectSelect');
const recordProjectGroup    = document.getElementById('recordProjectGroup');
const rewardActivityGroup   = document.getElementById('rewardActivityGroup');
const rewardActivitySelect  = document.getElementById('rewardActivitySelect');
const rewardActivityList    = document.getElementById('rewardActivityList');
const addRewardActivityBtn  = document.getElementById('addRewardActivityBtn');
const projectRewardSection  = document.getElementById('projectRewardSection');
const projectRewardList     = document.getElementById('projectRewardList');
const splitGroup            = document.getElementById('splitGroup');
const splitPayer            = document.getElementById('splitPayer');
const splitMemberChecks     = document.getElementById('splitMemberChecks');
const splitModeEqual        = document.getElementById('splitModeEqual');
const splitModeCustom       = document.getElementById('splitModeCustom');
const splitCustomArea       = document.getElementById('splitCustomArea');
const splitCustomInputs     = document.getElementById('splitCustomInputs');
const splitPreview          = document.getElementById('splitPreview');

// ===== DOM — 分類管理 =====
const pageCategories    = document.getElementById('pageCategories');
const pageSettings      = document.getElementById('pageSettings');
const pageRecurring     = document.getElementById('pageRecurring');
const pageBudget        = document.getElementById('pageBudget');
const navSettingsBtn    = document.getElementById('navSettings');
const goBudgetBtn       = document.getElementById('goBudget');
const goRecurringBtn    = document.getElementById('goRecurring');
const goCategoriesBtn   = document.getElementById('goCategories');
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
const recNameInput    = document.getElementById('recName');
const recAmountInput      = document.getElementById('recAmount');
const recAmountInputWrap  = document.getElementById('recAmountInputWrap');
const recCalcToggleBtn    = document.getElementById('recCalcToggleBtn');
const recCalcKeyboard     = document.getElementById('recCalcKeyboard');
const recCalcExpressionEl = document.getElementById('recCalcExpression');
const recCatPickBtn   = document.getElementById('recCatPickBtn');
const recCatPickEmoji = document.getElementById('recCatPickEmoji');
const recCatPickName  = document.getElementById('recCatPickName');
const recAccountSel   = document.getElementById('recAccount');
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

// ===== Modal input 防自動 focus（手機鍵盤不自動彈出）=====
// 原理：modal 開啟時把所有 input/select/textarea 設為 readonly，
// 使用者主動點擊後才移除 readonly，讓鍵盤正常彈出。
function lockModalInputs(overlayEl) {
  overlayEl.querySelectorAll('input, select, textarea').forEach(el => {
    if (el.readOnly === false && el.tagName !== 'SELECT') {
      el.dataset.wasReadonly = 'false';
      el.readOnly = true;
    }
  });
  overlayEl.addEventListener('pointerdown', function unlockOnTap(e) {
    const target = e.target.closest('input, select, textarea');
    if (target && target.dataset.wasReadonly === 'false') {
      target.readOnly = false;
      delete target.dataset.wasReadonly;
      // 重新鎖住其他 input（讓每次只有點到的那個解鎖）
      overlayEl.querySelectorAll('input, textarea').forEach(el => {
        if (el !== target && el.dataset.wasReadonly !== undefined) {
          el.readOnly = true;
        }
      });
    }
  }, { capture: true });
}

// 在所有 overlay 加上監聽，active 時鎖住 inputs
const _overlayObserver = new MutationObserver((mutations) => {
  mutations.forEach(m => {
    if (m.type === 'attributes' && m.attributeName === 'class') {
      const el = m.target;
      if (el.classList.contains('active')) {
        // 重新鎖住（每次開啟都重設）
        el.querySelectorAll('input, textarea').forEach(inp => {
          if (inp.getAttribute('inputmode') !== 'none') {
            inp.dataset.wasReadonly = 'false';
            inp.readOnly = true;
          }
        });
      } else {
        // 關閉時解鎖
        el.querySelectorAll('input, textarea').forEach(inp => {
          inp.readOnly = false;
          delete inp.dataset.wasReadonly;
        });
      }
    }
  });
});
document.querySelectorAll('.modal-overlay').forEach(ov => {
  _overlayObserver.observe(ov, { attributes: true });
  lockModalInputs(ov);
});

// ===== 認證 =====
const splashScreen = document.getElementById('splashScreen');
function hideSplash() {
  splashScreen.classList.add('hidden');
}

onAuthStateChanged(auth, (user) => {
  hideSplash();
  if (user) {
    currentUser = user;
    showApp(user);
    subscribeRecords();
    subscribeAccounts();
    subscribeCategories();
    subscribeTemplates();
    subscribeRecurring();
    subscribeBudgets();
    subscribeProjects();
  } else {
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
    allCategories = [];
    allBudgets    = [];
    allProjects   = [];
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
  // 暱稱登入用戶（非 Google）：顯示暱稱徽章
  const isNickname = !user.photoURL && user.displayName;
  document.getElementById('guestBadge')?.remove();
  if (isNickname) {
    userAvatar.classList.remove('visible');
    const badge = document.createElement('span');
    badge.id = 'guestBadge';
    badge.className = 'guest-badge';
    badge.textContent = user.displayName;
    logoutBtn.insertAdjacentElement('beforebegin', badge);
  } else {
    if (user.photoURL) {
      userAvatar.src = user.photoURL;
      userAvatar.classList.add('visible');
    }
  }
}

// ===== 頁面切換 =====
navHome.addEventListener('click', () => switchPage('home'));
navAccountsBtn.addEventListener('click', () => switchPage('accounts'));
navReportBtn.addEventListener('click', () => switchPage('report'));
navSettingsBtn.addEventListener('click', () => switchPage('settings'));
backToAccountsBtn.addEventListener('click', () => switchPage('accounts'));

function switchPage(page) {
  // 離開記帳頁時清除搜尋
  if (page !== 'home' && searchKeyword) {
    searchInput.value = '';
    searchKeyword = '';
    searchClearBtn.style.display = 'none';
    applySearchMode(false);
  }
  currentPage = page;
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
  if (page === 'home')          pageTitle.textContent = '我的記帳本';
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
  if (page === 'categories')    renderCategoryMgmtList();
  if (page === 'recurring')     renderRecurringList();
  if (page === 'budget')        renderBudgetPage();
  if (page === 'report')        renderReport();
  if (page === 'projects')      renderProjectList();
  if (page === 'projectDetail') renderProjectDetail();
}

// ===== 主頁預算小卡 =====
homeBudgetMoreBtn.addEventListener('click', () => switchPage('budget'));

// ===== 設定頁按鈕 =====
goBudgetBtn.addEventListener('click', () => switchPage('budget'));
goRecurringBtn.addEventListener('click', () => switchPage('recurring'));
goCategoriesBtn.addEventListener('click', () => switchPage('categories'));

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
  });
}

// ===== 專案訂閱 =====
function subscribeProjects() {
  const q = query(collection(db, 'projects'), where('uid', '==', currentUser.uid));
  unsubProjects = onSnapshot(q, snap => {
    allProjects = snap.docs.map(d => ({ docId: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    if (currentPage === 'projects') renderProjectList();
    if (currentPage === 'projectDetail') renderProjectDetail();
    updateRecordProjectSelect();
  });
}

// ===== 頁面切換（專案） =====
navProjectsBtn.addEventListener('click', () => switchPage('projects'));

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
    card.className = 'project-card';
    const members = (proj.members || []).join('、');
    const dateStr = proj.startDate && proj.endDate
      ? `${proj.startDate} ～ ${proj.endDate}`
      : proj.startDate || '';
    // 計算此專案的總花費
    const total = calcProjectTotal(proj);
    card.innerHTML = `
      <div class="project-card-main">
        <div class="project-card-name">${proj.name}</div>
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

function calcProjectTotal(proj) {
  return allRecords
    .filter(r => r.projectId === proj.docId && r.type === 'expense')
    .reduce((s, r) => s + r.amount, 0);
}

addProjectBtn.addEventListener('click', () => openProjectModal());

function openProjectModal(proj = null) {
  projectEditId.value          = proj ? proj.docId : '';
  projectModalTitle.textContent = proj ? '編輯專案' : '新增專案';
  projectNameInput.value       = proj ? proj.name : '';
  projectMembersInput.value    = proj ? (proj.members || []).filter(m => m !== '我').join('、') : '';
  projectStartInput.value      = proj?.startDate || '';
  projectEndInput.value        = proj?.endDate   || '';
  deleteProjectBtn.style.display = proj ? '' : 'none';
  // 載入回饋活動
  tempRewardActivities = (proj?.rewardActivities || []).map(a => ({ ...a }));
  renderRewardActivityEditor();
  projectModalOverlay.classList.add('active');
}

function renderRewardActivityEditor() {
  rewardActivityList.innerHTML = '';
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
      renderRewardActivityEditor();
    });
    rewardActivityList.appendChild(row);
  });
}

addRewardActivityBtn.addEventListener('click', () => {
  tempRewardActivities.push({ id: `r_${Date.now()}`, name: '', limit: 0, currency: 'TWD' });
  renderRewardActivityEditor();
});

function closeProjectModal() {
  projectModalOverlay.classList.remove('active');
}

closeProjectModalBtn.addEventListener('click', closeProjectModal);
projectModalOverlay.addEventListener('click', e => {
  if (e.target === projectModalOverlay) closeProjectModal();
});

projectForm.addEventListener('submit', async e => {
  e.preventDefault();
  const name    = projectNameInput.value.trim();
  const others  = projectMembersInput.value.split(/[,，、]/).map(s => s.trim()).filter(s => s && s !== '我');
  const members = ['我', ...others];
  const startDate = projectStartInput.value || null;
  const endDate   = projectEndInput.value   || null;
  const editId    = projectEditId.value;
  // 過濾掉名稱為空的活動
  const rewardActivities = tempRewardActivities.filter(a => a.name.trim());
  projectSubmitBtn.disabled = true;
  try {
    if (editId) {
      await updateDoc(doc(db, 'projects', editId), { name, members, startDate, endDate, rewardActivities });
    } else {
      await addDoc(collection(db, 'projects'), {
        uid: currentUser.uid, name, members, startDate, endDate, rewardActivities,
        createdAt: serverTimestamp(),
      });
    }
    closeProjectModal();
  } catch (err) { console.error(err); alert('儲存失敗'); }
  finally { projectSubmitBtn.disabled = false; }
});

deleteProjectBtn.addEventListener('click', async () => {
  const editId = projectEditId.value;
  if (editId && confirm('確定要刪除此專案？（記帳記錄不會被刪除）')) {
    await deleteDoc(doc(db, 'projects', editId));
    closeProjectModal();
    switchPage('projects');
  }
});

// ===== 專案詳情 =====
function openProjectDetail(proj) {
  currentProjectId = proj.docId;
  renderProjectDetail();
  switchPage('projectDetail');
}

function renderProjectDetail() {
  const proj = allProjects.find(p => p.docId === currentProjectId);
  if (!proj) return;

  projectDetailName.textContent = proj.name;
  const dateStr = proj.startDate && proj.endDate
    ? `${proj.startDate} ～ ${proj.endDate}`
    : proj.startDate || '未設定日期';
  projectDetailDates.textContent = `📅 ${dateStr}`;
  projectDetailMembers.textContent = proj.members?.length
    ? `👥 ${proj.members.join('、')}` : '';

  // 此專案的所有支出記錄
  const recs = allRecords.filter(r => r.projectId === proj.docId && r.type === 'expense');

  // 結算計算
  renderProjectSettle(proj, recs);

  // 回饋追蹤
  renderProjectReward(proj, recs);

  // 明細列表
  projectRecordList.innerHTML = '';
  if (recs.length === 0) {
    projectRecordList.innerHTML = '<div class="project-empty">還沒有相關記帳記錄</div>';
    return;
  }
  // 依日期排序
  [...recs].sort((a, b) => (b.date || '').localeCompare(a.date || '')).forEach(r => {
    const item = document.createElement('div');
    item.className = 'project-record-item project-record-item-clickable';
    const noteMeta = [r.date, r.note].filter(Boolean).join(' · ');
    const splitTags = r.splitData
      ? r.splitData.map(s => `<span class="rec-split-tag">${s.name} $${formatMoney(s.amount)}</span>`).join('')
      : '';
    const payerRow = r.splitPayer
      ? `<div class="project-rec-split">${r.splitPayer} 付 · ${splitTags}</div>`
      : '';
    item.innerHTML = `
      <div class="project-rec-left">
        <span class="project-rec-emoji">${r.displayEmoji || r.categoryEmoji || '📦'}</span>
        <div class="project-rec-info">
          <div class="project-rec-name">${r.displayName || r.categoryName || '其他'}</div>
          <div class="project-rec-meta">${noteMeta}</div>
          ${payerRow}
        </div>
      </div>
      <div class="project-rec-right">
        <div class="project-rec-amount">-$${formatMoney(r.amount)}</div>
        <span class="project-rec-edit-icon">✏️</span>
      </div>`;
    item.addEventListener('click', () => openModal(r));
    projectRecordList.appendChild(item);
  });
}

function renderProjectSettle(proj, recs) {
  const members = proj.members || [];
  if (members.length < 2) {
    projectSettleSummary.innerHTML = `<div class="settle-total">總花費 $${formatMoney(recs.reduce((s,r)=>s+r.amount,0))}</div>`;
    return;
  }

  // 計算每人應付 / 實際付出
  const paid   = {};  // 實際付出
  const owed   = {};  // 應付
  members.forEach(m => { paid[m] = 0; owed[m] = 0; });

  recs.forEach(r => {
    const payer = r.splitPayer;
    const splits = r.splitData;
    if (payer && splits && splits.length > 0) {
      if (paid[payer] !== undefined) paid[payer] += r.amount;
      splits.forEach(s => {
        if (owed[s.name] !== undefined) owed[s.name] += s.amount;
      });
    } else {
      // 沒有分帳資料，算在第一個成員（自己）
      const self = members[0];
      if (paid[self] !== undefined) paid[self] += r.amount;
      if (owed[self] !== undefined) owed[self] += r.amount;
    }
  });

  // 計算每人淨額（負 = 欠別人，正 = 別人欠你）
  const net = {};
  members.forEach(m => { net[m] = paid[m] - owed[m]; });

  const total = recs.reduce((s, r) => s + r.amount, 0);

  let html = `<div class="settle-total">總花費 $${formatMoney(total)}</div><div class="settle-list">`;
  members.forEach(m => {
    const n = net[m];
    const cls = n > 0 ? 'settle-positive' : n < 0 ? 'settle-negative' : '';
    const label = n > 0 ? `待收 $${formatMoney(n)}` : n < 0 ? `待付 $${formatMoney(Math.abs(n))}` : '已結清';
    html += `<div class="settle-item ${cls}"><span class="settle-name">${m}</span><span class="settle-label">${label}</span></div>`;
  });
  html += '</div>';
  projectSettleSummary.innerHTML = html;
}

function renderProjectReward(proj, recs) {
  const acts = (proj.rewardActivities || []).filter(a => a.name);
  if (acts.length === 0) {
    projectRewardSection.style.display = 'none';
    return;
  }
  projectRewardSection.style.display = '';
  projectRewardList.innerHTML = '';

  acts.forEach(act => {
    // 回饋追蹤用實際刷卡金額（全額），因為信用卡帳單是全額計算
    const spent = recs
      .filter(r => r.rewardActivityId === act.id)
      .reduce((s, r) => s + r.amount, 0);

    const limit     = act.limit || 0;
    const currency  = act.currency || 'TWD';
    const remaining = limit - spent;
    const pct       = limit > 0 ? Math.min(Math.round(spent / limit * 100), 100) : 0;
    const over      = spent > limit;
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

// ===== 記帳 modal 的專案選單 =====
function updateRecordProjectSelect() {
  const prev = recordProjectSelect.value;
  recordProjectSelect.innerHTML = '<option value="">不屬於任何專案</option>';
  allProjects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.docId;
    opt.textContent = p.name;
    recordProjectSelect.appendChild(opt);
  });
  if (prev) recordProjectSelect.value = prev;
  updateSplitGroupVisibility();
}

recordProjectSelect.addEventListener('change', () => {
  updateSplitGroupVisibility();
  updateRewardActivitySelect();
});

function updateRewardActivitySelect(savedId = null) {
  const projId = recordProjectSelect.value;
  const proj   = allProjects.find(p => p.docId === projId);
  const acts   = proj?.rewardActivities?.filter(a => a.name) || [];
  if (!projId || acts.length === 0) {
    rewardActivityGroup.style.display = 'none';
    rewardActivitySelect.value = '';
    return;
  }
  rewardActivityGroup.style.display = '';
  rewardActivitySelect.innerHTML = '<option value="">不套用回饋活動</option>';
  acts.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = `${a.name}（上限 ${a.currency || 'TWD'} ${formatMoney(a.limit)}）`;
    rewardActivitySelect.appendChild(opt);
  });
  if (savedId) rewardActivitySelect.value = savedId;
}

function updateSplitGroupVisibility(record = null) {
  const projId = recordProjectSelect.value;
  const proj   = allProjects.find(p => p.docId === projId);
  if (!proj || !proj.members || proj.members.length < 2) {
    splitGroup.style.display = 'none';
    return;
  }
  splitGroup.style.display = '';
  renderSplitUI(proj, record);
}

function renderSplitUI(proj, record = null) {
  const members = proj.members || [];

  // 還原資料（編輯模式）
  const savedPayer  = record?.splitPayer  || null;
  const savedSplits = record?.splitData   || null; // [{ name, amount }]

  // 判斷是否為自訂模式：有 splitData 且各人金額不完全相等
  let restoreCustom = false;
  if (savedSplits && savedSplits.length > 1) {
    const amounts = savedSplits.map(s => s.amount);
    restoreCustom = amounts.some(a => a !== amounts[0]);
  } else if (savedSplits && savedSplits.length > 0) {
    // 只有一人時，若金額不等於總金額也視為自訂（但通常是自費，維持 equal 即可）
    restoreCustom = false;
  }

  // 付款人
  splitPayer.innerHTML = '';
  members.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    splitPayer.appendChild(opt);
  });
  if (savedPayer && members.includes(savedPayer)) {
    splitPayer.value = savedPayer;
  }

  // 還原分攤模式按鈕狀態
  if (restoreCustom) {
    splitMode = 'custom';
    splitModeCustom.classList.add('active');
    splitModeEqual.classList.remove('active');
    splitCustomArea.style.display = '';
  } else {
    splitMode = 'equal';
    splitModeEqual.classList.add('active');
    splitModeCustom.classList.remove('active');
    splitCustomArea.style.display = 'none';
  }

  // 參與成員勾選
  splitMemberChecks.innerHTML = '';

  // 全員快捷按鈕
  const allBtn = document.createElement('button');
  allBtn.type = 'button';
  allBtn.className = 'split-all-btn';
  allBtn.textContent = '全員';
  allBtn.addEventListener('click', () => {
    splitMemberChecks.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.checked = true;
      cb.closest('label').classList.add('checked');
    });
    if (splitMode === 'custom') renderCustomSplitInputs();
    updateSplitPreview();
  });
  splitMemberChecks.appendChild(allBtn);

  // 已儲存的參與成員名單
  const savedMemberNames = savedSplits ? savedSplits.map(s => s.name) : null;

  members.forEach((m, i) => {
    // 有儲存資料時依儲存名單決定勾選；否則預設只勾第一位
    const shouldCheck = savedMemberNames ? savedMemberNames.includes(m) : i === 0;
    const label = document.createElement('label');
    label.className = 'exclude-cat-item' + (shouldCheck ? ' checked' : '');
    label.innerHTML = `<input type="checkbox" value="${m}" ${shouldCheck ? 'checked' : ''} /><span class="exclude-cat-name">${m}</span>`;
    label.querySelector('input').addEventListener('change', () => {
      label.classList.toggle('checked', label.querySelector('input').checked);
      if (splitMode === 'custom') renderCustomSplitInputs();
      updateSplitPreview();
    });
    splitMemberChecks.appendChild(label);
  });

  // 自訂模式：渲染輸入框並填入已儲存的金額
  if (restoreCustom && savedSplits) {
    renderCustomSplitInputs();
    // 填入儲存的金額
    savedSplits.forEach(s => {
      const inp = splitCustomInputs.querySelector(`input[data-member="${s.name}"]`);
      if (inp) inp.value = s.amount;
    });
  }

  updateSplitPreview();
}

splitPayer.addEventListener('change', updateSplitPreview);

splitModeEqual.addEventListener('click', () => {
  splitMode = 'equal';
  splitModeEqual.classList.add('active');
  splitModeCustom.classList.remove('active');
  splitCustomArea.style.display = 'none';
  updateSplitPreview();
});

splitModeCustom.addEventListener('click', () => {
  splitMode = 'custom';
  splitModeCustom.classList.add('active');
  splitModeEqual.classList.remove('active');
  splitCustomArea.style.display = '';
  renderCustomSplitInputs();
});

function renderCustomSplitInputs() {
  const members = getCheckedMembers();
  const amount  = parseFloat(document.getElementById('amount').value) || 0;
  splitCustomInputs.innerHTML = '';
  members.forEach(m => {
    const row = document.createElement('div');
    row.className = 'split-custom-row';
    row.innerHTML = `
      <span class="split-custom-name">${m}</span>
      <div class="amount-input-wrap split-custom-input-wrap">
        <span class="currency-sign">$</span>
        <input type="number" class="split-custom-input" data-member="${m}" placeholder="0" inputmode="decimal" />
      </div>`;
    row.querySelector('input').addEventListener('input', updateSplitPreview);
    splitCustomInputs.appendChild(row);
  });
}

function getCheckedMembers() {
  return [...splitMemberChecks.querySelectorAll('input:checked')].map(el => el.value);
}

function updateSplitPreview() {
  const amount  = parseFloat(document.getElementById('amount').value) || 0;
  const members = getCheckedMembers();
  if (members.length === 0) { splitPreview.innerHTML = ''; return; }

  let splits = [];
  if (splitMode === 'equal') {
    const each = Math.round(amount / members.length);
    splits = members.map(m => ({ name: m, amount: each }));
  } else {
    splits = members.map(m => {
      const inp = splitCustomInputs.querySelector(`input[data-member="${m}"]`);
      return { name: m, amount: parseFloat(inp?.value) || 0 };
    });
  }

  const payer = splitPayer.value;
  const onlyPayer = splits.length === 1 && splits[0].name === payer;

  splitPreview.innerHTML = splits.map(s => {
    let label;
    if (onlyPayer) {
      // 只有付款人自己 → 純自費
      label = `自費 $${formatMoney(amount)}`;
    } else if (s.name === payer) {
      const payerOwn = s.amount;
      const payerAdvanced = amount - payerOwn;
      label = payerAdvanced > 0
        ? `付 $${formatMoney(amount)}，代墊 $${formatMoney(payerAdvanced)}，自付 $${formatMoney(payerOwn)}`
        : `自費 $${formatMoney(amount)}`;
    } else {
      label = `欠 ${payer} $${formatMoney(s.amount)}`;
    }
    return `<div class="split-preview-row"><span>${s.name}</span><span>${label}</span></div>`;
  }).join('');
}

function getSplitData() {
  const projId = recordProjectSelect.value;
  const proj   = allProjects.find(p => p.docId === projId);
  if (!proj || splitGroup.style.display === 'none') return { splitPayer: null, splitData: null };

  const members = getCheckedMembers();
  const amount  = parseFloat(document.getElementById('amount').value) || 0;
  let splits = [];
  if (splitMode === 'equal') {
    const each = Math.round(amount / members.length);
    splits = members.map(m => ({ name: m, amount: each }));
  } else {
    splits = members.map(m => {
      const inp = splitCustomInputs.querySelector(`input[data-member="${m}"]`);
      return { name: m, amount: parseFloat(inp?.value) || 0 };
    });
  }
  return { splitPayer: splitPayer.value, splitData: splits };
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
    .filter(r => r.type === 'expense' && r.date?.startsWith(yearPrefix))
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
 * 本期 = 上個結算日+1 到 本次結算日
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

  return { start: toDateStr(startDate), end: toDateStr(endDate) };
}

function openAccountDetail(account) {
  detailAccountId   = account.docId;
  detailViewYear    = new Date().getFullYear();
  detailViewMonth   = new Date().getMonth();
  detailIcon.textContent = account.emoji;
  detailName.textContent = account.name;
  detailType.textContent = account.typeName;

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
    renderAll();
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
    // 若使用者尚無分類，寫入預設值（清除資料期間跳過）
    if (docs.length === 0) {
      if (window._clearingData) return;
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

saveTplBtn.addEventListener('click', () => {
  tplNameInput.value = '';
  tplNameOverlay.classList.add('active');
});

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
    createdAt: serverTimestamp(),
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

  const existing = allTemplates.find(t => t.name === name && t.type === type);
  if (existing) {
    await updateDoc(doc(db, 'templates', existing.docId), tplData);
  } else {
    await addDoc(collection(db, 'templates'), tplData);
  }
  tplNameOverlay.classList.remove('active');
  tplListOverlay.classList.remove('active');
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
      <button class="tpl-delete-btn" data-id="${tpl.docId}" title="刪除範本">🗑</button>
    `;

    item.querySelector('.tpl-delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`刪除範本「${tpl.name}」？`)) return;
      await deleteDoc(doc(db, 'templates', tpl.docId));
      renderTplList();
    });

    item.addEventListener('click', (e) => {
      if (e.target.closest('.tpl-delete-btn')) return;
      applyTemplate(tpl);
    });

    tplList.appendChild(item);
  });
}

function applyTemplate(tpl) {
  tplListOverlay.classList.remove('active');

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
    const acc = allAccounts.find(a => a.docId === item.accountId);

    // 連續補齊所有到期的執行次數
    while (nextDate <= today) {
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

    const emoji = item.categoryEmoji || '🔁';
    const nextDate = item.nextDate || item.startDate || '—';
    const freqLabel = `每 ${item.freqN} ${{'day':'天','week':'週','month':'月','year':'年'}[item.freqUnit] || '月'}`;
    const accName = allAccounts.find(a => a.docId === item.accountId)?.name || '';
    const meta = [freqLabel, accName, item.note].filter(Boolean).join(' · ');
    const catLabel = item.categoryName
      ? (item.subCategoryName ? `${item.categoryName} - ${item.subCategoryName}` : item.categoryName)
      : '';

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
          ${item.type === 'income' ? '+' : '-'}$${item.amount.toLocaleString()}
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

function openRecurringModal(item = null) {
  recurringForm.reset();
  recEditIdInput.value = '';
  recDeleteBtn.style.display = 'none';
  recCurrentType = 'expense';
  recBtnExpense.classList.add('active');
  recBtnIncome.classList.remove('active');
  recSelectedCategory    = null;
  recSelectedSubCategory = null;
  updateRecCatPickBtn();
  renderRecAccountSelect();

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
    recCurrentType = item.type;
    recBtnExpense.classList.toggle('active', item.type === 'expense');
    recBtnIncome.classList.toggle('active',  item.type === 'income');
    recNameInput.value = item.name || '';
    const amt = item.amount || 0;
    recCalcRaw  = String(amt);
    recCalcExpr = String(amt);
    recAmountInput.value = String(amt);
    recNoteInput.value   = item.note   || '';
    recFreqN.value       = item.freqN  || 1;
    recFreqUnit.value = item.freqUnit || 'month';
    syncRecFreqUI(item.freqUnit || 'month', item);
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
  } else {
    recurringModalTitle.textContent = '新增固定項目';
    const defaultCat = allCategories.find(c => c.type === 'expense');
    if (defaultCat) {
      recSelectedCategory    = defaultCat;
      recSelectedSubCategory = defaultCat.subs?.[0] || null;
      updateRecCatPickBtn();
    }
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
  allAccounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.docId;
    opt.textContent = acc.name;
    recAccountSel.appendChild(opt);
  });
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

recBtnExpense.addEventListener('click', () => {
  recCurrentType = 'expense';
  recBtnExpense.classList.add('active');
  recBtnIncome.classList.remove('active');
  // 切換類型時重設分類預設值
  const defaultCat = allCategories.find(c => c.type === 'expense');
  if (defaultCat) {
    recSelectedCategory    = defaultCat;
    recSelectedSubCategory = defaultCat.subs?.[0] || null;
    updateRecCatPickBtn();
  }
});

recBtnIncome.addEventListener('click', () => {
  recCurrentType = 'income';
  recBtnIncome.classList.add('active');
  recBtnExpense.classList.remove('active');
  const defaultCat = allCategories.find(c => c.type === 'income');
  if (defaultCat) {
    recSelectedCategory    = defaultCat;
    recSelectedSubCategory = defaultCat.subs?.[0] || null;
    updateRecCatPickBtn();
  }
});

// 固定收支的分類選擇：重用現有的 catPickerOverlay
recCatPickBtn.addEventListener('click', () => {
  // 暫時切換 picker 模式為固定收支
  window._recCatPickMode = true;
  openCatPicker(recCurrentType);
});

recurringForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name   = recNameInput.value.trim();
  // 若有未完成算式，先自動計算
  if (/[\+\-\*\/]/.test(recCalcRaw) && recCalcRaw !== recCalcExpr) recCalcEqual();
  const amount = parseFloat(recCalcRaw);
  if (!name || !amount || amount <= 0) return;

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
    accountId:       recAccountSel.value || null,
    categoryId:      recSelectedCategory?.docId      || null,
    categoryName:    recSelectedCategory?.name       || null,
    categoryEmoji:   recSelectedCategory?.emoji      || null,
    subCategoryId:   recSelectedSubCategory?.docId   || null,
    subCategoryName: recSelectedSubCategory?.name    || null,
    enabled: true,
  };

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

// ===== 搜尋 =====
function applySearchMode(isSearching) {
  homeMonthNav.style.display = isSearching ? 'none' : '';
  homeSummary.style.display  = isSearching ? 'none' : '';
}

searchInput.addEventListener('input', () => {
  searchKeyword = searchInput.value;
  searchClearBtn.style.display = searchKeyword ? '' : 'none';
  applySearchMode(!!searchKeyword.trim());
  renderList();
});
searchClearBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchKeyword = '';
  searchClearBtn.style.display = 'none';
  applySearchMode(false);
  searchInput.focus();
  renderList();
});

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
    // 還原專案與分攤
    recordProjectSelect.value = record.projectId || '';
    updateRewardActivitySelect(record.rewardActivityId || null);
    updateSplitGroupVisibility(record);
  } else {
    recordEditId.value = '';
    recordModalTitle.textContent = '新增記帳';
    submitBtn.textContent = '記下來！';
    deleteRecordBtn.style.display = 'none';
  }
  modalOverlay.classList.add('active');
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
  window._recCatPickMode = false;
}

// 渲染左欄主分類
function renderCatPickerParents() {
  catPickerParents.innerHTML = '';
  catPickerSubs.innerHTML = '';
  const parents = allCategories.filter(c => c.type === currentType);

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

    const { splitPayer: sp, splitData: sd } = getSplitData();
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
      projectId:          recordProjectSelect.value || null,
      rewardActivityId:   rewardActivitySelect.value || null,
      splitPayer:         sp || null,
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
  recordModalTitle.textContent = '新增記帳';
  submitBtn.textContent = '記下來！';
  recordProjectSelect.value = '';
  rewardActivityGroup.style.display = 'none';
  rewardActivitySelect.value = '';
  splitGroup.style.display = 'none';
  splitMode = 'equal';
  splitModeEqual.classList.add('active');
  splitModeCustom.classList.remove('active');
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

const billingDayGroup   = document.getElementById('billingDayGroup');
const accountBillingDay = document.getElementById('accountBillingDay');

// 填入 1~31 選項
for (let d = 1; d <= 31; d++) {
  const opt = document.createElement('option');
  opt.value = d;
  opt.textContent = `${d} 號`;
  accountBillingDay.appendChild(opt);
}

function openAccountModal(account = null) {
  accountEditId.value = account ? account.docId : '';
  accountModalTitle.textContent = account ? '編輯帳戶' : '新增帳戶';
  accountNameInput.value    = account ? account.name    : '';
  accountBalanceInput.value = account ? account.balance : '';
  accountNoteInput.value    = account ? account.note    : '';
  accountBillingDay.value   = account?.billingDay ?? '';
  selectedAccountType       = account ? account.typeId  : null;
  renderAccountTypeGrid();
  updateBillingDayVisibility();
  accountModalOverlay.classList.add('active');
}

const accountBalanceLabel = document.getElementById('accountBalanceLabel');

function updateBillingDayVisibility() {
  billingDayGroup.style.display = selectedAccountType === 'credit' ? '' : 'none';
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
    item.addEventListener('click', () => { selectedAccountType = t.id; renderAccountTypeGrid(); updateBillingDayVisibility(); });
    accountTypeGrid.appendChild(item);
  });
}

// ===== 提交帳戶 =====
accountForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedAccountType) { shakeEl(accountTypeGrid); return; }

  const name       = accountNameInput.value.trim();
  const balance    = parseFloat(accountBalanceInput.value) || 0;
  const note       = accountNoteInput.value.trim();
  const billingDay = selectedAccountType === 'credit' && accountBillingDay.value
    ? parseInt(accountBillingDay.value) : null;
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
        name, balance, note, billingDay,
      });
    } else {
      const maxOrder = allAccounts.reduce((m, a) => Math.max(m, a.order ?? 0), 0);
      await addDoc(collection(db, 'accounts'), {
        uid:      currentUser.uid,
        typeId:   selectedAccountType,
        emoji:    typeObj.emoji,
        typeName: typeObj.name,
        name, balance, note, billingDay,
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

  // 信用卡、貸款：餘額為負代表欠款（負債），餘額為正代表已還清有溢繳
  const LIABILITY_TYPES = ['credit', 'loan'];
  let totalAsset     = 0;
  let totalLiability = 0;
  allAccounts.forEach(a => {
    const bal = calcAccountBalance(a);
    if (LIABILITY_TYPES.includes(a.typeId)) {
      if (bal < 0) totalLiability += Math.abs(bal);
      else         totalAsset     += bal;
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
  renderHomeBudget();
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

function renderHomeBudget() {
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

  // 水位卡片產生器
  function makeTankCard(opts) {
    const { icon, label, spent, limit, pct, over, wide } = opts;
    const fillPct    = Math.min(pct, 100);
    const remaining  = limit - spent;
    const statusTxt  = over
      ? `<span class="tank-status-over">超支 $${formatMoney(spent - limit)}</span>`
      : `<span class="tank-status-pct">${pct}%</span>`;
    const remainTxt  = over
      ? `<div class="tank-remain over">超支 $${formatMoney(spent - limit)}</div>`
      : `<div class="tank-remain">剩 $${formatMoney(remaining)}</div>`;
    return `
      <div class="hb-tank-card${wide ? ' hb-tank-wide' : ''}">
        <div class="tank-status">${statusTxt}</div>
        <div class="tank-fill-wrap">
          <div class="tank-fill" style="height:${fillPct}%"></div>
          <div class="tank-content">
            <div class="tank-icon">${icon}</div>
            <div class="tank-label">${label}</div>
            ${remainTxt}
            <div class="tank-limit">/ $${formatMoney(limit)}</div>
          </div>
        </div>
      </div>`;
  }

  let html = '<div class="hb-grid">';

  // ── 月預算（佔整列）──
  if (monthBudget) {
    const excluded = monthBudget.excludedCategoryIds || [];
    const spent = allRecords
      .filter(r => {
        if (r.type !== 'expense' || !r.date?.startsWith(ym)) return false;
        if (r.subCategoryId && excluded.includes(`${r.categoryId}::${r.subCategoryId}`)) return false;
        if (!r.subCategoryId && excluded.includes(r.categoryId)) return false;
        return true;
      })
      .reduce((s, r) => s + getReportAmount(r), 0);
    const limit = monthBudget.amount;
    const pct   = limit > 0 ? Math.min(Math.round(spent / limit * 100), 100) : 0;
    const over  = spent > limit;
    const monthLabel = isCurrentMonth ? '本月預算' : `${viewMonth + 1}月預算`;
    html += makeTankCard({ icon: '💰', label: monthLabel, spent, limit, pct, over, wide: false });
  }

  // ── 類別預算（兩個一排，最多顯示 4 項）──
  if (catBudgets.length > 0) {
    const yearPrefix = `${thisYear}-`;
    const spentMap = {};
    allRecords
      .filter(r => r.type === 'expense' && r.date?.startsWith(yearPrefix))
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
        wide: false,
      });
    });

    const extraCount = catBudgets.length - sorted.length;
    if (extraCount > 0) {
      html += `<div class="hb-extra-card">還有 ${extraCount} 項…</div>`;
    }
  }

  html += '</div>';
  homeBudgetContent.innerHTML = html;
}

function matchesSearch(r, kw) {
  if (!kw) return true;
  const q = kw.toLowerCase();
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
  return fields.some(f => f && f.toLowerCase().includes(q));
}

function renderList() {
  const kw = searchKeyword.trim();
  // 搜尋模式：全部記錄；否則只取當月
  let recs = kw ? allRecords : getMonthRecords();

  // 更新標題
  if (kw) {
    listTitle.textContent = `搜尋「${kw}」的結果`;
    listTitle.classList.add('searching');
  } else {
    listTitle.textContent = '本月明細';
    listTitle.classList.remove('searching');
  }

  while (recordList.firstChild) recordList.removeChild(recordList.firstChild);

  // 轉帳只保留「轉出」那筆，避免重複顯示
  // 分攤記錄：若付款人不是「我」則不顯示在主頁（屬於別人代墊，在專案頁查看）
  let displayRecs = recs.filter(r => {
    if (r.type === 'transfer') return r.accountId === r.transferFromId;
    if (r.splitPayer && r.splitPayer !== '我') return false;
    return true;
  });

  // 套用關鍵字篩選
  if (kw) displayRecs = displayRecs.filter(r => matchesSearch(r, kw));

  if (displayRecs.length === 0) {
    recordList.appendChild(emptyState);
    emptyState.style.display = '';
    emptyState.querySelector('p').innerHTML = kw
      ? `找不到「${kw}」的相關記錄`
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
    // 搜尋模式下日期標頭的每日小計只算篩選後的那幾筆
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
    // 優先從 allAccounts 找（即時名稱），找不到則從 displayName 解析，最後才顯示 ?
    const fromAccObj = allAccounts.find(a => a.docId === r.transferFromId);
    const toAccObj   = allAccounts.find(a => a.docId === r.transferToId);
    const parsedTo   = r.displayName?.replace(/^轉帳 → /, '');
    const parsedFrom = r.displayName?.replace(/^轉帳 ← /, '');
    const fromName = fromAccObj?.name || (r.accountId === r.transferFromId ? r.accountName : parsedFrom) || '?';
    const toName   = toAccObj?.name   || (r.accountId === r.transferToId   ? r.accountName : parsedTo)   || '?';
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
const trendMetaBtnExpense = document.getElementById('trendMetaBtnExpense');
const trendMetaBtnIncome  = document.getElementById('trendMetaBtnIncome');
const trendMetaBtnBalance = document.getElementById('trendMetaBtnBalance');
const trendMetaBtns = [trendMetaBtnExpense, trendMetaBtnIncome, trendMetaBtnBalance];
const trendYearStats = document.getElementById('trendYearStats');
const trendMonthList = document.getElementById('trendMonthList');
const reportTabCategory  = document.getElementById('reportTabCategory');
const reportTabTrend     = document.getElementById('reportTabTrend');
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
  return allRecords.filter(r => r.date?.startsWith(prefix) && r.type !== 'transfer');
}

/**
 * 取得報表用的「有效金額」。
 * 若記錄有 splitData（分攤），取「我」的份額；
 * 否則回傳原始金額。
 * 帳戶餘額計算仍使用原始金額，只有報表分析使用此函數。
 */
function getReportAmount(r) {
  if (r.splitData && r.splitData.length > 0) {
    const mine = r.splitData.find(s => s.name === '我');
    if (mine != null) return mine.amount;
  }
  return r.amount;
}

function renderReport() {
  if (reportTab === 'wealth') { renderReportWealth(); return; }
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
  // 年份列只在趨勢 Tab 顯示
  if (trendYearNav) {
    trendYearNav.style.display = reportTab === 'trend' ? '' : 'none';
    trendYearLabel.textContent = `${reportYear} 年`;
  }
  if (reportTab === 'category') renderReportCategory();
  else renderReportTrend();
}

// ===== 類別分析 =====
function getCatViewRecords() {
  if (catView === 'year') {
    const prefix = `${reportYear}-`;
    return allRecords.filter(r => r.date?.startsWith(prefix) && r.type !== 'transfer');
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
    item.style.borderLeftColor = color;
    item.innerHTML = `
      <div class="report-cat-emoji">${cat.emoji}</div>
      <div class="report-cat-info">
        <div class="report-cat-name">${cat.name}</div>
        <div class="report-cat-bar-wrap">
          <div class="report-cat-bar" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="report-cat-percent">${pct}%</div>
      </div>
      <div>
        <div class="report-cat-amount ${reportType}">$${formatMoney(cat.amount)}</div>
      </div>
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
    item.style.borderLeftColor = color;
    item.innerHTML = `
      <div class="report-cat-emoji">${sub.emoji || cat?.emoji || '📦'}</div>
      <div class="report-cat-info">
        <div class="report-cat-name">${sub.name}</div>
        <div class="report-cat-bar-wrap">
          <div class="report-cat-bar" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="report-cat-percent">${pct}%</div>
      </div>
      <div>
        <div class="report-cat-amount ${reportType}">$${formatMoney(sub.amount)}</div>
      </div>
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
      <div class="report-record-amount ${r.type}">$${formatMoney(effAmt)}</div>
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
      <div class="report-record-amount ${r.type}">$${formatMoney(effAmt)}</div>
    `;
    reportCategoryList.appendChild(el);
  });
}

// ===== 圓餅圖 =====
const PIE_COLORS = [
  '#5B9BD5','#ED7D31','#A9D18E','#FF6B6B','#FFC107',
  '#9B59B6','#1ABC9C','#E74C3C','#3498DB','#F39C12',
  '#2ECC71','#E67E22','#16A085','#8E44AD','#D35400',
];

// 圓餅圖中間顯示總額的 plugin
const doughnutCenterPlugin = {
  id: 'doughnutCenter',
  afterDraw(chart) {
    if (chart.config.type !== 'doughnut') return;
    const { ctx, chartArea: { left, right, top, bottom } } = chart;
    const cx = (left + right) / 2;
    const cy = (top + bottom) / 2;
    const total = chart.config.options.plugins?.doughnutCenter?.total ?? 0;
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
              const pct = total > 0 ? Math.round(ctx.parsed / total * 100) : 0;
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
            <div class="report-record-amount ${r.type}">${r.type === 'income' ? '+' : '-'}$${formatMoney(effAmt)}</div>
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
    const init = a.balance || 0;
    if (LIABILITY_TYPES.includes(a.typeId)) {
      return sum + (init < 0 ? init : init); // 信用卡初始餘額直接加（通常為0）
    }
    return sum + init;
  }, 0);

  // 找出最早和最晚的記錄日期
  const nonTransfer = allRecords.filter(r => r.type !== 'transfer' && r.date);
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
