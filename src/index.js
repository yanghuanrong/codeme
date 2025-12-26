import { colorize, colors } from './utils/colors.js'
import {
  validateRepo,
  getGitUser,
  getProjectName,
  getProjectStats,
  getCommitLogs,
  getCommitStats,
} from './utils/git.js'
import {
  initStats,
  parseLogs,
  processCommits,
  calculateDateExtremes,
  extractTopKeywords,
} from './analyzers/stats.js'
import { SENTIMENT_DICT } from './utils/constants.js'
import { analyzeCollaboration } from './analyzers/collaboration.js'
import { calculateMetrics } from './analyzers/metrics.js'
import { buildReport } from './reporters/buildReport.js'
import { outputJsonReport } from './reporters/json.js'
import { renderVisualReport } from './reporters/visual.js'
import { ProgressBar, showProgress, logStep } from './utils/progress.js'
import { createError, handleError } from './utils/errors.js'

function processCommitsWithProgress(
  commitBlocks,
  logs,
  stats,
  author,
  progressBar
) {
  let processed = 0
  commitBlocks.forEach((block) => {
    const lines = block.trim().split('\n')
    const hash = lines[0]
    const files = lines.slice(1)
    const logEntry = logs.find((l) => l.hash === hash)
    if (!logEntry) {
      processed++
      if (progressBar) progressBar.update(processed)
      return
    }

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
    if (progressBar) progressBar.update(processed)
  })

  stats.summary.totalCommits = logs.length
}

export async function generateReport(config) {
  const { year, repoPath, sampleFilesCount = 10, jsonMode = false } = config

  let validatedRepoPath
  try {
    if (!jsonMode) {
      logStep(1, 6, '验证仓库路径...')
    }
    validatedRepoPath = validateRepo(repoPath)
  } catch (error) {
    throw createError('REPO_NOT_FOUND', error.message)
  }

  if (!jsonMode) {
    logStep(2, 6, '检测 Git 用户信息...')
  }
  const author = getGitUser(validatedRepoPath)
  if (!author) {
    throw createError('NO_GIT_USER')
  }

  if (!jsonMode) {
    console.log(
      colorize(
        `🚀 正在深度挖掘 ${colorize(
          author,
          colors.cyan,
          colors.bright
        )} 的 ${colorize(
          year,
          colors.yellow,
          colors.bright
        )} 年度开发者画像...`,
        colors.blue
      )
    )
    console.log('')
  }

  const since = `${year}-01-01 00:00:00`
  const until = `${year}-12-31 23:59:59`
  const authorFilter = `--author="${author}"`

  let progressSpinner
  if (!jsonMode) {
    logStep(3, 6, '抓取全仓库基准数据以进行对比...')
    progressSpinner = showProgress('正在分析项目统计数据...')
  }
  const projectStats = getProjectStats(since, until, validatedRepoPath)
  if (!jsonMode) {
    progressSpinner.stop('项目统计数据获取完成')
  }

  if (!jsonMode) {
    logStep(4, 6, '获取提交记录...')
    progressSpinner = showProgress('正在获取提交日志...')
  }
  const rawLogs = getCommitLogs(authorFilter, since, until, validatedRepoPath)
  if (!jsonMode) {
    progressSpinner.stop('提交日志获取完成')
  }

  if (!rawLogs) {
    throw createError('NO_DATA')
  }

  const logs = parseLogs(rawLogs)
  const stats = initStats()

  if (!jsonMode) {
    logStep(5, 6, '分析提交数据...')
  }
  const numStats = getCommitStats(authorFilter, since, until, validatedRepoPath)
  const commitBlocks = numStats.split('COMMIT_SEP|').filter(Boolean)

  let progressBar = null
  if (commitBlocks.length > 0 && !jsonMode) {
    progressBar = new ProgressBar(commitBlocks.length, '处理提交')
    console.log('')
  }

  processCommitsWithProgress(commitBlocks, logs, stats, author, progressBar)

  if (!jsonMode && progressBar) {
    progressBar.finish('提交数据处理完成')
    console.log('')
  }

  if (!jsonMode) {
    progressSpinner = showProgress('正在计算时间极值...')
  }
  calculateDateExtremes(stats)
  if (!jsonMode) {
    progressSpinner.stop()
  }

  if (!jsonMode) {
    progressSpinner = showProgress('正在提取关键词...')
  }
  const topKeywords = extractTopKeywords(stats.allMessages)
  if (!jsonMode) {
    progressSpinner.stop()
  }

  if (!jsonMode) {
    progressSpinner = showProgress('正在分析协作度...')
  }
  const collaboration = analyzeCollaboration(
    stats,
    validatedRepoPath,
    sampleFilesCount,
    author
  )
  if (!jsonMode) {
    progressSpinner.stop('协作度分析完成')
  }

  if (!jsonMode) {
    progressSpinner = showProgress('正在计算指标...')
  }
  const metrics = calculateMetrics(stats, projectStats.avgCommitsPerPerson)
  if (!jsonMode) {
    progressSpinner.stop()
  }

  const projectName = getProjectName(validatedRepoPath)

  if (!jsonMode) {
    logStep(6, 6, '生成报告...')
  }
  const report = buildReport(
    author,
    year,
    projectName,
    stats,
    projectStats,
    metrics,
    collaboration,
    logs,
    topKeywords
  )

  if (jsonMode) {
    outputJsonReport(report, stats, projectStats)
  } else {
    renderVisualReport(report, stats)
  }
}

export { outputJsonReport, renderVisualReport }
