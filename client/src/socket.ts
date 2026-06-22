import { io } from 'socket.io-client'

export const socket = io('http://localhost:5000', {
  autoConnect: false,
})

export const connectSocket = (token: string) => {
  socket.auth = { token }
  if (socket.disconnected) socket.connect()
}

export const disconnectSocket = () => {
  socket.disconnect()
}