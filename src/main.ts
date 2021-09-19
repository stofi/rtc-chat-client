/* eslint-disable @typescript-eslint/no-explicit-any */
import './style.css'

import RTCClient from './lib/RTCClient'

const $app = document.querySelector<HTMLDivElement>('#app')
const $messages = document.querySelector<HTMLDivElement>('#messages')
const $users = document.querySelector<HTMLDivElement>('#users')
const $login = document.querySelector<HTMLButtonElement>('#login')
const $input = document.querySelector<HTMLInputElement>('#input')
const $peer = document.querySelector<HTMLDivElement>('#peer')
const $messageInput = document.querySelector<HTMLInputElement>('#message')
const $send = document.querySelector<HTMLButtonElement>('#send')

if (!$app) throw new Error("Can't find #app")
if (!$messages) throw new Error("Can't find #messages")
if (!$users) throw new Error("Can't find #users")
if (!$login) throw new Error("Can't find #login")
if (!$input) throw new Error("Can't find #input")
if (!$peer) throw new Error("Can't find #peer")
if (!$send) throw new Error("Can't find #send")
if (!$messageInput) throw new Error("Can't find #message")

const rtc = new RTCClient({
    onSetUsers: (users: any[]) => {
        $users.innerHTML = ''
        users.forEach((user: any) => {
            const $userButton = document.createElement('button')
            $userButton.innerHTML = user.userName
            $users.appendChild($userButton)
            $userButton.onclick = () => {
                rtc.toggleConnection(user.userName)
            }
        })
    },
    onSetMessages: (messages: any) => {
        $messages.innerHTML = ''
        Object.entries(messages).forEach(([user, msgs]) => {
            const $userName = document.createElement('div')
            $userName.innerHTML = user
            const $messagesList = document.createElement('ul')
            $messagesList.className = ''
            if (Array.isArray(msgs)) {
                msgs.forEach(({ message, name, time }: any) => {
                    const $messageItem = document.createElement('li')
                    const $messageItemUser = document.createElement('div')
                    const $messageItemTime = document.createElement('div')
                    const $messageItemMessage = document.createElement('div')

                    const timeString = new Date(time).toLocaleDateString()

                    $messageItemUser.innerText = name
                    $messageItemTime.innerText = timeString
                    $messageItemMessage.innerText = message

                    $messageItem.appendChild($messageItemUser)
                    $messageItem.appendChild($messageItemMessage)
                    $messageItem.appendChild($messageItemTime)

                    $messageItem.classList.add('grid')
                    $messageItem.classList.add('grid-cols-6')
                    $messageItemUser.classList.add('col-span-1')
                    $messageItemTime.classList.add('col-span-1')
                    $messageItemMessage.classList.add('col-span-4')

                    $messagesList.appendChild($messageItem)
                })
            }
            $messages.appendChild($userName)
            $messages.appendChild($messagesList)
        })
    },
    onSetPeer: (peer: any) => {
        $peer.innerHTML = peer
    },
})

$login.onclick = () => {
    rtc.handleLogin($input.value)
}
$send.onclick = () => {
    rtc.sendMessage($messageInput.value)
}

window.rtc = rtc
