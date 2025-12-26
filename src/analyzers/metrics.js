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

/**
 * 计算六维事业雷达基因图谱
 * 
 * 六个维度的计算方式：
 * 
 * 1. 活跃度 (0-100)
 *    计算：总提交数 / 250 * 100（上限100%）
 *    含义：衡量开发者的提交频率和持续贡献能力
 *    阈值：250次提交 = 100%
 * 
 * 2. 影响力 (0-100)
 *    计算：总新增代码行数 / 12000 * 100（上限100%）
 *    含义：衡量代码产出量，反映对项目的实质性贡献
 *    阈值：12000行代码 = 100%
 * 
 * 3. 精炼度 (0-100)
 *    计算：refinementImpact * 2（上限100%）
 *    refinementImpact = (重构删除行数 / (重构新增行数 + 1)) * 50
 *    含义：衡量代码重构质量，删除冗余代码的能力（删除越多，精炼度越高）
 *    说明：值越高表示重构时删除的冗余代码越多，代码质量提升越明显
 * 
 * 4. 协作度 (0-100)
 *    计算：interweavingScore（直接使用，无需转换）
 *    interweavingScore = (他人贡献的代码行数 / 总代码行数) * 100
 *    含义：衡量与他人协作开发的程度
 *    说明：分析Top文件的git blame数据，计算他人参与编写的代码行占比
 *          值越高表示协作越密切，值越低表示独立开发越多
 * 
 * 5. 稳定性 (0-100)
 *    计算：(codeHealthIndex + stabilityScore) / 2
 *    - codeHealthIndex = (1 - 修复类提交数 / 总提交数) * 100
 *      含义：代码健康度，修复提交越少，健康度越高
 *    - stabilityScore = 100 - 压力关键词提交数 * 10
 *      含义：提交信息中的压力关键词（urgent/critical/hotfix等）越少，稳定性越高
 *    含义：综合衡量代码质量和开发节奏的稳定性
 * 
 * 6. 广度 (0-100)
 *    计算：techBreadth（上限100%）
 *    techBreadth = min(100, 根模块数 * 10 + 文件扩展名数 * 5)
 *    含义：衡量技术栈的广度，涉及的模块和技术类型多样性
 *    说明：每个根模块贡献10分，每种文件扩展名贡献5分
 */
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

