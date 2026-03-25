import RNFS from 'react-native-fs';
import {APPRuntimePath} from '../constant';

// 用于存储进度数据的内存缓存
let progressCache: Record<string, any> = {};
let isCacheLoaded = false;
let loadPromise: Promise<void> | null = null; // 用于处理并发加载

const PROGRESS_FILE_PATH = `${APPRuntimePath}/progress.json`;

const ensureLoaded = async (): Promise<void> => {
  if (isCacheLoaded) {
    return;
  }

  // 如果正在加载中，等待加载完成
  if (loadPromise) {
    await loadPromise;
    return;
  }

  // 开始加载
  loadPromise = (async () => {
    try {
      // 确保运行时目录存在
      const dirExists = await RNFS.exists(APPRuntimePath);
      if (!dirExists) {
        await RNFS.mkdir(APPRuntimePath);
        progressCache = {};
        isCacheLoaded = true;
        return;
      }

      // 检查进度文件是否存在
      const fileExists = await RNFS.exists(PROGRESS_FILE_PATH);
      if (fileExists) {
        // 读取进度文件
        const content = await RNFS.readFile(PROGRESS_FILE_PATH, 'utf8');
        progressCache = JSON.parse(content);
      } else {
        // 文件不存在，初始化为空对象
        progressCache = {};
      }
    } catch (error) {
      console.error('加载进度数据失败:', error);
      // 即使加载失败，也要确保缓存是对象，以便后续操作
      progressCache = {};
    } finally {
      isCacheLoaded = true;
      loadPromise = null;
    }
  })();

  await loadPromise;
};

export const saveProgress = async (key: string, progress: any): Promise<boolean> => {
  try {
    // 确保数据已加载
    await ensureLoaded();

    // 确保运行时目录存在
    const dirExists = await RNFS.exists(APPRuntimePath);
    if (!dirExists) {
      await RNFS.mkdir(APPRuntimePath);
    }

    // 更新内存缓存
    progressCache[key] = progress;

    // 将整个进度缓存写入文件
    const progressString = JSON.stringify(progressCache);
    await RNFS.writeFile(PROGRESS_FILE_PATH, progressString, 'utf8');

    return true;
  } catch (error) {
    console.error(`保存进度失败 key=${key}:`, error);
    return false;
  }
};

export const getProgress = async (key: string): Promise<any> => {
  // 确保数据已加载
  await ensureLoaded();

  return progressCache[key];
};

export const getAllProgress = async (): Promise<Record<string, any>> => {
  // 确保数据已加载
  await ensureLoaded();

  return {...progressCache}; // 返回副本以防止外部直接修改缓存
};

export const clearProgress = async (key: string): Promise<boolean> => {
  try {
    // 确保数据已加载
    await ensureLoaded();

    // 从内存缓存中删除
    delete progressCache[key];

    // 将更新后的进度缓存写入文件
    const progressString = JSON.stringify(progressCache);
    await RNFS.writeFile(PROGRESS_FILE_PATH, progressString, 'utf8');

    return true;
  } catch (error) {
    console.error(`清除进度失败 key=${key}:`, error);
    return false;
  }
};

export const clearAllProgress = async (): Promise<boolean> => {
  try {
    // 确保数据已加载
    await ensureLoaded();

    // 清空内存缓存
    progressCache = {};

    // 删除进度文件
    const fileExists = await RNFS.exists(PROGRESS_FILE_PATH);
    if (fileExists) {
      await RNFS.unlink(PROGRESS_FILE_PATH);
    }

    return true;
  } catch (error) {
    console.error('清除所有进度失败:', error);
    return false;
  }
};
