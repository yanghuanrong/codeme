import { execSync } from 'child_process'

const sentimentDict = {
  positive:
    /feat|improve|optimize|perfect|clean|refactor|add|success|resolve/gi,
  negative: /bug|fix|error|issue|fail|broken|revert|temp|shit|problem/gi,
  stressful: /urgent|critical|hotfix|immediately|!!!|deadline|priority/gi,
}

const runGit = (cmd, repoPath) => {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      cwd: repoPath,
      maxBuffer: 1024 * 1024 * 50,
    }).trim()
  } catch (e) {
    return ''
  }
}

const getGitUser = (repoPath) => {
  const email = runGit('git config user.email', repoPath)
  const name = runGit('git config user.name', repoPath)
  return email || name
}

const getProjectStats = (since, until, repoPath) => {
  const totalCommits =
    parseInt(
      runGit(
        `git rev-list --count --since="${since}" --until="${until}" --all`,
        repoPath
      )
    ) || 1
  const totalAuthors =
    parseInt(
      runGit(
        `git log --since="${since}" --until="${until}" --format="%ae" | sort -u | wc -l`,
        repoPath
      )
    ) || 1
  return {
    totalCommits,
    totalAuthors,
    avgCommitsPerPerson: totalCommits / totalAuthors,
  }
}

const parseLogs = (rawLogs) => {
  return rawLogs
    .split('\n')
    .map((line) => {
      const [hash, dateStr, msg] = line.split('|')
      return { hash, date: new Date(dateStr), msg }
    })
    .sort((a, b) => a.date - b.date)
}

const initStats = () => ({
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

const processCommits = (commitBlocks, logs, stats, author) => {
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

    if (sentimentDict.positive.test(msg)) stats.sentiment.positive++
    if (sentimentDict.negative.test(msg)) stats.sentiment.negative++
    if (sentimentDict.stressful.test(msg)) stats.sentiment.stressful++

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
  })

  stats.summary.totalCommits = logs.length
}

const calculateDateExtremes = (stats) => {
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

const extractTopKeywords = (messages) => {
  const stopWords = new Set([
    'the',
    'and',
    'to',
    'for',
    'in',
    'of',
    'with',
    'add',
    'fix',
    'update',
    'feat',
    'merged',
    'branch',
  ])
  const words =
    messages
      .join(' ')
      .toLowerCase()
      .match(/\b(\w+)\b/g) || []
  const wordFreq = {}
  words.forEach((w) => {
    if (w.length > 2 && !stopWords.has(w)) wordFreq[w] = (wordFreq[w] || 0) + 1
  })
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
}

const calculateStreak = (dates) => {
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

const analyzeCollaboration = (stats, repoPath, sampleFilesCount, author) => {
  const sortedFiles = Object.entries(stats.modules).sort((a, b) => b[1] - a[1])
  const topFiles = sortedFiles.slice(0, sampleFilesCount)

  let totalBlameLines = 0
  let othersLines = 0
  let soleMaintainedCount = 0

  topFiles.forEach(([file]) => {
    const filePath = file.startsWith('./') ? file.slice(2) : file
    try {
      const blameData = runGit(
        `git blame --line-porcelain "${filePath}" 2>/dev/null`,
        repoPath
      )
      if (blameData && blameData.trim()) {
        const authors = blameData.match(/^author .*/gm) || []
        if (authors.length > 0) {
          totalBlameLines += authors.length
          othersLines += authors.filter((a) => !a.includes(author)).length
        }
      }

      const fileAuthors = runGit(
        `git log --format="%ae" -- "${filePath}" 2>/dev/null | sort -u | wc -l`,
        repoPath
      )
      const authorCount = parseInt(fileAuthors) || 0
      if (authorCount === 1) soleMaintainedCount++
    } catch (e) {
      // 忽略无法访问的文件
    }
  })

  const interweavingScore =
    totalBlameLines > 0 ? (othersLines / totalBlameLines) * 100 : 0
  const soleMaintenanceIndex = (soleMaintainedCount / topFiles.length) * 100

  return { interweavingScore, soleMaintenanceIndex }
}

const calculateMetrics = (stats, avgCommitsPerPerson) => {
  const featRatio = stats.style.feat / stats.summary.totalCommits || 0
  const netCodeGrowth = Math.max(
    0,
    stats.summary.totalAdditions - stats.summary.totalDeletions
  )
  const growthRatio = netCodeGrowth / (stats.summary.totalAdditions + 1)
  const innovationRatio = (featRatio * 0.7 + growthRatio * 0.3) * 100

  const refinementImpact =
    stats.specialized.refactorDel > 0
      ? (stats.specialized.refactorDel / (stats.specialized.refactorAdd + 1)) *
        50
      : 0

  const codeHealthIndex = Math.max(
    0,
    (1 - stats.specialized.fixCount / (stats.summary.totalCommits || 1)) * 100
  )

  const techBreadth = Math.min(
    100,
    Object.keys(stats.rootModules).length * 10 +
      Object.keys(stats.fileExtensions).length * 5
  )

  const beatPercent = Math.min(
    99,
    Math.round((stats.summary.totalCommits / avgCommitsPerPerson) * 50)
  )

  const stabilityScore = Math.max(0, 100 - stats.sentiment.stressful * 10)

  return {
    innovationRatio,
    refinementImpact,
    codeHealthIndex,
    techBreadth,
    beatPercent,
    stabilityScore,
  }
}

const buildReport = (
  author,
  year,
  stats,
  projectStats,
  metrics,
  collaboration,
  logs,
  topKeywords
) => {
  const { interweavingScore, soleMaintenanceIndex } = collaboration
  const {
    innovationRatio,
    refinementImpact,
    codeHealthIndex,
    techBreadth,
    beatPercent,
    stabilityScore,
  } = metrics

  const maxStreak = calculateStreak(stats.time.dates)

  const labels = []
  if (stats.extremes.midnightCommits > stats.summary.totalCommits * 0.15)
    labels.push('深夜极客 🌙')
  if (interweavingScore > 40) labels.push('协作核心 🤝')
  if (soleMaintenanceIndex > 60) labels.push('领域领主 🏰')
  if (innovationRatio > 40) labels.push('开拓者 🚀')
  if (techBreadth > 70) labels.push('技术通才 🌐')
  if (refinementImpact > 40) labels.push('代码雕刻师 💎')
  if (stats.extremes.longestDay.span > 8) labels.push('马拉松选手 🏃')
  if (codeHealthIndex > 85) labels.push('定海神针 ⚓')

  return {
    user: author,
    year,
    overview: {
      commits: stats.summary.totalCommits,
      daysWorked: Object.keys(stats.time.dates).length,
      maxStreak,
      linesAdded: stats.summary.totalAdditions,
      linesRemoved: stats.summary.totalDeletions,
      health: codeHealthIndex.toFixed(1),
    },
    contrast: {
      projectTotalCommits: projectStats.totalCommits,
      projectAuthors: projectStats.totalAuthors,
      contributionRatio: (
        (stats.summary.totalCommits / projectStats.totalCommits) *
        100
      ).toFixed(1),
      beatPercent,
    },
    sentimentProfile: {
      mood:
        stats.sentiment.stressful > 5
          ? '负重前行'
          : stats.sentiment.positive > stats.sentiment.negative
          ? '能量满满'
          : '平和冷静',
      positiveCount: stats.sentiment.positive,
      stressCount: stats.sentiment.stressful,
    },
    advancedMetrics: {
      soleMaintenanceIndex: soleMaintenanceIndex.toFixed(1),
      innovationRatio: innovationRatio.toFixed(1),
      refinementImpact: refinementImpact.toFixed(1),
      techBreadth: techBreadth.toFixed(1),
    },
    timeCapsule: {
      latestCommit: stats.extremes.latestMoment
        ? {
            time: `${String(
              stats.extremes.latestMoment.date.getHours()
            ).padStart(2, '0')}:${String(
              stats.extremes.latestMoment.date.getMinutes()
            ).padStart(2, '0')}:${String(
              stats.extremes.latestMoment.date.getSeconds()
            ).padStart(2, '0')}`,
            date: stats.extremes.latestMoment.date.toLocaleDateString(),
            msg: stats.extremes.latestMoment.msg,
          }
        : null,
      marathonDay: stats.extremes.longestDay,
      maxCommitsPerDay: stats.extremes.maxCommitsPerDay,
      monthlyDistribution: stats.time.months,
    },
    techFingerprint: {
      topExtensions: Object.entries(stats.fileExtensions)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    },
    radar: {
      活跃度: Math.min(100, (stats.summary.totalCommits / 250) * 100).toFixed(
        0
      ),
      影响力: Math.min(
        100,
        (stats.summary.totalAdditions / 12000) * 100
      ).toFixed(0),
      精炼度: Math.min(100, refinementImpact * 2).toFixed(0),
      协作度: interweavingScore.toFixed(0),
      稳定性: ((codeHealthIndex + stabilityScore) / 2).toFixed(0),
      广度: techBreadth.toFixed(0),
    },
    milestones: [
      {
        type: '年度首秀',
        date: logs[0].date.toLocaleDateString(),
        detail: logs[0].msg,
      },
      {
        type: '影响力高峰',
        date: stats.extremes.biggestCommit.date.toLocaleDateString(),
        detail: `单次变动 ${stats.extremes.biggestCommit.lines} 行`,
      },
      {
        type: '最长连击',
        date: `${maxStreak} 天`,
        detail: '坚持是最高级的技术',
      },
      {
        type: '年度收官',
        date: logs[logs.length - 1].date.toLocaleDateString(),
        detail: logs[logs.length - 1].msg,
      },
    ],
    posterKeywords: {
      main: topKeywords[0] ? topKeywords[0][0].toUpperCase() : 'CODING',
      secondary: topKeywords.slice(1, 4).map((k) => k[0]),
    },
    habits: {
      peakHour: stats.time.hours.indexOf(Math.max(...stats.time.hours)),
      isWeekendWarrior:
        stats.time.weekdays[0] + stats.time.weekdays[6] >
        stats.summary.totalCommits * 0.3,
    },
    labels,
  }
}

export async function generateReport(config) {
  const { year, repoPath, sampleFilesCount = 10 } = config

  const author = getGitUser(repoPath)
  if (!author) {
    console.error(
      '❌ 无法检测 Git 用户信息，请确保已配置 Git user.name 或 user.email'
    )
    return
  }

  console.log(`🚀 正在深度挖掘 ${author} 的 ${year} 年度开发者画像...`)

  const since = `${year}-01-01 00:00:00`
  const until = `${year}-12-31 23:59:59`
  const authorFilter = `--author="${author}"`

  console.log(`📊 正在抓取全仓库基准数据以进行对比...`)
  const projectStats = getProjectStats(since, until, repoPath)

  const logFormat = '%h|%ad|%s'
  const rawLogs = runGit(
    `git log ${authorFilter} --since="${since}" --until="${until}" --pretty=format:"${logFormat}" --date=iso`,
    repoPath
  )
  if (!rawLogs) {
    console.log('未找到数据。')
    return
  }

  const logs = parseLogs(rawLogs)
  const stats = initStats()

  const numStats = runGit(
    `git log ${authorFilter} --since="${since}" --until="${until}" --numstat --pretty=format:"COMMIT_SEP|%h"`,
    repoPath
  )
  const commitBlocks = numStats.split('COMMIT_SEP|').filter(Boolean)

  processCommits(commitBlocks, logs, stats, author)
  calculateDateExtremes(stats)

  const topKeywords = extractTopKeywords(stats.allMessages)
  const collaboration = analyzeCollaboration(
    stats,
    repoPath,
    sampleFilesCount,
    author
  )
  const metrics = calculateMetrics(stats, projectStats.avgCommitsPerPerson)

  console.log('\n📊 终极数据分析完成，正在生成可视化报告...')
  const report = buildReport(
    author,
    year,
    stats,
    projectStats,
    metrics,
    collaboration,
    logs,
    topKeywords
  )

  renderVisualReport(report, stats)
}

export function renderVisualReport(report, stats) {
  const {
    user,
    year,
    overview,
    contrast,
    radar,
    milestones,
    posterKeywords,
    habits,
    labels,
    timeCapsule,
    sentimentProfile,
    advancedMetrics,
  } = report

  console.log('\n' + '='.repeat(80))
  console.log(`✨ ${user} | ${year} 年度开发者数字化画像 ✨`)
  console.log('='.repeat(80))

  console.log('\n【核心能力与影响力】')
  console.log(
    `  📊 你贡献了全项目 ${contrast.contributionRatio}% 的代码提交，击败了 ${contrast.beatPercent}% 的开发者`
  )
  console.log(
    `  🏰 独自维护指标: ${advancedMetrics.soleMaintenanceIndex}% | 创新产出比: ${advancedMetrics.innovationRatio}%`
  )
  console.log(
    `  🛠️  技术广度: ${advancedMetrics.techBreadth}% (跨越了 ${
      Object.keys(stats.rootModules).length
    } 个模块，涉及 ${Object.keys(stats.fileExtensions).join('/')} 等技术)`
  )
  console.log(
    `  💎  代码精炼度: ${advancedMetrics.refinementImpact}% (在重构中移除了 ${stats.specialized.refactorDel} 行冗余代码)`
  )
  console.log(
    `  🔥 年度总提交: ${overview.commits} 次 | 🏆 连续打卡: ${overview.maxStreak} 天`
  )
  console.log(`  🏷️ 荣誉标签: ${labels.join(' | ') || '稳步前进中'}`)

  console.log('\n【情绪状态 & 极端时刻】')
  console.log(
    `  🎭 年度编码心境: ${sentimentProfile.mood} (代码健康度评分: ${overview.health}%)`
  )
  if (timeCapsule.latestCommit) {
    console.log(
      `  🌙 年度最晚提交: ${timeCapsule.latestCommit.date} ${timeCapsule.latestCommit.time} -> "${timeCapsule.latestCommit.msg}"`
    )
  }
  if (timeCapsule.marathonDay.date) {
    console.log(
      `  🏃 单日最长奋战: ${timeCapsule.marathonDay.date} (持续 ${timeCapsule.marathonDay.span} 小时)`
    )
  }
  if (timeCapsule.maxCommitsPerDay.count > 0) {
    console.log(
      `  🚀 单日最多提交: ${timeCapsule.maxCommitsPerDay.date} (共 ${timeCapsule.maxCommitsPerDay.count} 次提交)`
    )
  }
  if (stats.extremes.biggestCommit.lines > 0) {
    console.log(
      `  📊 影响力高峰: ${stats.extremes.biggestCommit.date.toLocaleDateString()} (单次改动 ${
        stats.extremes.biggestCommit.lines
      } 行)`
    )
  }

  console.log('\n【六维事业雷达基因图谱】')
  Object.entries(radar).forEach(([key, value]) => {
    const bar = '█'.repeat(Math.floor(value / 5)).padEnd(20, '░')
    console.log(`  ${key.padEnd(8)} [${bar}] ${value}%`)
  })

  console.log('\n【年度关键词海报】')
  console.log(`  ***********************************`)
  console.log(`  * YEAR KEYWORD: ${posterKeywords.main.padEnd(10)} *`)
  console.log(`  * ${posterKeywords.secondary.join(' · ').padEnd(28)} *`)
  console.log(`  ***********************************`)

  console.log('\n【工作习惯洞察】')
  console.log(`  ⏰ 黄金时段: ${habits.peakHour}:00 点左右是你灵感迸发的高峰`)
  const netLines = overview.linesAdded - overview.linesRemoved
  console.log(
    `  📈 代码资产净增: ${netLines} 行 (新增: ${overview.linesAdded} / 移除: ${overview.linesRemoved})`
  )

  console.log('\n【年度里程碑】')
  milestones.forEach((m) => {
    console.log(`  📅 ${m.date.padEnd(12)} | [${m.type.padEnd(8)}] ${m.detail}`)
  })

  console.log('\n' + '='.repeat(80))
  console.log(
    `💡 寄语：你的年度核心特质是「${
      Object.entries(radar).sort((a, b) => b[1] - a[1])[0][0]
    }」，这是属于你的工程印记。`
  )
}
