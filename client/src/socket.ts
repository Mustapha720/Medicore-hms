import { io } from 'socket.io-client'

export const socket = io('https://medicore-hms-server.onrender.com', {
  autoConnect: false,
})

export const connectSocket = (token: string) => {
  socket.auth = { token }
  if (socket.disconnected) socket.connect()
}

export const disconnectSocket = () => {
  socket.disconnect()
}
