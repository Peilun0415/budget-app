// import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
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
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ===== Firebase 設定（請填入你自己的設定） =====
// 取得方式：見下方 firebase-setup.md 說明
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

// ===== 類別設定 =====
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

// ===== 狀態 =====
let currentUser    = null;
let currentType    = 'expense';
let selectedCategory = null;
let viewYear  = new Date().getFullYear();
let viewMonth = new Date().getMonth();
let unsubscribeSnapshot = null;
let allRecords = [];

// ===== DOM =====
const loginScreen  = document.getElementById('loginScreen');
const appScreen    = document.getElementById('appScreen');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const logoutBtn    = document.getElementById('logoutBtn');
const userAvatar   = document.getElementById('userAvatar');
const modalOverlay = document.getElementById('modalOverlay');
const openFormBtn  = document.getElementById('openFormBtn');
const closeFormBtn = document.getElementById('closeFormBtn');
const recordForm   = document.getElementById('recordForm');
const btnExpense   = document.getElementById('btnExpense');
const btnIncome    = document.getElementById('btnIncome');
const categoryGrid = document.getElementById('categoryGrid');
const amountInput  = document.getElementById('amount');
const dateInput    = document.getElementById('date');
const noteInput    = document.getElementById('note');
const submitBtn    = document.getElementById('submitBtn');
const recordList   = document.getElementById('recordList');
const emptyState   = document.getElementById('emptyState');
const totalIncome  = document.getElementById('totalIncome');
const totalExpense = document.getElementById('totalExpense');
const totalBalance = document.getElementById('totalBalance');
const currentMonthLabel = document.getElementById('currentMonthLabel');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

// ===== 認證狀態監聽 =====
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    showApp(user);
    subscribeRecords();
  } else {
    currentUser = null;
    showLogin();
    if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
    allRecords = [];
  }
});

// ===== Google 登入 =====
googleLoginBtn.addEventListener('click', async () => {
  try {
    googleLoginBtn.disabled = true;
    googleLoginBtn.textContent = '登入中...';
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (err) {
    console.error(err);
    googleLoginBtn.disabled = false;
    googleLoginBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>使用 Google 帳號登入`;
  }
});

// ===== 登出 =====
logoutBtn.addEventListener('click', async () => {
  if (confirm('確定要登出嗎？')) {
    await signOut(auth);
  }
});

// ===== 顯示/隱藏畫面 =====
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

// ===== Firestore 即時監聽 =====
function subscribeRecords() {
  if (unsubscribeSnapshot) unsubscribeSnapshot();

  const q = query(
    collection(db, 'records'),
    where('uid', '==', currentUser.uid),
    orderBy('date', 'desc'),
    orderBy('createdAt', 'desc')
  );

  unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
    allRecords = snapshot.docs.map(d => ({ docId: d.id, ...d.data() }));
    renderAll();
  }, (err) => {
    console.error('Firestore error:', err);
  });
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

// ===== 彈窗 =====
openFormBtn.addEventListener('click', openModal);
closeFormBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});

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

// ===== 類別格子 =====
function renderCategoryGrid() {
  categoryGrid.innerHTML = '';
  CATEGORIES[currentType].forEach(cat => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'cat-item' + (selectedCategory === cat.id ? ' selected' : '');
    item.dataset.id = cat.id;
    item.innerHTML = `<span class="cat-emoji">${cat.emoji}</span><span>${cat.name}</span>`;
    item.addEventListener('click', () => {
      selectedCategory = cat.id;
      renderCategoryGrid();
    });
    categoryGrid.appendChild(item);
  });
}

// ===== 日期 =====
function setDefaultDate() {
  const today = new Date();
  dateInput.value = formatDate(today);
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateDisplay(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(m)}月${parseInt(d)}日`;
}

// ===== 提交 =====
recordForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const amount = parseFloat(amountInput.value);
  if (!amount || amount <= 0) { shakeEl(amountInput.parentElement); return; }
  if (!selectedCategory)      { shakeEl(categoryGrid); return; }

  const cat = CATEGORIES[currentType].find(c => c.id === selectedCategory);

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

function shakeEl(el) {
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shake 0.3s ease';
}

function resetForm() {
  amountInput.value = '';
  noteInput.value   = '';
  selectedCategory  = null;
  currentType       = 'expense';
  btnExpense.classList.add('active');
  btnIncome.classList.remove('active');
  setDefaultDate();
  renderCategoryGrid();
}

// ===== 刪除 =====
async function deleteRecord(docId) {
  try {
    await deleteDoc(doc(db, 'records', docId));
  } catch (err) {
    console.error(err);
    alert('刪除失敗');
  }
}

// ===== 取得當月記錄 =====
function getMonthRecords() {
  const ym = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  return allRecords.filter(r => r.date && r.date.startsWith(ym));
}

// ===== 渲染全部 =====
function renderAll() {
  renderMonthLabel();
  renderSummary();
  renderList();
}

function renderMonthLabel() {
  currentMonthLabel.textContent = `${viewYear}年${viewMonth + 1}月`;
}

function renderSummary() {
  const monthRecords = getMonthRecords();
  const income  = monthRecords.filter(r => r.type === 'income').reduce((s, r) => s + r.amount, 0);
  const expense = monthRecords.filter(r => r.type === 'expense').reduce((s, r) => s + r.amount, 0);
  const balance = income - expense;

  totalIncome.textContent  = `$${formatMoney(income)}`;
  totalExpense.textContent = `$${formatMoney(expense)}`;
  totalBalance.textContent = `$${formatMoney(balance)}`;
  totalBalance.style.color = balance >= 0 ? 'var(--purple-main)' : 'var(--red-main)';
}

function formatMoney(n) {
  return n.toLocaleString('zh-TW', { maximumFractionDigits: 0 });
}

function renderList() {
  const monthRecords = getMonthRecords();

  while (recordList.firstChild) recordList.removeChild(recordList.firstChild);

  if (monthRecords.length === 0) {
    recordList.appendChild(emptyState);
    emptyState.style.display = '';
    return;
  }

  emptyState.style.display = 'none';

  const groups = {};
  monthRecords.forEach(r => {
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
      recordList.appendChild(item);
    });
  });
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
renderMonthLabel();
