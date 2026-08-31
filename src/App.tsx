import { PinSettings } from './components/PinSettings';
import { useState, useMemo } from 'react';
import { db } from './db';
import { useLiveQuery } from 'dexie-react-hooks';

// Composants
import { AuthGuard } from './components/AuthGuard';
import { NavBar } from './components/NavBar'; // <--- NOUVEAU

// Vues (Pages)
import { Dashboard } from './components/Dashboard';
import { ExemptionForm } from './components/ExemptionForm';
import { ExemptionList } from './components/ExemptionList';
import { StudentImporter } from './components/StudentImporter';
import { ReportGenerator } from './components/ReportGenerator';
import { BackupManager } from './components/BackupManager';
import { PrivacyPanel } from './components/PrivacyPanel';

import './App.css';

function App() {
  const studentCount = useLiveQuery(() => db.students.count());
  
  // État de navigation (Par défaut sur 'home')
  const [activeTab, setActiveTab] = useState('home');

  // Vérification de la sauvegarde (Logic 7 jours).
  // Simple dérivation : inutile de passer par un état + effet.
  // Le recalcul au changement d'onglet est volontaire : il relit
  // localStorage après un retour de l'écran Réglages, où l'utilisateur
  // vient peut-être d'effectuer sa sauvegarde.
  const needsBackup = useMemo(() => {
    if (activeTab === 'admin') return false; // déjà sur l'écran concerné
    if (!studentCount || studentCount === 0) return false;
    const lastBackup = localStorage.getItem('eps-last-backup');
    if (!lastBackup) return true;
    const diffDays = Math.ceil(
      Math.abs(new Date().getTime() - new Date(lastBackup).getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays > 7;
  }, [studentCount, activeTab]);

  // Si aucun élève, on bascule sur l'écran Admin (Import).
  // Ajustement d'état pendant le rendu : le motif recommandé par React
  // pour réagir au changement d'une valeur externe sans effet.
  const [prevCount, setPrevCount] = useState(studentCount);
  if (studentCount !== prevCount) {
    setPrevCount(studentCount);
    if (studentCount === 0) setActiveTab('admin');
  }

  return (
    <AuthGuard>
      <div className="container" style={{ paddingBottom: '80px' }}> 
        {/* paddingBottom important pour ne pas cacher le contenu derrière la barre */}

        {/* --- HEADER --- */}
        <header style={{marginBottom: '20px', textAlign: 'center'}}>
          <h1 style={{color: '#2563eb', margin: 0, fontSize: '1.2rem'}}>EPS Tracker</h1>
        </header>

        {/* --- ALERTE SAUVEGARDE --- */}
        {needsBackup && (
          <div 
            onClick={() => setActiveTab('admin')}
            style={{
              backgroundColor: '#fff7ed', border: '1px solid #f97316', color: '#c2410c',
              padding: '10px', borderRadius: '8px', marginBottom: '20px', cursor: 'pointer',
              fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between'
            }}
          >
            <span>⚠️ Sauvegarde requise !</span>
            <strong>Aller →</strong>
          </div>
        )}

        {/* --- LE CONTENU (Change selon l'onglet) --- */}
        
        {activeTab === 'home' && (
          <div style={{animation: 'fadeIn 0.3s'}}>
            <Dashboard />
            <div style={{marginTop: '20px', textAlign: 'center', color: '#666', fontSize: '0.9rem'}}>
              <em>Sélectionnez "Nouveau" en bas pour ajouter une dispense.</em>
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <div style={{animation: 'fadeIn 0.3s'}}>
            <ExemptionForm />
          </div>
        )}

        {activeTab === 'list' && (
          <div style={{animation: 'fadeIn 0.3s'}}>
            <ExemptionList />
          </div>
        )}

       {activeTab === 'admin' && (
          <div style={{animation: 'fadeIn 0.3s'}}>
            <h2 style={{borderBottom: '2px solid #eee', paddingBottom: '10px'}}>Réglages</h2>
            
            {/* 1. Gestion du Code PIN (Nouveau) */}
            <PinSettings />
            <div style={{height: '20px'}}></div>

            {/* 2. Sauvegardes */}
            <BackupManager />
            <div style={{height: '20px'}}></div>

            {/* 3. Imports */}
            <StudentImporter />
            <div style={{height: '20px'}}></div>
            
            {/* 4. Rapports */}
            <ReportGenerator />
            <div style={{height: '20px'}}></div>

            {/* 5. Confidentialité & conservation des données */}
            <PrivacyPanel />
            
            <div style={{height: '40px'}}></div>
            <p style={{textAlign: 'center', color: '#ccc', fontSize: '0.7rem'}}>v1.7 — Dispenses stockées sur l’appareil</p>
          </div>
        )}

      </div>

      {/* --- BARRE DE NAVIGATION (Toujours visible) --- */}
      <NavBar currentTab={activeTab} onTabChange={setActiveTab} />
      
    </AuthGuard>
  );
}

export default App;