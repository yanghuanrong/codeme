import { SENTIMENT_DICT, STOP_WORDS } from '../utils/constants.js'

export const initStats = () => ({
  summary: { totalCommits: 0, totalAdditions: 0, totalDeletions: 0 },
  time: {
    hours: Array(24).fill(0),
    weekdays: Array(7).fill(0),
    dates: {},
    months: Array(12).fill(0),
  },
  modules: {},
  rootModules: {},
  fileExtensions: {},
  style: { feat: 0, fix: 0, refactor: 0, docs: 0, chore: 0 },
  specialized: { refactorAdd: 0, refactorDel: 0, fixCount: 0 },
  sentiment: { positive: 0, negative: 0, stressful: 0 },
  extremes: {
    biggestCommit: { msg: '', lines: 0 },
    midnightCommits: 0,
    latestMoment: null,
    longestDay: { date: '', span: 0 },
    maxCommitsPerDay: { date: '', count: 0 },
  },
  allMessages: [],
})

export const parseLogs = (rawLogs) => {
  return rawLogs
    .split('\n')
    .map((line) => {
      const [hash, dateStr, msg] = line.split('|')
      return { hash, date: new Date(dateStr), msg }
    })
    .sort((a, b) => a.date - b.date)
}

export const processCommits = (commitBlocks, logs, stats, author, onProgress = null) => {
  let processed = 0
  commitBlocks.forEach((block) => {
    const lines = block.trim().split('\n')
    const hash = lines[0]
    const files = lines.slice(1)
    const logEntry = logs.find((l) => l.hash === hash)
    if (!logEntry) return

    const { date, msg } = logEntry
    const hour = date.getHours()
    const day = date.getDay()
    const month = date.getMonth()
    const dateKey = date.toISOString().split('T')[0]

    if (SENTIMENT_DICT.positive.test(msg)) stats.sentiment.positive++
    if (SENTIMENT_DICT.negative.test(msg)) stats.sentiment.negative++
    if (SENTIMENT_DICT.stressful.test(msg)) stats.sentiment.stressful++

    stats.time.hours[hour]++
    stats.time.weekdays[day]++
    stats.time.months[month]++
    if (!stats.time.dates[dateKey]) stats.time.dates[dateKey] = []
    stats.time.dates[dateKey].push(date)

    if (hour >= 0 && hour <= 6) {
      stats.extremes.midnightCommits++
      if (
        !stats.extremes.latestMoment ||
        hour > stats.extremes.latestMoment.date.getHours() ||
        (hour === stats.extremes.latestMoment.date.getHours() &&
          date.getMinutes() > stats.extremes.latestMoment.date.getMinutes())
      ) {
        stats.extremes.latestMoment = logEntry
      }
    }

    stats.allMessages.push(msg)

    const lowerMsg = msg.toLowerCase()
    const isRefactor = lowerMsg.includes('refactor')
    if (lowerMsg.includes('feat')) stats.style.feat++
    else if (lowerMsg.includes('fix')) {
      stats.style.fix++
      stats.specialized.fixCount++
    } else if (isRefactor) stats.style.refactor++
    else if (lowerMsg.includes('docs')) stats.style.docs++
    else stats.style.chore++

    let commitTotalChange = 0
    files.forEach((f) => {
      const parts = f.split('\t')
      if (parts.length === 3) {
        const add = parseInt(parts[0]) || 0
        const sub = parseInt(parts[1]) || 0
        stats.summary.totalAdditions += add
        stats.summary.totalDeletions += sub
        commitTotalChange += add + sub

        if (isRefactor) {
          stats.specialized.refactorAdd += add
          stats.specialized.refactorDel += sub
        }

        const path = parts[2]
        const ext = path.split('.').pop()
        if (ext && ext !== path)
          stats.fileExtensions[ext] = (stats.fileExtensions[ext] || 0) + 1

        stats.modules[path] = (stats.modules[path] || 0) + 1
        const rootDir = path.split('/')[0] || 'root'
        stats.rootModules[rootDir] = (stats.rootModules[rootDir] || 0) + 1
      }
    })

    if (commitTotalChange > stats.extremes.biggestCommit.lines) {
      stats.extremes.biggestCommit = {
        msg,
        lines: commitTotalChange,
        date,
      }
    }

    processed++
    if (onProgress) {
      onProgress(processed, commitBlocks.length)
    }
  })

  stats.summary.totalCommits = logs.length
}

export const calculateDateExtremes = (stats) => {
  Object.entries(stats.time.dates).forEach(([date, times]) => {
    if (times.length > stats.extremes.maxCommitsPerDay.count) {
      stats.extremes.maxCommitsPerDay = { date, count: times.length }
    }

    if (times.length > 1) {
      const span = (Math.max(...times) - Math.min(...times)) / (1000 * 60 * 60)
      if (span > stats.extremes.longestDay.span) {
        stats.extremes.longestDay = { date, span: span.toFixed(1) }
      }
    }
  })
}

export const extractTopKeywords = (messages) => {
  const words =
    messages
      .join(' ')
      .toLowerCase()
      .match(/\b(\w+)\b/g) || []
  const wordFreq = {}
  words.forEach((w) => {
    if (w.length > 2 && !STOP_WORDS.has(w)) wordFreq[w] = (wordFreq[w] || 0) + 1
  })
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
}

export const calculateStreak = (dates) => {
  const sortedDates = Object.keys(dates).sort()
  let maxStreak = 0
  let currentStreak = 0
  let prevDate = null

  sortedDates.forEach((d) => {
    const current = new Date(d)
    if (prevDate && current - prevDate === 86400000) currentStreak++
    else currentStreak = 1
    maxStreak = Math.max(maxStreak, currentStreak)
    prevDate = current
  })

  return maxStreak
}

