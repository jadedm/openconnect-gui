import { X } from 'lucide-react';
import { Button } from './ui/button';

function Alert({ alert, hideAlert }) {
  if (!alert.show) return null;

  const bgColor = alert.type === 'error'
    ? 'bg-destructive text-destructive-foreground'
    : alert.type === 'success'
    ? 'bg-primary text-primary-foreground'
    : 'bg-secondary text-secondary-foreground';

  return (
    <div className={`fixed bottom-6 right-6 flex items-center gap-2 rounded-md px-4 py-3 shadow-lg ${bgColor}`}>
      <span className="text-sm">{alert.message}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={hideAlert}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default Alert;
