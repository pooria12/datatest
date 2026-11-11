import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '@components/layout/Layout';
import { Dashboard } from '@pages/Dashboard';
import { Upload } from '@pages/Upload';
import { Preview } from '@pages/Preview';
import { Quality } from '@pages/Quality';
import { FeatureAnalysis } from '@pages/FeatureAnalysis';
import { AIInsights } from '@pages/AIInsights';
import { Cleaning } from '@pages/Cleaning';
import { Settings } from '@pages/Settings';
import { NotFound } from '@pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'upload', element: <Upload /> },
      { path: 'preview', element: <Preview /> },
      { path: 'quality', element: <Quality /> },
      { path: 'analysis', element: <FeatureAnalysis /> },
      { path: 'insights', element: <AIInsights /> },
      { path: 'cleaning', element: <Cleaning /> },
      { path: 'settings', element: <Settings /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);