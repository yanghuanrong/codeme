#!/usr/bin/env node

import { program } from 'commander'
import { generateReport } from '../src/index.js'
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
  .action((repoPath, options) => {
    const year = options.year || new Date().getFullYear().toString()

    const config = {
      year,
      repoPath: resolve(process.cwd(), repoPath),
      sampleFilesCount: parseInt(options.sample, 10) || 10,
      jsonMode: options.json || false,
    }

    generateReport(config).catch(console.error)
  })

program.parse(process.argv)
