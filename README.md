# Pollinations MCP 服务器

这是一个基于[Model Context Protocol (MCP)](https://github.com/microsoft/modelcontextprotocol)的服务器实现，用于连接[Pollinations.ai](https://pollinations.ai)服务的API接口。该服务器允许AI模型通过MCP协议调用Pollinations.ai的图像生成功能。

## 功能特点

- 支持通过MCP协议与Pollinations.ai服务交互
- 提供两个主要工具：
  - `generate_image`: 使用Pollinations.ai生成图像并返回URL
  - `download_image`: 下载生成的图像到本地文件
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

### 在Cursor中使用

[Cursor](https://cursor.com)是一个支持MCP协议的代码编辑器，可以直接使用本服务器提供的图像生成功能。设置步骤如下：

#### 方法一：全局配置

1. 在Cursor中，依次打开`Cursor设置` > `功能` > `MCP`
2. 点击`+ 添加新的MCP服务器`按钮
3. 设置以下参数：
   - **类型**：选择`stdio`
   - **名称**：输入`Pollinations图像生成`
   - **命令**：输入您的完整命令路径，例如`node /path/to/pollinations-mcp/dist/index.js`

#### 方法二：项目特定配置

1. 在项目根目录创建`.cursor`文件夹（如果不存在）
2. 将本项目中的`cursor/mcp.json`文件复制到`.cursor/mcp.json`
3. 根据您的环境修改文件路径

配置完成后，您可以在Cursor的Composer界面中的Agent模式下使用这些工具。简单地告诉Agent使用Pollinations生成图像，例如：

```
使用Pollinations生成一张描绘日落的图像
```

Agent将自动调用相应的工具，并请求您的确认后执行。

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

#### download_image

下载Pollinations.ai生成的图像到本地文件。

参数：
- `url` (必需): 要下载的图像URL
- `output_path` (可选): 保存图像的路径（包括文件名），默认为'image.jpg'

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
