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
import { analyzeCollaboration } from './analyzers/collaboration.js'
import { calculateMetrics } from './analyzers/metrics.js'
import { buildReport } from './reporters/buildReport.js'
import { outputJsonReport } from './reporters/json.js'
import { renderVisualReport } from './reporters/visual.js'
import { ProgressBar, showProgress, logStep } from './utils/progress.js'
import { createError, handleError } from './utils/errors.js'

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
  let onProgress = null
  if (commitBlocks.length > 0 && !jsonMode) {
    progressBar = new ProgressBar(commitBlocks.length, '处理提交')
    console.log('')
    onProgress = (current, total) => {
      progressBar.update(current)
    }
  }

  processCommits(commitBlocks, logs, stats, author, onProgress)

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

  let collaborationProgressBar = null
  let collaborationOnProgress = null
  if (!jsonMode) {
    const topFilesCount = Math.min(
      sampleFilesCount,
      Object.keys(stats.modules).length
    )
    if (topFilesCount > 0) {
      collaborationProgressBar = new ProgressBar(topFilesCount, '分析协作度')
      console.log('')
      collaborationOnProgress = (current, total) => {
        collaborationProgressBar.update(current)
      }
    } else {
      progressSpinner = showProgress('正在分析协作度...')
    }
  }
  const collaboration = analyzeCollaboration(
    stats,
    validatedRepoPath,
    sampleFilesCount,
    author,
    collaborationOnProgress
  )
  if (!jsonMode) {
    if (collaborationProgressBar) {
      collaborationProgressBar.finish('协作度分析完成')
      console.log('')
    } else {
      progressSpinner.stop('协作度分析完成')
    }
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
