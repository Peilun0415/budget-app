// 驗證 card-catalog.js 的格式，自動合併前把關
// 用法：node tools/validate-card-catalog.mjs [--base 舊版 card-catalog.js 路徑]
//   --base：與舊版比對，確認沒有刪除既有卡片 id（已設定的帳戶還在用）
import { readFileSync } from 'node:fs';

async function loadCatalog(path) {
  const source = readFileSync(path, 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const basePath = baseIdx >= 0 ? args[baseIdx + 1] : null;

const errors = [];
const fail = (msg) => errors.push(msg);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isHttps = (v) => typeof v === 'string' && /^https:\/\/\S+$/.test(v);

const { CARD_CATALOG, CARD_CATALOG_UPDATED } = await loadCatalog(new URL('../card-catalog.js', import.meta.url));

if (!isDate(CARD_CATALOG_UPDATED)) fail('CARD_CATALOG_UPDATED 不是 YYYY-MM-DD');
if (!Array.isArray(CARD_CATALOG) || CARD_CATALOG.length === 0) fail('CARD_CATALOG 必須是非空陣列');

const ids = new Set();
for (const card of CARD_CATALOG || []) {
  const where = card?.id || '(缺 id)';
  if (!card?.id || typeof card.id !== 'string') fail(`${where}：缺 id`);
  if (ids.has(card.id)) fail(`${where}：id 重複`);
  ids.add(card.id);
  if (!card.bank || !card.name) fail(`${where}：缺 bank 或 name`);
  if (!isDate(card.ruleVersion)) fail(`${where}：ruleVersion 不是 YYYY-MM-DD`);
  if (card.validUntil != null && !isDate(card.validUntil)) fail(`${where}：validUntil 格式錯誤`);
  if (!['calendar', 'billing'].includes(card.rewardPeriodMode)) fail(`${where}：rewardPeriodMode 只能是 calendar 或 billing`);
  if (!isHttps(card.sourceUrl)) fail(`${where}：sourceUrl 必須是 https 網址`);
  if (card.image != null && !isHttps(card.image)) fail(`${where}：image 必須是 https 網址`);
  if (!Array.isArray(card.tiers) || card.tiers.length === 0) {
    fail(`${where}：tiers 必須是非空陣列`);
    continue;
  }
  if (card.tiers.filter(t => t.key === 'base').length !== 1) fail(`${where}：必須剛好有一層 key 為 base`);
  const keys = new Set();
  for (const t of card.tiers) {
    const tw = `${where} / ${t?.key || '(缺 key)'}`;
    if (!t?.key) fail(`${tw}：缺 key`);
    if (keys.has(t.key)) fail(`${tw}：key 重複`);
    keys.add(t.key);
    if (!t.name) fail(`${tw}：缺 name`);
    if (typeof t.rate !== 'number' || !(t.rate > 0) || t.rate > 30) fail(`${tw}：rate 必須介於 0～30`);
    if (t.cap != null && !(typeof t.cap === 'number' && t.cap > 0)) fail(`${tw}：cap 必須是正數或 null`);
    if (t.period != null && !['card', 'calendar', 'billing'].includes(t.period)) fail(`${tw}：period 值錯誤`);
    if (!['sum', 'per'].includes(t.calcMode)) fail(`${tw}：calcMode 只能是 sum 或 per`);
    if (!['round', 'floor'].includes(t.rounding)) fail(`${tw}：rounding 只能是 round 或 floor`);
    for (const k of ['minSpend', 'maxSpend']) {
      if (t[k] != null && !(typeof t[k] === 'number' && t[k] > 0)) fail(`${tw}：${k} 必須是正數或省略`);
    }
    if (t.minSpend != null && t.maxSpend != null && t.minSpend > t.maxSpend) fail(`${tw}：minSpend 大於 maxSpend`);
    if (typeof t.designated !== 'boolean') fail(`${tw}：designated 必須是 true 或 false`);
  }
}

if (basePath) {
  const base = await loadCatalog(basePath);
  for (const old of base.CARD_CATALOG || []) {
    if (!ids.has(old.id)) fail(`刪除了既有卡片 ${old.id}（停發的卡請在 note 註明，不要刪除）`);
  }
}

if (errors.length) {
  console.error(`目錄格式檢查失敗（${errors.length} 項）：`);
  errors.forEach(e => console.error(`  - ${e}`));
  process.exit(1);
}
console.log(`目錄格式檢查通過：${CARD_CATALOG.length} 張卡`);
