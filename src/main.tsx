import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppUpdateWebView } from './AppUpdateWebView';
import { MaintenanceWebView } from './MaintenanceWebView';

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
    <Root />
  </React.StrictMode>,
);
