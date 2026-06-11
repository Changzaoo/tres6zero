const DEFAULT_API_URL = 'https://six3-m0wr.onrender.com';

export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
