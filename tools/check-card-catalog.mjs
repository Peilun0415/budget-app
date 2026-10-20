// 檢查 card-catalog.js 的官網連結與卡面圖片是否還能開啟
// 用法：node tools/check-card-catalog.mjs
import { readFileSync } from 'node:fs';

// 專案沒有 package.json 的 "type": "module"，以 data URL 載入 ES module 版的目錄
const catalogSource = readFileSync(new URL('../card-catalog.js', import.meta.url), 'utf8');
const { CARD_CATALOG, CARD_CATALOG_UPDATED } = await import(
  `data:text/javascript;base64,${Buffer.from(catalogSource).toString('base64')}`
);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function check(url, expectImage) {
  if (!url) return { ok: false, note: '未設定' };
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });
    const type = res.headers.get('content-type') || '';
    res.body?.cancel();
    if (!res.ok) return { ok: false, note: `HTTP ${res.status}` };
    const looksLikeImage = type.startsWith('image/')
      || (type.includes('octet-stream') && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url));
    if (expectImage && !looksLikeImage) return { ok: false, note: `不是圖片（${type || '未知類型'}）` };
    return { ok: true, note: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, note: err.message };
  }
}

const today = new Date().toISOString().slice(0, 10);
console.log(`目錄更新日 ${CARD_CATALOG_UPDATED}，檢查日 ${today}\n`);

let problems = 0;
for (const card of CARD_CATALOG) {
  const [source, image] = await Promise.all([check(card.sourceUrl, false), check(card.image, true)]);
  const expired = card.validUntil && card.validUntil < today;
  const flags = [];
  if (!source.ok) flags.push(`官網：${source.note}`);
  if (!card.image) flags.push('卡面：未設定（顯示替代卡面）');
  else if (!image.ok) flags.push(`卡面：${image.note}`);
  if (expired) flags.push(`規則已過期（validUntil ${card.validUntil}）`);
  if (flags.length && (card.image || !source.ok || expired)) problems++;
  console.log(`${flags.length ? '⚠' : '✓'} ${card.bank} ${card.name}${flags.length ? '\n    ' + flags.join('\n    ') : ''}`);
}

console.log(`\n需要處理：${problems} 張（「卡面未設定」的卡只需嘗試補圖，不算失敗）`);
process.exitCode = problems ? 1 : 0;
