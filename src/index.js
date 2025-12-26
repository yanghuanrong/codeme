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

export async function generateReport(config) {
  const { year, repoPath, sampleFilesCount = 10, jsonMode = false } = config

  let validatedRepoPath
  try {
    validatedRepoPath = validateRepo(repoPath)
  } catch (error) {
    if (jsonMode) {
      console.error(JSON.stringify({ error: error.message }))
    } else {
      console.error(colorize(`❌ ${error.message}`, colors.red, colors.bright))
    }
    return
  }

  const author = getGitUser(validatedRepoPath)
  if (!author) {
    if (jsonMode) {
      console.error(
        JSON.stringify({
          error:
            '无法检测 Git 用户信息，请确保已配置 Git user.name 或 user.email',
        })
      )
    } else {
      console.error(
        colorize(
          '❌ 无法检测 Git 用户信息，请确保已配置 Git user.name 或 user.email',
          colors.red,
          colors.bright
        )
      )
    }
    return
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
  }

  const since = `${year}-01-01 00:00:00`
  const until = `${year}-12-31 23:59:59`
  const authorFilter = `--author="${author}"`

  if (!jsonMode) {
    console.log(colorize('📊 正在抓取全仓库基准数据以进行对比...', colors.blue))
  }
  const projectStats = getProjectStats(since, until, validatedRepoPath)

  const rawLogs = getCommitLogs(authorFilter, since, until, validatedRepoPath)
  if (!rawLogs) {
    if (jsonMode) {
      console.log(JSON.stringify({ error: '未找到数据' }))
    } else {
      console.log(colorize('未找到数据。', colors.yellow))
    }
    return
  }

  const logs = parseLogs(rawLogs)
  const stats = initStats()

  const numStats = getCommitStats(authorFilter, since, until, validatedRepoPath)
  const commitBlocks = numStats.split('COMMIT_SEP|').filter(Boolean)

  processCommits(commitBlocks, logs, stats, author)
  calculateDateExtremes(stats)

  const topKeywords = extractTopKeywords(stats.allMessages)
  const collaboration = analyzeCollaboration(
    stats,
    validatedRepoPath,
    sampleFilesCount,
    author
  )
  const metrics = calculateMetrics(stats, projectStats.avgCommitsPerPerson)
  const projectName = getProjectName(validatedRepoPath)

  if (!jsonMode) {
    console.log(
      colorize(
        '\n📊 终极数据分析完成，正在生成可视化报告...',
        colors.green,
        colors.bright
      )
    )
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
