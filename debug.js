/*
 * debug.js : デバッグページ(debug.html)の処理。ページ移動だけを担当する。
 * パスワード・共通処理は debug_common.js、戦闘テストは battle_sim.js（別ページ）にある。
 */
window.__debugPageLoaded = true;

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

function init() {
  renderPageLinks();
  $("jump-form").addEventListener("submit", (e) => { e.preventDefault(); jumpTo($("jump-input").value); });
  setupAuth();
}

document.addEventListener("DOMContentLoaded", init);
