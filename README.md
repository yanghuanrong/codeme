# codeme

[![npm version](https://img.shields.io/npm/v/codeme.svg)](https://www.npmjs.com/package/codeme)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)](https://nodejs.org/)

分析 Git 项目的开发者画像和编码习惯的 CLI 工具。

## ✨ 特性

- 📊 **核心能力分析**：贡献度、影响力、协作度等指标
- 🏰 **独自维护指标**：分析你在项目中的独立性
- 💎 **代码精炼度**：重构中的代码优化情况
- 🌐 **技术广度**：涉及的技术栈和模块数量
- 🎭 **情感分析**：通过提交消息分析编码心境
- ⏰ **时间分析**：工作习惯、黄金时段、极端时刻
- 📈 **六维雷达图**：活跃度、影响力、精炼度、协作度、稳定性、广度
- 🎯 **交互式模式**：通过友好的问答界面配置分析参数
- 📊 **实时进度反馈**：显示分析进度，了解当前处理状态
- ❌ **友好错误提示**：提供详细的错误信息和解决建议
- 🔒 **隐私保护**：所有分析均在本地进行，不会上传任何数据
- 🔍 **多项目扫描**：支持扫描目录下所有 Git 仓库并生成聚合报告

## 安装

```bash
# 方式一：使用 npx（推荐，无需安装）
npx codeme

# 方式二：全局安装
npm install -g codeme

# 方式三：本地安装（开发模式）
npm install
```

## 使用方法

### 基本用法

```bash
# 分析当前目录仓库（自动检测当前 Git 用户）
codeme

# 分析指定仓库
codeme /path/to/repo

# 指定年份
codeme -y 2025

# 指定采样文件数量（用于分析协作度等指标）
codeme -s 20

# 以 JSON 格式输出数据
codeme --json

# 使用交互式模式（推荐新手使用）
codeme -i
codeme --interactive

# 组合使用
codeme /path/to/repo -y 2024 -s 30

# JSON 模式组合使用
codeme -y 2025 --json

# 多项目扫描（扫描当前目录下所有 Git 仓库）
codeme --scan

# 扫描指定目录下的所有项目
codeme --scan /path/to/projects

# 扫描 + 指定年份
codeme --scan -y 2024

# 扫描 + JSON 输出
codeme --scan --json
```

### 命令行选项

- `[repoPath]` - 仓库路径（可选，默认为当前目录）
- `-y, --year <year>` - 指定年份（如：2025，默认为当前年份）
- `-s, --sample <count>` - 采样文件数量（默认：10）
- `-j, --json` - 以 JSON 格式输出数据
- `-i, --interactive` - 使用交互式模式，通过问答方式配置参数
- `--scan` - 扫描目录下所有 Git 仓库（多项目模式）
- `-V, --version` - 显示版本号
- `-h, --help` - 显示帮助信息

**注意**：工具会自动检测当前 Git 用户（通过 `git config user.email` 或 `git config user.name`），无需手动指定作者。

## 使用示例

```bash
# 使用 npx 直接运行（推荐）
npx codeme
npx codeme -y 2025
npx codeme /path/to/project -y 2024

# 如果已全局安装
codeme -y 2025
codeme /path/to/project -y 2024
codeme -s 30

# 交互式模式（推荐新手）
codeme -i

# 多项目扫描（适合公司多项目场景）
cd ~/company-projects
codeme --scan -y 2025

# 扫描指定目录
codeme --scan ~/my-projects -y 2024
```

## 工作原理

### 单项目模式

1. 使用 `git log` 获取项目 commit 的相关数据
2. 本地计算分析，生成开发者画像
3. 输出可视化报告

### 多项目模式（--scan）

1. 递归扫描目录，自动发现所有 Git 仓库
2. 分别分析每个项目的提交数据
3. 聚合所有项目的数据，生成综合开发者画像
4. 显示项目贡献分布对比

所有分析均在本地进行，不会上传任何数据。

## 注意事项

- 工具仅统计 git log 中的 commit 时间，无法覆盖全部实际工作时间
- 分析结果仅供参考，请谨慎使用
- 需要确保在 Git 仓库目录中运行，或指定正确的仓库路径
- 多项目扫描会跳过 `node_modules`、`.next`、`dist`、`build` 等常见目录
- 如果扫描到的多个项目使用不同的 Git 用户，会使用第一个用户进行聚合分析

## 开发

```bash
# 克隆项目
git clone https://github.com/yanghuanrong/codeme.git
cd codeme

# 安装依赖
npm install

# 运行
npm start
```

## 贡献

欢迎贡献代码！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

## 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新历史。

## License

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。

## 相关链接

- [GitHub Repository](https://github.com/yanghuanrong/codeme)
- [npm Package](https://www.npmjs.com/package/codeme)
- [Issue Tracker](https://github.com/yanghuanrong/codeme/issues)
