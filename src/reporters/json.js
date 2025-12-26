import { formatDateTime } from '../utils/colors.js'

export function outputJsonReport(report, stats, projectStats) {
  const jsonData = {
    projectName: report.projectName,
    user: report.user,
    year: report.year,
    overview: {
      commits: report.overview.commits,
      daysWorked: report.overview.daysWorked,
      maxStreak: report.overview.maxStreak,
      linesAdded: report.overview.linesAdded,
      linesRemoved: report.overview.linesRemoved,
      health: parseFloat(report.overview.health),
    },
    contrast: {
      projectTotalCommits: report.contrast.projectTotalCommits,
      projectAuthors: report.contrast.projectAuthors,
      contributionRatio: parseFloat(report.contrast.contributionRatio),
      beatPercent: report.contrast.beatPercent,
    },
    sentimentProfile: {
      mood: report.sentimentProfile.mood,
      positiveCount: report.sentimentProfile.positiveCount,
      stressCount: report.sentimentProfile.stressCount,
    },
    advancedMetrics: {
      soleMaintenanceIndex: parseFloat(
        report.advancedMetrics.soleMaintenanceIndex
      ),
      innovationRatio: parseFloat(report.advancedMetrics.innovationRatio),
      refinementImpact: parseFloat(report.advancedMetrics.refinementImpact),
      techBreadth: parseFloat(report.advancedMetrics.techBreadth),
    },
    timeCapsule: {
      latestCommit: report.timeCapsule.latestCommit,
      marathonDay: report.timeCapsule.marathonDay,
      maxCommitsPerDay: report.timeCapsule.maxCommitsPerDay,
      monthlyDistribution: report.timeCapsule.monthlyDistribution,
    },
    techFingerprint: {
      topExtensions: report.techFingerprint.topExtensions,
    },
    radar: Object.fromEntries(
      Object.entries(report.radar).map(([key, value]) => [key, parseInt(value)])
    ),
    milestones: report.milestones,
    posterKeywords: report.posterKeywords,
    habits: report.habits,
    labels: report.labels,
    stats: {
      modules: Object.keys(stats.modules).length,
      rootModules: Object.keys(stats.rootModules),
      fileExtensions: Object.keys(stats.fileExtensions),
      specialized: {
        refactorAdd: stats.specialized.refactorAdd,
        refactorDel: stats.specialized.refactorDel,
        fixCount: stats.specialized.fixCount,
      },
      extremes: {
        biggestCommit: {
          msg: stats.extremes.biggestCommit.msg,
          lines: stats.extremes.biggestCommit.lines,
          date: stats.extremes.biggestCommit.date
            ? formatDateTime(stats.extremes.biggestCommit.date)
            : null,
        },
        midnightCommits: stats.extremes.midnightCommits,
        longestDay: stats.extremes.longestDay,
        maxCommitsPerDay: stats.extremes.maxCommitsPerDay,
      },
    },
  }

  console.log(JSON.stringify(jsonData, null, 2))
}

