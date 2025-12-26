export const SENTIMENT_DICT = {
  positive:
    /feat|improve|optimize|perfect|clean|refactor|add|success|resolve/gi,
  negative: /bug|fix|error|issue|fail|broken|revert|temp|shit|problem/gi,
  stressful: /urgent|critical|hotfix|immediately|!!!|deadline|priority/gi,
}

export const STOP_WORDS = new Set([
  'the',
  'and',
  'to',
  'for',
  'in',
  'of',
  'with',
  'add',
  'fix',
  'update',
  'feat',
  'merged',
  'branch',
])

export const GIT_MAX_BUFFER = 1024 * 1024 * 50 // 50MB

export const LABEL_THRESHOLDS = {
  midnightCommits: 0.15,
  interweavingScore: 40,
  soleMaintenanceIndex: 60,
  innovationRatio: 40,
  techBreadth: 70,
  refinementImpact: 40,
  longestDaySpan: 8,
  codeHealthIndex: 85,
}

export const RADAR_THRESHOLDS = {
  activeCommits: 250,
  activeLines: 12000,
}

