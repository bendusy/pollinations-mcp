# Pollinations MCP 服务器

<div align="center">
  <img src="./icon.png" alt="Pollinations MCP 服务器图标" width="200">
</div>

这是一个基于[Model Context Protocol (MCP)](https://github.com/microsoft/modelcontextprotocol)的服务器实现，用于连接[Pollinations.ai](https://pollinations.ai)服务的API接口。该服务器允许AI模型通过MCP协议调用Pollinations.ai的图像和文本生成功能。

## 功能特点

- 支持通过MCP协议与Pollinations.ai服务交互
- 提供三个主要工具：
  - `generate_image`: 使用Pollinations.ai生成图像并返回URL（默认无水印）
  - `download_image`: 下载生成的图像到本地文件
  - `generate_text`: 使用Pollinations.ai生成文本
- 基于TypeScript实现，支持类型安全
- 使用stdio传输机制，便于与AI模型集成

## 安装

1. 克隆仓库：

```bash
git clone https://github.com/bendusy/pollinations-mcp.git
cd pollinations-mcp
```

2. 安装依赖：

```bash
npm install
```

3. 构建项目：

```bash
npm run build
```

## 使用方法

### 作为MCP服务器运行

```bash
npm start
```

服务器将通过标准输入/输出(stdio)启动，等待MCP客户端连接。

### 在Cursor中使用（当前可能无法正常工作）

**注意：** 目前在Cursor中配置此服务器可能不会成功。如果您需要使用此功能，建议使用Cline（见下文）。

### 在Cline中使用（推荐）

[Cline](https://cline.app)是一个支持MCP协议的AI终端，可以成功使用本服务器提供的图像生成功能。设置步骤如下：

1. 安装并启动Cline
2. 打开Cline的设置文件，通常位于：
   - Windows: `%APPDATA%\Cline\config.json`
   - Mac: `~/Library/Application Support/Cline/config.json`
   - Linux: `~/.config/Cline/config.json`

3. 在配置文件中找到或添加`mcpServers`部分，然后添加以下配置：

```json
"mcpServers": {
  "pollinations-mcp": {
    "command": "node",
    "args": [
      "完整路径/到您的/pollinations-mcp/dist/index.js"
    ],
    "disabled": false,
    "autoApprove": [
      "download_image",
      "generate_image",
      "generate_text"
    ]
  }
}
```

例如，Windows系统上的完整配置可能如下：

```json
"mcpServers": {
  "pollinations-mcp": {
    "command": "node",
    "args": [
      "C:\\Users\\用户名\\路径\\到\\pollinations-mcp\\dist\\index.js"
    ],
    "disabled": false,
    "autoApprove": [
      "download_image",
      "generate_image",
      "generate_text"
    ]
  }
}
```

4. 保存配置文件并重启Cline
5. 现在您可以在Cline中使用Pollinations图像生成功能了，例如：

```
使用Pollinations生成图像：beautiful sunset over ocean with palm trees
```

### 与AI模型集成

本服务器设计用于与支持MCP协议的AI模型集成，使其能够生成图像。

### 支持的工具

#### generate_image

使用Pollinations.ai生成图像并返回URL。

参数：
- `prompt` (必需): 图像描述提示词
- `width` (可选): 图像宽度（像素），默认为1024
- `height` (可选): 图像高度（像素），默认为1024
- `seed` (可选): 随机种子值（用于生成一致的图像）
- `model` (可选): 要使用的模型，默认为'flux'
- `nologo` (可选): 设置为true可去除水印，默认为true
- `enhance` (可选): 提高图像质量（应用增强滤镜），默认为false
- `safe` (可选): 启用安全过滤（过滤不适内容），默认为false
- `private` (可选): 设置为true可使图像私有（不在公共feed中显示），默认为false

**提示词最佳实践：**
- 尽量使用英文编写提示词，Pollinations.ai对英文的理解更好
- 保持提示词简短精确，避免过长或模糊的描述
- 使用具体的形容词和名词，而非抽象概念
- 例如："beautiful sunset over ocean with palm trees"比"一张日落的图片"效果更好

#### download_image

下载Pollinations.ai生成的图像到本地文件。

参数：
- `url` (必需): 要下载的图像URL
- `output_path` (可选): 保存图像的路径（包括文件名），默认为'image.jpg'

#### generate_text

使用Pollinations.ai生成文本。

参数：
- `prompt` (必需): 文本提示词
- `model` (可选): 要使用的模型（如openai、mistral等），默认为'openai'
- `seed` (可选): 随机种子值（用于生成一致的结果）
- `system` (可选): 系统提示词（设置AI行为）
- `json` (可选): 是否返回JSON格式的响应，默认为false
- `private` (可选): 设置为true可使响应私有，默认为false

## API参考

本项目使用Pollinations.ai的官方API。完整的API文档请参考：[Pollinations API文档](https://github.com/pollinations/pollinations/blob/master/APIDOCS.md)

### 图像生成API

基本格式：`https://image.pollinations.ai/prompt/{prompt}?{参数}`

示例：
```
https://image.pollinations.ai/prompt/beautiful%20sunset?width=1024&height=1024&nologo=true
```

### 可用的图像模型

- `flux` (默认): 主流文生图模型，功能全面
- `variation`: 图像变体生成
- `dreamshaper`: 梦幻风格
- `anything`: 动漫风格图像
- `pixart`: 高质量插图风格

### 文本生成API

基本格式：`https://text.pollinations.ai/{prompt}?{参数}`

示例：
```
https://text.pollinations.ai/Tell%20me%20about%20artificial%20intelligence?model=openai
```

### 可用的文本模型

- `openai` (默认): OpenAI模型
- `mistral`: Mistral模型
- `gemini`: Google Gemini模型

## 开发

### 项目结构

- `src/index.ts`: 主服务器实现
- `dist/`: 编译后的JavaScript文件
- `package.json`: 项目配置和依赖

### 依赖

- `@modelcontextprotocol/sdk`: MCP协议SDK
- `axios`: HTTP客户端，用于下载图像
- `typescript`: TypeScript编译器

## 许可

本项目采用ISC许可证。详情请参阅[LICENSE](LICENSE)文件。

## 相关链接

- [Pollinations.ai](https://pollinations.ai)
- [Model Context Protocol](https://github.com/microsoft/modelcontextprotocol)