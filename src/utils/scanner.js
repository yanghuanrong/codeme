import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';

export async function scanGitRepos(rootDir, options = {}) {
  const { maxDepth = 3 } = options;
  const repos = [];
  const rootPath = resolve(rootDir);

  async function scanDir(dir, depth) {
    if (depth > maxDepth) return;

    try {
      const entries = await readdir(dir);
      let hasGitDir = false;

      // 检查当前目录是否是 Git 仓库
      for (const entry of entries) {
        if (entry === '.git') {
          const gitPath = join(dir, entry);
          try {
            const stats = await stat(gitPath);
            if (stats.isDirectory()) {
              hasGitDir = true;
              break;
            }
          } catch (error) {
            // 跳过无法访问的 .git
            continue;
          }
        }
      }

      // 如果是 Git 仓库，添加到列表并停止递归
      if (hasGitDir) {
        repos.push(dir);
        return;
      }

      // 继续扫描子目录
      for (const entry of entries) {
        // 跳过常见的不需要扫描的目录
        if (
          entry === '.git' ||
          entry === 'node_modules' ||
          entry === '.next' ||
          entry === 'dist' ||
          entry === 'build' ||
          entry === '.cache' ||
          entry === '.vscode' ||
          entry === '.idea'
        ) {
          continue;
        }

        const fullPath = join(dir, entry);
        try {
          const stats = await stat(fullPath);
          if (stats.isDirectory()) {
            await scanDir(fullPath, depth + 1);
          }
        } catch (error) {
          // 跳过无权限访问的目录
          continue;
        }
      }
    } catch (error) {
      // 跳过无法访问的目录
      return;
    }
  }

  await scanDir(rootPath, 0);
  return repos;
}

