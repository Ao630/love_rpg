/**
 * js/pages/title.js ― タイトル画面
 * ・表示時に前回の進行状態(タイマー含む)を破棄する = タイトルに戻ればゲームは必ずリセットされる
 * ・「スタート」: キャラ抽選とストップウォッチ開始を行い、intro.html へ移動する
 */
(function () {
  'use strict';

  Game.reset();

  var startButton = document.getElementById('btn-start');
  var errorEl = document.getElementById('title-error');

  startButton.addEventListener('click', function () {
    startButton.disabled = true; // 連打で二重に開始しないようにする
    var started = Game.newGame();
    if (!started) {
      // 保存に失敗したときだけ、ボタンを戻して理由を表示する
      startButton.disabled = false;
      errorEl.hidden = false;
    }
  });
})();
