import AppProviders from '@presentation/blocs/AppProviders.jsx';
import AppRoutes from '@presentation/routes/AppRoutes.jsx';
import Splash from '@core/widgets/Splash.jsx';

export default function App() {
  return (
    <AppProviders>
      <Splash />
      <AppRoutes />
    </AppProviders>
  );
}
