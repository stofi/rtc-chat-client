import WSClient from './WSClient'
import type { Message, User } from './WSClient'

const log = (text: string, value: unknown) => {
    console.log(`${text}: ${JSON.stringify(value, null, 2)}`)
    // console.trace()
}

const configuration: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.1.google.com:19302' }],
}

interface RTCClientOptions {
    onSetUsers?: (users: User[]) => void
    onSetMessages?: (message: RTCMessages) => void
    onSetPeer?: (peer: string) => void
    onSetUser?: (user: User) => void
}

interface RTCMessage {
    type: string
}
interface RTCMessages {
    [key: string]: RTCMessage[]
}

class RTCClient {
    wsClient: WSClient
    socketOpen = false
    loggingIn = false
    isLoggedIn = false
    private _users: User[] = []
    get users(): User[] {
        log(`get users `, this._users)
        return this._users
    }
    set users(value: User[]) {
        log(`set users`, value)
        if (this.setUsersCallback) {
            this.setUsersCallback(value)
        }
        this._users = value
    }
    private _peerName: string | null = null
    get peerName(): string | null {
        log(`get peerName `, this._peerName)
        return this._peerName
    }
    set peerName(value: string | null) {
        log(`set peerName`, value)
        this._peerName = value
        if (this.setPeerCallback) {
            this.setPeerCallback(value as string)
        }
    }
    private _userName: string | null = null
    get userName(): string | null {
        log(`get userName `, this._userName)
        return this._userName
    }
    set userName(value: string | null) {
        log(`set userName`, value)
        this._userName = value
        if (this.setUserCallback) {
            this.setUserCallback(value as string)
        }
    }

    private _receiveChannel: RTCDataChannel | null = null
    get receiveChannel(): RTCDataChannel | null {
        log(`get receiveChannel `, this._receiveChannel)
        return this._receiveChannel
    }
    set receiveChannel(value: RTCDataChannel | null) {
        log(`set receiveChannel`, value)
        this._receiveChannel = value
    }

    private _messages: RTCMessages = {}
    get messages(): RTCMessages {
        log(`get messages `, this._messages)
        return this._messages
    }
    set messages(value: RTCMessages) {
        log(`set messages`, value)
        if (this.setMessagesCallback) {
            this.setMessagesCallback(value)
        }
        this._messages = value
    }

    private _channel: RTCDataChannel | null = null
    get channel(): RTCDataChannel | null {
        log(`get channel `, this._channel)
        return this._channel
    }
    set channel(value: RTCDataChannel | null) {
        log(`set channel`, value)
        this._channel = value
    }

    private _connection: RTCPeerConnection | null = null
    get connection(): RTCPeerConnection | null {
        log(`get connection `, this._connection)
        return this._connection
    }
    set connection(value: RTCPeerConnection | null) {
        log(`set connection`, value)
        if (this.setConnectionCallback) {
            this.setConnectionCallback(value)
        }
        this._connection = value
    }

    setUsersCallback?: (users: User[]) => void
    setMessagesCallback?: (messages: RTCMessages) => void
    setPeerCallback?: (peer: string) => void
    setConnectionCallback?: (connection: RTCPeerConnection | null) => void
    setUserCallback?: (user: string) => void

    constructor(options: RTCClientOptions) {
        this.wsClient = new WSClient({
            onMessage: (msg: Message) => {
                switch (msg.type) {
                    case 'connect':
                        this.socketOpen = true
                        break
                    case 'login':
                        this.onLogin(msg)
                        break
                    case 'updateUsers':
                        this.users = [...this.users, msg.user as User]
                        break
                    case 'leave':
                    case 'removeUser':
                        this.removeUser(msg.user as User)
                        break
                    case 'offer':
                        this.onOffer(msg)
                        break
                    case 'answer':
                        this.onAnswer(msg)
                        break
                    case 'candidate':
                        this.onCandidate(msg)
                        break

                    default:
                        break
                }
            },
        })
        if (options.onSetUsers) {
            this.setUsersCallback = options.onSetUsers
        }
        if (options.onSetMessages) {
            this.setMessagesCallback = options.onSetMessages
        }
        if (options.onSetPeer) {
            this.setPeerCallback = options.onSetPeer
        }
    }

    onLogin({ success, users }: Message): void {
        this.loggingIn = false

        if (success) {
            this.isLoggedIn = true
            this.users = users as User[]
            const localConnection = new RTCPeerConnection(configuration)
            localConnection.onicecandidate = ({ candidate }) => {
                const connectedTo = this.peerName

                if (candidate && !!connectedTo) {
                    this.wsClient.send({
                        name: connectedTo,
                        type: 'candidate',
                        candidate,
                    })
                }
            }
            localConnection.ondatachannel = (event) => {
                console.log('Data channel is created!')
                this.receiveChannel = event.channel
                this.receiveChannel.onopen = () => {
                    console.log('Data channel is open and ready to be used.')
                }
                this.receiveChannel.onmessage =
                    this.handleDataChannelMessageReceived.bind(this)
                this.channel = this.receiveChannel
            }
            this.connection = localConnection
        } else {
            console.log('Login failed')
        }
    }
    onOffer({ offer, name }: Message): void {
        this.peerName = name ?? null
        const localConnection = this.connection
        if (!localConnection) throw new Error('Not connected')
        localConnection
            .setRemoteDescription(
                new RTCSessionDescription(offer as RTCSessionDescription)
            )
            .then(() => localConnection.createAnswer())
            .then((answer) => localConnection.setLocalDescription(answer))
            .then(() => {
                this.wsClient.send({
                    name: name,
                    type: 'answer',
                    answer: localConnection.localDescription,
                })
            })

            .catch(console.log)
    }
    onAnswer({ answer }: Message): void {
        const localConnection = this.connection
        if (!localConnection) throw new Error('Not connected')
        localConnection.setRemoteDescription(
            new RTCSessionDescription(answer as RTCSessionDescription)
        )
    }
    onCandidate({ candidate }: Message): void {
        const localConnection = this.connection
        if (!localConnection) throw new Error('Not connected')
        localConnection.addIceCandidate(
            new RTCIceCandidate(candidate as RTCIceCandidate)
        )
    }
    handleDataChannelMessageReceived({ data }: MessageEvent): void {
        console.log('Message received: ', data)

        const message = JSON.parse(data)
        const { name: user } = message

        const userMessages = this.messages[user]

        this.messages = Object.assign({}, this.messages, {
            [user]: userMessages ? [...userMessages, message] : [message],
        })
    }
    sendMessage(message: string): void {
        const time = new Date().toISOString()

        const connectedTo = this.peerName
        const user = this.userName
        const channel = this.channel
        if (!connectedTo) throw new Error('Not connected')
        if (!channel) throw new Error('No channel')
        if (!user) throw new Error('No user')

        const text = { time, message, name: user }

        const userMessages = this.messages[connectedTo]

        this.messages = Object.assign({}, this.messages, {
            [connectedTo]: userMessages ? [...userMessages, text] : [text],
        })

        channel.send(JSON.stringify(text))
    }
    handleConnection(): void {
        const localConnection = this.connection
        if (!localConnection) throw new Error('Not connected')
        if (!this.peerName) throw new Error('No peer name')
        const dataChannel = localConnection.createDataChannel('messenger')

        dataChannel.onerror = (error) => {
            console.log(error)
        }

        dataChannel.onmessage = this.handleDataChannelMessageReceived.bind(this)
        this.channel = dataChannel

        localConnection
            .createOffer()
            .then((offer) => localConnection.setLocalDescription(offer))
            .then(() =>
                this.wsClient.send({
                    type: 'offer',
                    offer: localConnection.localDescription,
                    name: this.peerName as string,
                })
            )
            .catch((e) => console.log(e))
    }
    toggleConnection(name: string): void {
        this.peerName = this.peerName === name ? null : name
        if (this.connection && this.peerName) {
            this.handleConnection()
        }
    }
    handleLogin(name: string): void {
        this.loggingIn = true
        this.userName = name
        this.wsClient.send({
            name,
            type: 'login',
        })
    }
    removeUser(user: User): void {
        if (!user) throw new Error('No user')
        if (!user.userName) throw new Error('No userName')
        this.users = this.users.filter(
            ({ userName }) => userName !== user.userName
        )
    }
}

export default RTCClient
