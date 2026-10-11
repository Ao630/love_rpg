/**
 * js/pages/talk.js ― キャラクターとの会話画面
 * 進行ステップによって、表示する会話と終了後の行き先が変わる(行き先は state.js の advanceFromTalk が決める)。
 *   talk-before   : キャラの talk.before
 *   talk-after    : 告白成功なら talk.afterSuccess / 失敗なら talk.afterFail
 *   talk-epilogue : ラスボスの talk.epilogue
 * 会話文が未設定でも、空白の1ページを表示して1回タップで先へ進む。
 */
(function () {
  'use strict';

  var STEP = Game.STEP;
  var state = Game.guard([STEP.TALK_BEFORE, STEP.TALK_AFTER, STEP.TALK_EPILOGUE]);
  if (!state) { return; }

  var character = Characters.getById(state.order[state.stageIndex]);
  var stageEl = document.getElementById('stage');

  Ui.applyBackground(stageEl, GAME_CONFIG.assets.backgrounds.classroom);
  GameTimer.mount(document.getElementById('timer'));

  // キャラクター画像(戦闘後に使う画像は GAME_CONFIG.talkImageAfterBattle で切り替え可能)
  var imageKey = 'normal';
  if (state.step !== STEP.TALK_BEFORE && GAME_CONFIG.talkImageAfterBattle === 'high') { imageKey = 'high'; }
  var imagePath = character.images[imageKey] || character.images.normal;
  Ui.showCharacterImage(
    document.getElementById('character-image'),
    document.getElementById('character-placeholder'),
    imagePath
  );

  // 今回表示する会話を選ぶ
  var list;
  if (state.step === STEP.TALK_BEFORE) {
    list = character.talk.before;
  } else if (state.step === STEP.TALK_AFTER) {
    list = state.lastResult === 'success' ? character.talk.afterSuccess : character.talk.afterFail;
  } else {
    list = character.talk.epilogue;
  }

  Dialogue.start({
    pages: Characters.textPages(list),
    textEl: document.getElementById('msg-text'),
    stageEl: stageEl,
    onDone: function () { Game.advanceFromTalk(); }
  });
})();
