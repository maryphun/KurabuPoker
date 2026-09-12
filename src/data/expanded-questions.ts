import type { GameMode, HandAction, PlayerType, PokerQuestion, Position, Street } from '../types/assessment.ts'
import { positions } from '../types/assessment.ts'

type Scenario = {
  id: string; mode: GameMode; title: string; category: string; hero: Position; cards: string; board: string;
  line: string; context: string; lesson: string; types?: Partial<Record<Position, PlayerType>>; stack?: number;
  /** Authored teaching references: passive EV, minimum raise EV, preferred size, its EV, shove EV. */
  scores: [number, number, number, number, number]
}
const round = (n: number) => Math.round(n * 10000) / 10000
const headsUp = 'UTG fold, HJ fold, CO fold, BTN raise 2.5, SB fold, BB call 1.5'
const inPositionCaller = 'UTG fold, HJ fold, CO raise 2.5, BTN call 2.5, SB fold, BB fold'
const multiway = 'UTG fold, HJ fold, CO raise 2.5, BTN call 2.5, SB fold, BB call 1.5'

// Each record specifies a different decision, with an authored line and review lesson.
// EVs are editable teaching references, not solver calculations or measured population EVs.
const scenarios: Scenario[] = [
  { id: 'cash-open-button', mode: 'cash', title: 'ボタンまでフォールド', category: 'プリフロップ', hero: 'BTN', cards: 'Ks 9s', board: '', line: 'UTG fold, HJ fold, CO fold', context: 'ブラインドの2人は参加ハンドを絞る傾向があります。ここ数周、あなたからのスチールにはあまり抵抗していません。', types: { SB: 'TP', BB: 'TAG' }, lesson: '後ろに残る人数とブラインドの傾向を考えます。このスーテッドハンドでは、小さくオープンしてポジションを生かす方針を基準にしています。', scores: [.1, .6, 2.5, .85, -13] },
  { id: 'cash-utg-open', mode: 'cash', title: 'アーリーポジションの最初の判断', category: 'プリフロップ', hero: 'UTG', cards: 'Ad Qd', board: '', line: '', context: '後ろにはまだ5人います。COは積極的に3ベットし、BBはスーテッドハンドで広くディフェンスしています。', types: { CO: 'LAG', BB: 'LP' }, lesson: '強いスーテッドブロードウェイはオープン候補です。後ろの人数を意識しつつ、過大なサイズで弱いハンドをすべて降ろす必要はありません。', scores: [.8, 1.1, 2.5, 1.6, -8] },
  { id: 'cash-blind-defense', mode: 'cash', title: 'BBでスチールに向き合う', category: 'プリフロップ', hero: 'BB', cards: 'Qh Th', board: '', line: 'UTG fold, HJ fold, CO fold, BTN raise 2.5, SB fold', context: 'BTNはボタンから広くオープンします。ポストフロップでも小さいベットを多用します。', types: { BTN: 'LAG' }, lesson: 'すでに支払ったBBと追加コール額を区別します。プレーしやすいスーテッドハンドをコールに残す方針です。3ベットした後の大きなポットも比較しましょう。', scores: [.9, .1, 10, .65, -17] },
  { id: 'cash-squeeze', mode: 'cash', title: 'オープンとコールの後ろで', category: 'プリフロップ', hero: 'SB', cards: 'As Kc', board: '', line: 'UTG fold, HJ fold, CO raise 2.5, BTN call 2.5', context: 'COは広めにオープンし、BTNはコールで参加することが多い相手です。BBはまだアクションしていません。', types: { CO: 'LAG', BTN: 'LP', BB: 'TAG' }, lesson: '強いハンドでスクイーズを検討します。ポジションが悪くコーラーもいるため、ヘッズアップのインポジション3ベットより大きめのサイズを基準にします。', scores: [1.5, 1.7, 13, 3.1, -7] },
  { id: 'cash-facing-threebet', mode: 'cash', title: 'オープンに3ベットが返った', category: 'プリフロップ', hero: 'BTN', cards: 'Ah 5h', board: '', line: 'UTG fold, HJ fold, CO fold, BTN raise 2.5, SB fold, BB raise 10', context: 'BBは3ベットが多く、4ベットに対して一部のハンドを降りています。今回はあなたのボタンオープンにリレイズしました。', types: { BB: 'LAG' }, lesson: 'Aのブロッカーと相手の3ベット傾向から4ベット候補を考えます。全額を押し込むことと、フォールドする余地を残すサイズは別の選択です。', scores: [-.9, -.3, 24, .45, -9] },
  { id: 'cash-flop-dry-aggressor', mode: 'cash', title: 'ドライなフロップで先手を取る', category: 'フロップ・アグレッサー', hero: 'BTN', cards: 'Ac Qs', board: 'Ad 7c 2h', line: `${headsUp} | BB check`, context: 'BBはプリフロップを広くコールし、フロップでは弱いペアでも小さいベットに付いてきます。', types: { BB: 'LP' }, lesson: 'トップペアで弱いペアからのコールを狙います。乾いたボードでは大きなベットだけでなく、小さい継続ベットも比較します。', scores: [3.6, 3.9, 1.8, 4.3, -5] },
  { id: 'cash-flop-connected-aggressor', mode: 'cash', title: 'つながったボードとオーバーカード', category: 'フロップ・アグレッサー', hero: 'BTN', cards: 'As Kd', board: '9h 8h 7c', line: `${headsUp} | BB check`, context: 'BBはコネクターやギャッパーでディフェンスします。強いドローではチェックレイズも使います。', types: { BB: 'LAG' }, lesson: 'プリフロップの攻め手でも、すべてのボードでベットする必要はありません。相手につながりやすい盤面で、チェックバックを基準にしています。', scores: [1.2, .5, 3.5, -.8, -29] },
  { id: 'cash-flop-bb-caller', mode: 'cash', title: 'BBで小さなCベットを受ける', category: 'フロップ・コーラー', hero: 'BB', cards: 'Kh Jc', board: 'Ks 8d 3c', line: `${headsUp} | BB check, BTN bet 1.8`, context: 'BTNはプリフロップを広くオープンし、このようなフロップではハンドを問わず小さくベットする傾向があります。', types: { BTN: 'LAG' }, lesson: '相手の広いベットレンジを残したままコールできます。トップペアを常に大きくレイズしてしまうと、相手の弱いハンドを降ろしやすくなります。', scores: [4.3, 3.5, 7, 3.2, -18] },
  { id: 'cash-flop-ip-caller', mode: 'cash', title: 'ポジションを持ってドローを続ける', category: 'フロップ・コーラー', hero: 'BTN', cards: 'Jh Th', board: 'Qh 9c 2h', line: `${inPositionCaller} | CO bet 2`, context: 'COは強いハンドだけでなく、オーバーカードでも継続ベットします。レイズされたときは慎重になる相手です。', types: { CO: 'TAG' }, lesson: 'ストレートとフラッシュの両方へのドローがあります。コールでポジションを生かす線と、レイズでフォールドを狙う線を比較します。', scores: [2.5, 2.1, 8, 3.2, -6] },
  { id: 'cash-multiway-top-pair', mode: 'cash', title: '3人のポットでトップペア', category: 'マルチウェイ', hero: 'BTN', cards: 'Ad Jd', board: 'Ac Ts 7s', line: `${multiway} | BB check, CO bet 3`, context: 'COは複数人が残っているとベットするハンドを絞ります。BBはあなたの後ろに残り、まだベットへの判断をしていません。', types: { CO: 'TAG', BB: 'LP' }, lesson: 'トップペアでも、ベッターだけでなく後ろのBBを考慮します。ここではポットを急に膨らませず、コールを基準にします。', scores: [2.2, .5, 12, -.8, -28] },
  { id: 'cash-multiway-set', mode: 'cash', title: '3人のフロップでセット', category: 'マルチウェイ', hero: 'BB', cards: '7d 7c', board: 'Kh 7h 4s', line: `${multiway} | BB check, CO bet 3, BTN call 3`, context: 'COは強いペアでベットし、BTNはペアやドローで広くコールします。2人ともまだ十分なスタックを持っています。', types: { CO: 'TAG', BTN: 'LP' }, lesson: 'セットで複数の相手からバリューを狙える場面です。ドローがある盤面で、コールだけで進める線と大きめのレイズを比較します。', scores: [11, 12, 15, 17, 7] },
  { id: 'cash-multiway-air', mode: 'cash', title: '2人にコールされたオープン', category: 'マルチウェイ', hero: 'CO', cards: 'Ah Qc', board: 'Js 9s 6d', line: `${multiway} | BB check`, context: 'BTNはペアやドローを簡単には降りません。BBも広いレンジで参加しており、あなたの後ろにはBTNのアクションが残っています。', types: { BTN: 'LP', BB: 'LP' }, lesson: '2人を相手にしたブラフはヘッズアップと同じには扱えません。この盤面ではチェックして次の情報を得る方針を基準にします。', scores: [1.1, .4, 5, -1.6, -37] },
  { id: 'cash-turn-nut-draw', mode: 'cash', title: 'ターンでナッツドローを持つ攻め手', category: 'ターン・アグレッサー', hero: 'BTN', cards: 'Ah Jh', board: 'Kh 8c 3h 2d', line: `${headsUp} | BB check, BTN bet 2, BB call 2 | BB check`, context: 'BBはフロップを広くコールしますが、ターンの大きなベットには弱いペアを降ろしています。', types: { BB: 'TAG' }, lesson: '未完成のドローでも、相手のフォールドとリバーでの改善の両方を考えます。ここではターンのセミブラフを基準にしています。', scores: [1.1, 1.3, 6.5, 2.7, -15] },
  { id: 'cash-turn-pair-draw', mode: 'cash', title: 'ペアにドローが加わったターン', category: 'ターン・アグレッサー', hero: 'BTN', cards: '9h 8h', board: '9c 6h 2s 7h', line: `${headsUp} | BB check, BTN bet 2, BB call 2 | BB check`, context: 'BBは一度ペアを作ると粘る相手です。強いハンドでもチェックから入ることが多くあります。', types: { BB: 'LP' }, lesson: 'ペアと複数のドローを持ち、チェックにも価値があります。相手が降りにくいという情報から、無料でリバーを見る線を基準にしています。', scores: [4.1, 3.8, 6, 3.7, -11] },
  { id: 'cash-turn-pressure', mode: 'cash', title: 'ドローのままチェックレイズを受ける', category: 'ターン・アグレッサー', hero: 'BTN', cards: 'Qs Js', board: 'Ks 9d 3s 2c', line: `${headsUp} | BB check, BTN bet 2, BB call 2 | BB check, BTN bet 6, BB raise 20`, context: 'BBはチェックレイズが少なく、過去に見せたハンドはセットやツーペアが中心でした。', types: { BB: 'TP' }, lesson: '自分にドローがあることだけで継続を決めません。相手の強いレイズレンジと追加額を踏まえ、この教材ではフォールドを基準にします。', scores: [-2, -5, 48, -8, -19] },
  { id: 'mtt-open-cutoff', mode: 'tournament', title: 'COから参加するハンド', category: 'プリフロップ', hero: 'CO', cards: 'Kd Jd', board: '', line: 'UTG fold, HJ fold', context: 'トーナメント序盤。BTNは参加ハンドを絞り、ブラインドの2人も大きなポットを避けています。', stack: 40, types: { BTN: 'TP', SB: 'TP', BB: 'TAG' }, lesson: '後ろの相手と残りスタックを確認し、小さいオープンで参加する線を基準にします。まだ深さがあるため、いきなり全額を投じる必要はありません。', scores: [.1, .5, 2.2, .75, -7] },
  { id: 'mtt-short-button', mode: 'tournament', title: 'ショートスタックのボタン', category: 'プリフロップ', hero: 'BTN', cards: '6c 6d', board: '', line: 'UTG fold, HJ fold, CO fold', context: 'トーナメント序盤。ブラインドはタイトですが、小さなオープンにはリスチールを使います。', stack: 12, types: { SB: 'TAG', BB: 'TAG' }, lesson: '浅いスタックでは、オープン後にレイズされた場合の計画が重要です。この場面はオールインを教材の基準にしています。', scores: [-.15, .25, 2.4, .4, .8] },
  { id: 'mtt-defend-suited', mode: 'tournament', title: 'ミニレイズにBBで対応する', category: 'プリフロップ', hero: 'BB', cards: 'Js 8s', board: '', line: 'UTG fold, HJ fold, CO fold, BTN raise 2, SB fold', context: 'トーナメント序盤。BTNは広くオープンし、ポストフロップでも積極的にベットします。', stack: 30, types: { BTN: 'LAG' }, lesson: '小さな追加額とスーテッドハンドのプレーしやすさを評価します。ここではコールを基準にし、浅めのスタックで不用意に3ベットする線と比較します。', scores: [.55, -.1, 7, .2, -5] },
  { id: 'mtt-reshove', mode: 'tournament', title: 'スチールにリスチールを返す', category: 'プリフロップ', hero: 'SB', cards: 'Ad Qc', board: '', line: 'UTG fold, HJ fold, CO fold, BTN raise 2.2', context: 'トーナメント序盤。BTNは頻繁にスチールしています。BBは強いハンドを待つ傾向があります。', stack: 18, types: { BTN: 'LAG', BB: 'TP' }, lesson: 'ポジションの悪さと浅いスタックを踏まえ、強いハンドでのリスチールを検討します。ここではオールインを基準にしています。', scores: [.4, .6, 7, 1.1, 1.6] },
  { id: 'mtt-facing-tight-shove', mode: 'tournament', title: 'アーリーからのプッシュ', category: 'プリフロップ', hero: 'BB', cards: 'Ac 7d', board: '', line: 'UTG all-in 16, HJ fold, CO fold, BTN fold, SB fold', context: 'トーナメント序盤。UTGはこれまで参加が少なく、アーリーポジションでは特にハンドを絞っています。', stack: 16, types: { UTG: 'TP' }, lesson: 'Aを持っていることだけでコールを決めません。相手の位置とプッシュレンジを考え、この場面はフォールドを基準にします。', scores: [-2.4, 0, 0, 0, -2.4] },
  { id: 'mtt-flop-high-card', mode: 'tournament', title: 'ハイカードボードでCベット', category: 'フロップ・アグレッサー', hero: 'BTN', cards: 'As Td', board: 'Ah 6d 2c', line: `${headsUp} | BB check`, stack: 35, context: 'トーナメント序盤。BBは低いペアやスーテッドハンドでコールし、弱いペアでも小さいベットに付いてきます。', types: { BB: 'LP' }, lesson: 'トップペアで小さい継続ベットを基準にします。相手の弱いペアを残しながら、次のストリートのサイズを考えます。', scores: [3.2, 3.5, 1.8, 3.9, -2] },
  { id: 'mtt-flop-underpair', mode: 'tournament', title: 'オーバーカードが2枚落ちた', category: 'フロップ・アグレッサー', hero: 'BTN', cards: '8h 8d', board: 'Kc Qh 4s', line: `${headsUp} | BB check`, stack: 30, context: 'トーナメント序盤。BBはブロードウェイを多くコールに残し、トップペアを簡単には降ろしません。', types: { BB: 'LP' }, lesson: '小さいペアにはショーダウンの価値もあります。強いハンドにコールされ、弱いハンドだけを降ろすベットにならないか考えます。', scores: [1.4, .9, 3, .5, -9] },
  { id: 'mtt-flop-second-pair', mode: 'tournament', title: 'BBでセカンドペアを守る', category: 'フロップ・コーラー', hero: 'BB', cards: 'Qd 9d', board: 'Ks Qc 5h', line: `${headsUp} | BB check, BTN bet 1.5`, stack: 35, context: 'トーナメント序盤。BTNは広いレンジで小さいCベットを打ちます。ターンではベットを諦めることもあります。', types: { BTN: 'LAG' }, lesson: '小さいベットに対して、トップペア以外も継続候補です。セカンドペアで相手のブラフを残すコールを基準にしています。', scores: [1.3, .3, 6, -.2, -12] },
  { id: 'mtt-flop-position-draw', mode: 'tournament', title: 'インポジションでガットショット', category: 'フロップ・コーラー', hero: 'BTN', cards: 'Ad Jd', board: 'Kd Qs 4c', line: `${inPositionCaller} | CO bet 2`, stack: 40, context: 'トーナメント序盤。COはポケットペアやブロードウェイでオープンします。小さいCベットには弱いハンドも混ざります。', types: { CO: 'TAG' }, lesson: 'ガットショットだけでなく、オーバーカードとバックドアの改善も考えます。ポジションを生かすコールを教材の基準にしています。', scores: [.8, .3, 7, .55, -10] },
  { id: 'mtt-multiway-overpair', mode: 'tournament', title: 'オーバーペアで3人のフロップ', category: 'マルチウェイ', hero: 'CO', cards: 'Qc Qd', board: 'Jh 8h 3c', line: `${multiway} | BB check`, stack: 40, context: 'トーナメント序盤。BTNとBBはペアやドローでコールすることが多く、まだ2人とも残っています。', types: { BTN: 'LP', BB: 'LP' }, lesson: '複数人が相手でも、強いハンドではバリューを取りにいきます。ドローがある盤面で、適度なサイズのベットを基準にしています。', scores: [5.2, 5.8, 5, 7.1, 1] },
  { id: 'mtt-multiway-draw', mode: 'tournament', title: 'ベットとコールの後ろのドロー', category: 'マルチウェイ', hero: 'BB', cards: 'As 5s', board: 'Ks 9s 2d', line: `${multiway} | BB check, CO bet 2.5, BTN call 2.5`, stack: 35, context: 'トーナメント序盤。COは複数人が残るとベットレンジを絞ります。BTNはペアやドローでコールを続けます。', types: { CO: 'TAG', BTN: 'LP' }, lesson: '2人の継続レンジと残りスタックを考慮します。ナッツフラッシュへのドローをコールで続ける線を基準にし、両者を降ろす難しさも比較します。', scores: [1.8, 1.1, 11, 1.4, -5] },
  { id: 'mtt-multiway-weak-pair', mode: 'tournament', title: '強いアクションに挟まれる', category: 'マルチウェイ', hero: 'BTN', cards: 'Th 9h', board: 'Ts 8c 6c', line: `${multiway} | BB bet 4, CO raise 12`, stack: 40, context: 'トーナメント序盤。BBは普段チェックから入り、COも複数人相手のレイズは少ないプレイヤーです。', types: { BB: 'TP', CO: 'TAG' }, lesson: 'トップペアでもキッカーと盤面、2人の強いアクションを合わせて評価します。この教材ではフォールドを基準にします。', scores: [-4.2, -7, 26, -8, -13] },
  { id: 'mtt-turn-flush-barrel', mode: 'tournament', title: 'ターンでフラッシュドローを得る', category: 'ターン・アグレッサー', hero: 'BTN', cards: 'Ac Tc', board: 'Kc 7d 3h 2c', line: `${headsUp} | BB check, BTN bet 2, BB call 2 | BB check`, stack: 35, context: 'トーナメント序盤。BBはフロップを広くコールしますが、ターンで強く押されると弱いペアを降ろしています。', types: { BB: 'TAG' }, lesson: 'ターンで増えた改善の可能性と相手のフォールドを狙います。ここではセカンドバレルを基準にします。', scores: [.8, 1, 6, 2, -6] },
  { id: 'mtt-turn-straight-barrel', mode: 'tournament', title: 'ターンのオープンエンド', category: 'ターン・アグレッサー', hero: 'BTN', cards: 'Qh Jh', board: 'Td 9c 3h 2s', line: `${headsUp} | BB check, BTN bet 2, BB call 2 | BB check`, stack: 30, context: 'トーナメント序盤。BBはフロップをミドルペアでもコールしますが、ターンの大きめのベットには慎重です。', types: { BB: 'TP' }, lesson: '両端のストレートドローを持つターンです。フォールドを引き出す線と、チェックでカードを見る線を比較します。', scores: [.5, .7, 6.5, 1.6, -7] },
  { id: 'mtt-turn-combo-control', mode: 'tournament', title: 'ショーダウン価値とドローの両立', category: 'ターン・アグレッサー', hero: 'BTN', cards: 'Ts 9s', board: 'Th 7s 2c 8s', line: `${headsUp} | BB check, BTN bet 2, BB call 2 | BB check`, stack: 28, context: 'トーナメント序盤。BBはペアを持つとあまりフォールドせず、強いハンドでもチェックを多用します。', types: { BB: 'LP' }, lesson: 'ペアと強いドローが共存します。相手が降りにくい場面では、残りスタックを意識してチェックバックする線も大切です。', scores: [4.4, 4, 6, 4.1, -2] },
]

function buildScenario(s: Scenario): PokerQuestion {
  const initial = s.stack ?? (s.mode === 'cash' ? 100 : 40)
  const remaining = Object.fromEntries(positions.map(p => [p, initial])) as Record<Position, number>
  const active = new Set(positions), contributions = Object.fromEntries(positions.map(p => [p, 0])) as Record<Position, number>
  const actions: HandAction[] = [], streets: Street[] = ['preflop', 'flop', 'turn', 'river']
  let pot = 0, street: Street = 'preflop', highest = 0, lastRaise = 1
  function add(position: Position, action: HandAction['action'], amountBb = 0) {
    actions.push({ position, action, amountBb, street })
    remaining[position] = round(remaining[position] - amountBb); pot = round(pot + amountBb)
    contributions[position] = round(contributions[position] + amountBb)
    if (action === 'fold') active.delete(position)
    if (contributions[position] > highest) {
      if (action !== 'post') lastRaise = Math.max(lastRaise, round(contributions[position] - highest))
      highest = contributions[position]
    }
  }
  add('SB', 'post', .5); add('BB', 'post', 1)
  s.line.split('|').forEach((roundText, index) => {
    street = streets[index]!
    if (index) { highest = 0; lastRaise = 1; positions.forEach(p => { contributions[p] = 0 }); actions.push({ position: 'dealer', action: 'deal', amountBb: 0, street }) }
    roundText.split(',').map(v => v.trim()).filter(Boolean).forEach(text => {
      const [position, action, amount] = text.split(/\s+/)
      add(position as Position, action as HandAction['action'], Number(amount ?? 0))
    })
  })
  const invested = contributions[s.hero], toCall = round(Math.min(remaining[s.hero], highest - invested))
  const min = round(highest + lastRaise), max = round(invested + remaining[s.hero])
  const canRaise = remaining[s.hero] > toCall && [...active].some(p => p !== s.hero && remaining[p] > 0)
  const [passEv, minEv, target, targetEv, shoveEv] = s.scores
  const options: PokerQuestion['options'] = []
  if (toCall) options.push({ id: 'fold', action: 'fold', label: 'フォールド', evBb: 0, explanation: `追加のチップを投じずに降ります。${s.lesson}` })
  options.push({ id: toCall ? 'call' : 'check', action: toCall ? 'call' : 'check', label: toCall ? `${toCall} bb コール` : 'チェック', evBb: passEv, explanation: s.lesson })
  if (canRaise) {
    if (min < max) {
      const knots = [[min, minEv], ...(target > min && target < max ? [[target, targetEv]] : []), [max, shoveEv]]
      knots.forEach(([size, ev], index) => options.push({ id: `size-${index}`, action: 'raise', sizeBb: size!, label: `${size} bb ${toCall ? 'レイズ' : 'ベット'}`, evBb: ev!, explanation: s.lesson }))
    }
    options.push({ id: 'all-in', action: 'all-in', label: 'オールイン', evBb: shoveEv, explanation: `残りスタックをすべて投入する線です。${s.lesson}` })
  }
  return { id: s.id, mode: s.mode, enabled: true, title: s.title, category: s.category, difficulty: s.category === 'プリフロップ' ? 'basic' : 'intermediate', street,
    heroPosition: s.hero, heroCards: s.cards.split(' ') as [string, string], board: s.board ? s.board.split(' ') : [],
    potBb: pot, effectiveStackBb: remaining[s.hero], toCallBb: toCall, heroInvestedBb: invested, ...(canRaise && min < max ? { minRaiseToBb: min } : {}),
    opponents: positions.filter(p => p !== s.hero).map((p, i) => ({ position: p, type: s.types?.[p] ?? (['TAG', 'LP', 'TP', 'LAG'] as PlayerType[])[i % 4]!, stackBb: remaining[p], inHand: active.has(p) })),
    context: s.context, prompt: 'この状況で、どうアクションしますか？', actions,
    history: actions.some(a => a.action !== 'post' && a.action !== 'deal') ? actions.filter(a => a.action !== 'post' && a.action !== 'deal').map(a => `${a.position} ${a.action}${a.amountBb ? ` ${a.amountBb} bb` : ''}`) : ['ブラインドが入り、あなたのアクションです。'], options,
    evBasis: 'この問題のEVは、解説の方針を練習するために作成者が設定した暫定の教材基準値です。ソルバーや実測データによる推定値ではありません。サイズ間は基準点のEVを直線補間します。結果のEVロスは、この教材基準からの差です。公開教材として使う際は、想定レンジと全アクションのEVを検証・調整してください。',
  }
}

export const expandedQuestions = scenarios.map(buildScenario)

