import React, {useState, useEffect, useRef} from 'react';
import {View, TextInput, TouchableOpacity, Text, StyleSheet, ProgressViewIOS, Platform, ProgressBarAndroid} from 'react-native';
import RFNS from 'react-native-fs';
import {AppMoviesBasePath} from '../../../constant';
import { useRoute } from '@react-navigation/native';
import config from '../../../config';
import { useToast } from '../../../provider/toast';
import FileViewer from 'react-native-file-viewer';

const Download = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadedSize, setDownloadedSize] = useState(0); // 添加已下载大小状态
  const [showProgressBySize, setShowProgressBySize] = useState(false); // 控制显示模式
  const route = useRoute();
  const inputRef = useRef<TextInput>(null);
  const { showToast } = useToast();

  // 添加useEffect来处理接收到的weblink参数
  useEffect(() => {
    if (route.params?.weblink) {
      setUrl(route.params.weblink);
    }
  }, [route.params?.weblink]);

  const downloadFile = async () => {
    if (!url) {
      return;
    }

    try {
      setLoading(true);
      setProgress(-1);
      setDownloadedSize(0);
      setShowProgressBySize(false); // 重置显示模式

      const response = await fetch(config.apiBaseURL + '/tool/video-parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-feehi-sec-verify': config.feehiSecVerify,
        },
        body: JSON.stringify({
          url: url,
        }),
      });
      const data = await response.json();
      if(data?.code && data.code !== 0 ){
        throw new Error(`解析失败: ${data.message}`);
      }

      let downloadURL = data.url;
      let fileName = data.filename;

      const targetDir = AppMoviesBasePath;
      const dirExists = await RFNS.exists(targetDir);
      if (!dirExists) {
        await RFNS.mkdir(targetDir);
      }

      const filePath = `${targetDir}/${fileName}`;
      setProgress(0);
      const download = RFNS.downloadFile({
        fromUrl: downloadURL,
        toFile: filePath,
        progress: (res) => {
          // 如果contentLength为-1或0，表示不支持进度显示，改为显示已下载大小
          if (!res.contentLength || res.contentLength <= 0) {
            setShowProgressBySize(true);
            setDownloadedSize(res.bytesWritten);
          } else {
            setShowProgressBySize(false);
            const progressPercent = res.bytesWritten / res.contentLength;
            setProgress(progressPercent);
          }
        },
        progressDivider: 1,
      });

      const result = await download.promise;

      if (result.statusCode === 200) {
        setLoading(false);
        setProgress(1);
        showToast({message: `已保存到: ${filePath}`, onPress: () => {
            FileViewer.open(filePath);
        }, autoHide: false});
      } else {
        throw new Error(`下载失败，状态码: ${result.statusCode}`);
      }
    } catch (error) {
      setLoading(false);
      showToast({message: `下载失败: ${error.message}`, backgroundColor: 'red', autoHide: false});
    }
  };

  // 格式化文件大小显示
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    } else if (bytes < 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } else {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[styles.input, loading && styles.disabledInput]}
          placeholder="请输入文件URL"
          value={url}
          onChangeText={(val:string)=>{
            setUrl(extractFirstUrl(val));
          }}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          onFocus={() => {
            setTimeout(() => {
              inputRef.current?.setSelection(0, url.length);
            }, 100);
          }}
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.disabledButton]}
          onPress={downloadFile}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? (progress === -1 ? '解析中' : '下载中') : '下载'}
          </Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {showProgressBySize
              ? (progress === -1 ? '解析中' : `已下载: ${formatFileSize(downloadedSize)} `)
              : (progress === -1 ? '解析中' : `下载进度: ${(progress * 100).toFixed(1)}% `)}
          </Text>
          {showProgressBySize ? (
            // 当无法显示进度时，显示不确定进度条
            Platform.OS === 'ios' ? (
              <ProgressViewIOS
                style={styles.progressBar}
                progress={0}
                progressViewStyle="bar"
              />
            ) : (
              <ProgressBarAndroid
                style={styles.progressBar}
                styleAttr="Horizontal"
                indeterminate={true}
              />
            )
          ) : Platform.OS === 'ios' ? (
            <ProgressViewIOS
              style={styles.progressBar}
              progress={progress}
            />
          ) : (
            <ProgressBarAndroid
              style={styles.progressBar}
              styleAttr="Horizontal"
              indeterminate={false}
              progress={progress}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  // 添加禁用按钮样式
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 添加输入框禁用样式
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  // 添加进度相关样式
  progressContainer: {
    width: '100%',
    marginTop: 20,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  progressBar: {
    width: '100%',
    height: 10,
  },
});

const tlds = [
  'com','cn','org','net','edu','gov','io','co','top','xyz',
  'tech','vip','cc','biz','info','me','tv','club','shop'
].join('|');
const extractFirstUrl = (text) => {
  if (!text) return '';
  const regex = new RegExp(
      `(?:https?:\\/\\/)?` +                       // 可选协议
      `[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.` +        // 域名部分
      `(?:${tlds})` +                             // 顶级域名
      `(?:\\/[^\\s"'“”‘<>]*)?`,                  // 可选路径
      "i"
  );

  const match = text.match(regex);
  if (!match) return null;

  // 去掉首尾空格、引号、括号、标点
  return match[0].replace(/^[\s"'“‘(<\[{]+|[\s"'”’\)>.,;:!?，。）\]}]+$/g, '');
};

export default Download;
