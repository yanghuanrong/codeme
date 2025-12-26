#!/usr/bin/env node

import { program } from 'commander'
import { generateReport } from '../src/index.js'
import { handleError, createError } from '../src/utils/errors.js'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 读取 package.json 获取版本号
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, '../package.json'), 'utf-8')
)

program
  .name('codeme')
  .description('分析 Git 项目的开发者画像和编码习惯')
  .version(packageJson.version)

program
  .argument('[repoPath]', '仓库路径（默认为当前目录）', '.')
  .option('-y, --year <year>', '指定年份（如：2025）', '')
  .option('-s, --sample <count>', '采样文件数量（默认：10）', '10')
  .option('-j, --json', '以 JSON 格式输出数据', false)
  .option('-i, --interactive', '使用交互式模式', false)
  .action(async (repoPath, options) => {
    let config

    if (options.interactive) {
      const { promptInteractiveConfig } = await import(
        '../src/utils/interactive.js'
      )
      config = await promptInteractiveConfig()
    } else {
      const year = options.year || new Date().getFullYear().toString()
      const sampleCount = parseInt(options.sample, 10) || 10

      // 输入验证
      const yearNum = parseInt(year, 10)
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        handleError(createError('INVALID_YEAR', `年份 "${year}" 无效`), false)
        return
      }

      if (isNaN(sampleCount) || sampleCount < 1 || sampleCount > 100) {
        handleError(
          createError('INVALID_SAMPLE', `采样数量 "${options.sample}" 无效`),
          false
        )
        return
      }

      config = {
        year: yearNum.toString(),
        repoPath: repoPath || '.',
        sampleFilesCount: sampleCount,
        jsonMode: options.json || false,
      }
    }

    try {
      await generateReport(config)
    } catch (error) {
      handleError(error, config.jsonMode)
    }
  })

program.parse(process.argv)
