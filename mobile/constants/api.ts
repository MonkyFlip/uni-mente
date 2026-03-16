import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

export const API_URL = extra.API_URL;
export const API_REST_URL = extra.API_REST_URL;
