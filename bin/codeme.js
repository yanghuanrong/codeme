#!/usr/bin/env node

import { program } from 'commander';
import { generateReport, generateMultiProjectReport } from '../src/index.js';
import { handleError, createError } from '../src/utils/errors.js';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取 package.json 获取版本号
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
);

program
  .name('codeme')
  .description('分析 Git 项目的开发者画像和编码习惯')
  .version(packageJson.version);

program
  .argument('[repoPath]', '仓库路径（默认为当前目录）', '.')
  .option('-y, --year <year>', '指定年份（如：2025）', '')
  .option('-s, --sample <count>', '采样文件数量（默认：10）', '10')
  .option('-j, --json', '以 JSON 格式输出数据', false)
  .option('-i, --interactive', '使用交互式模式', false)
  .option('--scan', '扫描目录下所有 Git 仓库（多项目模式）', false)
  .action(async (repoPath, options) => {
    let config;

    // 扫描模式
    if (options.scan) {
      const scanDir = repoPath || '.';
      const { scanGitRepos } = await import('../src/utils/scanner.js');
      const { colorize, colors } = await import('../src/utils/colors.js');

      if (!options.json) {
        console.log(
          colorize(`🔍 正在扫描目录: ${resolve(scanDir)}\n`, colors.blue)
        );
      }

      const repos = await scanGitRepos(scanDir);

      if (repos.length === 0) {
        handleError(
          createError('NO_REPOS_FOUND', `在 ${scanDir} 中未找到任何 Git 仓库`),
          options.json || false
        );
        return;
      }

      if (!options.json) {
        console.log(
          colorize(
            `✅ 找到 ${colorize(
              repos.length.toString(),
              colors.cyan,
              colors.bright
            )} 个 Git 仓库:\n`,
            colors.green
          )
        );
        repos.forEach((repo, i) => {
          const name = repo.split('/').pop();
          console.log(`   ${i + 1}. ${colorize(name, colors.yellow)}`);
        });
        console.log('');
      }

      const year = options.year || new Date().getFullYear().toString();
      const sampleCount = parseInt(options.sample, 10) || 10;

      const yearNum = parseInt(year, 10);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        handleError(createError('INVALID_YEAR', `年份 "${year}" 无效`), false);
        return;
      }

      if (isNaN(sampleCount) || sampleCount < 1 || sampleCount > 100) {
        handleError(
          createError('INVALID_SAMPLE', `采样数量 "${options.sample}" 无效`),
          false
        );
        return;
      }

      config = {
        year: yearNum.toString(),
        repoPaths: repos,
        sampleFilesCount: sampleCount,
        jsonMode: options.json || false,
        scanMode: true,
      };
    } else if (options.interactive) {
      // 交互式模式
      const { promptInteractiveConfig } = await import(
        '../src/utils/interactive.js'
      );
      config = await promptInteractiveConfig();
    } else {
      // 单项目模式（默认）
      const year = options.year || new Date().getFullYear().toString();
      const sampleCount = parseInt(options.sample, 10) || 10;

      // 输入验证
      const yearNum = parseInt(year, 10);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        handleError(createError('INVALID_YEAR', `年份 "${year}" 无效`), false);
        return;
      }

      if (isNaN(sampleCount) || sampleCount < 1 || sampleCount > 100) {
        handleError(
          createError('INVALID_SAMPLE', `采样数量 "${options.sample}" 无效`),
          false
        );
        return;
      }

      config = {
        year: yearNum.toString(),
        repoPath: repoPath || '.',
        sampleFilesCount: sampleCount,
        jsonMode: options.json || false,
      };
    }

    try {
      if (config.scanMode) {
        await generateMultiProjectReport(config);
      } else {
        await generateReport(config);
      }
    } catch (error) {
      handleError(error, config.jsonMode);
    }
  });

program.parse(process.argv);
