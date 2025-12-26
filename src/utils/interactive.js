import inquirer from 'inquirer'
import { colorize, colors } from './colors.js'

export async function promptInteractiveConfig() {
  console.log(
    '\n' +
      colorize('🎯 欢迎使用 codeme 交互式分析', colors.cyan, colors.bright) +
      '\n'
  )

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'repoPath',
      message: '请输入仓库路径（留空使用当前目录）:',
      default: '.',
      validate: (input) => {
        if (!input || input.trim() === '') return true
        return true
      },
    },
    {
      type: 'input',
      name: 'year',
      message: '请输入要分析的年份:',
      default: new Date().getFullYear().toString(),
      validate: (input) => {
        const year = parseInt(input)
        if (isNaN(year) || year < 2000 || year > 2100) {
          return '请输入有效的年份（2000-2100）'
        }
        return true
      },
      filter: (input) => input.trim(),
    },
    {
      type: 'input',
      name: 'sample',
      message: '请输入采样文件数量（用于分析协作度）:',
      default: '10',
      validate: (input) => {
        const count = parseInt(input)
        if (isNaN(count) || count < 1 || count > 100) {
          return '请输入 1-100 之间的数字'
        }
        return true
      },
      filter: (input) => input.trim(),
    },
    {
      type: 'confirm',
      name: 'jsonMode',
      message: '是否以 JSON 格式输出?',
      default: false,
    },
  ])

  return {
    repoPath: answers.repoPath || '.',
    year: answers.year,
    sampleFilesCount: parseInt(answers.sample, 10) || 10,
    jsonMode: answers.jsonMode || false,
  }
}

