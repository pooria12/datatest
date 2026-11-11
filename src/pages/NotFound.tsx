import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '@components/common/EmptyState';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <EmptyState
      icon={<Compass className="h-8 w-8 text-muted-foreground" />}
      title="Page not found"
      description="The page you are looking for does not exist or has been moved."
      action={{ label: 'Back to Dashboard', onClick: () => navigate('/') }}
    />
  );
}
