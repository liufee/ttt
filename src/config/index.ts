import baseConfig from './config';
import devConfig from './config.dev';
import releaseConfig from './config.release';

// 递归合并对象的函数
export function deepMerge<T extends Record<string, any>>(target: T, source: T): T {
    for (const key in source) {
        if (
            source[key] &&
            typeof source[key] === 'object' &&
            !Array.isArray(source[key])
        ) {
            // 递归合并对象
            target[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            // 直接覆盖
            target[key] = source[key];
        }
    }
    return target;
}

// 选择对应的环境配置
const envConfig = __DEV__ ? devConfig : releaseConfig;

// 合并配置
const finalConfig = deepMerge({ ...baseConfig }, envConfig);

export {getProgress, saveProgress, clearProgress} from './progress';
export default finalConfig;
