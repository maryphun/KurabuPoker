import type { AnswerOption, HandAction, PokerQuestion, Position, Street } from '../types/assessment.ts'
import { positions, streetLabels } from '../types/assessment.ts'

export const actionLabels = { fold: 'フォールド', check: 'チェック', call: 'コール', bet: 'ベット', raise: 'レイズ', 'all-in': 'オールイン', post: 'ブラインド', deal: '配札' }
export const streetOrder: Street[] = ['preflop', 'flop', 'turn', 'river']
export function actionLabel(action: HandAction) {
  return action.action === 'deal' ? streetLabels[action.street] : `${action.position} · ${actionLabels[action.action]}${action.amountBb ? ` ${action.amountBb}BB` : ''}`
}

/** Reconstruct from the authored final snapshot; replay never mutates a question. */
export function replayState(question: PokerQuestion, cursor: number, options?: { skipPosts?: boolean }) {
  const authoredActions = question.actions ?? []
  const actions = options?.skipPosts ? authoredActions.filter(action => action.action !== 'post') : authoredActions
  const step = Math.max(0, Math.min(cursor, actions.length))
  const pending = actions.slice(step)
  const played = actions.slice(0, step)
  const lastDeal = played.reduce((latest, action, index) => action.action === 'deal' ? index : latest, -1)
  const lastActions = played.slice(lastDeal + 1).reduce<Partial<Record<Position, HandAction>>>((result, action) => {
    if (action.action !== 'deal' && action.action !== 'post') result[action.position as Position] = action
    return result
  }, {})
  const seats = positions.map(position => {
    const opponent = question.opponents.find(p => p.position === position)
    const hero = position === question.heroPosition
    return { position, hero, type: opponent?.type, stackBb: (hero ? question.effectiveStackBb : opponent!.stackBb) + pending.filter(a => a.position === position).reduce((sum, a) => sum + a.amountBb, 0),
      inHand: hero || opponent!.inHand || pending.some(a => a.position === position && a.action === 'fold') }
  })
  const street = actions.length ? (actions[Math.max(0, step - 1)]?.street ?? 'preflop') : question.street
  const count = { preflop: 0, flop: 3, turn: 4, river: 5 }[street]
  return { seats, street, board: question.board.slice(0, count), potBb: question.potBb - pending.reduce((sum, a) => sum + a.amountBb, 0), current: step ? actions[step - 1] : undefined, lastActions }
}

export function raisePoints(question: PokerQuestion) {
  return question.options.filter(o => o.action === 'raise' && o.sizeBb !== undefined).sort((a, b) => a.sizeBb! - b.sizeBb!)
}
export function raiseEv(question: PokerQuestion, size: number): AnswerOption {
  const points = raisePoints(question), first = points[0], last = points.at(-1)
  if (!first || !last || !Number.isFinite(size) || size < first.sizeBb! || size > last.sizeBb!) throw new Error('レイズ額が設定範囲外です。')
  const high = points.find(p => p.sizeBb! >= size)!, low = [...points].reverse().find(p => p.sizeBb! <= size)!
  const ratio = high.sizeBb === low.sizeBb ? 0 : (size - low.sizeBb!) / (high.sizeBb! - low.sizeBb!)
  return { id: 'sized-raise', action: 'raise', sizeBb: size, label: `${question.toCallBb ? 'レイズ' : 'ベット'} ${size} bb`, evBb: low.evBb + (high.evBb - low.evBb) * ratio,
    explanation: `${size} bbの基準EVは、作成者が設定したサイズ別EVの間を直線で補間しています。${low.explanation}` }
}
export function decisionChoices(question: PokerQuestion) {
  const byAction = (action: AnswerOption['action']) => question.options.find(o => o.action === action)
  const points = raisePoints(question)
  const call = byAction(question.toCallBb ? 'call' : 'check')
  const canRaise = points.length > 1 && question.opponents.some(p => p.inHand && p.stackBb > 0)
  const allIn = byAction('all-in') ?? (question.toCallBb === question.effectiveStackBb ? call : undefined)
  return [
    { key: 'raise', label: question.toCallBb ? 'レイズ' : 'ベット', english: question.toCallBb ? 'Raise' : 'Bet', optionId: 'sized-raise', enabled: canRaise, detail: canRaise ? 'サイズを指定' : 'レイズ不可' },
    { key: 'all-in', label: 'オールイン', english: 'All-in', optionId: allIn?.id, enabled: !!allIn, detail: `${question.effectiveStackBb} bb` },
    { key: 'fold', label: 'フォールド', english: 'Fold', optionId: byAction('fold')?.id, enabled: question.toCallBb > 0 && !!byAction('fold'), detail: question.toCallBb ? 'ハンドを降りる' : 'チェックできます' },
    { key: 'call', label: question.toCallBb ? 'コール' : 'チェック', english: question.toCallBb ? 'Call' : 'Check', optionId: call?.id, enabled: !!call, detail: question.toCallBb ? `${question.toCallBb} bb` : '追加額なし' },
  ]
}

/** The minimum increase is the last full bet/raise, not necessarily Hero's call amount. */
export function minimumRaiseTo(question: PokerQuestion) {
  if (!question.actions?.length) return (question.heroInvestedBb ?? 0) + question.toCallBb + Math.max(1, question.toCallBb)
  let highest = 0, increment = 1
  const invested = Object.fromEntries(positions.map(p => [p, 0])) as Record<Position, number>
  for (const action of question.actions) {
    if (action.street !== question.street || action.position === 'dealer') continue
    const total = invested[action.position] + action.amountBb
    invested[action.position] = total
    if (total > highest) {
      if (action.action !== 'post') increment = Math.max(increment, total - highest)
      highest = total
    }
  }
  return Math.round((highest + increment) * 10000) / 10000
}

export function validateHand(question: PokerQuestion): string[] {
  const errors: string[] = []
  const fail = (message: string) => errors.push(message)
  if (question.actions !== undefined) {
    if (!Array.isArray(question.actions) || !question.actions.length || question.actions.length > 80) return ['再生アクションは1〜80件で指定してください。']
    let previous = 0
    for (const a of question.actions) {
      if (!a || ![...positions, 'dealer'].includes(a.position) || !(a.action in actionLabels) || !streetOrder.includes(a.street) || !Number.isFinite(a.amountBb) || a.amountBb < 0) { fail('再生アクションの形式が不正です。'); continue }
      if ((a.action === 'deal') !== (a.position === 'dealer')) fail('配札はディーラーのみ指定できます。')
      if (['fold', 'check', 'deal'].includes(a.action) && a.amountBb !== 0) fail('フォールド・チェック・配札の追加額は0です。')
      if (!['fold', 'check', 'deal'].includes(a.action) && a.amountBb <= 0) fail('ベット等の追加額は0より大きくしてください。')
      const current = streetOrder.indexOf(a.street)
      if (current < previous || current > streetOrder.indexOf(question.street)) fail('ストリートの順序が不正です。')
      previous = current
    }
    if (errors.length) return errors
    if (question.actions.at(-1)!.street !== question.street) fail('再生の最終ストリートを問題に合わせてください。')
    if (question.actions.reduce((sum, a) => sum + a.amountBb, 0) > question.potBb + .000001) fail('再生中の投入額が最終ポットを超えています。')
    const folded = new Set<Position | 'dealer'>()
    question.actions.forEach((a, index) => {
      if (folded.has(a.position)) fail('フォールド後のアクションがあります。')
      if (a.action === 'fold') {
        folded.add(a.position)
        if (a.position === question.heroPosition || question.opponents.find(p => p.position === a.position)?.inHand) fail('フォールド履歴と最終参加状態が一致しません。')
      }
      if (a.action === 'all-in' && Math.abs(replayState(question, index + 1).seats.find(s => s.position === a.position)!.stackBb) > .000001) fail('オールイン後の残りスタックは0にしてください。')
    })
  }
  if (!question.options.some(o => o.action)) return errors // Retain legacy, user-authored questions.
  const points = raisePoints(question), invested = question.heroInvestedBb ?? 0
  if (!Number.isFinite(invested) || invested < 0) fail('自分の投入済み額が不正です。')
  question.options.forEach(o => {
    if (!o.action || !['fold', 'call', 'check', 'raise', 'all-in'].includes(o.action)) fail('各EV基準点にアクション種別を指定してください。')
    if (o.action === 'raise' && (!Number.isFinite(o.sizeBb) || o.sizeBb! <= 0)) fail('レイズの基準サイズを指定してください。')
  })
  const required = question.toCallBb ? ['fold', 'call'] : ['check']
  if (required.some(a => !question.options.some(o => o.action === a))) fail('フォールド・コール、またはチェックのEVを設定してください。')
  for (const action of ['fold', 'call', 'check', 'all-in']) if (question.options.filter(o => o.action === action).length > 1) fail('同じアクションの基準EVが重複しています。')
  if (question.options.some(o => o.action === (question.toCallBb ? 'check' : 'call'))) fail('ベットがある場合はコール、ない場合はチェックを設定してください。')
  if (!question.toCallBb && question.options.some(o => o.action === 'fold')) fail('チェックできる場面のフォールドEVは設定しません。')
  const canContestRaise = question.opponents.some(p => p.inHand && p.stackBb > 0) && question.effectiveStackBb > question.toCallBb
  const minLegal = minimumRaiseTo(question)
  if (canContestRaise && !question.options.some(o => o.action === 'all-in')) fail('オールインのEVを設定してください。')
  if (canContestRaise && invested + question.effectiveStackBb > (question.minRaiseToBb ?? minLegal) && !points.length) fail('レイズ可能な場面にはサイズ別EVを設定してください。')
  if (!canContestRaise && question.options.some(o => o.action === 'all-in')) {
    const call = question.options.find(o => o.action === 'call')
    const all = question.options.find(o => o.action === 'all-in')!
    if (question.toCallBb !== question.effectiveStackBb || !call || Math.abs(call.evBb - all.evBb) > .000001) fail('オールインできない場面、またはコールとオールインのEVが一致しません。')
  }
  if (points.length) {
    if (points.length < 2 || new Set(points.map(p => p.sizeBb)).size !== points.length) fail('レイズEVは異なるサイズで2点以上指定してください。')
    if (!Number.isFinite(question.minRaiseToBb) || question.minRaiseToBb! < minLegal - .000001) fail('最小レイズ総額を確認してください（直前のフルレイズ幅以上）。')
    if (points[0]?.sizeBb !== question.minRaiseToBb || points.at(-1)?.sizeBb !== invested + question.effectiveStackBb) fail('EV基準点は最小レイズからオールイン総額までカバーしてください。')
    const allIn = question.options.find(o => o.action === 'all-in')
    if (!allIn || Math.abs(allIn.evBb - points.at(-1)!.evBb) > .000001) fail('オールインEVを最大サイズのEVと一致させてください。')
    if (!question.opponents.some(p => p.inHand && p.stackBb > 0)) fail('相手が全員オールインのためレイズできません。')
  }
  return errors
}
