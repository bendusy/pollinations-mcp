#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
// 简化的错误类型枚举
var PollinationsErrorType;
(function (PollinationsErrorType) {
    PollinationsErrorType["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    PollinationsErrorType["API_ERROR"] = "API_ERROR";
    PollinationsErrorType["FILE_SYSTEM_ERROR"] = "FILE_SYSTEM_ERROR";
})(PollinationsErrorType || (PollinationsErrorType = {}));
// 简化的错误类
class PollinationsError extends Error {
    constructor(message, type, statusCode) {
        super(message);
        this.name = 'PollinationsError';
        this.type = type;
        this.statusCode = statusCode;
    }
    toUserFriendlyMessage() {
        return `错误: ${this.message}${this.statusCode ? ` (状态码: ${this.statusCode})` : ''}`;
    }
}
// Pollinations文本API实现
class PollinationsTextAPI {
    constructor() {
        this.baseTextUrl = 'https://text.pollinations.ai';
    }
    /**
     * 生成文本 (GET方法)
     * @param prompt 提示词
     * @param options 选项
     * @returns 生成的文本
     */
    async generateTextGet(prompt, options = {}) {
        const { model = 'openai', seed, json = false, system, private: isPrivate = false } = options;
        let url = `${this.baseTextUrl}/${encodeURIComponent(prompt)}?model=${model}`;
        if (seed !== undefined) {
            url += `&seed=${seed}`;
        }
        if (json) {
            url += `&json=true`;
        }
        if (system) {
            url += `&system=${encodeURIComponent(system)}`;
        }
        if (isPrivate) {
            url += `&private=true`;
        }
        try {
            const response = await axios.get(url);
            return response.data;
        }
        catch (error) {
            throw new Error(`文本生成失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 获取可用模型列表
     * @returns 模型列表
     */
    async getAvailableModels() {
        try {
            const url = `${this.baseTextUrl}/models`;
            const response = await axios.get(url);
            return response.data;
        }
        catch (error) {
            throw new Error(`获取模型列表失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
// Pollinations.ai 服务器实现
class PollinationsServer {
    constructor() {
        this.baseUrl = 'https://image.pollinations.ai';
        this.server = new Server({
            name: 'pollinations-mcp-server',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        // 初始化文本API
        this.textAPI = new PollinationsTextAPI();
        // 设置工具处理器
        this.setupToolHandlers();
        // 错误处理
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    // 错误处理方法
    handleValidationError(message) {
        return new PollinationsError(message, PollinationsErrorType.VALIDATION_ERROR, 400);
    }
    handleApiError(error) {
        if (axios.isAxiosError(error)) {
            const statusCode = error.response?.status || 0;
            const message = error.response?.data?.message || error.message;
            return new PollinationsError(`API错误: ${message}`, PollinationsErrorType.API_ERROR, statusCode);
        }
        return new PollinationsError(`未知错误: ${error.message || error}`, PollinationsErrorType.API_ERROR, 0);
    }
    handleFileSystemError(error, operation) {
        return new PollinationsError(`文件操作失败 (${operation}): ${error.message || error}`, PollinationsErrorType.FILE_SYSTEM_ERROR);
    }
    // 设置MCP工具处理器
    setupToolHandlers() {
        // 列出可用工具
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'generate_image',
                    description: '使用Pollinations.ai生成图像',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            prompt: {
                                type: 'string',
                                description: '图像描述提示词',
                            },
                            width: {
                                type: 'number',
                                description: '图像宽度（像素）',
                                default: 1024,
                            },
                            height: {
                                type: 'number',
                                description: '图像高度（像素）',
                                default: 1024,
                            },
                            seed: {
                                type: 'number',
                                description: '随机种子值（用于生成一致的图像）',
                            },
                            model: {
                                type: 'string',
                                description: '要使用的模型（如flux、variation等）',
                                default: 'flux',
                            },
                            nologo: {
                                type: 'boolean',
                                description: '设置为true可去除水印',
                                default: true,
                            },
                            enhance: {
                                type: 'boolean',
                                description: '提高图像质量（应用增强滤镜）',
                                default: false,
                            },
                            safe: {
                                type: 'boolean',
                                description: '启用安全过滤（过滤不适内容）',
                                default: false,
                            },
                            private: {
                                type: 'boolean',
                                description: '设置为true可使图像私有',
                                default: false,
                            },
                        },
                        required: ['prompt'],
                    },
                },
                {
                    name: 'download_image',
                    description: '下载Pollinations.ai生成的图像到本地文件',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            url: {
                                type: 'string',
                                description: '要下载的图像URL',
                            },
                            output_path: {
                                type: 'string',
                                description: '保存图像的路径（包括文件名）',
                                default: 'image.jpg',
                            },
                        },
                        required: ['url'],
                    },
                },
                {
                    name: 'generate_text',
                    description: '使用Pollinations.ai生成文本',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            prompt: {
                                type: 'string',
                                description: '文本提示词',
                            },
                            model: {
                                type: 'string',
                                description: '要使用的模型（如openai、mistral等）',
                                default: 'openai',
                            },
                            seed: {
                                type: 'number',
                                description: '随机种子值（用于生成一致的结果）',
                            },
                            system: {
                                type: 'string',
                                description: '系统提示词（设置AI行为）',
                            },
                            json: {
                                type: 'boolean',
                                description: '是否返回JSON格式的响应',
                                default: false,
                            },
                            private: {
                                type: 'boolean',
                                description: '设置为true可使响应私有',
                                default: false,
                            },
                        },
                        required: ['prompt'],
                    },
                },
            ],
        }));
        // 处理工具调用
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            switch (request.params.name) {
                case 'generate_image':
                    return this.handleGenerateImage(request.params.arguments);
                case 'download_image':
                    return this.handleDownloadImage(request.params.arguments);
                case 'generate_text':
                    return this.handleGenerateText(request.params.arguments);
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `未知工具: ${request.params.name}`);
            }
        });
    }
    // 处理生成图像请求
    async handleGenerateImage(args) {
        try {
            if (!this.isValidGenerateImageArgs(args)) {
                throw this.handleValidationError('无效的图像生成参数');
            }
            const { prompt, width = 1024, height = 1024, seed, model = 'flux', nologo = true, enhance = false, safe = false, private: isPrivate = false } = args;
            // 检查提示词是否为英文
            const isMainlyEnglish = this.isMainlyEnglish(prompt);
            const isConcise = prompt.length <= 200;
            let promptFeedback = '';
            if (!isMainlyEnglish) {
                promptFeedback += '提示：Pollinations.ai对英文提示词的理解更好，建议使用英文编写提示词。\n';
            }
            if (!isConcise) {
                promptFeedback += '提示：提示词过长可能影响生成效果，建议保持简短精确（建议不超过200字符）。\n';
            }
            // 构建Pollinations URL（使用官方路径格式）
            let imageUrl = `${this.baseUrl}/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}`;
            if (seed !== undefined) {
                imageUrl += `&seed=${seed}`;
            }
            if (model) {
                imageUrl += `&model=${model}`;
            }
            if (nologo) {
                imageUrl += `&nologo=true`;
            }
            // 添加新参数支持
            if (enhance) {
                imageUrl += `&enhance=true`;
            }
            if (safe) {
                imageUrl += `&safe=true`;
            }
            if (isPrivate) {
                imageUrl += `&private=true`;
            }
            // 验证URL是否有效
            try {
                // 发送HEAD请求检查URL是否可访问（不下载完整图像）
                await axios.head(imageUrl);
            }
            catch (error) {
                // 处理API错误
                const pollinationsError = this.handleApiError(error);
                // 特殊处理安全过滤错误
                if (pollinationsError.statusCode === 400 && safe) {
                    throw new PollinationsError('内容被安全过滤拦截，请修改提示词后重试', PollinationsErrorType.VALIDATION_ERROR, 400);
                }
                throw pollinationsError;
            }
            const response = {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            url: imageUrl,
                            prompt,
                            width,
                            height,
                            seed,
                            model,
                            nologo,
                            enhance,
                            safe,
                            private: isPrivate
                        }, null, 2),
                    },
                ],
            };
            // 如果有提示反馈，添加到响应中
            if (promptFeedback) {
                response.content.unshift({
                    type: 'text',
                    text: promptFeedback
                });
            }
            return response;
        }
        catch (error) {
            // 处理所有错误
            let pollinationsError;
            if (error instanceof PollinationsError) {
                pollinationsError = error;
            }
            else {
                pollinationsError = this.handleApiError(error);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: pollinationsError.toUserFriendlyMessage(),
                    },
                ],
                isError: true,
            };
        }
    }
    // 检查文本是否主要为英文
    isMainlyEnglish(text) {
        // 英文字符（包括空格和标点）的正则表达式
        const englishRegex = /^[A-Za-z0-9\s.,;:'"!?()-]+$/;
        // 如果完全匹配英文字符，返回true
        if (englishRegex.test(text)) {
            return true;
        }
        // 否则计算非英文字符的比例
        const nonEnglishChars = text.split('').filter(char => !char.match(/[A-Za-z0-9\s.,;:'"!?()-]/)).length;
        const totalChars = text.length;
        // 如果非英文字符少于20%，仍然视为主要是英文
        return (nonEnglishChars / totalChars) < 0.2;
    }
    // 处理下载图像请求
    async handleDownloadImage(args) {
        try {
            if (!this.isValidDownloadImageArgs(args)) {
                throw this.handleValidationError('无效的图像下载参数');
            }
            // 获取参数
            let { url, output_path = 'image.jpg' } = args;
            // 使用相对路径保存图像到当前工作目录
            output_path = path.resolve(process.cwd(), output_path);
            console.error(`图像将保存到: ${output_path}`);
            try {
                // 确保输出目录存在
                const dirname = path.dirname(output_path);
                if (!fs.existsSync(dirname)) {
                    console.error(`创建目录: ${dirname}`);
                    fs.mkdirSync(dirname, { recursive: true });
                }
            }
            catch (fsError) {
                throw this.handleFileSystemError(fsError, '创建目录');
            }
            // 下载图像
            console.error(`开始下载图像: ${url}`);
            let response;
            try {
                response = await axios.get(url, { responseType: 'arraybuffer' });
            }
            catch (downloadError) {
                throw this.handleApiError(downloadError);
            }
            // 写入文件
            try {
                console.error(`写入文件: ${output_path}`);
                fs.writeFileSync(output_path, Buffer.from(response.data, 'binary'));
            }
            catch (writeError) {
                throw this.handleFileSystemError(writeError, '写入文件');
            }
            // 验证文件是否写入成功
            try {
                if (fs.existsSync(output_path)) {
                    const fileSize = fs.statSync(output_path).size;
                    console.error(`文件成功写入: ${output_path}, 大小: ${fileSize} 字节`);
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: true,
                                    message: `图像已下载到 ${output_path}`,
                                    size: fileSize,
                                    path: output_path
                                }, null, 2),
                            },
                        ],
                    };
                }
                else {
                    throw new PollinationsError(`文件写入失败: ${output_path}`, PollinationsErrorType.FILE_SYSTEM_ERROR);
                }
            }
            catch (verifyError) {
                if (verifyError instanceof PollinationsError) {
                    throw verifyError;
                }
                else {
                    throw this.handleFileSystemError(verifyError, '验证文件');
                }
            }
        }
        catch (error) {
            // 处理所有错误
            let pollinationsError;
            if (error instanceof PollinationsError) {
                pollinationsError = error;
            }
            else {
                pollinationsError = this.handleApiError(error);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: pollinationsError.toUserFriendlyMessage(),
                    },
                ],
                isError: true,
            };
        }
    }
    // 验证生成图像参数
    isValidGenerateImageArgs(args) {
        return (typeof args === 'object' &&
            args !== null &&
            typeof args.prompt === 'string' &&
            (args.width === undefined || typeof args.width === 'number') &&
            (args.height === undefined || typeof args.height === 'number') &&
            (args.seed === undefined || typeof args.seed === 'number') &&
            (args.model === undefined || typeof args.model === 'string') &&
            (args.nologo === undefined || typeof args.nologo === 'boolean') &&
            (args.enhance === undefined || typeof args.enhance === 'boolean') &&
            (args.safe === undefined || typeof args.safe === 'boolean') &&
            (args.private === undefined || typeof args.private === 'boolean'));
    }
    // 验证下载图像参数
    isValidDownloadImageArgs(args) {
        return (typeof args === 'object' &&
            args !== null &&
            typeof args.url === 'string' &&
            (args.output_path === undefined || typeof args.output_path === 'string'));
    }
    // 处理生成文本请求
    async handleGenerateText(args) {
        try {
            if (!this.isValidGenerateTextArgs(args)) {
                throw this.handleValidationError('无效的文本生成参数');
            }
            const { prompt, model = 'openai', seed, system, json = false, private: isPrivate = false } = args;
            const result = await this.textAPI.generateTextGet(prompt, {
                model,
                seed,
                json,
                system,
                private: isPrivate
            });
            return {
                content: [
                    {
                        type: 'text',
                        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            // 处理所有错误
            let pollinationsError;
            if (error instanceof PollinationsError) {
                pollinationsError = error;
            }
            else {
                pollinationsError = this.handleApiError(error);
            }
            return {
                content: [
                    {
                        type: 'text',
                        text: pollinationsError.toUserFriendlyMessage(),
                    },
                ],
                isError: true,
            };
        }
    }
    // 验证生成文本参数
    isValidGenerateTextArgs(args) {
        return (typeof args === 'object' &&
            args !== null &&
            typeof args.prompt === 'string' &&
            (args.model === undefined || typeof args.model === 'string') &&
            (args.seed === undefined || typeof args.seed === 'number') &&
            (args.system === undefined || typeof args.system === 'string') &&
            (args.json === undefined || typeof args.json === 'boolean') &&
            (args.private === undefined || typeof args.private === 'boolean'));
    }
    // 运行服务器
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Pollinations MCP服务器正在通过stdio运行');
    }
}
// 创建并运行服务器
const server = new PollinationsServer();
server.run().catch(console.error);
