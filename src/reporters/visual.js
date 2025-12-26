import { colorize, colors, formatDateTime } from '../utils/colors.js'

export function renderVisualReport(report, stats) {
  const {
    user,
    year,
    projectName,
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

  console.log('\n' + colorize('='.repeat(80), colors.cyan, colors.bright))
  console.log(
    colorize('✨ ', colors.yellow) +
      colorize(`${projectName}`, colors.magenta, colors.bright) +
      colorize(' | ', colors.gray) +
      colorize(`${user}`, colors.cyan, colors.bright) +
      colorize(' | ', colors.gray) +
      colorize(`${year}`, colors.yellow, colors.bright) +
      colorize(' 年度开发者数字化画像 ', colors.white) +
      colorize('✨', colors.yellow)
  )
  console.log(colorize('='.repeat(80), colors.cyan, colors.bright))

  console.log(
    '\n' + colorize('【核心能力与影响力】', colors.magenta, colors.bright)
  )
  console.log(
    `  ${colorize('📊', colors.blue)} 你贡献了全项目 ${colorize(
      `${contrast.contributionRatio}%`,
      colors.green,
      colors.bright
    )} 的代码提交，击败了 ${colorize(
      `${contrast.beatPercent}%`,
      colors.yellow,
      colors.bright
    )} 的开发者`
  )
  console.log(
    `  ${colorize('🏰', colors.magenta)} ${'独自维护指标'.padEnd(
      9
    )}: ${colorize(
      `${advancedMetrics.soleMaintenanceIndex}%`,
      colors.cyan
    )} | 创新产出比: ${colorize(
      `${advancedMetrics.innovationRatio}%`,
      colors.green
    )}`
  )
  console.log(
    `  ${colorize('🛠️', colors.blue)} ${' 技术广度'.padEnd(12)}: ${colorize(
      `${advancedMetrics.techBreadth}%`,
      colors.cyan
    )} (跨越了 ${colorize(
      Object.keys(stats.rootModules).length,
      colors.yellow
    )} 个模块，涉及 ${colorize(
      Object.keys(stats.fileExtensions).join('/'),
      colors.green
    )} 等技术)`
  )
  console.log(
    `  ${colorize('💎', colors.cyan)} ${'代码精炼度'.padEnd(10)}: ${colorize(
      `${advancedMetrics.refinementImpact}%`,
      colors.green
    )} (在重构中移除了 ${colorize(
      stats.specialized.refactorDel,
      colors.yellow
    )} 行冗余代码)`
  )
  console.log(
    `  ${colorize('🔥', colors.red)} ${'年度总提交'.padEnd(10)}: ${colorize(
      `${overview.commits}`,
      colors.bright,
      colors.yellow
    )} 次 | ${colorize('🏆', colors.yellow)} 连续打卡: ${colorize(
      `${overview.maxStreak}`,
      colors.green,
      colors.bright
    )} 天`
  )
  console.log(
    `  ${colorize('🏷️', colors.magenta)} ${' 荣誉标签'.padEnd(12)}: ${
      labels.length > 0
        ? labels.map((l) => colorize(l, colors.cyan)).join(' | ')
        : colorize('稳步前进中', colors.gray)
    }`
  )

  console.log(
    '\n' + colorize('【情绪状态 & 极端时刻】', colors.magenta, colors.bright)
  )
  const moodColor =
    sentimentProfile.mood === '能量满满'
      ? colors.green
      : sentimentProfile.mood === '负重前行'
      ? colors.yellow
      : colors.cyan
  console.log(
    `  ${colorize('🎭', colors.magenta)} ${'年度编码心境'.padEnd(
      12
    )}: ${colorize(
      sentimentProfile.mood,
      moodColor,
      colors.bright
    )} (代码健康度评分: ${colorize(`${overview.health}%`, colors.green)})`
  )
  if (timeCapsule.latestCommit) {
    console.log(
      `  ${colorize('🌙', colors.blue)} ${'年度最晚提交'.padEnd(
        12
      )}: ${colorize(
        timeCapsule.latestCommit.date,
        colors.yellow
      )} -> ${colorize(`"${timeCapsule.latestCommit.msg}"`, colors.cyan)}`
    )
  }
  if (timeCapsule.marathonDay.date) {
    const marathonDateTime = formatDateTime(timeCapsule.marathonDay.date)
    console.log(
      `  ${colorize('🏃', colors.green)} ${'单日最长奋战'.padEnd(
        12
      )}: ${colorize(marathonDateTime, colors.yellow)} (持续 ${colorize(
        `${timeCapsule.marathonDay.span}`,
        colors.red,
        colors.bright
      )} 小时)`
    )
  }
  if (timeCapsule.maxCommitsPerDay.count > 0) {
    const maxCommitsDateTime = formatDateTime(timeCapsule.maxCommitsPerDay.date)
    console.log(
      `  ${colorize('🚀', colors.red)} ${'单日最多提交'.padEnd(12)}: ${colorize(
        maxCommitsDateTime,
        colors.yellow
      )} (共 ${colorize(
        timeCapsule.maxCommitsPerDay.count,
        colors.green,
        colors.bright
      )} 次提交)`
    )
  }

  console.log(
    '\n' + colorize('【六维事业雷达基因图谱】', colors.magenta, colors.bright)
  )
  const radarColors = [
    colors.red,
    colors.yellow,
    colors.green,
    colors.cyan,
    colors.blue,
    colors.magenta,
  ]
  let colorIndex = 0
  Object.entries(radar).forEach(([key, value]) => {
    const valueNum = parseInt(value)
    const filledBars = Math.floor(valueNum / 5)
    const filledBar = colorize(
      '█'.repeat(filledBars),
      radarColors[colorIndex % radarColors.length]
    )
    const emptyBar = colorize('░'.repeat(20 - filledBars), colors.gray)
    const valueColor =
      valueNum >= 80 ? colors.green : valueNum >= 60 ? colors.yellow : colors.gray
    console.log(
      `  ${colorize(
        key.padEnd(8),
        colors.white
      )} [${filledBar}${emptyBar}] ${colorize(
        `${value}%`,
        valueColor,
        colors.bright
      )}`
    )
    colorIndex++
  })

  console.log(
    '\n' + colorize('【年度关键词海报】', colors.magenta, colors.bright)
  )
  const border = colorize('*'.repeat(36), colors.cyan)
  console.log(`  ${border}`)
  console.log(
    `  ${colorize('*', colors.cyan)} ${colorize(
      'YEAR KEYWORD:',
      colors.gray
    )} ${colorize(
      posterKeywords.main.padEnd(10),
      colors.yellow,
      colors.bright
    )} ${colorize('*', colors.cyan)}`
  )
  console.log(
    `  ${colorize('*', colors.cyan)} ${colorize(
      posterKeywords.secondary.join(' · ').padEnd(28),
      colors.cyan
    )} ${colorize('*', colors.cyan)}`
  )
  console.log(`  ${border}`)

  console.log(
    '\n' + colorize('【工作习惯洞察】', colors.magenta, colors.bright)
  )
  console.log(
    `  ${colorize('🕒', colors.yellow)} ${'黄金时段'.padEnd(12)}: ${colorize(
      `${habits.peakHour}:00`,
      colors.cyan,
      colors.bright
    )} 点左右是你灵感迸发的高峰`
  )
  const netLines = overview.linesAdded - overview.linesRemoved
  const netLinesColor =
    netLines > 0 ? colors.green : netLines < 0 ? colors.red : colors.gray
  console.log(
    `  ${colorize('📈', colors.green)} ${'代码资产净增'.padEnd(10)}: ${colorize(
      `${netLines}`,
      netLinesColor,
      colors.bright
    )} 行 (新增: ${colorize(
      overview.linesAdded,
      colors.green
    )} / 移除: ${colorize(overview.linesRemoved, colors.red)})`
  )

  console.log('\n' + colorize('【年度里程碑】', colors.magenta, colors.bright))
  const milestoneTypes = {
    年度首秀: colors.green,
    影响力高峰: colors.red,
    最长连击: colors.yellow,
    年度收官: colors.blue,
  }
  milestones.forEach((m) => {
    const typeColor = milestoneTypes[m.type] || colors.white
    const dateDisplay = m.date.includes('天') ? m.date.padEnd(19) : m.date
    console.log(
      `  ${colorize('📅', colors.yellow)} ${colorize(
        dateDisplay,
        colors.cyan
      )} ${colorize('|', colors.gray)} [${colorize(
        m.type.padEnd(8),
        typeColor,
        colors.bright
      )}] ${colorize(m.detail, colors.white)}`
    )
  })

  console.log('\n' + colorize('='.repeat(80), colors.cyan, colors.bright))
  const topTrait = Object.entries(radar).sort((a, b) => b[1] - a[1])[0][0]
  console.log(
    `${colorize('💡', colors.yellow)} ${colorize(
      '寄语：',
      colors.gray
    )}你的年度核心特质是「${colorize(
      topTrait,
      colors.cyan,
      colors.bright
    )}」，这是属于你的工程印记。`
  )
  console.log()
}

