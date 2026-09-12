import { BookOpen, ChartNoAxesCombined, Clock3, Flame, GraduationCap, LayoutDashboard, Library, Settings2, Spade, Target, UsersRound } from 'lucide-vue-next'
import type { Component } from 'vue'
interface NavItem { label: string; icon: Component; target?: 'dashboard' | 'assessment' | 'manager' }
export const navigation: { label: string; items: NavItem[] }[] = [
  { label: 'STUDY ROOM', items: [
    { label: 'ダッシュボード', icon: LayoutDashboard, target: 'dashboard' },
    { label: 'マイラーニング', icon: GraduationCap },
    { label: 'コース一覧', icon: Library },
    { label: '交流会', icon: UsersRound },
  ] },
  { label: 'TOOLS', items: [
    { label: '実力診断', icon: Target, target: 'assessment' },
    { label: 'レンジライブラリ', icon: Spade },
    { label: 'ハンドレビュー', icon: ChartNoAxesCombined },
  ] },
]
export const accountNavigation = [{ label: '設定', icon: Settings2 }]
export const stats = [
  { label: '完了したレッスン', value: '24', suffix: '/ 48', detail: '今週 +4レッスン', icon: BookOpen, tone: 'mint', spark: '0,26 10,26 10,21 23,21 23,23 34,23 34,13 46,13 46,17 58,17 58,8 70,8 70,3 82,3' },
  { label: '学習時間', value: '12.5', suffix: '時間', detail: '今週 +2.5時間', icon: Clock3, tone: 'blue', spark: '0,28 10,25 20,26 30,16 40,20 50,12 60,15 70,4 82,7' },
  { label: '練習の正答率', value: '78', suffix: '%', detail: '今月 +6%', icon: Target, tone: 'lilac', spark: '0,28 10,24 20,27 30,18 40,20 50,10 60,14 70,7 82,2' },
  { label: '連続学習', value: '7', suffix: '日', detail: '最長記録は12日', icon: Flame, tone: 'amber', spark: '' },
]
export const skills = [
  { label: 'プリフロップの基礎', value: 85, color: '#a3e8c1' },
  { label: 'ポストフロップ戦略', value: 62, color: '#aaa5e8' },
  { label: 'ベットサイズ', value: 48, color: '#83b7d8' },
  { label: 'メンタルゲーム', value: 70, color: '#dcc38b' },
]
export const recentLessons = [
  { title: 'ポジション別のオープンレンジ', category: 'プリフロップの基礎', duration: '18分', date: '今日', icon: Spade, tone: 'mint' },
  { title: 'ポジションの重要性', category: 'ポーカーの基礎', duration: '12分', date: '昨日', icon: Target, tone: 'lilac' },
  { title: 'ポットオッズを理解する', category: 'ポーカーの数学', duration: '16分', date: '9月10日', icon: ChartNoAxesCombined, tone: 'blue' },
]
