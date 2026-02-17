"use client";

interface Tab {
  key: string;
  label: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export function TabNavigation({ tabs, activeTab, onTabChange }: TabNavigationProps) {
  return (
    <div className="border-b border-border">
      <nav className="flex gap-1 -mb-px" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`
                relative px-4 py-2.5 text-sm font-medium transition-colors duration-200
                ${isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
                }
              `}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full transition-all duration-200" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
