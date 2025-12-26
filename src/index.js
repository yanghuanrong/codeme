import { colorize, colors } from './utils/colors.js';
import {
  validateRepo,
  getGitUser,
  getProjectName,
  getProjectStats,
  getCommitLogs,
  getCommitStats,
} from './utils/git.js';
import {
  initStats,
  parseLogs,
  processCommits,
  calculateDateExtremes,
  extractTopKeywords,
} from './analyzers/stats.js';
import { analyzeCollaboration } from './analyzers/collaboration.js';
import { calculateMetrics } from './analyzers/metrics.js';
import { buildReport } from './reporters/buildReport.js';
import {
  outputJsonReport,
  outputMultiProjectJsonReport,
} from './reporters/json.js';
import { renderVisualReport } from './reporters/visual.js';
import { renderMultiProjectVisualReport } from './reporters/multiProject.js';
import { generateUnifiedEvaluation } from './analyzers/evaluation.js';
import { createError, handleError } from './utils/errors.js';

export async function generateReport(config) {
  const { year, repoPath, sampleFilesCount = 10, jsonMode = false } = config;

  let validatedRepoPath;
  try {
    validatedRepoPath = validateRepo(repoPath);
  } catch (error) {
    throw createError('REPO_NOT_FOUND', error.message);
  }

  const author = getGitUser(validatedRepoPath);
  if (!author) {
    throw createError('NO_GIT_USER');
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
    );
    console.log('');
  }

  const since = `${year}-01-01 00:00:00`;
  const until = `${year}-12-31 23:59:59`;
  const authorFilter = `--author="${author}"`;

  const projectStats = getProjectStats(since, until, validatedRepoPath);
  const rawLogs = getCommitLogs(authorFilter, since, until, validatedRepoPath);

  if (!rawLogs) {
    throw createError('NO_DATA');
  }

  const logs = parseLogs(rawLogs);
  const stats = initStats();

  const numStats = getCommitStats(
    authorFilter,
    since,
    until,
    validatedRepoPath
  );
  const commitBlocks = numStats.split('COMMIT_SEP|').filter(Boolean);

  processCommits(commitBlocks, logs, stats, author);
  calculateDateExtremes(stats);
  const topKeywords = extractTopKeywords(stats.allMessages);

  const collaboration = analyzeCollaboration(
    stats,
    validatedRepoPath,
    sampleFilesCount,
    author
  );

  const metrics = calculateMetrics(stats, projectStats.avgCommitsPerPerson);
  const projectName = getProjectName(validatedRepoPath);

  // 先收集完整数据
  const singleProjectResult = {
    projectName,
    stats,
    projectStats,
    metrics,
    collaboration,
    repoPath: validatedRepoPath,
  };

  // 先生成基础报告（不包含统一评价）
  const baseReport = buildReport(
    author,
    year,
    projectName,
    stats,
    projectStats,
    metrics,
    collaboration,
    logs,
    topKeywords
  );

  // 将 report 添加到 singleProjectResult 中
  singleProjectResult.report = baseReport;

  // 基于完整数据（包含 report）生成统一评价
  const unifiedEvaluation = generateUnifiedEvaluation(
    stats,
    metrics,
    collaboration,
    [singleProjectResult],
    projectStats
  );

  // 使用统一评价重新生成报告（包含统一评价的标签）
  const report = buildReport(
    author,
    year,
    projectName,
    stats,
    projectStats,
    metrics,
    collaboration,
    logs,
    topKeywords,
    unifiedEvaluation
  );

  // 更新 singleProjectResult 中的 report
  singleProjectResult.report = report;

  if (jsonMode) {
    outputJsonReport(report, stats, projectStats);
  } else {
    renderVisualReport(report, stats);

    // 显示统一评价
    const { renderEvaluation } = await import('./reporters/multiProject.js');
    renderEvaluation(unifiedEvaluation);
  }
}

// 内部函数：生成单项目数据（不输出，用于多项目聚合）
async function generateSingleProjectData(config) {
  const { year, repoPath, sampleFilesCount = 10 } = config;

  const validatedRepoPath = validateRepo(repoPath);
  const author = getGitUser(validatedRepoPath);
  if (!author) {
    throw createError('NO_GIT_USER');
  }

  const since = `${year}-01-01 00:00:00`;
  const until = `${year}-12-31 23:59:59`;
  const authorFilter = `--author="${author}"`;

  const projectStats = getProjectStats(since, until, validatedRepoPath);
  const rawLogs = getCommitLogs(authorFilter, since, until, validatedRepoPath);

  if (!rawLogs) {
    return null;
  }

  const logs = parseLogs(rawLogs);
  const stats = initStats();
  const numStats = getCommitStats(
    authorFilter,
    since,
    until,
    validatedRepoPath
  );
  const commitBlocks = numStats.split('COMMIT_SEP|').filter(Boolean);

  processCommits(commitBlocks, logs, stats, author);
  calculateDateExtremes(stats);
  const topKeywords = extractTopKeywords(stats.allMessages);

  const collaboration = analyzeCollaboration(
    stats,
    validatedRepoPath,
    sampleFilesCount,
    author
  );

  const metrics = calculateMetrics(stats, projectStats.avgCommitsPerPerson);
  const projectName = getProjectName(validatedRepoPath);

  // 先收集完整数据（不生成报告，因为需要统一评价）
  const projectData = {
    author,
    projectName,
    repoPath: validatedRepoPath,
    stats,
    projectStats,
    metrics,
    collaboration,
    logs,
    topKeywords,
  };

  return projectData;
}

// 聚合多个项目的统计数据
function aggregateStats(projectResults) {
  const aggregated = initStats();
  let totalProjectCommits = 0;
  let totalProjectAuthors = 0;
  let totalAvgCommitsPerPerson = 0;

  projectResults.forEach((result) => {
    if (!result) return;

    const { stats, projectStats } = result;

    // 合并基础统计
    aggregated.summary.totalCommits += stats.summary.totalCommits;
    aggregated.summary.totalAdditions += stats.summary.totalAdditions;
    aggregated.summary.totalDeletions += stats.summary.totalDeletions;

    // 合并时间分布
    stats.time.hours.forEach((count, hour) => {
      aggregated.time.hours[hour] += count;
    });
    stats.time.weekdays.forEach((count, day) => {
      aggregated.time.weekdays[day] += count;
    });
    stats.time.months.forEach((count, month) => {
      aggregated.time.months[month] += count;
    });

    // 合并日期
    Object.keys(stats.time.dates).forEach((date) => {
      if (!aggregated.time.dates[date]) {
        aggregated.time.dates[date] = [];
      }
      aggregated.time.dates[date].push(...stats.time.dates[date]);
    });

    // 合并模块和文件扩展名
    Object.keys(stats.modules).forEach((module) => {
      aggregated.modules[module] =
        (aggregated.modules[module] || 0) + stats.modules[module];
    });
    Object.keys(stats.rootModules).forEach((root) => {
      aggregated.rootModules[root] =
        (aggregated.rootModules[root] || 0) + stats.rootModules[root];
    });
    Object.keys(stats.fileExtensions).forEach((ext) => {
      aggregated.fileExtensions[ext] =
        (aggregated.fileExtensions[ext] || 0) + stats.fileExtensions[ext];
    });

    // 合并提交风格
    aggregated.style.feat += stats.style.feat;
    aggregated.style.fix += stats.style.fix;
    aggregated.style.refactor += stats.style.refactor;
    aggregated.style.docs += stats.style.docs;
    aggregated.style.chore += stats.style.chore;

    // 合并专业指标
    aggregated.specialized.refactorAdd += stats.specialized.refactorAdd;
    aggregated.specialized.refactorDel += stats.specialized.refactorDel;
    aggregated.specialized.fixCount += stats.specialized.fixCount;

    // 合并情感分析
    aggregated.sentiment.positive += stats.sentiment.positive;
    aggregated.sentiment.negative += stats.sentiment.negative;
    aggregated.sentiment.stressful += stats.sentiment.stressful;

    // 合并提交消息
    aggregated.allMessages.push(...stats.allMessages);

    // 合并项目统计
    totalProjectCommits += projectStats.totalCommits;
    totalProjectAuthors += projectStats.totalAuthors;
    totalAvgCommitsPerPerson += projectStats.avgCommitsPerPerson;

    // 更新极值
    if (
      stats.extremes.biggestCommit.lines >
      aggregated.extremes.biggestCommit.lines
    ) {
      aggregated.extremes.biggestCommit = stats.extremes.biggestCommit;
    }
    aggregated.extremes.midnightCommits += stats.extremes.midnightCommits;
    if (
      stats.extremes.latestMoment &&
      (!aggregated.extremes.latestMoment ||
        stats.extremes.latestMoment.date >
          aggregated.extremes.latestMoment.date)
    ) {
      aggregated.extremes.latestMoment = stats.extremes.latestMoment;
    }
  });

  // 重新计算时间极值
  calculateDateExtremes(aggregated);

  // 计算聚合的项目统计
  const projectCount = projectResults.filter((r) => r).length;
  const aggregatedProjectStats = {
    totalCommits: totalProjectCommits,
    totalAuthors: totalProjectAuthors,
    avgCommitsPerPerson: totalAvgCommitsPerPerson / projectCount || 0,
  };

  return { aggregated, aggregatedProjectStats };
}

// 多项目分析
export async function generateMultiProjectReport(config) {
  const { year, repoPaths, sampleFilesCount = 10, jsonMode = false } = config;

  if (!jsonMode) {
    console.log(
      colorize(
        `🚀 正在分析 ${colorize(
          repoPaths.length.toString(),
          colors.cyan,
          colors.bright
        )} 个项目的聚合开发者画像...`,
        colors.blue
      )
    );
    console.log('');
  }

  const projectResults = [];
  const authorSet = new Set();

  // 分析每个项目
  for (let i = 0; i < repoPaths.length; i++) {
    const repoPath = repoPaths[i];
    const projectName = getProjectName(repoPath);

    if (!jsonMode) {
      console.log(
        colorize(
          `[${i + 1}/${repoPaths.length}] 分析项目: ${colorize(
            projectName,
            colors.yellow
          )}`,
          colors.gray
        )
      );
    }

    try {
      const result = await generateSingleProjectData({
        year,
        repoPath,
        sampleFilesCount,
      });

      if (result) {
        projectResults.push(result);
        authorSet.add(result.author);
      }
    } catch (error) {
      if (!jsonMode) {
        console.warn(
          colorize(
            `⚠️  跳过项目 ${projectName}: ${error.message}`,
            colors.yellow
          )
        );
      }
      continue;
    }
  }

  if (projectResults.length === 0) {
    throw createError('NO_DATA', '没有找到任何可分析的项目数据');
  }

  // 检查作者一致性
  const authors = Array.from(authorSet);
  if (authors.length > 1 && !jsonMode) {
    console.warn(
      colorize(
        `⚠️  警告: 发现多个不同的 Git 用户 (${authors.join(
          ', '
        )})，将使用第一个用户进行聚合分析`,
        colors.yellow
      )
    );
  }
  const author = authors[0];

  // 聚合数据
  const { aggregated, aggregatedProjectStats } = aggregateStats(projectResults);

  // 重新计算聚合后的指标
  const topKeywords = extractTopKeywords(aggregated.allMessages);
  const collaboration = analyzeCollaboration(
    aggregated,
    projectResults[0].repoPath, // 使用第一个项目路径进行分析
    sampleFilesCount,
    author
  );
  const metrics = calculateMetrics(
    aggregated,
    aggregatedProjectStats.avgCommitsPerPerson
  );

  // 为每个项目生成 report（用于统一评价分析）
  const projectResultsWithReports = projectResults.map((r) => {
    const projectLogs = r.logs || [];
    const projectTopKeywords = r.topKeywords || [];
    const projectReport = buildReport(
      r.author || author,
      year,
      r.projectName,
      r.stats,
      r.projectStats,
      r.metrics,
      r.collaboration,
      projectLogs,
      projectTopKeywords
    );
    return {
      ...r,
      report: projectReport,
    };
  });

  // 基于聚合数据生成统一评价
  const unifiedEvaluation = generateUnifiedEvaluation(
    aggregated,
    metrics,
    collaboration,
    projectResultsWithReports,
    aggregatedProjectStats
  );

  // 使用统一评价生成聚合报告
  const aggregatedReport = buildReport(
    author,
    year,
    `聚合项目 (${projectResults.length} 个)`,
    aggregated,
    aggregatedProjectStats,
    metrics,
    collaboration,
    aggregated.allMessages.map((msg, i) => ({
      hash: `aggregated-${i}`,
      date: new Date(),
      msg,
    })),
    topKeywords,
    unifiedEvaluation
  );

  if (jsonMode) {
    outputMultiProjectJsonReport(
      aggregatedReport,
      projectResults,
      aggregated,
      aggregatedProjectStats
    );
  } else {
    renderMultiProjectVisualReport(
      aggregatedReport,
      projectResultsWithReports,
      aggregated,
      unifiedEvaluation
    );
  }
}

export { outputJsonReport, renderVisualReport };
