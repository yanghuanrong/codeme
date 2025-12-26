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
import { ProgressBar, showProgress, logStep } from './utils/progress.js';
import { createError, handleError } from './utils/errors.js';

export async function generateReport(config) {
  const { year, repoPath, sampleFilesCount = 10, jsonMode = false } = config;

  let validatedRepoPath;
  try {
    if (!jsonMode) {
      logStep(1, 6, '验证仓库路径...');
    }
    validatedRepoPath = validateRepo(repoPath);
  } catch (error) {
    throw createError('REPO_NOT_FOUND', error.message);
  }

  if (!jsonMode) {
    logStep(2, 6, '检测 Git 用户信息...');
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

  let progressSpinner;
  if (!jsonMode) {
    logStep(3, 6, '抓取全仓库基准数据以进行对比...');
    progressSpinner = showProgress('正在分析项目统计数据...');
  }
  const projectStats = getProjectStats(since, until, validatedRepoPath);
  if (!jsonMode) {
    progressSpinner.stop('项目统计数据获取完成');
  }

  if (!jsonMode) {
    logStep(4, 6, '获取提交记录...');
    progressSpinner = showProgress('正在获取提交日志...');
  }
  const rawLogs = getCommitLogs(authorFilter, since, until, validatedRepoPath);
  if (!jsonMode) {
    progressSpinner.stop('提交日志获取完成');
  }

  if (!rawLogs) {
    throw createError('NO_DATA');
  }

  const logs = parseLogs(rawLogs);
  const stats = initStats();

  if (!jsonMode) {
    logStep(5, 6, '分析提交数据...');
  }
  const numStats = getCommitStats(
    authorFilter,
    since,
    until,
    validatedRepoPath
  );
  const commitBlocks = numStats.split('COMMIT_SEP|').filter(Boolean);

  let progressBar = null;
  let onProgress = null;
  if (commitBlocks.length > 0 && !jsonMode) {
    progressBar = new ProgressBar(commitBlocks.length, '处理提交');
    console.log('');
    onProgress = (current, total) => {
      progressBar.update(current);
    };
  }

  processCommits(commitBlocks, logs, stats, author, onProgress);

  if (!jsonMode && progressBar) {
    progressBar.finish('提交数据处理完成');
    console.log('');
  }

  if (!jsonMode) {
    progressSpinner = showProgress('正在计算时间极值...');
  }
  calculateDateExtremes(stats);
  if (!jsonMode) {
    progressSpinner.stop();
  }

  if (!jsonMode) {
    progressSpinner = showProgress('正在提取关键词...');
  }
  const topKeywords = extractTopKeywords(stats.allMessages);
  if (!jsonMode) {
    progressSpinner.stop();
  }

  let collaborationProgressBar = null;
  let collaborationOnProgress = null;
  if (!jsonMode) {
    const topFilesCount = Math.min(
      sampleFilesCount,
      Object.keys(stats.modules).length
    );
    if (topFilesCount > 0) {
      collaborationProgressBar = new ProgressBar(topFilesCount, '分析协作度');
      console.log('');
      collaborationOnProgress = (current, total) => {
        collaborationProgressBar.update(current);
      };
    } else {
      progressSpinner = showProgress('正在分析协作度...');
    }
  }
  const collaboration = analyzeCollaboration(
    stats,
    validatedRepoPath,
    sampleFilesCount,
    author,
    collaborationOnProgress
  );
  if (!jsonMode) {
    if (collaborationProgressBar) {
      collaborationProgressBar.finish('协作度分析完成');
      console.log('');
    } else {
      progressSpinner.stop('协作度分析完成');
    }
  }

  if (!jsonMode) {
    progressSpinner = showProgress('正在计算指标...');
  }
  const metrics = calculateMetrics(stats, projectStats.avgCommitsPerPerson);
  if (!jsonMode) {
    progressSpinner.stop();
  }

  const projectName = getProjectName(validatedRepoPath);

  if (!jsonMode) {
    logStep(6, 6, '生成报告...');
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
  );

  if (jsonMode) {
    outputJsonReport(report, stats, projectStats);
  } else {
    renderVisualReport(report, stats);
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
  );

  return {
    author,
    projectName,
    repoPath: validatedRepoPath,
    stats,
    projectStats,
    metrics,
    collaboration,
    report,
    logs,
    topKeywords,
  };
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

  if (!jsonMode) {
    const spinner = showProgress('正在聚合数据...');
    spinner.stop('数据聚合完成');
    console.log('');
  }

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
    topKeywords
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
      projectResults,
      aggregated
    );
  }
}

export { outputJsonReport, renderVisualReport };
