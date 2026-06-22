import { useEffect } from 'react';
import { socket } from '../socket';

export const useSocket = (event: string, handler: (...args: unknown[]) => void) => {
  useEffect(() => {
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler]);
};