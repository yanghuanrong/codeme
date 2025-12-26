import { execSync } from 'child_process';
import { basename, resolve } from 'path';
import { existsSync } from 'fs';
import { GIT_MAX_BUFFER } from './constants.js';

export const runGit = (cmd, repoPath, throwOnError = false) => {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      cwd: repoPath,
      maxBuffer: GIT_MAX_BUFFER,
      stdio: throwOnError ? 'pipe' : ['pipe', 'pipe', 'ignore'],
    }).trim();
  } catch (e) {
    if (throwOnError) {
      throw new Error(`Git 命令执行失败: ${cmd}\n错误信息: ${e.message}`);
    }
    return '';
  }
};

export const validateRepo = (repoPath) => {
  const resolvedPath = resolve(process.cwd(), repoPath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`仓库路径不存在: ${resolvedPath}`);
  }
  try {
    const gitDir = runGit('git rev-parse --git-dir', resolvedPath);
    if (!gitDir) {
      throw new Error(`指定路径不是有效的 Git 仓库: ${resolvedPath}`);
    }
  } catch (error) {
    throw new Error(`Git 命令执行失败: ${error.message}`);
  }
  return resolvedPath;
};

export const getGitUser = (repoPath) => {
  const email = runGit('git config user.email', repoPath);
  const name = runGit('git config user.name', repoPath);
  return email || name;
};

export const getProjectName = (repoPath) => {
  const remoteUrl = runGit('git config --get remote.origin.url', repoPath);
  if (remoteUrl) {
    const match = remoteUrl.match(/(?:[/:])([^/]+?)(?:\.git)?$/);
    if (match && match[1]) {
      return match[1];
    }
  }
  return basename(repoPath);
};

export const getProjectStats = (since, until, repoPath) => {
  const totalCommits =
    parseInt(
      runGit(
        `git rev-list --count --since="${since}" --until="${until}" --all`,
        repoPath
      )
    ) || 1;
  const totalAuthors =
    parseInt(
      runGit(
        `git log --since="${since}" --until="${until}" --all --format="%ae" | sort -u | wc -l`,
        repoPath
      )
    ) || 1;
  return {
    totalCommits,
    totalAuthors,
    avgCommitsPerPerson: totalCommits / totalAuthors,
  };
};

export const getCommitLogs = (authorFilter, since, until, repoPath) => {
  const logFormat = '%h|%ad|%s';
  return runGit(
    `git log ${authorFilter} --since="${since}" --until="${until}" --all --pretty=format:"${logFormat}" --date=iso`,
    repoPath
  );
};

export const getCommitStats = (authorFilter, since, until, repoPath) => {
  return runGit(
    `git log ${authorFilter} --since="${since}" --until="${until}" --all --numstat --pretty=format:"COMMIT_SEP|%h"`,
    repoPath
  );
};
