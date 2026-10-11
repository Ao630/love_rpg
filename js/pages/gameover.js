/**
 * js/pages/gameover.js ― 敗北画面
 * 一言コメント(SCENARIO_DATA.defeatComments)からランダムに1つ表示する。未提供(空)なら非表示。
 * 「タイトルに戻る」 → index.html(進行状態を破棄)
 */
(function () {
  'use strict';

  var state = Game.guard([Game.STEP.GAME_OVER]);
  if (!state) { return; }

  var comments = window.SCENARIO_DATA && Array.isArray(SCENARIO_DATA.defeatComments)
    ? SCENARIO_DATA.defeatComments.filter(function (c) { return typeof c === 'string' && c !== ''; })
    : [];
  var comment = Util.pickRandom(comments);
  if (comment !== null) {
    var commentEl = document.getElementById('defeat-comment');
    commentEl.textContent = comment;
    commentEl.hidden = false;
  }

  var titleButton = document.getElementById('btn-title');
  titleButton.addEventListener('click', function () {
    titleButton.disabled = true;
    Game.backToTitle();
  });
})();
