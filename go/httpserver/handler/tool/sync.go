package tool

import (
	"golang.org/x/net/websocket"
	"strings"
)

func (t *ToolHandler) broadcast(message string, sender *websocket.Conn) {
	t.mutex.Lock()
	defer t.mutex.Unlock()

	for client := range t.Clients {
		// 修改：不向发送者自己广播消息
		if client == sender {
			continue
		}
		err := websocket.Message.Send(client, message+"\\\\END///")
		if err != nil {
			client.Close()
			delete(t.Clients, client)
		}
	}
}

func (t *ToolHandler) WebsocketHandler(ws *websocket.Conn) {
	defer func() {
		t.mutex.Lock()
		delete(t.Clients, ws)
		t.mutex.Unlock()
		ws.Close()
	}()

	t.mutex.Lock()
	t.Clients[ws] = true
	t.mutex.Unlock()

	for {
		var msg string
		err := websocket.Message.Receive(ws, &msg)
		if err != nil {
			break
		}

		t.mutex.Lock()
		t.Buffer[ws] += msg
		t.mutex.Unlock()

		// 检查是否完整
		for strings.Contains(t.Buffer[ws], "\\\\END///") {
			endIndex := strings.Index(t.Buffer[ws], "\\\\END///")
			completeMessage := t.Buffer[ws][:endIndex]

			// 解析消息类型
			if len(completeMessage) < 1 {

				continue
			}

			msgType := completeMessage[0] // 消息类型
			//content := completeMessage[1:] // 消息内容

			// 处理不同类型的消息
			if msgType == '1' { // 文本消息
				t.broadcast(completeMessage, ws)
			} else if msgType == '5' { // 文件传输开始
				// 发送确认消息
				websocket.Message.Send(ws, "6ACK\\\\END///")
				// 广播文件传输开始消息
				t.broadcast(completeMessage, ws)
			} else if msgType == '7' { // 文件分块数据
				// 广播文件分块数据
				t.broadcast(completeMessage, ws)
			} else {
				t.broadcast(completeMessage, ws) // 发送其他类型消息
			}

			t.mutex.Lock()
			t.Buffer[ws] = t.Buffer[ws][endIndex+len("\\\\END///"):]
			t.mutex.Unlock()
		}
	}
}
