import {launchImageLibrary} from 'react-native-image-picker';
import DocumentPicker, {types} from 'react-native-document-picker';
import {getABSPath, userErrorMessage} from '../../../utils';
import type {Asset as PickerAsset} from 'react-native-image-picker/src/types';
import {ToastOptions} from '../../../provider/toast';
import {Alert} from 'react-native';

export interface Asset{
    uri: string,
    fileName: string,
    type: string
    fileSize: number,
}

export function mediaPicker(showToast:(options: ToastOptions) => void) {

    const selectMedia = (onSelected:(assets:Asset[])=>void) => {
        launchImageLibrary({mediaType: 'mixed', selectionLimit: 0},(response) => {
            if (!response.assets || response.assets.length <= 0) {
                return;
            }
            const normalized: Asset[] = response.assets.map((file:PickerAsset) => ({
                uri: file.uri!,
                fileName: file.fileName ?? '',
                type: file.type ?? 'unknown',
                fileSize: file.fileSize ?? 0,
            }));
            onSelected(normalized);
        });
    };

    const selectAttachment = async (onSelected:(assets:Asset[])=>void) => {
        try {
            const results = await DocumentPicker.pick({
                type: [types.allFiles],
                allowMultiSelection: true,
            });
            if(results.length <= 0){
                return;
            }

            const normalized: Asset[] = results.map((file) => ({
                uri: getABSPath(file.uri!),
                fileName: file.name ?? '',
                type: file.type ?? 'unknown',
                fileSize: file.size ?? 0,
            }));

            onSelected(normalized);

        } catch (err: any) {
            if (!DocumentPicker.isCancel(err)) {
                showToast({
                    message: '文件选择失败:' + userErrorMessage(err),
                    backgroundColor: 'red',
                });
            }
        }
    };

    return {selectMedia, selectAttachment};
};

export interface FileSizeCheckResult {
    passed: boolean;      // 是否通过校验
    totalSizeMB: number;  // 文件总大小 MB
    needsConfirm?: boolean; // 是否需要用户确认
}

export function checkMediaSize(media: Asset[], showTipFilesSize:number, maxTotalFilesSize:number): FileSizeCheckResult {
    let totalSize = 0;
    for (const item of media) {
        if (item.fileSize) totalSize += item.fileSize;
    }
    const totalSizeMB = Math.ceil(totalSize / (1024 * 1024));

    if (maxTotalFilesSize > 0 && totalSizeMB > maxTotalFilesSize) {
        return { passed: false, totalSizeMB };
    }

    if (showTipFilesSize > 0 && totalSizeMB > showTipFilesSize) {
        return { passed: true, totalSizeMB, needsConfirm: true };
    }

    return { passed: true, totalSizeMB };
}

export async function confirmMediaSizeIfNeeded(result: FileSizeCheckResult): Promise<boolean> {
    if (result.needsConfirm) {
        return new Promise((resolve) => {
            Alert.alert(
                '提醒',
                `选择的文件(${result.totalSizeMB}MB)超过提示阈值, 是否继续提交?`,
                [
                    { text: '取消', style: 'cancel', onPress: () => resolve(false) },
                    { text: '继续', onPress: () => resolve(true) },
                ]
            );
        });
    }
    return result.passed;
}
