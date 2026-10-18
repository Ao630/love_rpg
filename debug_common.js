/*
 * debug_common.js : デバッグページ(debug.html)と戦闘シミュレーション(battle_sim.html)の共通部分
 *
 * 【注意】GitHub Pagesは静的サイトなので、パスワード判定はブラウザ内で行われる。
 *   ソースを読めば誰でも仕組みを確認できるため、本物のセキュリティではない。
 *   「うっかり開かれない」ための簡易ロックとして使うこと。重要な情報は置かない。
 */
window.__debugCommonLoaded = true; // 読み込めたかを各ページで確認するための印

// ============================================================
// 設定（ここだけ編集すればよい）
// ============================================================
const DEBUG_CONFIG = {
  // パスワードのSHA-256ハッシュ（16進文字列）。初期パスワードは「debug」。必ず変更すること。
  // 変更手順：ターミナルで  printf '新しいパスワード' | sha256sum  を実行し、出力の文字列を貼る。
  passwordHash: "0b8e9e995d8d77f1e4770f0f79665aee6f3f70247b3735422daba73df4c3096f",

  // デバッグページの移動ボタン。 { label: "表示名", url: "相対パス" } の形式で追加する。
  // 未作成のページは404になるので、ファイルを作ってから追加する。
  pages: [
    { label: "戦闘シミュレーション", url: "battle_sim.html" }
  ],

  // 戦闘シミュレーションの初期値。※原案で数値が未確定のため、デバッグ用の仮の値。
  // シミュレーション画面上でも変更できる。
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

// シミュレーションで選べる敵の一覧（デバッグ専用。ゲーム本体のキャラクター登録とは別）。
// 名前・画像2・音声・セリフは未提供なので空欄。素材が届いたらここに書き足す。
const DEBUG_ENEMIES = [
  { id: "girl01", name: "", imageNormal: "assets/images/characters/girl01_normal.png", imageLove: "", voices: [], lines: [], isBoss: false },
  { id: "girl02", name: "", imageNormal: "assets/images/characters/girl02_normal.png", imageLove: "", voices: [], lines: [], isBoss: false },
  { id: "girl03", name: "", imageNormal: "assets/images/characters/girl03_normal.png", imageLove: "", voices: [], lines: [], isBoss: false },
  { id: "boss01", name: "", imageNormal: "assets/images/characters/boss01_normal.png", imageLove: "", voices: [], lines: [], isBoss: true }
];

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
// 認証（両ページ共通）
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

// 認証画面の初期化。HTML側に #login-area #login-form #password-input #login-message
// #tools-area #logout-button がある前提。onChange(authed) は表示切替のたびに呼ばれる。
function setupAuth(onChange) {
  const render = () => {
    const authed = isAuthed();
    $("login-area").hidden = authed;
    $("tools-area").hidden = !authed;
    if (typeof onChange === "function") onChange(authed);
  };

  $("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = $("login-message");
    message.textContent = "確認中...";
    try {
      const hash = await sha256Hex($("password-input").value);
      $("password-input").value = "";
      if (hash === DEBUG_CONFIG.passwordHash) {
        setAuthed(true);
        message.textContent = "";
        render();
      } else {
        message.textContent = "パスワードが違います。";
      }
    } catch (err) {
      message.textContent = "エラー: " + (err && err.message ? err.message : err);
    }
  });

  $("logout-button").addEventListener("click", () => { setAuthed(false); render(); });
  render();
}
