package util

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"io"
	"os"
)

func EncryptFile(inputPath, outputPath, keyHex string) string {
	key, err := hex.DecodeString(keyHex)
	if err != nil {
		return "error:" + err.Error()
	}
	inFile, err := os.Open(inputPath)
	if err != nil {
		return "error:" + err.Error()
	}
	defer inFile.Close()

	outFile, err := os.Create(outputPath)
	if err != nil {
		return "error:" + err.Error()
	}
	defer outFile.Close()

	if err := encryptStream(inFile, outFile, key); err != nil {
		return "error:" + err.Error()
	}
	return ""
}

func DecryptFile(inputPath, outputPath, keyHex string) string {
	key, err := hex.DecodeString(keyHex)
	if err != nil {
		return "error:" + err.Error()
	}
	inFile, err := os.Open(inputPath)
	if err != nil {
		return "error:" + err.Error()
	}
	defer inFile.Close()

	outFile, err := os.Create(outputPath)
	if err != nil {
		return "error:" + err.Error()
	}
	defer outFile.Close()

	if err := decryptStream(inFile, outFile, key); err != nil {
		return "error:" + err.Error()
	}
	return ""
}

func EncryptString(plain, keyHex string) string {
	key, err := hex.DecodeString(keyHex)
	if err != nil {
		return "error:" + err.Error()
	}

	inBuf := bytes.NewBufferString(plain)
	outBuf := new(bytes.Buffer)

	if err := encryptStream(inBuf, outBuf, key); err != nil {
		return "error:" + err.Error()
	}

	return hex.EncodeToString(outBuf.Bytes())
}

func DecryptString(cipherHex, keyHex string) string {
	key, err := hex.DecodeString(keyHex)
	if err != nil {
		return "error:" + err.Error()
	}

	cipherBytes, err := hex.DecodeString(cipherHex)
	if err != nil {
		return "error:invalid hex"
	}

	inBuf := bytes.NewReader(cipherBytes)
	outBuf := new(bytes.Buffer)

	if err := decryptStream(inBuf, outBuf, key); err != nil {
		return "error:" + err.Error()
	}

	return outBuf.String()
}

func EncryptBytes(binary []byte, keyHex string) []byte {
	key, err := hex.DecodeString(keyHex)
	if err != nil {
		return []byte("error:" + err.Error())
	}

	inBuf := bytes.NewBuffer(binary)
	outBuf := new(bytes.Buffer)

	if err := encryptStream(inBuf, outBuf, key); err != nil {
		return []byte("error:" + err.Error())
	}

	return outBuf.Bytes()
}

func DecryptBytes(binary []byte, keyHex string) []byte {
	key, err := hex.DecodeString(keyHex)
	if err != nil {
		return []byte("error:" + err.Error())
	}

	inBuf := bytes.NewBuffer(binary)
	outBuf := new(bytes.Buffer)

	if err := decryptStream(inBuf, outBuf, key); err != nil {
		return []byte("error:" + err.Error())
	}

	return outBuf.Bytes()
}

func newAESCTRStream(key []byte, iv []byte) (cipher.Stream, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	return cipher.NewCTR(block, iv), nil
}

func genRandomIV() ([]byte, error) {
	iv := make([]byte, aes.BlockSize)
	if _, err := rand.Read(iv); err != nil {
		return nil, err
	}
	return iv, nil
}

func encryptStream(reader io.Reader, writer io.Writer, key []byte) error {
	iv, err := genRandomIV()
	if err != nil {
		return err
	}
	// 先写入 IV
	if _, err := writer.Write(iv); err != nil {
		return err
	}
	stream, err := newAESCTRStream(key, iv)
	if err != nil {
		return err
	}
	sw := &cipher.StreamWriter{S: stream, W: writer}
	_, err = io.Copy(sw, reader)
	return err
}

func decryptStream(reader io.Reader, writer io.Writer, key []byte) error {
	iv := make([]byte, aes.BlockSize)
	if _, err := io.ReadFull(reader, iv); err != nil {
		return err
	}
	stream, err := newAESCTRStream(key, iv)
	if err != nil {
		return err
	}
	sr := &cipher.StreamReader{S: stream, R: reader}
	_, err = io.Copy(writer, sr)
	return err
}
