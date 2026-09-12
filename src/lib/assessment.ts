import type { AnswerRecord, GameMode, PokerQuestion, QuestionBank } from '../types/assessment.ts'
import { raiseEv, validateHand } from './poker-hand.ts'

export function evaluateAnswer(answer: AnswerRecord) {
  let selected = answer.optionId === 'sized-raise' ? raiseEv(answer.question, answer.raiseToBb!) : answer.question.options.find(option => option.id === answer.optionId)
  if (!selected) throw new Error('回答の選択肢が見つかりません。')
  if (answer.chosenAction === 'all-in' && selected.action === 'call') selected = { ...selected, label: `オールイン ${answer.question.effectiveStackBb} bb（コール）` }
  const bestEv = Math.max(...answer.question.options.map(option => option.evBb))
  const loss = Math.max(0, bestEv - selected.evBb)
  return { selected, bestEv, loss, correct: loss < 0.000001,
    best: answer.question.options.filter(option => Math.abs(option.evBb - bestEv) < 0.000001) }
}

export function summarizeAnswers(answers: AnswerRecord[]) {
  const rows = answers.map(evaluateAnswer)
  const correctCount = rows.filter(row => row.correct).length
  const accuracy = answers.length ? Math.round(correctCount / answers.length * 100) : 0
  const totalLoss = rows.reduce((sum, row) => sum + row.loss, 0)
  const categories = [...new Set(answers.map(answer => answer.question.category))].map(name => {
    const matching = answers.filter(answer => answer.question.category === name)
    return { name, count: matching.length, correct: matching.filter(answer => evaluateAnswer(answer).correct).length,
      loss: matching.reduce((sum, answer) => sum + evaluateAnswer(answer).loss, 0) }
  }).sort((a, b) => b.loss - a.loss)
  return { correctCount, accuracy, totalLoss, averageLoss: answers.length ? totalLoss / answers.length : 0,
    seconds: Math.round(answers.reduce((sum, answer) => sum + answer.elapsedMs, 0) / 1000), categories,
    level: accuracy >= 80 ? '応用に進める段階' : accuracy >= 50 ? '基礎が身についてきた段階' : '基礎を固める段階' }
}

export function selectQuestions(bank: QuestionBank, mode: GameMode, count = 10, random = Math.random): PokerQuestion[] {
  const pool = bank.questions.filter(question => question.enabled && question.mode === mode)
  for (let index = pool.length - 1; index > 0; index--) {
    const next = Math.floor(random() * (index + 1))
    ;[pool[index], pool[next]] = [pool[next]!, pool[index]!]
  }
  // Snapshot the questions so edits never change an in-progress or completed score.
  return JSON.parse(JSON.stringify(pool.slice(0, count))) as PokerQuestion[]
}

export function validateBank(value: unknown): string[] {
  const errors: string[] = []
  if (!value || typeof value !== 'object') return ['問題集はJSONオブジェクトで指定してください。']
  const bank = value as Record<string, unknown>
  if (bank.version !== 1) errors.push('対応する問題集のバージョンは1です。')
  if (!Array.isArray(bank.questions) || !bank.questions.length) return [...errors, '問題を1問以上登録してください。']
  if (bank.questions.length > 500) return [...errors, '問題数の上限は500問です。']
  const ids = new Set<string>()
  const fieldLabels: Record<string, string> = { id: '問題ID', title: '問題タイトル', category: '分野', context: '状況・レンジの前提', prompt: 'ユーザーへの質問', evBasis: 'EVの計算・仮定・出典', potBb: 'ポット', toCallBb: 'コール額', effectiveStackBb: '実効スタック' }
  bank.questions.forEach((raw, index) => {
    const prefix = `問題${index + 1}`
    const fail = (message: string) => errors.push(`${prefix}：${message}`)
    if (!raw || typeof raw !== 'object') { fail('問題の形式が不正です。'); return }
    const question = raw as Record<string, unknown>
    for (const key of ['id', 'title', 'category', 'context', 'prompt', 'evBasis']) {
      if (typeof question[key] !== 'string' || !(question[key] as string).trim()) fail(`${fieldLabels[key]}を入力してください。`)
      else if ((question[key] as string).length > 5000) fail(`${fieldLabels[key]}は5,000文字以内にしてください。`)
    }
    if (typeof question.id === 'string') { if (ids.has(question.id)) fail('問題IDが重複しています。'); ids.add(question.id) }
    if (typeof question.enabled !== 'boolean') fail('公開状態が不正です。')
    if (!['cash', 'tournament'].includes(String(question.mode))) fail('ゲーム形式が不正です。')
    if (!['basic', 'intermediate', 'advanced'].includes(String(question.difficulty))) fail('難易度が不正です。')
    const streets = { preflop: 0, flop: 3, turn: 4, river: 5 }
    if (!(String(question.street) in streets)) fail('ストリートが不正です。')
    const seatNames = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB']
    if (!seatNames.includes(String(question.heroPosition))) fail('自分のポジションが不正です。')
    const isNumber = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 100000
    for (const key of ['potBb', 'toCallBb', 'effectiveStackBb']) if (!isNumber(question[key])) fail(`${fieldLabels[key]}は0〜100,000の数値で指定してください。`)
    if (Number(question.effectiveStackBb) <= 0) fail('実効スタックは0より大きくしてください。')
    if (Number(question.toCallBb) > Number(question.effectiveStackBb)) fail('コール額が残り実効スタックを超えています。')
    if (Number(question.toCallBb) > Number(question.potBb)) fail('コール額が現在のポットを超えています。')
    const hole = Array.isArray(question.heroCards) ? question.heroCards : []
    const board = Array.isArray(question.board) ? question.board : []
    if (hole.length !== 2) fail('手札は2枚指定してください。')
    if (!Array.isArray(question.board) || board.length !== streets[question.street as keyof typeof streets]) fail('ボードの枚数がストリートと一致しません。')
    const cards = [...hole, ...board]
    if (cards.some(card => typeof card !== 'string' || !/^[2-9TJQKA][shdc]$/.test(card))) fail('カードはAs、Th、2cの形式で指定してください。')
    if (new Set(cards).size !== cards.length) fail('手札・ボードに同じカードが重複しています。')
    if (!Array.isArray(question.history) || !question.history.length || question.history.length > 20 || question.history.some(line => typeof line !== 'string' || !line.trim() || line.length > 1000)) fail('アクション履歴を1〜20行で入力してください。')
    if (!Array.isArray(question.opponents) || question.opponents.length !== 5) fail('相手を5席分指定してください。')
    else {
      const seats = new Set([question.heroPosition])
      let activeCount = 0
      for (const opponent of question.opponents) {
        if (!opponent || typeof opponent !== 'object') { fail('相手プレイヤーの形式が不正です。'); continue }
        if (!seatNames.includes(opponent.position) || seats.has(opponent.position)) fail('相手のポジションが重複または不正です。')
        seats.add(opponent.position)
        if (!['LAG', 'LP', 'TAG', 'TP'].includes(opponent.type)) fail('相手のプレイヤータイプが不正です。')
        if (!isNumber(opponent.stackBb)) fail('相手のスタックが不正です。')
        if (typeof opponent.inHand !== 'boolean') fail('相手の参加状態が不正です。')
        if (opponent.inHand) activeCount++
      }
      if (!activeCount) fail('ハンドに参加中の相手を1人以上指定してください。')
    }
    if (!Array.isArray(question.options) || question.options.length < 2 || question.options.length > 20) fail('選択肢・EV基準点は2〜20個にしてください。')
    else {
      const optionIds = new Set<string>()
      for (const option of question.options) {
        if (!option || typeof option !== 'object') { fail('選択肢の形式が不正です。'); continue }
        if (typeof option.id !== 'string' || !option.id.trim() || optionIds.has(option.id)) fail('選択肢IDが空または重複しています。')
        optionIds.add(option.id)
        if (typeof option.label !== 'string' || !option.label.trim()) fail('選択肢のラベルを入力してください。')
        if (typeof option.explanation !== 'string' || !option.explanation.trim()) fail('各選択肢の解説を入力してください。')
        if (typeof option.evBb !== 'number' || !Number.isFinite(option.evBb) || Math.abs(option.evBb) > 100000) fail('基準EVは有限の数値（bb）で指定してください。')
      }
    }
    if (!errors.some(error => error.startsWith(`${prefix}：`))) validateHand(question as unknown as PokerQuestion).forEach(fail)
  })
  return errors
}

export function parseBank(json: string): QuestionBank {
  let value: unknown
  try { value = JSON.parse(json) } catch { throw new Error('JSONを読み込めません。ファイルの形式を確認してください。') }
  const errors = validateBank(value)
  if (errors.length) throw new Error(errors.join('\n'))
  return value as QuestionBank
}

export function formatBb(value: number) { return new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 2 }).format(value) }
