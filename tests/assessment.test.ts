import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultBank, legacyBank, revisionTwoBank, upgradeBank } from '../src/data/question-bank.ts'
import { replayState, decisionChoices, raiseEv, raisePoints, minimumRaiseTo } from '../src/lib/poker-hand.ts'
import { selectQuestions, summarizeAnswers, evaluateAnswer, parseBank, validateBank } from '../src/lib/assessment.ts'
import type { PokerQuestion } from '../src/types/assessment.ts'
import { expandedQuestions } from '../src/data/expanded-questions.ts'

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const fixture = () => copy(defaultBank)

test('30 distinct additions cover five situation groups in both formats without probability hints', () => {
  assert.equal(expandedQuestions.length, 30)
  assert.equal(new Set(expandedQuestions.map(q => q.id)).size, 30)
  assert.equal(new Set(expandedQuestions.map(q => [q.heroCards, q.board, q.actions].map(v => JSON.stringify(v)).join('|'))).size, 30)
  for (const mode of ['cash', 'tournament'] as const) {
    const pool = expandedQuestions.filter(q => q.mode === mode)
    assert.equal(pool.length, 15)
    assert.equal(pool.filter(q => q.street === 'preflop').length, 5)
    assert.equal(pool.filter(q => q.category === 'フロップ・アグレッサー').length, 2)
    assert.equal(pool.filter(q => q.category === 'フロップ・コーラー').length, 2)
    assert.equal(pool.filter(q => q.category === 'マルチウェイ').length, 3)
    assert.equal(pool.filter(q => q.category === 'ターン・アグレッサー').length, 3)
  }
  for (const q of defaultBank.questions) assert.doesNotMatch(q.context, /%|％|レーキ|引き分け|ICM|考慮しません/)
  for (const q of expandedQuestions.filter(q => q.category === 'マルチウェイ')) assert.equal(q.opponents.filter(p => p.inHand).length, 2)
})

test('new histories agree with final contributions and actual betting positions', () => {
  for (const q of expandedQuestions) {
    const seats = new Map(q.opponents.map(p => [p.position, p.stackBb])); seats.set(q.heroPosition, q.effectiveStackBb)
    const invested = new Map<string, number>()
    for (const a of q.actions!) {
      if (a.action === 'deal') invested.clear()
      else invested.set(a.position, (invested.get(a.position) ?? 0) + a.amountBb)
    }
    assert.ok(Math.abs((invested.get(q.heroPosition) ?? 0) - q.heroInvestedBb!) < .00001)
    const highest = Math.max(...invested.values())
    assert.ok(Math.abs(q.toCallBb - Math.min(q.effectiveStackBb, highest - q.heroInvestedBb!)) < .00001)
    assert.ok(Math.abs(q.potBb - q.actions!.reduce((sum, a) => sum + a.amountBb, 0)) < .00001)
    const preflop = q.actions!.filter(a => a.street === 'preflop' && a.action === 'raise')
    if (q.category.includes('アグレッサー')) assert.equal(preflop.at(-1)?.position, q.heroPosition)
    if (q.category.includes('コーラー')) assert.ok(q.actions!.some(a => a.street === 'preflop' && a.action === 'call' && a.position === q.heroPosition))
  }
  assert.equal(minimumRaiseTo(expandedQuestions.find(q => q.id === 'cash-squeeze')!), 4)
  assert.equal(minimumRaiseTo(expandedQuestions.find(q => q.id === 'mtt-multiway-weak-pair')!), 20)
})

test('revision 3 adds exactly 30 once and updates context without overwriting edited fields', () => {
  const saved = copy(revisionTwoBank)
  saved.questions[0]!.options[0]!.evBb = -1
  saved.questions[0]!.title = '独自タイトル'
  saved.questions[0]!.enabled = false
  const upgraded = upgradeBank(saved)
  assert.equal(upgraded.questions.length, 54)
  assert.equal(upgraded.questions[0]!.title, '独自タイトル')
  assert.equal(upgraded.questions[0]!.options[0]!.evBb, -1)
  assert.equal(upgraded.questions[0]!.enabled, false)
  assert.doesNotMatch(upgraded.questions[0]!.context, /勝率|レーキ/)
  assert.deepEqual(upgradeBank(upgraded), upgraded)
  upgraded.questions.pop()
  assert.equal(upgradeBank(upgraded).questions.length, 53)
})

test('all teaching examples have valid cards, unique seats, finite EVs, and legal call amounts', () => {
  assert.deepEqual(validateBank(defaultBank), [])
  assert.equal(defaultBank.questions.filter(q => q.mode === 'cash').length, 27)
  assert.equal(defaultBank.questions.filter(q => q.mode === 'tournament').length, 27)
})
test('both modes use only published questions, without duplicates, and cap at 10', () => {
  const bank = fixture(); bank.questions[0]!.enabled = false
  for (const mode of ['cash', 'tournament'] as const) {
    const questions = selectQuestions(bank, mode)
    assert.equal(questions.length, 10)
    assert.equal(new Set(questions.map(q => q.id)).size, 10)
    assert.ok(questions.every(q => q.mode === mode && q.enabled))
  }
})

test('replay conserves chips, exposes cards by street, and ends at the authored snapshot', () => {
  for (const question of defaultBank.questions) {
    const actions = question.actions!, initial = replayState(question, 0)
    assert.ok(Math.abs(initial.potBb) < .000001)
    assert.equal(initial.board.length, 0)
    const chips = (state: ReturnType<typeof replayState>) => state.potBb + state.seats.reduce((sum, s) => sum + s.stackBb, 0)
    for (let cursor = 0; cursor <= actions.length; cursor++) {
      const state = replayState(question, cursor)
      assert.ok(Math.abs(chips(state) - chips(initial)) < .000001)
      assert.ok(state.seats.every(s => s.stackBb >= 0))
      assert.ok(state.potBb >= -.000001)
      assert.equal(state.seats.filter(s => s.hero).length, 1)
      assert.equal(state.seats.find(s => s.hero)!.type, undefined)
    }
    const final = replayState(question, actions.length)
    assert.equal(final.potBb, question.potBb)
    assert.deepEqual(final.board, question.board)
    assert.equal(final.seats.find(s => s.hero)!.stackBb, question.effectiveStackBb)
    for (const opponent of question.opponents) assert.equal(final.seats.find(s => s.position === opponent.position)!.inHand, opponent.inHand)
  }
})

test('stepping backward restores folded seats, stack commitments, and community cards', () => {
  const q = defaultBank.questions[0]!, actions = q.actions!
  const fold = actions.findIndex(a => a.action === 'fold')
  assert.equal(replayState(q, fold).seats.find(s => s.position === actions[fold]!.position)!.inHand, true)
  assert.equal(replayState(q, fold + 1).seats.find(s => s.position === actions[fold]!.position)!.inHand, false)
  const deal = actions.findIndex(a => a.street === 'flop')
  assert.equal(replayState(q, deal).board.length, 0)
  assert.equal(replayState(q, deal + 1).board.length, 3)
  const before = replayState(q, actions.length - 1), after = replayState(q, actions.length)
  assert.equal(after.potBb - before.potBb, q.toCallBb)
})

test('four action slots respect all-in opponents and no-bet situations', () => {
  const allIn = decisionChoices(defaultBank.questions[0]!)
  assert.equal(allIn.length, 4)
  assert.equal(allIn.find(c => c.key === 'raise')!.enabled, false)
  assert.ok(allIn.filter(c => c.key !== 'raise').every(c => c.enabled))
  const allInCall = evaluateAnswer({ question: defaultBank.questions[0]!, optionId: 'call', chosenAction: 'all-in', elapsedMs: 0 })
  assert.equal(allInCall.loss, 0)
  assert.match(allInCall.selected.label, /オールイン.*コール/)
  const bet = decisionChoices(defaultBank.questions.find(q => q.id === 'cash-lp-value')!)
  assert.equal(bet.find(c => c.key === 'fold')!.enabled, false)
  assert.equal(bet.find(c => c.key === 'call')!.label, 'チェック')
  const facingBet = decisionChoices(defaultBank.questions.find(q => q.id === 'cash-raise-lag')!)
  assert.ok(facingBet.every(c => c.enabled))
})

test('free sizing interpolates authored EV and records the exact chosen amount and loss', () => {
  const q = defaultBank.questions.find(q => q.id === 'cash-raise-lag')!, points = raisePoints(q)
  const min = points[0]!, max = points.at(-1)!, size = min.sizeBb! + (max.sizeBb! - min.sizeBb!) * .37
  const expected = min.evBb + (max.evBb - min.evBb) * .37
  assert.ok(Math.abs(raiseEv(q, size).evBb - expected) < .000001)
  const score = evaluateAnswer({ question: q, optionId: 'sized-raise', raiseToBb: size, elapsedMs: 4000 })
  assert.equal(score.selected.sizeBb, size)
  assert.ok(Math.abs(score.loss - (score.bestEv - expected)) < .000001)
  for (const invalid of [0, min.sizeBb! - .01, max.sizeBb! + .01, NaN, Infinity]) assert.throws(() => raiseEv(q, invalid))
})

test('migration upgrades untouched examples and preserves custom questions, edits and deletions', () => {
  const old = copy(legacyBank); old.questions[0]!.title = '編集済み'
  const migrated = upgradeBank(old)
  assert.equal(migrated.questions.length, 54)
  assert.equal(migrated.questions[0]!.title, old.questions[0]!.title); assert.deepEqual(migrated.questions[0]!.options, old.questions[0]!.options)
  assert.ok(migrated.questions[1]!.actions!.length)
  assert.deepEqual(upgradeBank(migrated), migrated)
  const small = copy(legacyBank); small.questions = small.questions.slice(0, 2)
  assert.equal(upgradeBank(small).questions.length, 32)
  assert.deepEqual(validateBank(migrated), [])
})

test('invalid replay and sizing configurations are rejected on import', () => {
  const mutations: ((q: PokerQuestion) => void)[] = [
    q => { q.actions![0]!.amountBb = -1 },
    q => { q.actions![0]!.amountBb = q.potBb + 1 },
    q => { q.actions![3]!.position = q.heroPosition },
    q => { q.actions![0]!.street = 'river' },
    q => { q.options.find(o => o.action === 'raise')!.sizeBb = .1 },
    q => { q.options.find(o => o.action === 'all-in')!.evBb = 999 },
    q => { q.minRaiseToBb = 0 },
  ]
  for (const mutate of mutations) {
    const q = copy(defaultBank.questions.find(q => q.id === 'cash-raise-lag')!); mutate(q)
    assert.ok(validateBank({ version: 1, questions: [q] }).length)
  }
})
test('small and empty banks return actual available counts and random ordering is injectable', () => {
  const bank = fixture(); bank.questions = bank.questions.slice(0, 2)
  assert.equal(selectQuestions(bank, 'cash').length, 2)
  assert.equal(selectQuestions(bank, 'tournament').length, 0)
  assert.notDeepEqual(selectQuestions(bank, 'cash', 5, () => 0).map(q => q.id), selectQuestions(bank, 'cash', 5, () => .999).map(q => q.id))
})
test('active quiz snapshots do not change when the editor changes the bank', () => {
  const bank = fixture(), questions = selectQuestions(bank, 'cash')
  const original = questions[0]!.options[0]!.evBb
  bank.questions.find(q => q.id === questions[0]!.id)!.options[0]!.evBb = 999
  assert.equal(questions[0]!.options[0]!.evBb, original)
})
test('opportunity cost includes folding away profitable EV, not only negative choices', () => {
  const question = defaultBank.questions.find(q => q.id === 'cash-lag-river')!
  const fold = evaluateAnswer({ question, optionId: 'fold', elapsedMs: 1000 })
  assert.equal(fold.loss, 9); assert.equal(fold.correct, false)
  assert.equal(evaluateAnswer({ question, optionId: 'call', elapsedMs: 1000 }).loss, 0)
})
test('negative-EV calls are counted correctly and best-EV ties are accepted', () => {
  const question = copy(defaultBank.questions.find(q => q.id === 'cash-tp-river')!)
  assert.equal(evaluateAnswer({ question, optionId: 'call', elapsedMs: 0 }).loss, 12)
  question.options[1]!.evBb = 0
  assert.equal(evaluateAnswer({ question, optionId: 'call', elapsedMs: 0 }).correct, true)
})
test('summary aggregates category losses, accuracy, elapsed time, and mean loss', () => {
  const answers = [
    { question: defaultBank.questions[0]!, optionId: 'fold', elapsedMs: 10000 },
    { question: defaultBank.questions[1]!, optionId: 'fold', elapsedMs: 15000 },
  ]
  const stats = summarizeAnswers(answers)
  assert.equal(stats.totalLoss, 9); assert.equal(stats.averageLoss, 4.5)
  assert.equal(stats.correctCount, 1); assert.equal(stats.accuracy, 50)
  assert.equal(stats.seconds, 25); assert.equal(stats.categories[0]!.loss, 9)
  assert.equal(summarizeAnswers([]).totalLoss, 0)
})
test('unknown answers fail instead of silently awarding points', () => {
  assert.throws(() => evaluateAnswer({ question: defaultBank.questions[0]!, optionId: 'missing', elapsedMs: 0 }))
})
test('bank import round-trips custom questions and all four opponent types', () => {
  const bank = fixture(); const custom = copy(bank.questions[0]!)
  custom.id = 'custom-question'; custom.title = '管理画面で作った問題'; custom.opponents[0]!.type = 'LP'
  bank.questions.push(custom)
  assert.deepEqual(parseBank(JSON.stringify(bank)), bank)
  assert.ok(parseBank(JSON.stringify(bank)).questions.some(q => q.id === 'custom-question'))
})
test('invalid imports cannot replace the question bank', () => {
  assert.throws(() => parseBank('{bad json'))
  assert.throws(() => parseBank(JSON.stringify({ version: 2, questions: [] })))
  const mutations: ((question: PokerQuestion) => void)[] = [
    q => { q.board[0] = q.heroCards[0] },
    q => { q.board = [] },
    q => { q.toCallBb = q.effectiveStackBb + 1 },
    q => { q.opponents[0]!.position = q.heroPosition },
    q => { q.options[1]!.id = q.options[0]!.id },
    q => { q.options[0]!.evBb = Number.NaN },
    q => { q.opponents.forEach(p => { p.inHand = false }) },
  ]
  mutations.forEach(mutate => { const bank = fixture(); mutate(bank.questions[0]!); assert.ok(validateBank(bank).length > 0) })
})

