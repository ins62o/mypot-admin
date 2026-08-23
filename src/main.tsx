import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { AppUpdateWebView } from './AppUpdateWebView';
import { MaintenanceWebView } from './MaintenanceWebView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const pathname = window.location.pathname.replace(/\/+$/, '');
const isAppUpdatePath =
  pathname === '/app-update' || pathname === '/app-update/index.html';
const isMaintenancePath =
  pathname === '/maintenance' || pathname === '/maintenance/index.html';
const Root = isAppUpdatePath
  ? AppUpdateWebView
  : isMaintenancePath
    ? MaintenanceWebView
    : App;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Root />
    </QueryClientProvider>
  </React.StrictMode>,
);
