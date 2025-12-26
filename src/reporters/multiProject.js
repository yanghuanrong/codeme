import { colorize, colors } from '../utils/colors.js';
import { renderVisualReport } from './visual.js';

function formatNumber(num) {
  const absNum = Math.abs(num);
  if (absNum >= 1000000) {
    const sign = num < 0 ? '-' : '';
    return sign + (absNum / 1000000).toFixed(1) + 'M';
  }
  if (absNum >= 1000) {
    const sign = num < 0 ? '-' : '';
    return sign + (absNum / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function createProgressBar(percentage, barLength = 20) {
  const filled = Math.floor((percentage / 100) * barLength);
  const empty = barLength - filled;
  // 根据占比值选择颜色：高占比(>=50%)绿色，中等(>=20%)黄色，低占比(<20%)蓝色
  const barColor =
    percentage >= 50
      ? colors.green
      : percentage >= 20
      ? colors.yellow
      : colors.blue;
  const bar =
    colorize('█'.repeat(filled), barColor) +
    colorize('░'.repeat(empty), colors.gray);
  return `${bar} ${percentage.toFixed(1)}%`;
}

function stripAnsiCodes(str) {
  // 移除 ANSI 转义序列
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function renderTable(rows, columns) {
  // 计算每列的最大宽度
  const colWidths = columns.map((col, index) => {
    const headerWidth = col.header.length;
    const maxContentWidth = Math.max(
      ...rows.map((row) => {
        const content = row[col.key] || '';
        // 处理带颜色的对象
        if (typeof content === 'object' && content.text) {
          return stripAnsiCodes(content.text).length;
        }
        // 对于包含 ANSI 颜色代码的内容，需要去除颜色代码计算实际宽度
        if (typeof content === 'string') {
          return stripAnsiCodes(content).length;
        }
        return content.toString().length;
      })
    );
    return Math.max(headerWidth, maxContentWidth, col.minWidth || 0);
  });

  // 绘制表格顶部边框
  const topBorder =
    '┌' + colWidths.map((w) => '─'.repeat(w + 2)).join('┬') + '┐';
  console.log(colorize(topBorder, colors.gray));

  // 绘制表头
  const headerRow =
    colorize('│', colors.gray) +
    columns
      .map((col, i) => {
        const header = col.header.padEnd(colWidths[i]);
        return ` ${colorize(header, colors.cyan, colors.bright)} `;
      })
      .join(colorize('│', colors.gray)) +
    colorize('│', colors.gray);
  console.log(headerRow);

  // 绘制表头底部边框
  const headerBorder =
    '├' + colWidths.map((w) => '─'.repeat(w + 2)).join('┼') + '┤';
  console.log(colorize(headerBorder, colors.gray));

  // 绘制数据行
  rows.forEach((row, rowIndex) => {
    const dataRow =
      colorize('│', colors.gray) +
      columns
        .map((col, i) => {
          let content = row[col.key] || '';
          let useCustomColor = false;
          let customColor = null;

          // 处理带颜色的对象
          if (typeof content === 'object' && content.text && content.color) {
            customColor = content.color;
            content = content.text;
            useCustomColor = true;
          } else if (typeof content !== 'string') {
            content = content.toString();
          }

          const formatted = content.padEnd(colWidths[i]);
          const colored = useCustomColor
            ? colorize(formatted, customColor)
            : col.color
            ? colorize(formatted, col.color)
            : formatted;
          return ` ${colored} `;
        })
        .join(colorize('│', colors.gray)) +
      colorize('│', colors.gray);
    console.log(dataRow);
  });

  // 绘制表格底部边框
  const bottomBorder =
    '└' + colWidths.map((w) => '─'.repeat(w + 2)).join('┴') + '┘';
  console.log(colorize(bottomBorder, colors.gray));
}

export function renderMultiProjectVisualReport(
  aggregatedReport,
  projectResults,
  aggregatedStats,
  unifiedEvaluation
) {
  // 先显示聚合报告
  renderVisualReport(aggregatedReport, aggregatedStats);

  // 然后显示项目对比表格
  console.log('');
  console.log(colorize('【项目贡献分布】', colors.magenta, colors.bright));
  console.log('');

  const totalCommits = aggregatedStats.summary.totalCommits;
  const sortedProjects = projectResults
    .map((r) => {
      return {
        name: r.projectName,
        commits: r.stats.summary.totalCommits,
        ratio: (r.stats.summary.totalCommits / totalCommits) * 100,
      };
    })
    .sort((a, b) => b.commits - a.commits);

  // 准备表格数据
  const tableRows = sortedProjects.map((project, index) => {
    return {
      rank: `#${index + 1}`,
      name: project.name,
      ratio: createProgressBar(project.ratio, 15),
      ratioValue: project.ratio, // 用于排序和计算宽度
    };
  });

  // 定义表格列
  const tableColumns = [
    {
      key: 'rank',
      header: '排名',
      minWidth: 5,
      color: colors.gray,
    },
    {
      key: 'name',
      header: '项目名称',
      minWidth: 20,
      color: colors.cyan,
    },
    {
      key: 'ratio',
      header: '贡献占比',
      minWidth: 25,
      color: null, // 进度条已经有颜色了
    },
  ];

  renderTable(tableRows, tableColumns);

  // 使用统一评价（如果提供了）
  if (unifiedEvaluation) {
    renderEvaluation(unifiedEvaluation);
  } else {
    // 向后兼容：如果没有提供统一评价，使用原有逻辑
    const evaluation = generateEvaluation(
      aggregatedReport,
      aggregatedStats,
      projectResults
    );
    renderEvaluation(evaluation);
  }
}

// 根据数据分析生成开发者角色评价
// 根据数据分析生成开发者角色评价
export function generateEvaluation(report, stats, projectResults) {
  const { contrast, advancedMetrics, overview, radar } = report;

  const contributionRatio = parseFloat(contrast.contributionRatio) || 0;
  const soleMaintenanceIndex =
    parseFloat(advancedMetrics.soleMaintenanceIndex) || 0;
  const innovationRatio = parseFloat(advancedMetrics.innovationRatio) || 0;
  const refinementImpact = parseFloat(advancedMetrics.refinementImpact) || 0;
  const totalCommits = stats.summary.totalCommits;
  const fixRatio =
    totalCommits > 0 ? stats.specialized.fixCount / totalCommits : 0;
  const refactorRatio =
    totalCommits > 0 ? stats.style.refactor / totalCommits : 0;
  const totalProjects = projectResults.length;

  // 分析每个项目的贡献占比，计算动态阈值
  const projectContributions = projectResults.map((r) => {
    const projectContributionRatio =
      parseFloat(r.report?.contrast?.contributionRatio) || 0;
    const projectAuthors = r.projectStats?.totalAuthors || 1;
    // 根据项目成员数量计算核心贡献阈值：平均占比 * 1.8（超过平均值的80%算核心）
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

  // 统计核心项目数量
  const coreProjects = projectContributions.filter((p) => p.isCoreProject);
  const coreProjectCount = coreProjects.length;
  const totalCommitsInCoreProjects = coreProjects.reduce(
    (sum, p) => sum + p.commits,
    0
  );
  const coreProjectRatio =
    totalCommits > 0 ? (totalCommitsInCoreProjects / totalCommits) * 100 : 0;

  // 判断角色类型
  let role = '';
  let roleEmoji = '';
  let evaluation = '';
  let details = [];

  // 核心输出型：在核心项目中贡献占比高、创新产出比高
  if (coreProjectCount > 0 && coreProjectRatio >= 60 && innovationRatio > 25) {
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
  // 独立维护者：独自维护指标高、在核心项目中独立性强
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
  // 辅助型（脏活累活）：大量修复、重构、删除行数多
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
  // 协作核心型：在多个项目中都有实质性贡献（但不全是核心项目）
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
  // 全能型：各项指标均衡，在核心项目中有不错表现
  else if (
    coreProjectCount >= 2 &&
    innovationRatio > 18 &&
    soleMaintenanceIndex > 25
  ) {
    role = '全能型开发者';
    roleEmoji = '🌟';
    evaluation = '你是全栈多面的技术专家，在创新、维护和协作方面都有出色表现。';
    details.push(`在 ${coreProjectCount} 个核心项目中均有出色表现`);
    details.push('创新产出与代码维护并重');
    details.push('既能独立开发也能团队协作');
  }
  // 活跃型：提交数中等，各项指标在提升
  else {
    role = '活跃开发者';
    roleEmoji = '🌱';
    evaluation = '你通过持续贡献为项目带来价值，保持活跃的参与度。';
    details.push(`完成了 ${totalCommits} 次提交`);
    if (totalProjects > 1) {
      details.push(`参与了 ${totalProjects} 个项目的开发`);
      if (coreProjectCount > 0) {
        details.push(`在 ${coreProjectCount} 个项目中承担核心维护`);
      }
    }
    details.push('保持持续学习和贡献的热情');
  }

  // 获取核心特质（雷达图中最高值）
  const topTrait = radar
    ? Object.entries(radar).sort(
        (a, b) => parseFloat(b[1]) - parseFloat(a[1])
      )[0]?.[0] || '活跃度'
    : '活跃度';

  return {
    role,
    roleEmoji,
    evaluation,
    details,
    topTrait,
    stats: {
      contributionRatio,
      soleMaintenanceIndex,
      innovationRatio,
      totalCommits,
      totalProjects,
      coreProjectCount,
    },
  };
}

export function renderEvaluation(evaluation) {
  console.log('');
  console.log(colorize('【开发者画像评价】', colors.magenta, colors.bright));
  console.log('');

  // 角色标签
  console.log(
    `  ${evaluation.roleEmoji} ${colorize(
      evaluation.role,
      colors.yellow,
      colors.bright
    )}`
  );
  console.log('');

  // 评价
  console.log(
    `  ${colorize('评价', colors.cyan, colors.bright)}: ${colorize(
      evaluation.evaluation,
      colors.white
    )}`
  );
}
