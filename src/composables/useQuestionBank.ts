import { ref } from 'vue'
import type { QuestionBank } from '@/types/assessment'
import { defaultBank, upgradeBank } from '@/data/question-bank'
import { parseBank, validateBank } from '@/lib/assessment'

const storageKey = 'kurabu.question-bank.v1'
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const bank = ref<QuestionBank>(clone(defaultBank))
const storageMessage = ref('')
try {
  const saved = localStorage.getItem(storageKey)
  if (saved) {
    bank.value = upgradeBank(parseBank(saved))
    localStorage.setItem(storageKey, JSON.stringify(bank.value))
  }
} catch {
  storageMessage.value = '保存済みの問題集を読み込めなかったため、初期問題を表示しています。'
}

export function useQuestionBank() {
  function save(next: QuestionBank) {
    const errors = validateBank(next)
    if (errors.length) throw new Error(errors.join('\n'))
    // Do not claim a save succeeded when storage is blocked or full.
    try { localStorage.setItem(storageKey, JSON.stringify(next)) }
    catch { throw new Error('ブラウザに保存できません。ストレージ設定と空き容量を確認してください。') }
    bank.value = clone(next)
    storageMessage.value = ''
  }
  return { bank, save, storageMessage }
}
