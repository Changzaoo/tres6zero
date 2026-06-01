const DEFAULT_API_URL = 'https://tres6zero.onrender.com';

export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
