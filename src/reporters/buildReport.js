import { formatDateTime } from '../utils/colors.js';
import { calculateStreak } from '../analyzers/stats.js';
import { generateLabels, calculateRadar } from '../analyzers/metrics.js';

export const buildReport = (
  author,
  year,
  projectName,
  stats,
  projectStats,
  metrics,
  collaboration,
  logs,
  topKeywords,
  unifiedEvaluation = null
) => {
  const { interweavingScore, soleMaintenanceIndex } = collaboration;
  const {
    innovationRatio,
    refinementImpact,
    codeHealthIndex,
    techBreadth,
    beatPercent,
    stabilityScore,
  } = metrics;

  const maxStreak = calculateStreak(stats.time.dates);
  // 如果提供了统一评价，使用统一评价的标签，否则使用原有逻辑（向后兼容）
  const labels = unifiedEvaluation?.labels || generateLabels(stats, metrics, collaboration);
  const radar = calculateRadar(stats, metrics, collaboration);

  return {
    user: author,
    year,
    projectName,
    overview: {
      commits: stats.summary.totalCommits,
      daysWorked: Object.keys(stats.time.dates).length,
      maxStreak,
      linesAdded: stats.summary.totalAdditions,
      linesRemoved: stats.summary.totalDeletions,
      health: (codeHealthIndex || 0).toFixed(1),
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
      soleMaintenanceIndex: (soleMaintenanceIndex || 0).toFixed(1),
      innovationRatio: (innovationRatio || 0).toFixed(1),
      refinementImpact: (refinementImpact || 0).toFixed(1),
      techBreadth: (techBreadth || 0).toFixed(1),
    },
    timeCapsule: {
      latestCommit: stats.extremes.latestMoment
        ? {
            date: formatDateTime(stats.extremes.latestMoment.date),
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
    radar,
    milestones: [
      {
        type: '年度首秀',
        date: formatDateTime(logs[0].date),
        detail: logs[0].msg,
      },
      {
        type: '年度收官',
        date: formatDateTime(logs[logs.length - 1].date),
        detail: logs[logs.length - 1].msg,
      },
      {
        type: '影响力高峰',
        date: stats.extremes.biggestCommit.date
          ? formatDateTime(stats.extremes.biggestCommit.date)
          : '',
        detail: `单次变动 ${stats.extremes.biggestCommit.lines} 行`,
      },
      {
        type: '最长连击',
        date: `${maxStreak} 天`,
        detail: '坚持是最高级的技术',
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
    unifiedEvaluation: unifiedEvaluation || null,
  };
};
