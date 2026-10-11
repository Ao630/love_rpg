/**
 * js/pages/clear.js ― クリア画面
 * ストップウォッチはラスボス成功の時点で停止済み。その最終タイムを「あなたのタイムは○○でした！」と表示する。
 * 「タイトルに戻る」 → index.html(進行状態を破棄)
 */
(function () {
  'use strict';

  var state = Game.guard([Game.STEP.CLEAR]);
  if (!state) { return; }

  document.getElementById('clear-time').textContent =
    'あなたのタイムは' + GameTimer.format(Game.elapsedMs(state)) + 'でした！';

  var titleButton = document.getElementById('btn-title');
  titleButton.addEventListener('click', function () {
    titleButton.disabled = true;
    Game.backToTitle();
  });
})();
