/*
 * battle_sim.js : 戦闘シミュレーション(battle_sim.html)の処理
 * ゲーム本体とは独立。この画面の中だけで「好感度を上げる → 成功率を上げる → 告白」を試す。
 * 共通の設定・認証は debug_common.js。
 */
window.__battleSimLoaded = true;

// 戦闘の状態。phase: "love"=好感度を上げる / "rate"=成功率を上げる / "done"=判定済み
const battle = {
  enemy: null,
  phase: "love",
  love: 0,
  rate: 0,
  settings: null,
  timerId: null // 成功率を下げるタイマー
};

// 告白の集計
const tally = { success: 0, fail: 0 };

// ---------- 設定欄 ----------
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

// 設定欄の値を読む。空欄や不正な値は初期値に戻す
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

function fillEnemySelect() {
  const select = $("enemy-select");
  select.textContent = "";
  DEBUG_ENEMIES.forEach((enemy) => {
    const option = document.createElement("option");
    option.value = enemy.id;
    option.textContent = (enemy.isBoss ? "【ラスボス】" : "") + (enemy.name || enemy.id);
    select.appendChild(option);
  });
}

// ---------- タイマー ----------
function stopRateTimer() {
  if (battle.timerId !== null) {
    clearInterval(battle.timerId);
    battle.timerId = null;
  }
}

// 成功率フェーズ中、100msごとに成功率を下げる（二重起動しない）
function startRateTimer() {
  stopRateTimer();
  battle.timerId = setInterval(() => {
    if (battle.phase !== "rate") { stopRateTimer(); return; }
    const s = battle.settings;
    battle.rate = clamp(battle.rate - s.rateDecayPerSec / 10, s.rateMin, s.rateMax);
    renderBattle();
  }, 100);
}

// ---------- 表示 ----------
// 好感度が最大値の半分を超え、かつ画像2が登録されていれば切り替える（画像2は未提供なら常に通常画像）
function currentEnemyImage() {
  const e = battle.enemy;
  if (!e) return "";
  const overHalf = battle.love > battle.settings.loveMax / 2;
  return (overHalf && e.imageLove) ? e.imageLove : (e.imageNormal || "");
}

function renderTally() {
  $("tally-total").textContent = tally.success + tally.fail;
  $("tally-success").textContent = tally.success;
  $("tally-fail").textContent = tally.fail;
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

// ---------- 戦闘の進行 ----------
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
  if (success) tally.success++; else tally.fail++;
  $("result-text").textContent =
    (success ? "告白成功！" : "告白失敗...") + "（成功率 " + battle.rate.toFixed(1) + "%）";
  renderTally();
  renderBattle();
}

// 戦闘をやり直す（選んだ敵と、設定欄の現在の値で初期化）
function resetBattle() {
  stopRateTimer();
  const id = $("enemy-select").value;
  battle.enemy = DEBUG_ENEMIES.find((e) => e.id === id) || null;
  battle.settings = readSettingInputs();
  battle.phase = "love";
  battle.love = 0;
  battle.rate = 0;
  $("line-text").textContent = "";
  $("result-text").textContent = "";
  renderBattle();
}

// ---------- 初期化 ----------
function init() {
  fillEnemySelect();
  fillSettingInputs();

  $("enemy-select").addEventListener("change", resetBattle);
  $("reset-button").addEventListener("click", resetBattle);
  $("default-button").addEventListener("click", () => { fillSettingInputs(); resetBattle(); });
  $("attack-button").addEventListener("click", handleAttack);
  $("confess-button").addEventListener("click", handleConfess);
  $("max-love-button").addEventListener("click", () => {
    if (battle.phase === "love") { enterRatePhase(); renderBattle(); }
  });
  $("max-rate-button").addEventListener("click", () => {
    if (battle.phase === "rate") { battle.rate = battle.settings.rateMax; renderBattle(); }
  });
  $("tally-reset-button").addEventListener("click", () => { tally.success = 0; tally.fail = 0; renderTally(); });

  resetBattle();
  renderTally();
  // ログアウト時は成功率タイマーを止める
  setupAuth((authed) => { if (!authed) stopRateTimer(); });
}

document.addEventListener("DOMContentLoaded", init);
