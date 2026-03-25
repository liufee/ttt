import { createClient } from 'webdav';
import RNFS from 'react-native-fs';
import {WebDAVClient} from'webdav/dist/node/types';
import {arrayBufferToBase64} from '../utils';

export default class Webdav {

    private client:WebDAVClient;

    constructor (webdavUrl: string, username: string, password: string){
        this.client = createClient(webdavUrl, {
            username,
            password,
        });
    }

    // 获取文件列表
    async listFiles(directory: string = '/'){
        try {
            return await this.client.getDirectoryContents(directory);
        } catch (error) {
            console.error('获取文件列表失败:', error);
            throw error;
        }
    }

    // 检查目录是否存在
    async checkDirExists (directoryPath: string) {
        try {
            const stat = await this.client.stat(directoryPath);
            return stat.type === 'directory'; // true: 目录存在
        } catch (err) {
            if (err.response && err.response.status === 404) {
                return false; // 不存在
            }
            throw err;
        }
    }

    // 创建目录
    async createDirectory(directoryPath: string){
        try {
            await this.client.createDirectory(directoryPath, {recursive: true});
            return true;
        } catch (error) {
            console.error('创建目录失败:', error);
            return false;
        }
    }

    // 删除文件或文件夹
    async deleteFileOrFolder(filePath: string){
        try {
            await this.client.deleteFile(filePath);
            return true;
        } catch (error) {
            console.error('删除失败:', error);
            return false;
        }
    }

    // 下载文件并保存到本地
    async downloadFile(filePath: string, dstFilePath: string){
        try {
            const fileContents = await this.client.getFileContents(filePath, {format: 'binary'});
            const base64Data = arrayBufferToBase64(fileContents);
            await RNFS.writeFile(dstFilePath, base64Data, 'base64');
        } catch (error) {
            console.error('下载文件失败:', error);
            throw error;
        }
    }

    async uploadFile(filePath: string, fileData: string|ArrayBuffer) {
        try {
            await this.client.putFileContents(filePath, fileData);
            return true;
        } catch (error) {
            console.error('上传失败:', error);
            return false;
        }
    }
}
