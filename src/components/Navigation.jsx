import { Network, ScrollText, Activity, ListChecks } from 'lucide-react';
import { Badge } from './ui/badge';

function Navigation({ currentView, onViewChange, problematicRoutesCount, runningProcessesCount }) {
  const navItems = [
    { id: 'connection', label: 'Connection', icon: Network },
    { id: 'logs', label: 'Logs', icon: ScrollText },
    { id: 'diagnostics', label: 'Diagnostics', icon: Activity, badge: problematicRoutesCount },
    { id: 'processes', label: 'Processes', icon: ListChecks, badge: runningProcessesCount },
  ];

  return (
    <nav className="border-b bg-muted/30">
      <div className="px-6 flex gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`
                flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                ${isActive
                  ? 'border-primary text-primary font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.badge > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default Navigation;
