import { colorize, colors } from './colors.js'

export class ProgressBar {
  constructor(total, label = '') {
    this.total = total
    this.current = 0
    this.label = label
    this.barLength = 30
  }

  update(current, customLabel = '') {
    this.current = current
    const percentage = Math.min(100, Math.floor((current / this.total) * 100))
    const filled = Math.floor((percentage / 100) * this.barLength)
    const empty = this.barLength - filled
    const bar = colorize('█'.repeat(filled), colors.green) + colorize('░'.repeat(empty), colors.gray)
    const displayLabel = customLabel || this.label
    process.stdout.write(
      `\r${colorize(displayLabel, colors.cyan)} [${bar}] ${colorize(`${percentage}%`, colors.yellow)} (${current}/${this.total})`
    )
    if (current >= this.total) {
      process.stdout.write('\n')
    }
  }

  finish(message = '') {
    this.update(this.total)
    if (message) {
      console.log(colorize(`✓ ${message}`, colors.green))
    }
  }
}

export function showProgress(message) {
  const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let index = 0
  const interval = setInterval(() => {
    process.stdout.write(`\r${spinner[index % spinner.length]} ${colorize(message, colors.cyan)}`)
    index++
  }, 100)
  return {
    stop: (finalMessage = '') => {
      clearInterval(interval)
      if (finalMessage) {
        console.log(`\r${colorize('✓', colors.green)} ${colorize(finalMessage, colors.green)}`)
      } else {
        process.stdout.write('\r' + ' '.repeat(50) + '\r')
      }
    },
  }
}

export function logStep(step, total, message) {
  console.log(
    colorize(`[${step}/${total}]`, colors.blue, colors.bright) +
      ' ' +
      colorize(message, colors.white)
  )
}

