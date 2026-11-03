import { ThemeProvider } from '@presentation/blocs/ThemeContext.jsx';
import { ToastProvider } from '@presentation/blocs/ToastContext.jsx';
import { AuthProvider } from '@presentation/blocs/AuthContext.jsx';
import { DataProvider } from '@presentation/blocs/DataContext.jsx';

/** Proveedores globales de la aplicacion (tema, avisos, sesion y datos). */
export default function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <DataProvider>
          <AuthProvider>{children}</AuthProvider>
        </DataProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
