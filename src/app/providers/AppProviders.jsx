import { ThemeProvider } from '@shared/context/ThemeContext.jsx';
import { ToastProvider } from '@shared/context/ToastContext.jsx';
import { AuthProvider } from '@shared/context/AuthContext.jsx';
import { DataProvider } from '@shared/context/DataContext.jsx';

/** Proveedores globales de la aplicacion (tema, avisos, sesion y datos). */
export default function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <DataProvider>{children}</DataProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
