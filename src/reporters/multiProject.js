import { colorize, colors } from '../utils/colors.js';
import { renderVisualReport } from './visual.js';

function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function createProgressBar(percentage, barLength = 20) {
  const filled = Math.floor((percentage / 100) * barLength);
  const empty = barLength - filled;
  const bar =
    colorize('█'.repeat(filled), colors.green) +
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
          if (typeof content !== 'string') {
            content = content.toString();
          }
          const formatted = content.padEnd(colWidths[i]);
          const colored = col.color
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
  aggregatedStats
) {
  // 先显示聚合报告
  renderVisualReport(aggregatedReport, aggregatedStats);

  // 然后显示项目对比表格
  console.log(colorize('项目贡献分布', colors.magenta, colors.bright));
  console.log('');

  const totalCommits = aggregatedStats.summary.totalCommits;
  const sortedProjects = projectResults
    .map((r) => ({
      name: r.projectName,
      commits: r.stats.summary.totalCommits,
      additions: r.stats.summary.totalAdditions,
      deletions: r.stats.summary.totalDeletions,
      netLines: r.stats.summary.totalAdditions - r.stats.summary.totalDeletions,
      ratio: (r.stats.summary.totalCommits / totalCommits) * 100,
    }))
    .sort((a, b) => b.commits - a.commits);

  // 准备表格数据
  const tableRows = sortedProjects.map((project, index) => {
    const additionsStr = formatNumber(project.additions);
    const deletionsStr = formatNumber(project.deletions);
    const netLinesStr =
      project.netLines >= 0
        ? `+${formatNumber(project.netLines)}`
        : formatNumber(project.netLines);

    return {
      rank: `#${index + 1}`,
      name: project.name,
      commits: formatNumber(project.commits),
      additions: additionsStr,
      deletions: deletionsStr,
      netLines: netLinesStr,
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
      key: 'commits',
      header: '提交数',
      minWidth: 8,
      color: colors.green,
    },
    {
      key: 'additions',
      header: '新增行',
      minWidth: 10,
      color: colors.green,
    },
    {
      key: 'deletions',
      header: '删除行',
      minWidth: 10,
      color: colors.red,
    },
    {
      key: 'netLines',
      header: '净增行',
      minWidth: 10,
      color: colors.yellow,
    },
    {
      key: 'ratio',
      header: '贡献占比',
      minWidth: 25,
      color: null, // 进度条已经有颜色了
    },
  ];

  renderTable(tableRows, tableColumns);
  console.log('');
}
