/*
 * debug.js : デバッグページの処理
 *
 * 【注意】GitHub Pagesは静的サイトなので、パスワード判定はブラウザ内で行われる。
 *   ソースを読めば誰でも仕組みを確認できるため、本物のセキュリティではない。
 *   「うっかり開かれない」ための簡易ロックとして使うこと。重要な情報は置かない。
 */

window.__debugLoaded = true; // debug.html 側で「このファイルが読み込めたか」を確認するための印

// ============================================================
// 設定（ここだけ編集すればよい）
// ============================================================
const DEBUG_CONFIG = {
  // パスワードのSHA-256ハッシュ（16進文字列）。初期パスワードは「debug」。必ず変更すること。
  // 変更手順：ターミナルで  printf '新しいパスワード' | sha256sum  を実行し、出力の文字列を貼る。
  passwordHash: "0b8e9e995d8d77f1e4770f0f79665aee6f3f70247b3735422daba73df4c3096f",

  // ページ移動ボタンの一覧。 { label: "表示名", url: "相対パス" } の形式で追加する。
  // 例: { label: "タイトル画面", url: "index.html" }
  // 未作成のページは404になるので、ファイルを作ってから追加する。
  pages: [
  ],

  // 戦闘テストの初期値。※原案で数値が未確定のため、デバッグ用の仮の値。画面上でも変更できる。
  battle: {
    loveMax: 100,        // 好感度の最大値
    loveInc: 5,          // アタック1回あたりの好感度増加
    rateInit: 10,        // 好感度MAX直後の成功率(%)
    rateInc: 3,          // アタック1回あたりの成功率増加(%)
    rateDecayPerSec: 5,  // 成功率が1秒あたり下がる量(%)
    rateMin: 0,          // 成功率の下限(%)
    rateMax: 100         // 成功率の上限(%)
  }
};

// 認証済みフラグの保存キー（タブを閉じると消える sessionStorage を使用）
const AUTH_KEY = "debugAuthed";

// ============================================================
// 共通ヘルパー
// ============================================================
const $ = (id) => document.getElementById(id);

// 純JSのSHA-256（crypto.subtle が使えない http 環境などのための予備）
function sha256Fallback(text) {
  const bytes = Array.from(new TextEncoder().encode(text));
  const K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
  ];
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const hi = Math.floor(bitLen / 0x100000000), lo = bitLen >>> 0;
  [hi, lo].forEach((v) => { for (let s = 24; s >= 0; s -= 8) bytes.push((v >>> s) & 0xff); });
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));
  for (let i = 0; i < bytes.length; i += 64) {
    const w = new Array(64);
    for (let t = 0; t < 16; t++) {
      w[t] = ((bytes[i+4*t] << 24) | (bytes[i+4*t+1] << 16) | (bytes[i+4*t+2] << 8) | bytes[i+4*t+3]) >>> 0;
    }
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t-15], 7) ^ rotr(w[t-15], 18) ^ (w[t-15] >>> 3);
      const s1 = rotr(w[t-2], 17) ^ rotr(w[t-2], 19) ^ (w[t-2] >>> 10);
      w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    H[0]=(H[0]+a)>>>0; H[1]=(H[1]+b)>>>0; H[2]=(H[2]+c)>>>0; H[3]=(H[3]+d)>>>0;
    H[4]=(H[4]+e)>>>0; H[5]=(H[5]+f)>>>0; H[6]=(H[6]+g)>>>0; H[7]=(H[7]+h)>>>0;
  }
  return H.map((x) => x.toString(16).padStart(8, "0")).join("");
}

// 文字列のSHA-256を16進文字列で返す。使えれば標準機能、使えなければ予備の関数を使う
async function sha256Hex(text) {
  if (window.crypto && crypto.subtle) {
    try {
      const bytes = new TextEncoder().encode(text);
      const digest = await crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch (e) { /* 予備へ */ }
  }
  return sha256Fallback(text);
}

// 配列から1つランダムに選ぶ（空配列なら null）
function pickRandom(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

// 値を min〜max に収める
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// ============================================================
// 認証
// ============================================================
// 保存先が使えない環境（プライベートモード等）でも動くよう、メモリ上の印も併用する
let authedInMemory = false;

function isAuthed() {
  if (authedInMemory) return true;
  try { return sessionStorage.getItem(AUTH_KEY) === "1"; } catch (e) { return false; }
}

function setAuthed(flag) {
  authedInMemory = flag;
  try {
    if (flag) sessionStorage.setItem(AUTH_KEY, "1"); else sessionStorage.removeItem(AUTH_KEY);
  } catch (e) { /* 保存できない環境では、ページを開き直すと再入力が必要になるだけ */ }
}

// 認証状態に合わせて表示を切り替える
function renderAuthState() {
  const authed = isAuthed();
  $("login-area").hidden = authed;
  $("tools-area").hidden = !authed;
  if (!authed) stopRateTimer(); // ログアウト時はタイマーも止める
}

async function handleLogin(event) {
  event.preventDefault();
  const message = $("login-message");
  message.textContent = "確認中...";
  try {
    const hash = await sha256Hex($("password-input").value);
    $("password-input").value = "";
    if (hash === DEBUG_CONFIG.passwordHash) {
      setAuthed(true);
      renderAuthState();
      resetBattle();
      message.textContent = "";
    } else {
      message.textContent = "パスワードが違います。";
    }
  } catch (err) {
    message.textContent = "エラー: " + (err && err.message ? err.message : err);
  }
}

// ============================================================
// ページ移動
// ============================================================
// 同じサイト内のURLだけ許可して移動する（外部サイトへは飛ばさない）
function jumpTo(input) {
  const message = $("jump-message");
  message.textContent = "";
  const text = String(input || "").trim();
  if (!text) { message.textContent = "URLまたはファイル名を入力してください。"; return; }
  let target;
  try { target = new URL(text, location.href); } catch (e) {
    message.textContent = "URLの形式が正しくありません。"; return;
  }
  if (target.origin !== location.origin) {
    message.textContent = "同じサイト内のページだけ移動できます。"; return;
  }
  location.href = target.href;
}

function renderPageLinks() {
  const box = $("page-links");
  box.textContent = "";
  DEBUG_CONFIG.pages.forEach((page) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = page.label;
    button.addEventListener("click", () => jumpTo(page.url));
    box.appendChild(button);
  });
}

// ============================================================
// 戦闘テスト
// ============================================================
// 戦闘の状態。phase: "love"=好感度を上げる / "rate"=成功率を上げる / "done"=判定済み
const battle = {
  enemy: null,
  phase: "love",
  love: 0,
  rate: 0,
  settings: null,
  timerId: null // 成功率を下げるタイマー
};

// 予備の敵一覧。js/data/characters.js が読み込めない／空のときだけ使う（デバッグ専用）
const FALLBACK_ENEMIES = [
  { id: "girl01", name: "", imageNormal: "assets/images/characters/girl01_normal.png", imageLove: "", voices: [], lines: [], isBoss: false },
  { id: "girl02", name: "", imageNormal: "assets/images/characters/girl02_normal.png", imageLove: "", voices: [], lines: [], isBoss: false },
  { id: "girl03", name: "", imageNormal: "assets/images/characters/girl03_normal.png", imageLove: "", voices: [], lines: [], isBoss: false },
  { id: "boss01", name: "", imageNormal: "assets/images/characters/boss01_normal.png", imageLove: "", voices: [], lines: [], isBoss: true }
];

// 敵の一覧がどこから来たか（画面表示用）
let enemySourceNote = "";

// 選べる敵の一覧。通常は js/data/characters.js（通常ステージ候補 + ラスボス）。使えなければ予備を使う
function getAllEnemies() {
  let list = [];
  try {
    const normals = (typeof NORMAL_CHARACTERS !== "undefined" && Array.isArray(NORMAL_CHARACTERS)) ? NORMAL_CHARACTERS : [];
    const boss = (typeof BOSS_CHARACTER !== "undefined" && BOSS_CHARACTER && BOSS_CHARACTER.id) ? [BOSS_CHARACTER] : [];
    list = normals.concat(boss).filter((e) => e && e.id);
  } catch (err) { list = []; }
  if (list.length > 0) {
    enemySourceNote = "";
    return list;
  }
  enemySourceNote = "";
  return FALLBACK_ENEMIES;
}

function fillEnemySelect() {
  const select = $("enemy-select");
  select.textContent = "";
  getAllEnemies().forEach((enemy) => {
    const option = document.createElement("option");
    option.value = enemy.id;
    option.textContent = (enemy.isBoss ? "【ラスボス】" : "") + (enemy.name || enemy.id);
    select.appendChild(option);
  });
  $("enemy-note").textContent = enemySourceNote;
}

// 設定欄に初期値を入れる
function fillSettingInputs() {
  const b = DEBUG_CONFIG.battle;
  $("cfg-loveMax").value = b.loveMax;
  $("cfg-loveInc").value = b.loveInc;
  $("cfg-rateInit").value = b.rateInit;
  $("cfg-rateInc").value = b.rateInc;
  $("cfg-rateDecay").value = b.rateDecayPerSec;
  $("cfg-rateMin").value = b.rateMin;
  $("cfg-rateMax").value = b.rateMax;
}

// 設定欄の値を読む。不正な値は初期値に戻す
function readSettingInputs() {
  const d = DEBUG_CONFIG.battle;
  const num = (id, fallback) => {
    const v = parseFloat($(id).value);
    return Number.isFinite(v) ? v : fallback;
  };
  const s = {
    loveMax: Math.max(1, num("cfg-loveMax", d.loveMax)),
    loveInc: Math.max(0, num("cfg-loveInc", d.loveInc)),
    rateInit: num("cfg-rateInit", d.rateInit),
    rateInc: Math.max(0, num("cfg-rateInc", d.rateInc)),
    rateDecayPerSec: Math.max(0, num("cfg-rateDecay", d.rateDecayPerSec)),
    rateMin: num("cfg-rateMin", d.rateMin),
    rateMax: num("cfg-rateMax", d.rateMax)
  };
  if (s.rateMin > s.rateMax) { const t = s.rateMin; s.rateMin = s.rateMax; s.rateMax = t; }
  return s;
}

function stopRateTimer() {
  if (battle.timerId !== null) {
    clearInterval(battle.timerId);
    battle.timerId = null;
  }
}

// 成功率フェーズ開始：100msごとに成功率を下げる（二重起動しない）
function startRateTimer() {
  stopRateTimer();
  battle.timerId = setInterval(() => {
    if (battle.phase !== "rate") { stopRateTimer(); return; }
    const s = battle.settings;
    battle.rate = clamp(battle.rate - s.rateDecayPerSec / 10, s.rateMin, s.rateMax);
    renderBattle();
  }, 100);
}

// 敵の画像を表示する。好感度が最大値の半分を超え、かつ画像2が登録されていれば切り替える
function currentEnemyImage() {
  const e = battle.enemy;
  if (!e) return "";
  const overHalf = battle.love > battle.settings.loveMax / 2;
  return (overHalf && e.imageLove) ? e.imageLove : (e.imageNormal || "");
}

// 画面表示を状態に合わせて更新する（状態は変更しない）
function renderBattle() {
  const s = battle.settings;
  const e = battle.enemy;
  $("enemy-name").textContent = e ? (e.name || e.id) : "-";

  const img = $("enemy-image");
  const src = currentEnemyImage();
  if (src) { img.src = src; img.hidden = false; } else { img.removeAttribute("src"); img.hidden = true; }

  $("phase-label").textContent =
    battle.phase === "love" ? "好感度を上げる" : battle.phase === "rate" ? "成功率を上げる" : "判定済み";
  $("love-text").textContent = battle.love + " / " + s.loveMax;
  $("love-gauge").max = s.loveMax;
  $("love-gauge").value = battle.love;
  $("rate-text").textContent = battle.phase === "love" ? "-" : battle.rate.toFixed(1) + "%";

  const done = battle.phase === "done";
  $("attack-button").disabled = done || !e;
  $("confess-button").hidden = battle.phase === "love";
  $("confess-button").disabled = done;
  $("max-love-button").disabled = battle.phase !== "love";
  $("max-rate-button").disabled = battle.phase !== "rate";
}

// 好感度MAXになったら成功率フェーズへ移る
function enterRatePhase() {
  battle.phase = "rate";
  battle.love = battle.settings.loveMax;
  battle.rate = clamp(battle.settings.rateInit, battle.settings.rateMin, battle.settings.rateMax);
  startRateTimer();
}

// セリフと音声を1つずつランダムに出す。未登録なら何もしない
function showLineAndVoice() {
  const e = battle.enemy;
  $("line-text").textContent = pickRandom(e && e.lines) || "";
  const voice = pickRandom(e && e.voices);
  if (voice) {
    try {
      const p = new Audio(voice).play();
      if (p && p.catch) p.catch(() => {}); // 再生できなくてもエラーにしない
    } catch (err) { /* 無視 */ }
  }
}

function handleAttack() {
  if (!battle.enemy) return;
  const s = battle.settings;
  if (battle.phase === "love") {
    battle.love = clamp(battle.love + s.loveInc, 0, s.loveMax);
    showLineAndVoice();
    if (battle.love >= s.loveMax) enterRatePhase();
  } else if (battle.phase === "rate") {
    battle.rate = clamp(battle.rate + s.rateInc, s.rateMin, s.rateMax);
    showLineAndVoice();
  }
  renderBattle();
}

// 告白：表示中の成功率そのもので一度だけ判定する
function handleConfess() {
  if (battle.phase !== "rate") return; // 二重判定・不正な状態では何もしない
  battle.phase = "done";
  stopRateTimer();
  const success = Math.random() * 100 < battle.rate;
  $("result-text").textContent =
    (success ? "告白成功！" : "告白失敗...") + "（成功率 " + battle.rate.toFixed(1) + "%）";
  renderBattle();
}

// 戦闘をやり直す（選んだ敵と設定欄の値で初期化）
function resetBattle() {
  stopRateTimer();
  const id = $("enemy-select").value;
  battle.enemy = getAllEnemies().find((e) => e.id === id) || null;
  battle.settings = readSettingInputs();
  battle.phase = "love";
  battle.love = 0;
  battle.rate = 0;
  $("line-text").textContent = "";
  $("result-text").textContent = battle.enemy ? "" : "敵が登録されていません（data/characters.js を確認）。";
  renderBattle();
}

// ============================================================
// 初期化
// ============================================================
function init() {
  $("login-form").addEventListener("submit", handleLogin);
  $("logout-button").addEventListener("click", () => { setAuthed(false); renderAuthState(); });
  $("jump-form").addEventListener("submit", (e) => { e.preventDefault(); jumpTo($("jump-input").value); });

  fillEnemySelect();
  fillSettingInputs();
  renderPageLinks();
  $("enemy-select").addEventListener("change", resetBattle);
  $("reset-button").addEventListener("click", resetBattle);
  $("attack-button").addEventListener("click", handleAttack);
  $("confess-button").addEventListener("click", handleConfess);
  $("max-love-button").addEventListener("click", () => {
    if (battle.phase === "love") { battle.love = battle.settings.loveMax; enterRatePhase(); renderBattle(); }
  });
  $("max-rate-button").addEventListener("click", () => {
    if (battle.phase === "rate") { battle.rate = battle.settings.rateMax; renderBattle(); }
  });

  resetBattle();
  renderAuthState();
}

document.addEventListener("DOMContentLoaded", init);
