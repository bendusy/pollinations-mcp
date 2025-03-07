import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Pollinations文本API实现
 */
export class PollinationsTextAudioAPI {
  private baseTextUrl = 'https://text.pollinations.ai';

  /**
   * 生成文本 (GET方法)
   * @param prompt 提示词
   * @param options 选项
   * @returns 生成的文本
   */
  async generateTextGet(prompt: string, options: {
    model?: string;
    seed?: number;
    json?: boolean;
    system?: string;
    private?: boolean;
  } = {}) {
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
    } catch (error) {
      throw new Error(`文本生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 生成文本 (POST方法)
   * @param messages 消息数组
   * @param options 选项
   * @returns 生成的文本
   */
  async generateTextPost(messages: Array<{role: string, content: string | Array<{type: string, text?: string, image_url?: {url: string}}>}>, options: {
    model?: string;
    seed?: number;
    jsonMode?: boolean;
    private?: boolean;
  } = {}) {
    const { model = 'openai', seed, jsonMode = false, private: isPrivate = false } = options;
    
    try {
      const response = await axios.post(`${this.baseTextUrl}/`, {
        messages,
        model,
        seed,
        jsonMode,
        private: isPrivate
      });
      return response.data;
    } catch (error) {
      throw new Error(`文本生成失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 获取可用模型列表
   * @param type 模型类型 ('text')
   * @returns 模型列表
   */
  async getAvailableModels(type: 'text' = 'text') {
    try {
      const url = `${this.baseTextUrl}/models`;
      
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw new Error(`获取模型列表失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 