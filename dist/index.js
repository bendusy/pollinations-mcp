#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
// Pollinations.ai 服务器实现
class PollinationsServer {
    constructor() {
        this.baseUrl = 'https://pollinations.ai';
        this.server = new Server({
            name: 'pollinations-mcp-server',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        // 设置工具处理器
        this.setupToolHandlers();
        // 错误处理
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    // 设置MCP工具处理器
    setupToolHandlers() {
        // 列出可用工具
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'generate_image',
                    description: '使用Pollinations.ai生成图像并返回URL',
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
            ],
        }));
        // 处理工具调用
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            switch (request.params.name) {
                case 'generate_image':
                    return this.handleGenerateImage(request.params.arguments);
                case 'download_image':
                    return this.handleDownloadImage(request.params.arguments);
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `未知工具: ${request.params.name}`);
            }
        });
    }
    // 处理生成图像请求
    async handleGenerateImage(args) {
        if (!this.isValidGenerateImageArgs(args)) {
            throw new McpError(ErrorCode.InvalidParams, '无效的图像生成参数');
        }
        const { prompt, width = 1024, height = 1024, seed, model = 'flux', nologo = true } = args;
        // 构建Pollinations URL
        let imageUrl = `${this.baseUrl}/p/${encodeURIComponent(prompt)}?width=${width}&height=${height}`;
        if (seed !== undefined) {
            imageUrl += `&seed=${seed}`;
        }
        if (model) {
            imageUrl += `&model=${model}`;
        }
        if (nologo) {
            imageUrl += `&nologo=true`;
        }
        try {
            return {
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
                            nologo
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `生成图像URL时出错: ${error instanceof Error ? error.message : String(error)}`,
                    },
                ],
                isError: true,
            };
        }
    }
    // 处理下载图像请求
    async handleDownloadImage(args) {
        if (!this.isValidDownloadImageArgs(args)) {
            throw new McpError(ErrorCode.InvalidParams, '无效的图像下载参数');
        }
        // 获取参数
        let { url, output_path = 'image.jpg' } = args;
        try {
            // 使用相对路径保存图像到当前工作目录
            output_path = path.resolve(process.cwd(), output_path);
            console.error(`图像将保存到: ${output_path}`);
            // 确保输出目录存在
            const dirname = path.dirname(output_path);
            if (!fs.existsSync(dirname)) {
                console.error(`创建目录: ${dirname}`);
                fs.mkdirSync(dirname, { recursive: true });
            }
            // 下载图像
            console.error(`开始下载图像: ${url}`);
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            // 写入文件
            console.error(`写入文件: ${output_path}`);
            fs.writeFileSync(output_path, Buffer.from(response.data, 'binary'));
            // 验证文件是否写入成功
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
                console.error(`文件写入失败: ${output_path}`);
                return {
                    content: [
                        {
                            type: 'text',
                            text: `文件写入失败: ${output_path}`,
                        },
                    ],
                    isError: true,
                };
            }
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `下载图像时出错: ${error instanceof Error ? error.message : String(error)}`,
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
            (args.nologo === undefined || typeof args.nologo === 'boolean'));
    }
    // 验证下载图像参数
    isValidDownloadImageArgs(args) {
        return (typeof args === 'object' &&
            args !== null &&
            typeof args.url === 'string' &&
            (args.output_path === undefined || typeof args.output_path === 'string'));
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
