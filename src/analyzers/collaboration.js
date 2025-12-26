import { runGit } from '../utils/git.js'

export const analyzeCollaboration = (stats, repoPath, sampleFilesCount, author, onProgress = null) => {
  const sortedFiles = Object.entries(stats.modules).sort((a, b) => b[1] - a[1])
  const topFiles = sortedFiles.slice(0, sampleFilesCount)

  let totalBlameLines = 0
  let othersLines = 0
  let soleMaintainedCount = 0

  topFiles.forEach(([file], index) => {
    const filePath = file.startsWith('./') ? file.slice(2) : file
    try {
      const blameData = runGit(
        `git blame --line-porcelain "${filePath}" 2>/dev/null`,
        repoPath
      )
      if (blameData && blameData.trim()) {
        const authors = blameData.match(/^author .*/gm) || []
        if (authors.length > 0) {
          totalBlameLines += authors.length
          othersLines += authors.filter((a) => !a.includes(author)).length
        }
      }

      const fileAuthors = runGit(
        `git log --format="%ae" -- "${filePath}" 2>/dev/null | sort -u | wc -l`,
        repoPath
      )
      const authorCount = parseInt(fileAuthors) || 0
      if (authorCount === 1) soleMaintainedCount++
    } catch (e) {
      // 忽略无法访问的文件
    }

    if (onProgress) {
      onProgress(index + 1, topFiles.length)
    }
  })

  const interweavingScore =
    totalBlameLines > 0 ? (othersLines / totalBlameLines) * 100 : 0
  const soleMaintenanceIndex =
    topFiles.length > 0 ? (soleMaintainedCount / topFiles.length) * 100 : 0

  return { interweavingScore, soleMaintenanceIndex }
}

