/**
 * js/pages/map.js ― ステージ移動画面
 * 全ステージ(totalStages)を丸で並べ、クリア済みを塗りつぶし、ハートが現在のステージへ移動する。
 * 「すすむ」 → 戦闘前の会話(talk.html)
 */
(function () {
  'use strict';

  var state = Game.guard([Game.STEP.MAP]);
  if (!state) { return; }

  var total = GAME_CONFIG.totalStages;
  var current = state.stageIndex;

  var stageEl = document.getElementById('stage');
  var trackEl = document.getElementById('map-track');
  var markerEl = document.getElementById('map-marker');

  Ui.applyBackground(stageEl, GAME_CONFIG.assets.backgrounds.map);
  GameTimer.mount(document.getElementById('timer'));
  document.getElementById('map-title').textContent = Game.stageLabel(current);

  // 対戦相手の名前(登録されているときだけ表示)
  var opponent = Characters.getById(state.order[current]);
  if (opponent.name) {
    var opponentEl = document.getElementById('map-opponent');
    opponentEl.textContent = opponent.name;
    opponentEl.hidden = false;
  }

  /** ステージ番号(0始まり)に対応する、トラック上の横位置(%) */
  function positionOf(index) {
    return total <= 1 ? 50 : (index / (total - 1)) * 100;
  }

  // ステージの数だけ丸を作る
  for (var i = 0; i < total; i++) {
    var node = document.createElement('div');
    node.className = 'map-node' + (i < current ? ' map-node--done' : '') + (i === current ? ' map-node--current' : '');
    node.style.left = positionOf(i) + '%';
    node.textContent = String(i + 1);
    trackEl.appendChild(node);
  }

  // ハートの移動: 2ステージ目以降は、前のステージの位置から現在の位置へ動かす
  var startIndex = current > 0 ? current - 1 : current;
  markerEl.style.left = positionOf(startIndex) + '%';
  if (startIndex !== current) {
    window.setTimeout(function () { markerEl.style.left = positionOf(current) + '%'; }, 250);
  }

  var nextButton = document.getElementById('btn-next');
  nextButton.addEventListener('click', function () {
    nextButton.disabled = true; // 連打防止
    Game.advanceFromMap();
  });
})();
