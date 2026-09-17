import AppProviders from '@app/providers/AppProviders.jsx';
import AppRoutes from '@app/routes/AppRoutes.jsx';
import Splash from '@shared/components/Splash.jsx';

export default function App() {
  return (
    <AppProviders>
      <Splash />
      <AppRoutes />
    </AppProviders>
  );
}
