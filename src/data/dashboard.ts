import { BookOpen, ChartNoAxesCombined, Clock3, Flame, GraduationCap, LayoutDashboard, Library, LifeBuoy, Settings2, Spade, Target } from 'lucide-vue-next'

// Presentation fixtures. Replace with a service/composable when live data is introduced.
export const navigation = [
  { label: 'WORKSPACE', items: [
    { label: 'Overview', icon: LayoutDashboard, active: true },
    { label: 'My learning', icon: GraduationCap },
    { label: 'Course library', icon: Library },
  ] },
  { label: 'IMPROVE YOUR GAME', items: [
    { label: 'Practice', icon: Target },
    { label: 'Range library', icon: Spade },
    { label: 'Hand review', icon: ChartNoAxesCombined },
  ] },
]
export const accountNavigation = [{ label: 'Help & resources', icon: LifeBuoy }, { label: 'Settings', icon: Settings2 }]
export const stats = [
  { label: 'Lessons completed', value: '24', suffix: '/ 48', detail: '+4 this week', icon: BookOpen, tone: 'mint', spark: '0,26 10,26 10,21 23,21 23,23 34,23 34,13 46,13 46,17 58,17 58,8 70,8 70,3 82,3' },
  { label: 'Study time', value: '12.5', suffix: 'hrs', detail: '+2.5 hrs this week', icon: Clock3, tone: 'blue', spark: '0,28 10,25 20,26 30,16 40,20 50,12 60,15 70,4 82,7' },
  { label: 'Practice accuracy', value: '78', suffix: '%', detail: '+6% this month', icon: Target, tone: 'lilac', spark: '0,28 10,24 20,27 30,18 40,20 50,10 60,14 70,7 82,2' },
  { label: 'Current streak', value: '7', suffix: 'days', detail: 'Your best is 12 days', icon: Flame, tone: 'amber', spark: '' },
]
export const skills = [
  { label: 'Preflop fundamentals', value: 85, color: '#a3e8c1' },
  { label: 'Postflop strategy', value: 62, color: '#aaa5e8' },
  { label: 'Bet sizing', value: 48, color: '#83b7d8' },
  { label: 'Mental game', value: 70, color: '#dcc38b' },
]
export const recentLessons = [
  { title: 'Opening ranges by position', category: 'Preflop fundamentals', duration: '18 min', date: 'Today', icon: Spade, tone: 'mint' },
  { title: 'The power of position', category: 'Poker foundations', duration: '12 min', date: 'Yesterday', icon: Target, tone: 'lilac' },
  { title: 'Understanding pot odds', category: 'Poker mathematics', duration: '16 min', date: 'Sep 10', icon: ChartNoAxesCombined, tone: 'blue' },
]
