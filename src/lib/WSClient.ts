const WS_URL = 'ws://localhost:9000/ws'

export interface User {
    userName: string
}

export interface Message {
    type: string
    name?: string
    candidate?: unknown
    success?: boolean
    users?: User[]
    user?: User
    offer?: unknown
    answer?: unknown
}

interface WSClientOptions {
    url?: string
    onMessage?: (message: Message) => void
}

class WSClient {
    connection: WebSocket
    messages: Message[] = []
    onMessageCallback?: (message: Message) => void

    constructor({ url, onMessage }: WSClientOptions) {
        this.connection = new WebSocket(url ?? WS_URL)
        this.onMessageCallback = onMessage
        this.connection.onmessage = this.messageHandler.bind(this)
        this.connection.onclose = this.closeHandler.bind(this)
    }

    messageHandler(event: MessageEvent): void {
        const data: Message = JSON.parse(event.data)
        this.messages.push(data)

        if (this.onMessageCallback) {
            this.onMessageCallback(data)
        }
    }

    closeHandler(): void {
        console.log('websocket closed')
        this.connection.close()
    }

    send(msg: Message): void {
        this.connection.send(JSON.stringify(msg))
    }

    sendRaw(rawMsg: string): void {
        this.connection.send(rawMsg)
    }
}

export default WSClient
