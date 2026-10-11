/**
 * js/pages/intro.js ― 導入の独白
 * 文章(SCENARIO_DATA.intro)が未設定でも、空白の1ページを表示して1回タップで先へ進む。
 * 終了後 → ステージ移動画面(map.html)
 */
(function () {
  'use strict';

  var state = Game.guard([Game.STEP.INTRO]);
  if (!state) { return; }

  var stageEl = document.getElementById('stage');
  Ui.applyBackground(stageEl, GAME_CONFIG.assets.backgrounds.intro || GAME_CONFIG.assets.backgrounds.classroom);
  GameTimer.mount(document.getElementById('timer'));

  Dialogue.start({
    pages: Characters.textPages(window.SCENARIO_DATA && SCENARIO_DATA.intro),
    textEl: document.getElementById('msg-text'),
    stageEl: stageEl,
    onDone: function () { Game.advanceFromIntro(); }
  });
})();
