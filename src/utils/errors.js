import { colorize, colors } from './colors.js'

export class CodemeError extends Error {
  constructor(message, suggestion = '', code = 'UNKNOWN_ERROR') {
    super(message)
    this.name = 'CodemeError'
    this.suggestion = suggestion
    this.code = code
  }

  display() {
    console.error(
      '\n' +
        colorize('❌ 错误:', colors.red, colors.bright) +
        ' ' +
        colorize(this.message, colors.red)
    )
    if (this.suggestion) {
      console.error(
        colorize('💡 建议:', colors.yellow, colors.bright) +
          ' ' +
          colorize(this.suggestion, colors.yellow)
      )
    }
    console.error('')
  }
}

export const ErrorMessages = {
  REPO_NOT_FOUND: {
    message: '仓库路径不存在',
    suggestion: '请检查路径是否正确，或使用 `codeme` 分析当前目录',
    code: 'REPO_NOT_FOUND',
  },
  NOT_GIT_REPO: {
    message: '指定路径不是有效的 Git 仓库',
    suggestion: '请确保路径指向一个包含 .git 目录的 Git 仓库',
    code: 'NOT_GIT_REPO',
  },
  NO_GIT_USER: {
    message: '无法检测 Git 用户信息',
    suggestion:
      '请运行以下命令配置 Git 用户信息：\n  git config user.email "your@email.com"\n  git config user.name "Your Name"',
    code: 'NO_GIT_USER',
  },
  NO_DATA: {
    message: '未找到指定时间范围内的提交数据',
    suggestion:
      '请尝试：\n  1. 检查年份是否正确\n  2. 确认该时间段内有提交记录\n  3. 使用 `git log` 验证提交历史',
    code: 'NO_DATA',
  },
  GIT_COMMAND_FAILED: {
    message: 'Git 命令执行失败',
    suggestion:
      '请确保：\n  1. 已安装 Git\n  2. 有权限访问该仓库\n  3. 仓库未损坏',
    code: 'GIT_COMMAND_FAILED',
  },
  INVALID_YEAR: {
    message: '年份格式无效',
    suggestion: '请使用 4 位数字年份，如：2024',
    code: 'INVALID_YEAR',
  },
  INVALID_SAMPLE: {
    message: '采样数量无效',
    suggestion: '采样数量必须是大于 0 的整数',
    code: 'INVALID_SAMPLE',
  },
}

export function handleError(error, jsonMode = false) {
  if (jsonMode) {
    if (error instanceof CodemeError) {
      console.error(
        JSON.stringify({
          error: error.message,
          code: error.code,
          suggestion: error.suggestion,
        })
      )
    } else {
      console.error(JSON.stringify({ error: error.message || '未知错误' }))
    }
  } else {
    if (error instanceof CodemeError) {
      error.display()
    } else {
      console.error(
        '\n' +
          colorize('❌ 发生错误:', colors.red, colors.bright) +
          ' ' +
          colorize(error.message || '未知错误', colors.red)
      )
      if (error.stack && process.env.DEBUG) {
        console.error(colorize(error.stack, colors.gray))
      }
      console.error('')
    }
  }
  process.exit(1)
}

export function createError(type, customMessage = '') {
  const errorInfo = ErrorMessages[type] || ErrorMessages.GIT_COMMAND_FAILED
  return new CodemeError(
    customMessage || errorInfo.message,
    errorInfo.suggestion,
    errorInfo.code
  )
}

