import { LABEL_THRESHOLDS } from '../utils/constants.js';

/**
 * 统一的评价生成函数
 * 基于聚合后的完整数据生成标签和角色评价，确保各模块输出一致
 * @param {Object} stats - 聚合后的统计数据
 * @param {Object} metrics - 聚合后的指标数据
 * @param {Object} collaboration - 协作数据
 * @param {Array} projectResults - 项目结果数组（包含 report）
 * @param {Object} aggregatedProjectStats - 聚合后的项目统计（可选，用于多项目场景）
 */
export function generateUnifiedEvaluation(
  stats,
  metrics,
  collaboration,
  projectResults = [],
  aggregatedProjectStats = null
) {
  const { interweavingScore = 0, soleMaintenanceIndex = 0 } =
    collaboration || {};
  const {
    innovationRatio = 0,
    techBreadth = 0,
    refinementImpact = 0,
    codeHealthIndex = 0,
  } = metrics || {};

  // 生成标签
  const labels = [];
  if (
    stats.extremes.midnightCommits >
    stats.summary.totalCommits * LABEL_THRESHOLDS.midnightCommits
  )
    labels.push('深夜极客 🌙');
  if (interweavingScore > LABEL_THRESHOLDS.interweavingScore)
    labels.push('协作核心 🤝');
  if (soleMaintenanceIndex > LABEL_THRESHOLDS.soleMaintenanceIndex)
    labels.push('领域领主 🏰');
  if (innovationRatio > LABEL_THRESHOLDS.innovationRatio)
    labels.push('开拓者 🚀');
  if (techBreadth > LABEL_THRESHOLDS.techBreadth) labels.push('技术通才 🌐');
  if (refinementImpact > LABEL_THRESHOLDS.refinementImpact)
    labels.push('代码雕刻师 💎');
  if (
    stats.extremes.longestDay?.span &&
    parseFloat(stats.extremes.longestDay.span) > LABEL_THRESHOLDS.longestDaySpan
  )
    labels.push('马拉松选手 🏃');
  if (codeHealthIndex > LABEL_THRESHOLDS.codeHealthIndex)
    labels.push('定海神针 ⚓');

  // 生成角色评价
  const totalProjects = projectResults.length || 1;
  // 计算聚合后的贡献占比
  let contributionRatio = 0;
  if (aggregatedProjectStats && aggregatedProjectStats.totalCommits > 0) {
    // 多项目：使用聚合后的项目统计
    contributionRatio =
      (stats.summary.totalCommits / aggregatedProjectStats.totalCommits) * 100;
  } else if (projectResults.length === 1 && projectResults[0].report?.contrast) {
    // 单项目：直接使用项目的贡献占比
    contributionRatio =
      parseFloat(projectResults[0].report.contrast.contributionRatio) || 0;
  } else if (projectResults.length > 1) {
    // 多项目但未提供 aggregatedProjectStats：计算加权平均贡献占比
    const totalProjectCommits = projectResults.reduce(
      (sum, r) => sum + (r.projectStats?.totalCommits || 0),
      0
    );
    const totalAuthorCommits = stats.summary.totalCommits;
    if (totalProjectCommits > 0) {
      contributionRatio = (totalAuthorCommits / totalProjectCommits) * 100;
    }
  }
  const fixRatio =
    stats.summary.totalCommits > 0
      ? stats.specialized.fixCount / stats.summary.totalCommits
      : 0;
  const refactorRatio =
    stats.summary.totalCommits > 0
      ? stats.style.refactor / stats.summary.totalCommits
      : 0;

  // 分析每个项目的贡献占比
  const projectContributions = projectResults.map((r) => {
    const projectContributionRatio =
      parseFloat(r.report?.contrast?.contributionRatio) || 0;
    const projectAuthors = r.projectStats?.totalAuthors || 1;
    const avgContribution = 100 / projectAuthors;
    const coreThreshold = avgContribution * 1.8;
    const isCoreProject = projectContributionRatio >= coreThreshold;

    return {
      name: r.projectName,
      contributionRatio: projectContributionRatio,
      authors: projectAuthors,
      commits: r.stats?.summary?.totalCommits || 0,
      isCoreProject,
      coreThreshold,
    };
  });

  const coreProjects = projectContributions.filter((p) => p.isCoreProject);
  const coreProjectCount = coreProjects.length;
  const totalCommitsInCoreProjects = coreProjects.reduce(
    (sum, p) => sum + p.commits,
    0
  );
  const coreProjectRatio =
    stats.summary.totalCommits > 0
      ? (totalCommitsInCoreProjects / stats.summary.totalCommits) * 100
      : 0;

  // 判断角色类型
  let role = '';
  let roleEmoji = '';
  let evaluation = '';
  let details = [];

  // 核心输出型
  if (
    coreProjectCount > 0 &&
    coreProjectRatio >= 60 &&
    innovationRatio > 25
  ) {
    role = '核心输出';
    roleEmoji = '⚡';
    evaluation = '你是团队的核心引擎，承担着主要的开发任务和功能创新。';
    if (coreProjectCount === 1) {
      details.push(
        `在核心项目中贡献了 ${coreProjects[0].contributionRatio.toFixed(
          1
        )}% 的提交`
      );
    } else {
      details.push(`在 ${coreProjectCount} 个核心项目中贡献占比均超过阈值`);
      details.push(`核心项目贡献占总提交的 ${coreProjectRatio.toFixed(1)}%`);
    }
    details.push(`创新产出比达到 ${innovationRatio.toFixed(1)}%`);
  }
  // 独立维护者
  else if (
    soleMaintenanceIndex > 55 &&
    coreProjectCount > 0 &&
    coreProjects.some((p) => p.contributionRatio > 30)
  ) {
    role = '独立维护者';
    roleEmoji = '🏰';
    evaluation = '你是独立模块的守护者，独自承担关键模块的维护和开发。';
    details.push(`独自维护指标高达 ${soleMaintenanceIndex.toFixed(1)}%`);
    if (coreProjectCount === 1) {
      details.push(
        `在核心项目中独立贡献 ${coreProjects[0].contributionRatio.toFixed(
          1
        )}% 的代码`
      );
    } else {
      details.push(`在 ${coreProjectCount} 个核心项目中承担独立开发`);
    }
  }
  // 辅助型开发者
  else if (
    (fixRatio > 0.3 || refactorRatio > 0.25) &&
    stats.summary.totalDeletions > stats.summary.totalAdditions * 0.8
  ) {
    role = '辅助型开发者';
    roleEmoji = '🔧';
    evaluation = '你是团队的稳定基石，默默承担着修复、重构和代码优化的工作。';
    if (fixRatio > 0.3) {
      details.push(`修复类提交占比 ${(fixRatio * 100).toFixed(1)}%`);
    }
    if (refactorRatio > 0.25) {
      details.push(`重构类提交占比 ${(refactorRatio * 100).toFixed(1)}%`);
    }
    details.push('通过代码优化提升项目质量');
  }
  // 协作核心型
  else if (
    totalProjects >= 3 &&
    coreProjectCount < totalProjects * 0.6 &&
    coreProjectCount >= 1 &&
    contributionRatio > 15
  ) {
    role = '协作核心';
    roleEmoji = '🤝';
    evaluation = '你是团队协作的桥梁，在多个项目间协调配合，推动整体进展。';
    details.push(`参与 ${totalProjects} 个项目的开发`);
    details.push(
      `在 ${coreProjectCount} 个项目中承担核心维护，其他项目中提供协作支持`
    );
    const avgContribution =
      projectContributions.reduce((sum, p) => sum + p.contributionRatio, 0) /
      totalProjects;
    details.push(`平均贡献占比 ${avgContribution.toFixed(1)}%`);
  }
  // 全能型开发者
  else if (
    coreProjectCount >= 2 &&
    innovationRatio > 18 &&
    soleMaintenanceIndex > 25
  ) {
    role = '全能型开发者';
    roleEmoji = '🌟';
    evaluation =
      '你是全栈多面的技术专家，在创新、维护和协作方面都有出色表现。';
    details.push(`在 ${coreProjectCount} 个核心项目中均有出色表现`);
    details.push('创新产出与代码维护并重');
    details.push('既能独立开发也能团队协作');
  }
  // 成长型开发者
  else {
    role = '成长型开发者';
    roleEmoji = '🌱';
    evaluation = '你正在快速成长，通过持续贡献积累经验，未来可期。';
    details.push(`完成了 ${stats.summary.totalCommits} 次提交`);
    if (totalProjects > 1) {
      details.push(`参与了 ${totalProjects} 个项目的开发`);
      if (coreProjectCount > 0) {
        details.push(`在 ${coreProjectCount} 个项目中承担核心维护`);
      }
    }
    details.push('保持持续学习和贡献的热情');
  }

  return {
    labels,
    role,
    roleEmoji,
    evaluation,
    details,
    stats: {
      contributionRatio,
      soleMaintenanceIndex,
      innovationRatio,
      totalCommits: stats.summary.totalCommits,
      totalProjects,
      coreProjectCount,
    },
  };
}

