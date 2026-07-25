import { io } from 'socket.io-client';
import { API_BASE_URL } from './apiConfig';

export const socket = io(API_BASE_URL, {
  withCredentials: true,
});