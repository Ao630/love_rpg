/*
 * debug.js : デバッグページの処理
 *
 * 【注意】GitHub Pagesは静的サイトなので、パスワード判定はブラウザ内で行われる。
 *   ソースを読めば誰でも仕組みを確認できるため、本物のセキュリティではない。
 *   「うっかり開かれない」ための簡易ロックとして使うこと。重要な情報は置かない。
 */

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

// 文字列のSHA-256を16進文字列で返す（https または localhost でのみ crypto.subtle が使える）
async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
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
function isAuthed() {
  try { return sessionStorage.getItem(AUTH_KEY) === "1"; } catch (e) { return false; }
}

function setAuthed(flag) {
  try {
    if (flag) sessionStorage.setItem(AUTH_KEY, "1"); else sessionStorage.removeItem(AUTH_KEY);
  } catch (e) { /* 保存できない環境では毎回入力が必要になるだけ */ }
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
  message.textContent = "";
  if (!(window.crypto && crypto.subtle)) {
    message.textContent = "この環境ではパスワード確認が使えません（https または localhost で開いてください）。";
    return;
  }
  const hash = await sha256Hex($("password-input").value);
  $("password-input").value = "";
  if (hash === DEBUG_CONFIG.passwordHash) {
    setAuthed(true);
    renderAuthState();
    resetBattle();
  } else {
    message.textContent = "パスワードが違います。";
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

// 選べる敵の一覧（通常ステージ候補 + ラスボス）。data/characters.js で定義されたもの。
function getAllEnemies() {
  const normals = typeof NORMAL_CHARACTERS !== "undefined" ? NORMAL_CHARACTERS : [];
  const boss = typeof BOSS_CHARACTER !== "undefined" ? [BOSS_CHARACTER] : [];
  return normals.concat(boss);
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
