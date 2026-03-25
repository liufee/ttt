import RNFS from 'react-native-fs';
import {MediaType} from '../services/weibo/model';

export const getABSPath = (contentSchemePath)=> {
    const path = contentSchemePath.replace('content://com.android.externalstorage.documents/document/primary%3A', '');
    return RNFS.ExternalStorageDirectoryPath + '/' + path.replaceAll('%2F', '/');
};

export const getAbsPathFileExplorer = (contentSchemePath)=> {
    const path = contentSchemePath.replace('content://com.android.fileexplorer.myprovider/external_files', '');
    return RNFS.ExternalStorageDirectoryPath + '/' + path;
};

export const arrayBufferToBase64 = (arrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    const length = bytes.byteLength;
    for (let i = 0; i < length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);  // 使用 window.btoa() 将二进制字符串转换为 Base64
};

export const base64ToArrayBuffer = (base64) => {
    // 将 base64 转换为 ArrayBuffer
    const byteCharacters = atob(base64);
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
    }
    return byteArray.buffer;
};

export const mimeIsImage = (mime: string) => {
    return mime === 'image/jpeg' || mime === 'image/jpg' || mime === 'image/gif' || mime === 'image/webp' || mime === 'image/png' || mime === 'image/bmp';
};

export const userErrorMessage = (e:any) => {
    if (e instanceof Error) {
        return e.message;
    }
    if (typeof e === 'string') {
        return e;
    }
    try {
        return JSON.stringify(e);
    } catch {
        return '发生未知错误';
    }
};

export const getMediaType = (type:string|null|undefined):MediaType|string => {
    if (!type){
        return '';
    }
    if (type.startsWith('image/') || type === 'pic') {
        return MediaType.Image;
    }
    if (type.startsWith('video/')){
        return MediaType.Video;
    }
    if (type.startsWith('audio/')){
        return MediaType.Audio;
    }
    return type;
};

export const isTimeBetween = (startTime, endTime) => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    const currentMinutes = hours * 60 + minutes;
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

export const parseURI = (uri: string) => {
    if (typeof uri !== 'string') {
        return null;
    }

    const regex = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^\/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/;
    const match = uri.match(regex);

    if (!match) {
        // fallback: treat whole string as path
        return {
            scheme: null,
            hostname: null,
            path: uri,
            query: null,
            searchParams: {},
            fragment: null,
        };
    }

    const query = match[4] ? match[4].slice(1) : null;
    const searchParams: Record<string, string> = {};

    if (query) {
        query.split('&').forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
                searchParams[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
            }
        });
    }

    return {
        scheme: match[1] || null,
        hostname: match[2] || null,
        path: match[3] || '',
        query,
        searchParams,
        fragment: match[5] ? match[5].slice(1) : null,
    };
};

export const appendURIGETParams = (rawURL:string, searchParams:Record<string, string>) => {
    const separator = rawURL.includes('?') ? '&' : '?';
    const params = new URLSearchParams(searchParams).toString();
    return rawURL + separator + params;
};

