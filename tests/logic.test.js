/**
 * tests/logic.test.js ― ゲームロジックの自動テスト(ブラウザ不要)
 * 実行方法: プロジェクトのルートで  node tests/logic.test.js
 * 画面(DOM)は使わず、ルール・進行・抽選・タイマー整形を実際のファイルを読み込んで検証する。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.join(__dirname, '..');
let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  OK   ' + name); }
  catch (e) { console.log('  FAIL ' + name + '\n       ' + e.message); process.exitCode = 1; }
}

/** ブラウザの代わりになる最小限の環境(sessionStorage・location)を作り、実際のJSを読み込む */
function loadEnvironment(characterData, shared) {
  // shared を渡すと、同じ保存領域・遷移履歴を使う「新しいページの読み込み」になる(ページ遷移の再現)
  const store = shared ? shared.store : {};
  const nav = shared ? shared.nav : { assigned: [], replaced: [] };
  const ctx = {
    sessionStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    location: { assign: (p) => nav.assigned.push(p), replace: (p) => nav.replaced.push(p) },
    addEventListener: () => {},
    console
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const files = ['js/config.js', 'js/data/characters.js', 'js/data/scenario.js', 'js/core/util.js',
    'js/core/characters.js', 'js/core/state.js', 'js/core/timer.js', 'js/core/battle-logic.js'];
  files.forEach((f) => {
    vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
    if (f === 'js/data/characters.js' && characterData) { ctx.CHARACTER_DATA = characterData; }
  });
  return { ctx, store, nav };
}

/**
 * 通しプレイ用: ブラウザで「ページが遷移するたびにJSが読み込み直される」動きを再現する。
 * do(fn) で操作を実行したあと、新しいページとして読み込み直す。
 */
class Player {
  constructor(characterData) {
    this.data = characterData;
    this.shared = { store: {}, nav: { assigned: [], replaced: [] } };
    this.reload();
  }
  reload() { this.env = loadEnvironment(this.data, this.shared); }
  get G() { return this.env.ctx.Game; }
  get nav() { return this.shared.nav; }
  do(fn) { const r = fn(this.G); this.reload(); return r; }
}

const seqRng = (values) => { let i = 0; return () => values[i++ % values.length]; };
const makeChar = (id) => ({ id, name: '', images: { normal: '', high: '' }, voices: { normal: [], high: [] },
  lines: { normal: [], high: [] }, talk: { before: [
    '一人目のセリフ',
    '2ページ目のセリフ',
    '3ページ目のセリフ',
    '4ページ目のセリフ',
    '5ページ目のセリフ'
  ], afterSuccess: [
    '一人目勝ちのセリフ',
    '2ページ目のセリフ',
    '3ページ目のセリフ',
    '4ページ目のセリフ',
    '5ページ目のセリフ'
  ], afterFail: [
    '一人目負けのセリフ',
    '2ページ目のセリフ',
    '3ページ目のセリフ',
    '4ページ目のセリフ',
    '5ページ目のセリフ'
  ] } });

console.log('■ 好感度ゲージ');
{
  const { ctx } = loadEnvironment();
  const C = ctx.GAME_CONFIG;

  test('アタックで好感度が増える', () => {
    const b = ctx.BattleLogic.create(C, Math.random);
    b.attack();
    assert.strictEqual(b.getAffection(), C.affection.gainPerAttack);
  });

  test('好感度は最大値を超えない(100回連打)', () => {
    const b = ctx.BattleLogic.create(C, Math.random);
    for (let i = 0; i < 100; i++) { b.attack(); }
    assert.ok(b.getAffection() <= C.affection.max);
    assert.strictEqual(b.getAffection(), C.affection.max);
  });

  test('好感度が「半分を上回る」まで high にならない(ちょうど半分は含まない)', () => {
    const b = ctx.BattleLogic.create(C, Math.random);
    let crossedAt = null;
    while (b.getPhase() === 'affection') {
      const r = b.attack();
      if (r.crossedHigh) { crossedAt = b.getAffection(); }
      if (b.getAffection() <= C.affection.max / 2) { assert.strictEqual(b.isHigh(), false); }
    }
    assert.ok(crossedAt > C.affection.max / 2);
  });

  test('crossedHigh は全体で1回だけ', () => {
    const b = ctx.BattleLogic.create(C, Math.random);
    let count = 0;
    for (let i = 0; i < 100; i++) { if (b.attack().crossedHigh) { count++; } }
    assert.strictEqual(count, 1);
  });

  test('MAXで告白成功率フェーズへ移行し、reachedMax は1回だけ', () => {
    const b = ctx.BattleLogic.create(C, Math.random);
    let reached = 0;
    while (b.getPhase() === 'affection') { if (b.attack().reachedMax) { reached++; } }
    assert.strictEqual(reached, 1);
    assert.strictEqual(b.getPhase(), 'confession');
    assert.strictEqual(b.displayRate(), C.confession.initialRate);
    for (let i = 0; i < 100; i++) { assert.strictEqual(b.attack().reachedMax, false); } // 以降は再発しない
  });
}

console.log('■ 告白成功率・判定');
{
  const { ctx } = loadEnvironment();
  const C = ctx.GAME_CONFIG;
  const toConfession = (rng) => {
    const b = ctx.BattleLogic.create(C, rng || Math.random);
    while (b.getPhase() === 'affection') { b.attack(); }
    return b;
  };

  test('告白フェーズでは好感度は増えず、成功率が増える', () => {
    const b = toConfession();
    const before = b.displayRate();
    const r = b.attack();
    assert.strictEqual(r.type, 'rate');
    assert.strictEqual(b.getAffection(), C.affection.max);
    assert.strictEqual(b.displayRate(), before + C.confession.gainPerAttack);
  });

  test('成功率は上限を超えない', () => {
    const b = toConfession();
    for (let i = 0; i < 500; i++) { b.attack(); }
    assert.strictEqual(b.displayRate(), C.confession.max);
  });

  test('時間経過で成功率が下がり、下限を割らない', () => {
    const b = toConfession();
    b.attack(); b.attack();
    const before = b.displayRate();
    b.tick(1000);
    assert.ok(b.displayRate() < before);
    b.tick(1000000);
    assert.strictEqual(b.displayRate(), C.confession.min);
  });

  test('affectionフェーズ中は tick しても成功率は動かない', () => {
    const b = ctx.BattleLogic.create(C, Math.random);
    b.tick(5000);
    assert.strictEqual(b.displayRate(), 0);
  });

  test('判定は一度だけ(2回目は null)、判定後のアタックは無効', () => {
    const b = toConfession(() => 0);
    const first = b.confess();
    assert.ok(first && typeof first.success === 'boolean');
    assert.strictEqual(b.confess(), null);
    assert.strictEqual(b.attack().type, 'none');
  });

  test('好感度フェーズ中は告白できない', () => {
    const b = ctx.BattleLogic.create(C, Math.random);
    assert.strictEqual(b.confess(), null);
  });

  test('成功率0%は必ず失敗 / 100%は必ず成功(乱数の両端)', () => {
    const b0 = toConfession(() => 0);
    b0.tick(1000000);
    assert.strictEqual(b0.confess().success, false);
    const b1 = toConfession(() => 0.999999);
    for (let i = 0; i < 500; i++) { b1.attack(); }
    assert.strictEqual(b1.confess().success, true);
  });

  test('判定に使う成功率は画面表示(displayRate)と一致する', () => {
    const b = toConfession(() => 0.5);
    b.attack(); b.tick(333);
    const shown = b.displayRate();
    assert.strictEqual(b.confess().rate, shown);
  });

  test('確率の統計: 成功率30%付近で、成功が概ね30%', () => {
    let wins = 0; const N = 20000;
    for (let i = 0; i < N; i++) {
      const b = toConfession(Math.random);
      while (b.displayRate() < 30) { b.attack(); }
      while (b.displayRate() > 30) { b.tick(10); }
      if (b.confess().success) { wins++; }
    }
    const ratio = wins / N;
    assert.ok(ratio > 0.27 && ratio < 0.33, 'ratio=' + ratio);
  });
}

console.log('■ キャラクター抽選');
{
  test('通常ステージは重複なく2人 + ラスボス固定', () => {
    const data = { normal: ['a', 'b', 'c', 'd', 'e'].map(makeChar), boss: makeChar('boss') };
    const { ctx } = loadEnvironment(data);
    for (let i = 0; i < 300; i++) {
      const order = ctx.Characters.pickStageOrder(Math.random);
      assert.strictEqual(order.length, 3);
      assert.notStrictEqual(order[0], order[1]);
      assert.ok(['a', 'b', 'c', 'd', 'e'].includes(order[0]) && ['a', 'b', 'c', 'd', 'e'].includes(order[1]));
      assert.strictEqual(order[2], 'boss');
    }
  });

  test('すべての組み合わせ・順序が出現する(偏りなし)', () => {
    const data = { normal: ['a', 'b', 'c'].map(makeChar), boss: makeChar('boss') };
    const { ctx } = loadEnvironment(data);
    const seen = new Set();
    for (let i = 0; i < 500; i++) { seen.add(ctx.Characters.pickStageOrder(Math.random).slice(0, 2).join('')); }
    assert.strictEqual(seen.size, 6);
  });

  test('同じIDが重複登録されていても、同一キャラが2人選ばれない', () => {
    const data = { normal: ['a', 'a', 'b'].map(makeChar), boss: makeChar('boss') };
    const { ctx } = loadEnvironment(data);
    for (let i = 0; i < 100; i++) {
      const o = ctx.Characters.pickStageOrder(Math.random);
      assert.notStrictEqual(o[0], o[1]);
    }
  });

  test('登録が足りなくてもクラッシュせず、重複しない空欄キャラで埋まる', () => {
    const { ctx } = loadEnvironment({ normal: [makeChar('a')], boss: makeChar('boss') });
    const o = ctx.Characters.pickStageOrder(Math.random);
    assert.strictEqual(o.length, 3);
    assert.notStrictEqual(o[0], o[1]);
    const empty = ctx.Characters.getById(o.find((id) => id.startsWith('empty')));
    assert.strictEqual(empty.name, '');
  });

  test('項目が欠けたデータや壊れたデータでも読み込める', () => {
    const { ctx } = loadEnvironment({ normal: [{ id: 'x', lines: null, voices: 5, images: undefined }, null, {}], boss: {} });
    const c = ctx.Characters.getById('x');
    assert.deepStrictEqual(Array.from(c.lines.normal), []);
    assert.strictEqual(c.images.normal, '');
    assert.strictEqual(ctx.Characters.pickStageOrder(Math.random).length, 3);
  });

  test('配布時の空欄テンプレートでも2人+ボスが選べる', () => {
    const { ctx } = loadEnvironment();
    const o = ctx.Characters.pickStageOrder(Math.random);
    assert.strictEqual(o[2], 'boss');
    assert.notStrictEqual(o[0], o[1]);
  });

  test('会話ページが空でも、空白1ページになる', () => {
    const { ctx } = loadEnvironment();
    assert.deepStrictEqual(Array.from(ctx.Characters.textPages([])), ['']);
    assert.deepStrictEqual(Array.from(ctx.Characters.textPages(['a', 'b'])), ['a', 'b']);
  });
}

console.log('■ 画面遷移・進行(通しプレイ)');
{
  /** 戦闘前の会話まで進める共通手順 */
  const toBattle = (p) => {
    p.do((G) => G.newGame());
    p.do((G) => G.advanceFromIntro());
    p.do((G) => G.advanceFromMap());
    p.do((G) => G.advanceFromTalk());
  };

  test('全成功: intro→map→talk→battle→talk を3回 → epilogue → clear → タイトル', () => {
    const p = new Player();
    const trace = [];
    assert.ok(p.do((G) => G.newGame())); trace.push(p.G.current().step);
    assert.ok(p.do((G) => G.advanceFromIntro())); trace.push(p.G.current().step);
    for (let stage = 0; stage < 3; stage++) {
      assert.strictEqual(p.G.current().stageIndex, stage);
      assert.strictEqual(p.G.current().step, 'map');
      assert.ok(p.do((G) => G.advanceFromMap()));  trace.push(p.G.current().step);
      assert.strictEqual(p.G.current().step, 'talk-before');
      assert.ok(p.do((G) => G.advanceFromTalk())); trace.push(p.G.current().step);
      assert.strictEqual(p.G.current().step, 'battle');
      assert.ok(p.do((G) => G.finishBattle(true))); trace.push(p.G.current().step);
      assert.strictEqual(p.G.current().step, 'talk-after');
      assert.ok(p.do((G) => G.advanceFromTalk())); trace.push(p.G.current().step);
    }
    assert.strictEqual(p.G.current().step, 'talk-epilogue');
    assert.ok(p.do((G) => G.advanceFromTalk()));
    assert.strictEqual(p.G.current().step, 'clear');
    assert.ok(p.do((G) => G.backToTitle()));
    assert.strictEqual(p.G.current(), null);
    assert.strictEqual(p.nav.assigned[p.nav.assigned.length - 1], 'index.html');
    // 開いたページの順番: 導入→移動→会話→戦闘→会話→移動… の順
    assert.deepStrictEqual(p.nav.assigned.slice(0, 7),
      ['intro.html', 'map.html', 'talk.html', 'battle.html', 'talk.html', 'map.html', 'talk.html']);
  });

  test('登場順: 1人目→2人目→ラスボスの順に、抽選されたキャラが相手になる', () => {
    const data = { normal: ['a', 'b', 'c'].map(makeChar), boss: makeChar('boss') };
    const p = new Player(data);
    p.do((G) => G.newGame());
    const order = Array.from(p.G.current().order);
    p.do((G) => G.advanceFromIntro());
    const opponents = [];
    for (let stage = 0; stage < 3; stage++) {
      opponents.push(p.env.ctx.Characters.getById(p.G.current().order[p.G.current().stageIndex]).id);
      p.do((G) => G.advanceFromMap()); p.do((G) => G.advanceFromTalk());
      p.do((G) => G.finishBattle(true)); p.do((G) => G.advanceFromTalk());
    }
    assert.deepStrictEqual(opponents, order);
    assert.strictEqual(opponents[2], 'boss');
  });

  test('告白失敗: talk-after → gameover → タイトル / 最終タイムが確定', () => {
    const p = new Player();
    toBattle(p);
    assert.ok(p.do((G) => G.finishBattle(false)));
    assert.strictEqual(typeof p.G.current().finishedAt, 'number');
    assert.ok(p.do((G) => G.advanceFromTalk()));
    assert.strictEqual(p.G.current().step, 'gameover');
    assert.ok(p.do((G) => G.backToTitle()));
    assert.strictEqual(p.G.current(), null);
  });

  test('2人目で失敗しても敗北画面へ(途中ステージの失敗)', () => {
    const p = new Player();
    toBattle(p);
    p.do((G) => G.finishBattle(true)); p.do((G) => G.advanceFromTalk());
    p.do((G) => G.advanceFromMap()); p.do((G) => G.advanceFromTalk());
    p.do((G) => G.finishBattle(false)); p.do((G) => G.advanceFromTalk());
    assert.strictEqual(p.G.current().step, 'gameover');
  });

  test('告白判定の二重実行は無視される(同一ページ内の連打・遷移後の再実行)', () => {
    const p = new Player();
    toBattle(p);
    assert.strictEqual(p.G.finishBattle(true), true);
    assert.strictEqual(p.G.finishBattle(false), false);   // 同じページでの2回目(連打)
    p.reload();
    assert.strictEqual(p.G.finishBattle(false), false);   // 遷移後に戦闘結果だけ再送されても無効
    assert.strictEqual(p.G.current().lastResult, 'success');
  });

  test('ステップを飛ばす不正な遷移は無効', () => {
    const p = new Player();
    p.do((G) => G.newGame());
    assert.strictEqual(p.G.advanceFromMap(), false);   // intro 中に map の次へは進めない
    assert.strictEqual(p.G.finishBattle(true), false); // intro 中に告白結果は出せない
    assert.strictEqual(p.G.advanceFromTalk(), false);
    assert.strictEqual(p.G.current().step, 'intro');
  });

  test('ガード: 状態がなければタイトルへ / 別ステップなら正しい画面へ', () => {
    const p = new Player();
    assert.strictEqual(p.G.guard(['battle']), null);
    assert.strictEqual(p.nav.replaced.pop(), 'index.html');
    p.reload();                       // リダイレクト後は新しいページとして読み込み直される
    p.do((G) => G.newGame());
    assert.strictEqual(p.G.guard(['battle']), null);
    assert.strictEqual(p.nav.replaced.pop(), 'intro.html');
    p.reload();
    assert.ok(p.G.guard(['intro']));
  });

  test('戻る操作の想定: 戦闘中に map.html を開いても、戦闘画面へ戻される', () => {
    const p = new Player();
    toBattle(p);
    assert.strictEqual(p.G.guard(['map']), null);
    assert.strictEqual(p.nav.replaced.pop(), 'battle.html');
  });

  test('降参でタイトルへ戻り、状態が破棄される', () => {
    const p = new Player();
    p.do((G) => G.newGame()); p.do((G) => G.advanceFromIntro());
    assert.ok(p.do((G) => G.surrender()));
    assert.strictEqual(p.G.current(), null);
    assert.strictEqual(p.nav.assigned.pop(), 'index.html');
  });

  test('降参後に新しくスタートすると、抽選・タイマーがやり直しになる', () => {
    const p = new Player();
    p.do((G) => G.newGame());
    const first = p.G.current().startedAt;
    p.do((G) => G.surrender());
    p.do((G) => G.newGame());
    assert.strictEqual(p.G.current().step, 'intro');
    assert.strictEqual(p.G.current().stageIndex, 0);
    assert.strictEqual(p.G.current().finishedAt, null);
    assert.ok(p.G.current().startedAt >= first);
  });

  test('壊れた保存データがあっても、クラッシュせず無視される', () => {
    const { ctx, store } = loadEnvironment();
    store[ctx.GAME_CONFIG.storageKey] = '{broken json';
    assert.strictEqual(ctx.Game.current(), null);
    store[ctx.GAME_CONFIG.storageKey] = JSON.stringify({ version: 1, step: 'nope', order: [] });
    assert.strictEqual(ctx.Game.current(), null);
  });

  test('ラスボス成功でタイマー停止 / 途中ステージ成功では停止しない', () => {
    const p = new Player();
    toBattle(p);
    p.do((G) => G.finishBattle(true));
    assert.strictEqual(p.G.current().finishedAt, null);   // 1人目成功: まだ計測中
    p.do((G) => G.advanceFromTalk()); p.do((G) => G.advanceFromMap()); p.do((G) => G.advanceFromTalk());
    p.do((G) => G.finishBattle(true));
    assert.strictEqual(p.G.current().finishedAt, null);   // 2人目成功: まだ計測中
    p.do((G) => G.advanceFromTalk()); p.do((G) => G.advanceFromMap()); p.do((G) => G.advanceFromTalk());
    p.do((G) => G.finishBattle(true));
    assert.strictEqual(typeof p.G.current().finishedAt, 'number'); // ラスボス成功: 停止
    const stopped = p.G.elapsedMs(p.G.current());
    const until = Date.now() + 30; while (Date.now() < until) { /* 30ms待つ */ }
    assert.strictEqual(p.G.elapsedMs(p.G.current()), stopped);      // 停止後は値が固定
  });

  test('計測中のタイムは時間とともに増え、ページ遷移しても途切れない', () => {
    const p = new Player();
    p.do((G) => G.newGame());
    const t1 = p.G.elapsedMs(p.G.current());
    const until = Date.now() + 30; while (Date.now() < until) { /* 30ms待つ */ }
    p.do((G) => G.advanceFromIntro());
    const t2 = p.G.elapsedMs(p.G.current());
    assert.ok(t2 >= t1 + 25, 't1=' + t1 + ' t2=' + t2);
  });

  test('ステージ表示は「ステージ 1-3」〜「ステージ 3-3」', () => {
    const { ctx } = loadEnvironment();
    assert.deepStrictEqual([0, 1, 2].map((i) => ctx.Game.stageLabel(i)), ['ステージ 1-3', 'ステージ 2-3', 'ステージ 3-3']);
  });
}

console.log('■ ストップウォッチ');
{
  const { ctx } = loadEnvironment();
  test('MM:SS:CC 形式に整形される', () => {
    assert.strictEqual(ctx.GameTimer.format(0), '00:00:00');
    assert.strictEqual(ctx.GameTimer.format(12340), '00:12:34');
    assert.strictEqual(ctx.GameTimer.format(61230), '01:01:23');
    assert.strictEqual(ctx.GameTimer.format(59999), '00:59:99');
    assert.strictEqual(ctx.GameTimer.format(6000000), '100:00:00');
    assert.strictEqual(ctx.GameTimer.format(-5), '00:00:00');
  });
}

console.log('\n' + passed + ' 件のテストが成功' + (process.exitCode ? '(失敗あり)' : ''));
