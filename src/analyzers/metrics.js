import { LABEL_THRESHOLDS, RADAR_THRESHOLDS } from '../utils/constants.js'

export const calculateMetrics = (stats, avgCommitsPerPerson) => {
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

export const generateLabels = (stats, metrics, collaboration) => {
  const { interweavingScore = 0, soleMaintenanceIndex = 0 } = collaboration || {}
  const {
    innovationRatio = 0,
    techBreadth = 0,
    refinementImpact = 0,
    codeHealthIndex = 0,
  } = metrics || {}

  const labels = []
  if (
    stats.extremes.midnightCommits >
    stats.summary.totalCommits * LABEL_THRESHOLDS.midnightCommits
  )
    labels.push('深夜极客 🌙')
  if (interweavingScore > LABEL_THRESHOLDS.interweavingScore)
    labels.push('协作核心 🤝')
  if (soleMaintenanceIndex > LABEL_THRESHOLDS.soleMaintenanceIndex)
    labels.push('领域领主 🏰')
  if (innovationRatio > LABEL_THRESHOLDS.innovationRatio)
    labels.push('开拓者 🚀')
  if (techBreadth > LABEL_THRESHOLDS.techBreadth) labels.push('技术通才 🌐')
  if (refinementImpact > LABEL_THRESHOLDS.refinementImpact)
    labels.push('代码雕刻师 💎')
  if (
    stats.extremes.longestDay?.span &&
    parseFloat(stats.extremes.longestDay.span) > LABEL_THRESHOLDS.longestDaySpan
  )
    labels.push('马拉松选手 🏃')
  if (codeHealthIndex > LABEL_THRESHOLDS.codeHealthIndex)
    labels.push('定海神针 ⚓')

  return labels
}

export const calculateRadar = (stats, metrics, collaboration) => {
  const { interweavingScore = 0 } = collaboration
  const {
    stabilityScore = 0,
    codeHealthIndex = 0,
    techBreadth = 0,
    refinementImpact = 0,
  } = metrics

  return {
    活跃度: Math.min(
      100,
      (stats.summary.totalCommits / RADAR_THRESHOLDS.activeCommits) * 100
    ).toFixed(0),
    影响力: Math.min(
      100,
      (stats.summary.totalAdditions / RADAR_THRESHOLDS.activeLines) * 100
    ).toFixed(0),
    精炼度: Math.min(100, (refinementImpact || 0) * 2).toFixed(0),
    协作度: (interweavingScore || 0).toFixed(0),
    稳定性: (((codeHealthIndex || 0) + (stabilityScore || 0)) / 2).toFixed(0),
    广度: (techBreadth || 0).toFixed(0),
  }
}

