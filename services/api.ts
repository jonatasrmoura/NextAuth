import axios, { AxiosError } from "axios";
import { GetServerSidePropsContext } from "next";
import { parseCookies, setCookie } from 'nookies';
import { signOut } from "../contexts/AuthContext";
import { AuthTokenError } from "./errors/AuthTokenError";

type Context = undefined | GetServerSidePropsContext;
type ApiErrorProps = {
  code: string
};

let isRefreshing = false;
let failedRequestQueue: any[] = [];

export function setupApiClient(ctx: Context = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: 'http://localhost:3333',
    headers: {
      Authorization: `Bearer ${cookies['nextauth.token']}`,
    }
  });
  
  api.interceptors.response.use((response) => {
    return response;
  }, (error: AxiosError<ApiErrorProps>) => {
    if (error.response?.status === 401) {
      if (error.response.data?.code === 'token.expired') {
        // renovar o token
  
        cookies = parseCookies(ctx);
  
        const { 'nextauth.refreshToken': refreshToken } = cookies;
        const originalConfig = error.config;
  
        if (!isRefreshing) {
          isRefreshing = true;

          console.log('refresh');
  
          api.post('/refresh', {
            refreshToken,
          }).then((response) => {
            const { token } = response.data;
    
            setCookie(ctx, 'nextauth.token', token, {
              maxAge: 60 * 60 * 24 * 30, // 30 days
              path: '/',
            });
      
            setCookie(ctx, 'nextauth.refreshToken', response.data.refreshToken, {
              maxAge: 60 * 60 * 24 * 30, // 30 days
              path: '/',
            });
    
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  
            failedRequestQueue.forEach((response) => response.onSuccess(token));
            failedRequestQueue = [];
          }).catch((err) => {
            failedRequestQueue.forEach((response) => response.onFailure(err));
            failedRequestQueue = [];
  
            if(process.browser) {
              signOut();
            }
          }).finally(() => {
            isRefreshing = false;
          });
        }
  
        return new Promise((resolve, reject) => {
          failedRequestQueue.push({
            onSuccess: (token: string) => {
              if(!originalConfig.headers) {
                return reject('Configura????o original n??o encontrada!');
              }
  
              originalConfig.headers['Authorization'] = `Bearer ${token}`;
  
              resolve(api(originalConfig));
            },
            onFailure: (err: AxiosError) => {
              reject(err);
            },
          });
        });
      } else {
        // deslogar o usu??rio
        if(process.browser) {
          signOut();
        } else {
          return Promise.reject(new AuthTokenError());
        }
      }
    }
  
    return Promise.reject(error);
  });

  return api;
}
