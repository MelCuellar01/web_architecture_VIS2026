import { io } from 'socket.io-client';

const API_BASE = 'http://localhost:3000';

export const socket = io(API_BASE, {
  withCredentials: true,
});