import type { GameMode, HandAction, PlayerType, PokerQuestion, Position, QuestionBank, Street } from '../types/assessment.ts'
import { positions } from '../types/assessment.ts'
import { expandedQuestions } from './expanded-questions.ts'

const round = (value: number) => Math.round(value * 10000) / 10000
function opponents(position: Position, villain: Position, type: PlayerType, stack: number) {
  return positions.filter(seat => seat !== position).map((seat, index) => ({ position: seat,
    type: seat === villain ? type : (['TAG', 'LP', 'TP', 'LAG'] as PlayerType[])[index % 4]!,
    stackBb: seat === villain ? 0 : stack, inHand: seat === villain }))
}

function callQuestion(id: string, mode: GameMode, title: string, type: PlayerType, cards: [string, string], board: string[], pot: number, call: number, equity: number, context: string): PokerQuestion {
  const ev = round(equity * (pot + call) - call)
  return { id, enabled: true, mode, title, category: board.length ? 'ポットオッズ' : 'プリフロップ', difficulty: 'basic',
    street: board.length === 5 ? 'river' : board.length === 4 ? 'turn' : 'preflop',
    heroPosition: 'BB', heroCards: cards, board, effectiveStackBb: call, potBb: pot, toCallBb: call,
    opponents: opponents('BB', 'BTN', type, mode === 'cash' ? 100 : 25),
    context: `${context} この問題では相手のレンジに対する勝率を${Math.round(equity * 100)}%と仮定します。引き分け・レーキは考慮しません。`,
    history: ['他の4人はフォールド。BTNとあなたのヘッズアップ。', `BTNがオールイン。現在のポットは相手のベットを含めて${pot} bb。`, `あなたの残りスタックとコール額はともに${call} bb。`],
    prompt: 'このレンジとポットオッズなら、どうしますか？',
    evBasis: `フォールドを0 bbとする意思決定時点のチップEV。コールEV = 勝率 × (現在のポット + コール額) − コール額 = ${equity} × (${pot} + ${call}) − ${call} = ${ev} bb。勝率は教材上の仮定です。${mode === 'tournament' ? '賞金EV（ICM）は含みません。' : ''}`,
    options: [
      { id: 'fold', label: 'フォールド', evBb: 0, explanation: ev > 0 ? 'コールにはプラスのEVがあります。フォールドすると、その期待値を取り逃がします。' : 'この仮定では勝率が必要勝率に届かないため、追加のチップを投じない選択が有利です。' },
      { id: 'call', label: `${call} bb コール`, evBb: ev, explanation: `必要勝率は${round(call / (pot + call) * 100).toFixed(1)}%。仮定した勝率${Math.round(equity * 100)}%は${ev > 0 ? 'これを上回るので、コールが有利です。' : 'これを下回るので、コールはマイナスEVです。'}` },
    ] }
}

function betQuestion(id: string, mode: GameMode, bluff: boolean, type: PlayerType, pot: number, rates: [number, number]): PokerQuestion {
  const small = pot / 2, large = pot
  const ev = (bet: number, fold: number) => round(bluff ? fold * pot - (1 - fold) * bet : pot + (1 - fold) * bet)
  return { id, enabled: true, mode, title: bluff ? 'フォールド率を読む' : 'バリューを引き出すサイズ',
    category: bluff ? '相手への対応' : 'ベットサイズ', difficulty: 'intermediate', street: 'river',
    heroPosition: 'BTN', heroCards: bluff ? ['8h', '7h'] : ['As', 'Ks'], board: bluff ? ['Ah', 'Kd', '9c', '2s', '3d'] : ['Qs', 'Js', 'Ts', '4d', '2c'],
    effectiveStackBb: pot * 2, potBb: pot, toCallBb: 0,
    opponents: opponents('BTN', 'BB', type, pot * 2).map(opponent => ({ ...opponent, stackBb: pot * 2 })),
    context: bluff ? `相手はBB。リバーまで来ましたが、あなたのドローは完成しませんでした。この問題ではショーダウン勝率を0%と仮定します。相手はハーフポットに${rates[0] * 100}%、ポットベットに${rates[1] * 100}%の確率でフォールドします。` : `あなたはロイヤルフラッシュ。相手はBBでチェックしました。ハーフポットに${rates[0] * 100}%、ポットベットに${rates[1] * 100}%の確率でフォールドすると仮定します。`,
    history: ['他の4人はフォールド。BTNとBBのヘッズアップ。', `リバーのポットは${pot} bb。BBはチェック。`, '相手はベットに対してコールかフォールドのみを選び、レイズしないと仮定します。'],
    prompt: 'この相手の反応を踏まえて、どのアクションを選びますか？',
    evBasis: bluff ? 'チェックEVは0。ブラフEV = フォールド率 × 現在のポット − コール率 × ベット額。コールされたときの勝率は0%。反応率は教材上の仮定です。' : 'チェックEVは現在のポット額。ベットEV = 現在のポット + コール率 × ベット額。勝率100%、引き分け・レーキなし。反応率は教材上の仮定です。',
    options: [
      { id: 'check', label: 'チェック', evBb: bluff ? 0 : pot, explanation: bluff ? 'ショーダウン勝率0%なのでチェックのEVは0です。ブラフのEVがプラスになるかを比べます。' : '確実に現在のポットを獲得しますが、相手から追加のコールを引き出す機会はありません。' },
      { id: 'half', label: `${small} bb ベット`, evBb: ev(small, rates[0]), explanation: `ハーフポットへのフォールド率は${rates[0] * 100}%。仮定した反応率から計算するとEVは${ev(small, rates[0])} bbです。` },
      { id: 'pot', label: `${large} bb ベット`, evBb: ev(large, rates[1]), explanation: `ポットベットへのフォールド率は${rates[1] * 100}%。仮定した反応率から計算するとEVは${ev(large, rates[1])} bbです。` },
    ] }
}

// Initial teaching examples. The browser editor works on complete, editable records.
// These are transparent mathematical scenarios, not solver-generated ranges.
export const legacyBank: QuestionBank = { version: 1, questions: [
  callQuestion('cash-lag-river', 'cash', '積極的な相手のリバーベット', 'LAG', ['Ac', 'Jh'], ['Ad', '9s', '7c', '4h', '2d'], 45, 15, .4, '幅広いレンジで攻める相手にトップペアを持っています。'),
  callQuestion('cash-tp-river', 'cash', '慎重な相手からのオールイン', 'TP', ['Kh', 'Qd'], ['Ks', 'Jc', '8d', '3h', '2c'], 60, 30, .2, '普段はパッシブな相手がリバーでオールインしました。'),
  callQuestion('cash-tag-turn', 'cash', 'ターンのフラッシュドロー', 'TAG', ['Ah', 'Qh'], ['Jh', '8h', '4c', '2s'], 30, 20, .25, '相手がターンでオールインしました。コール後の追加ベットはありません。'),
  callQuestion('cash-lp-river', 'cash', '小さなベットとポットオッズ', 'LP', ['Qh', 'Jc'], ['Qs', '9d', '6c', '4h', '2d'], 50, 10, .3, 'コールが多い相手ですが、今回は小さな残りスタックをオールインしています。'),
  betQuestion('cash-tp-bluff', 'cash', true, 'TP', 20, [.65, .75]),
  betQuestion('cash-lp-value', 'cash', false, 'LP', 20, [.1, .25]),
  callQuestion('mtt-lag-shove', 'tournament', 'ショートスタックのスチール', 'LAG', ['Ad', '9c'], [], 13.5, 11, .52, '序盤の6人卓。BTNが12 bbをオールイン。あなたはBBを1 bb支払済み、SBの0.5 bbが残っています。アンティはありません。'),
  callQuestion('mtt-tag-shove', 'tournament', 'タイトなレンジとの勝率比較', 'TAG', ['Ah', '8d'], [], 21.5, 19, .38, '序盤の6人卓。BTNが20 bbをオールイン。あなたはBBを1 bb支払済みです。アンティはありません。'),
  callQuestion('mtt-lp-turn', 'tournament', '残りスタックと必要勝率', 'LP', ['Kh', 'Qh'], ['Jh', '9h', '3c', '2d'], 24, 8, .32, '賞金の影響を考えないチップEVの練習です。ターンで相手がオールインしました。'),
  callQuestion('mtt-tp-river', 'tournament', '強いレンジに降りる判断', 'TP', ['As', 'Td'], ['Ac', 'Qh', '9d', '6s', '3c'], 30, 15, .18, '普段あまりレイズしない相手がリバーでオールインしました。今回は賞金の影響を考えません。'),
  betQuestion('mtt-tag-bluff', 'tournament', true, 'TAG', 12, [.3, .6]),
  betQuestion('mtt-tp-value', 'tournament', false, 'TP', 12, [.2, .8]),
] }

function addReplay(q: PokerQuestion) {
  const actions: HandAction[] = []
  const push = (position: HandAction['position'], action: HandAction['action'], amountBb = 0, street: Street = 'preflop') => actions.push({ position, action, amountBb: round(amountBb), street })
  push('SB', 'post', .5); push('BB', 'post', 1)
  for (const p of ['UTG', 'HJ', 'CO'] as const) push(p, 'fold')
  if (q.street === 'preflop') {
    push('BTN', 'all-in', q.toCallBb + 1); push('SB', 'fold')
    q.heroInvestedBb = 1
  } else {
    const previousPot = q.potBb - q.toCallBb
    const open = (previousPot - .5) / 2
    push('BTN', 'raise', open); push('SB', 'fold'); push('BB', 'call', open - 1)
    for (const street of ['flop', 'turn', 'river'] as const) {
      push('dealer', 'deal', 0, street)
      if (street === q.street) {
        if (q.heroPosition === 'BB') { push('BB', 'check', 0, street); push('BTN', 'all-in', q.toCallBb, street) }
        else push('BB', q.toCallBb ? 'bet' : 'check', q.toCallBb, street)
        break
      }
      push('BB', 'check', 0, street); push('BTN', 'check', 0, street)
    }
    q.heroInvestedBb = 0
  }
  q.actions = actions
  return q
}

function modernize(original: PokerQuestion): PokerQuestion {
  const q: PokerQuestion = JSON.parse(JSON.stringify(original))
  q.options.forEach(o => { if (o.id === 'fold' || o.id === 'call' || o.id === 'check') o.action = o.id })
  if (!q.toCallBb) {
    const small = q.options.find(o => o.id === 'half')!, pot = q.options.find(o => o.id === 'pot')!
    small.action = 'raise'; small.sizeBb = q.potBb / 2
    pot.action = 'raise'; pot.sizeBb = q.potBb
    q.minRaiseToBb = 1
    // Explicit educator-authored endpoints; intermediate sizes use linear EV interpolation.
    q.options.push({ id: 'min', action: 'raise', sizeBb: 1, label: '1 bb ベット', evBb: q.options[0]!.evBb, explanation: '最小サイズのEVをこの教材の基準点として設定しています。' })
    const allEv = round(pot.evBb - q.potBb * .15)
    q.options.push({ id: 'max', action: 'raise', sizeBb: q.effectiveStackBb, label: `${q.effectiveStackBb} bb ベット`, evBb: allEv, explanation: '最大サイズの教材基準値です。サイズ間は直線補間で評価します。' },
      { id: 'all-in', action: 'all-in', label: 'オールイン', evBb: allEv, explanation: 'スタック全額をベットした場合の教材基準値です。' })
    q.evBasis += ' 最小サイズと最大サイズは作成者が置いた練習用EV基準値です。全サイズのEVは基準点間の直線補間で、ソルバー出力ではありません。'
  }
  return addReplay(q)
}

function raiseQuestion(id: string, mode: GameMode, bluff: boolean, type: PlayerType, pot: number, foldRate: number): PokerQuestion {
  const q = betQuestion(id, mode, bluff, type, pot, [.3, foldRate])
  const call = pot / 2, max = pot * 2
  q.title = bluff ? `${type}へのリバーレイズ` : `${type}からのバリュー獲得`
  q.category = 'レイズサイズ'; q.toCallBb = call; q.potBb = pot + call; q.minRaiseToBb = call * 2
  q.opponents.find(p => p.position === 'BB')!.stackBb = max - call
  q.context = `${bluff ? 'ショーダウン勝率0%のブラフ候補です。' : 'ロイヤルフラッシュで勝率100%です。'} 相手はレイズにコールかフォールドのみ。最小レイズへのフォールド率は${Math.round(foldRate * 100)}%、オールインには${Math.round(Math.min(.95, foldRate + .15) * 100)}%と仮定します。レーキ・引き分けは含みません。`
  const ev = (size: number, rate: number) => round(bluff ? rate * q.potBb - (1 - rate) * size : q.potBb + (1 - rate) * (size - call))
  const minEv = ev(call * 2, foldRate), maxEv = ev(max, Math.min(.95, foldRate + .15))
  q.options = [
    { id: 'fold', action: 'fold', label: 'フォールド', evBb: 0, explanation: '意思決定時点の追加EVを0とします。' },
    { id: 'call', action: 'call', label: `${call} bb コール`, evBb: bluff ? -call : q.potBb, explanation: '勝率と現在のポットからコールEVを計算しています。' },
    { id: 'min', action: 'raise', sizeBb: call * 2, label: `${call * 2} bbへレイズ`, evBb: minEv, explanation: '最小レイズへの反応率から計算した基準EVです。' },
    { id: 'max', action: 'raise', sizeBb: max, label: `${max} bbへレイズ`, evBb: maxEv, explanation: 'オールインへの反応率から計算した基準EVです。' },
    { id: 'all-in', action: 'all-in', label: 'オールイン', evBb: maxEv, explanation: '最大サイズのレイズと同じEVです。' },
  ]
  q.evBasis = `ブラフ：F × 現在のポット − (1−F) × レイズ総額。勝率100%：現在のポット + (1−F) × (レイズ総額−コール額)。Fは教材の仮定です。サイズ間はEVを直線補間します。ソルバー出力ではありません。${mode === 'tournament' ? 'チップEVのみ、ICMは含みません。' : ''}`
  return addReplay(q)
}

export const revisionTwoBank: QuestionBank = { version: 1, revision: 2, questions: [
  ...legacyBank.questions.map(modernize),
  ...(['cash', 'tournament'] as const).flatMap(mode => {
    const pot = mode === 'cash' ? 20 : 10
    return [
      raiseQuestion(`${mode}-raise-lag`, mode, true, 'LAG', pot, .6),
      raiseQuestion(`${mode}-raise-tp`, mode, true, 'TP', pot * 1.5, .2),
      raiseQuestion(`${mode}-raise-lp`, mode, false, 'LP', pot, .15),
      raiseQuestion(`${mode}-raise-tag`, mode, false, 'TAG', pot * 1.5, .65),
      modernize(betQuestion(`${mode}-lag-bluff`, mode, true, 'LAG', pot * 1.2, [.35, .55])),
      modernize(betQuestion(`${mode}-tag-value`, mode, false, 'TAG', pot * 1.2, [.3, .5])),
    ]
  }),
] }

/** Upgrade untouched examples only; never overwrite custom content or resurrect deleted old examples. */
function upgradeToTwo(saved: QuestionBank): QuestionBank {
  if (saved.revision === 2) return saved
  const questions = saved.questions.map(q => {
    const original = legacyBank.questions.find(old => old.id === q.id)
    return original && JSON.stringify(q) === JSON.stringify(original) ? revisionTwoBank.questions.find(next => next.id === q.id)! : q
  })
  const oldIds = new Set(legacyBank.questions.map(q => q.id))
  const ids = new Set(questions.map(q => q.id))
  // Append new examples only to banks that still contain the original starter collection.
  if (legacyBank.questions.every(old => ids.has(old.id))) questions.push(...revisionTwoBank.questions.filter(q => !oldIds.has(q.id) && !ids.has(q.id)))
  return JSON.parse(JSON.stringify({ ...saved, revision: 2, questions }))
}

const revisedContexts: Record<string, string> = {
  'cash-lag-river': 'BTNは幅広いハンドで参加し、ドローが完成しないリバーでもブラフを続けることがあります。',
  'cash-tp-river': 'BTNは普段コールが多く、大きなベットをしたときは強いハンドを見せることが多い相手です。',
  'cash-tag-turn': 'BTNは強いペアやセットを積極的にプレーします。今回はターンで残りスタックを押し込んでいます。',
  'cash-lp-river': 'BTNは普段コールが多い相手です。残りスタックが少なくなり、今回はリバーで押し込んできました。',
  'mtt-lag-shove': 'トーナメント序盤。BTNはボタンから頻繁にスチールしています。あなたはBBを支払っており、SBはフォールドしました。',
  'mtt-tag-shove': 'トーナメント序盤。BTNは参加ハンドを絞り、浅いスタックでは強いAやポケットペアを積極的にプレーします。',
  'mtt-lp-turn': 'トーナメント序盤。BTNは広くコールしますが、今回はターンで残りスタックを押し込んできました。',
  'mtt-tp-river': 'トーナメント序盤。BTNは大きなベットが少なく、強いハンドが完成したときに積極的になる相手です。',
}
const tendencies: Record<PlayerType, string> = {
  LAG: '幅広いハンドで参加し、弱いハンドでも積極的にベットします。レイズに対しては一部のハンドを降ろすこともあります。',
  LP: 'ペアを作ると粘り強くコールします。自分から大きくベットすることは少ない相手です。',
  TAG: '参加ハンドを絞り、強いハンドやドローを積極的にプレーします。大きなレイズには慎重です。',
  TP: '参加ハンドを絞り、大きなポットを避ける傾向があります。強く抵抗するときは注意が必要です。',
}

/** Remove answer-giving probabilities and modeling caveats from the decision text. */
export function cleanDecisionContext(context: string): string {
  return context.split(/(?<=。)/).filter(sentence => !/(?:勝率|フォールド率|確率).*\d|レーキ|引き分け|賞金.*(?:含み|考え)|チップEVの練習/.test(sentence)).join('').trim()
}
function reviseQuestion(q: PokerQuestion): PokerQuestion {
  const old = revisionTwoBank.questions.find(p => p.id === q.id)
  let context = cleanDecisionContext(q.context)
  // Replace stock wording field-by-field; preserve custom titles, EVs, actions and opponent types.
  if (old && q.context === old.context) {
    const opponent = q.opponents.find(p => p.inHand)!
    context = revisedContexts[q.id] ?? `${q.mode === 'tournament' ? 'トーナメント序盤。' : ''}${opponent.position}は${tendencies[opponent.type]}`
  }
  return { ...q, context: context || '相手の傾向とアクション履歴を確認して判断してください。' }
}
export const defaultBank: QuestionBank = { version: 1, revision: 3, questions: [...revisionTwoBank.questions.map(reviseQuestion), ...expandedQuestions] }

export function upgradeBank(saved: QuestionBank): QuestionBank {
  if ((saved.revision ?? 0) >= 3) return saved
  const previous = saved.revision === 2 ? saved : upgradeToTwo(saved)
  const questions = previous.questions.map(reviseQuestion)
  const ids = new Set(questions.map(q => q.id))
  // New IDs only, once. Never restore a deleted question or replace custom scoring.
  questions.push(...expandedQuestions.filter(q => !ids.has(q.id)))
  return JSON.parse(JSON.stringify({ ...previous, revision: 3, questions }))
}
