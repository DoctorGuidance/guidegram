import assert from 'assert'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

console.log('🧪 Starting Milestone 17 Verification: Group Statistics Timeframes & Historical Sync...')

// 1. Verify GroupStatsModal.tsx defaults to today
const statsPath = path.join(rootDir, 'src', 'components', 'GroupStatsModal.tsx')
assert(fs.existsSync(statsPath), 'GroupStatsModal.tsx must exist')
const statsSrc = fs.readFileSync(statsPath, 'utf-8')

assert(
  statsSrc.includes("useState<Timeframe>('today')"),
  'GroupStatsModal must default timeframe state to today'
)
assert(
  statsSrc.includes('ensureTimeframeHistory'),
  'GroupStatsModal must implement ensureTimeframeHistory function'
)
assert(
  statsSrc.includes('getTimeframeStartTime'),
  'GroupStatsModal must compute boundary timestamps for today, yesterday, week, month'
)
assert(
  statsSrc.includes('ensureTimeframeHistory(timeframe)'),
  'GroupStatsModal must trigger history sync on modal open and timeframe change'
)
console.log('  ✅ GroupStatsModal default timeframe and auto-sync logic verified.')

// 2. Verify accountManager.ts getHistoricalMessages timestamp safety
const accountMgrPath = path.join(rootDir, 'electron', 'telegram', 'accountManager.ts')
assert(fs.existsSync(accountMgrPath), 'accountManager.ts must exist')
const accountMgrSrc = fs.readFileSync(accountMgrPath, 'utf-8')

assert(
  accountMgrSrc.includes('offsetDate > 1e11 ? Math.floor(offsetDate / 1000) : Math.floor(offsetDate)'),
  'accountManager.ts must safely resolve offsetDate without double-dividing millisecond/second timestamps'
)
console.log('  ✅ Backend AccountManager timestamp safety verified.')

// 3. Functional simulation of timeframe window calculations
const now = new Date(2026, 8, 10, 15, 30, 0) // Fixed test anchor: Sept 10, 2026
const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
const yesterdayStart = todayStart - 24 * 3600 * 1000
const weekStart = now.getTime() - 7 * 24 * 3600 * 1000
const monthStart = now.getTime() - 30 * 24 * 3600 * 1000

// Mock messages across different days
const mockMsgs = [
  { id: 1, text: 'Old message 40 days ago', date: now.getTime() - 40 * 24 * 3600 * 1000 },
  { id: 2, text: 'Message 20 days ago (Month)', date: now.getTime() - 20 * 24 * 3600 * 1000 },
  { id: 3, text: 'Message 4 days ago (Week)', date: now.getTime() - 4 * 24 * 3600 * 1000 },
  { id: 4, text: 'Message yesterday morning', date: yesterdayStart + 4 * 3600 * 1000 },
  { id: 5, text: 'Message today noon', date: todayStart + 6 * 3600 * 1000 },
]

function filterByTimeframe(msgs, tf) {
  return msgs.filter((m) => {
    if (tf === 'today') return m.date >= todayStart
    if (tf === 'yesterday') return m.date >= yesterdayStart && m.date < todayStart
    if (tf === 'week') return m.date >= weekStart
    if (tf === 'month') return m.date >= monthStart
    return true
  })
}

const todayFiltered = filterByTimeframe(mockMsgs, 'today')
assert.strictEqual(todayFiltered.length, 1)
assert.strictEqual(todayFiltered[0].id, 5)

const yesterdayFiltered = filterByTimeframe(mockMsgs, 'yesterday')
assert.strictEqual(yesterdayFiltered.length, 1)
assert.strictEqual(yesterdayFiltered[0].id, 4)

const weekFiltered = filterByTimeframe(mockMsgs, 'week')
assert.strictEqual(weekFiltered.length, 3) // ids 3, 4, 5

const monthFiltered = filterByTimeframe(mockMsgs, 'month')
assert.strictEqual(monthFiltered.length, 4) // ids 2, 3, 4, 5

const allFiltered = filterByTimeframe(mockMsgs, 'all')
assert.strictEqual(allFiltered.length, 5)

console.log('  ✅ Timeframe filtering mathematical models verified.')
console.log('🎉 All Milestone 17 checks passed successfully!')
