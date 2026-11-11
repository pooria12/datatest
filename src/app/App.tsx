import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { ToastProvider } from '@components/ui/Toast';
import { DatasetProvider } from '@/context/DatasetProvider';

export function App() {
  return (
    <ToastProvider>
      <DatasetProvider>
        <RouterProvider router={router} />
      </DatasetProvider>
    </ToastProvider>
  );
}
