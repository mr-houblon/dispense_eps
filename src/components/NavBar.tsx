import { LayoutDashboard, PlusCircle, List, Settings } from 'lucide-react';

interface NavBarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
}

export const NavBar = ({ currentTab, onTabChange }: NavBarProps) => {
  
  // La liste des onglets
  const tabs = [
    { id: 'home', label: 'Aujourd\'hui', icon: LayoutDashboard },
    { id: 'add', label: 'Nouveau', icon: PlusCircle },
    { id: 'list', label: 'Historique', icon: List },
    { id: 'admin', label: 'Réglages', icon: Settings },
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '100%',
      backgroundColor: 'white',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '10px 0',
      zIndex: 1000, // Pour rester au-dessus du reste
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
    }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              color: isActive ? '#2563eb' : '#9ca3af', // Bleu si actif, Gris sinon
              cursor: 'pointer',
              flex: 1
            }}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span style={{
              fontSize: '0.7rem', 
              marginTop: '4px', 
              fontWeight: isActive ? 'bold' : 'normal'
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};