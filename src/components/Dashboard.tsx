import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { JustificatifViewer } from './JustificatifViewer';

export const Dashboard = () => {
  const today = new Date().toISOString().split('T')[0];
  
  // On récupère les dispenses actives (Date de fin >= Aujourd'hui)
  const activeExemptions = useLiveQuery(async () => {
    const all = await db.exemptions.toArray();
    const active = all.filter(ex => ex.endDate >= today);
    
    // On doit récupérer les infos des élèves pour chaque dispense
    const enriched = await Promise.all(active.map(async (ex) => {
      const student = await db.students.get(ex.studentId);
      return { ...ex, student };
    }));
    
    // Tri par date de fin (les plus urgentes en premier)
    return enriched.sort((a, b) => a.endDate.localeCompare(b.endDate));
  });

  // FONCTION CALCUL JOURS RESTANTS
  const getDaysRemaining = (endDateStr: string) => {
    const end = new Date(endDateStr);
    const now = new Date(today); // On compare à la date du jour (sans heure)
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Dernier jour !";
    return `Reste ${diffDays}j`;
  };

  const activeCount = activeExemptions?.length || 0;

  return (
    <div>
      {/* HEADER RÉCAPITULATIF */}
      <div 
        className="card" 
        style={{
          backgroundColor: '#2563eb', 
          color: 'white', 
          textAlign: 'center',
          marginBottom: '20px'
        }}
      >
        <h2 style={{margin: 0, color: 'white', fontSize: '1.5rem'}}>
          📅 Aujourd'hui
        </h2>
        <div style={{fontSize: '3rem', fontWeight: 'bold', margin: '10px 0'}}>
          {activeCount}
        </div>
        <div style={{fontSize: '1rem', opacity: 0.9}}>
          Élève{activeCount > 1 ? 's' : ''} dispensé{activeCount > 1 ? 's' : ''}
        </div>
      </div>

      {/* LISTE DÉTAILLÉE */}
      <h3 style={{marginLeft: '5px', marginBottom: '15px'}}>En cours :</h3>

      {!activeExemptions || activeExemptions.length === 0 ? (
        <div style={{textAlign: 'center', color: '#6b7280', padding: '40px'}}>
          ✅ Tout le monde est apte !
        </div>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {activeExemptions.map(ex => (
            <div key={ex.id} className="card" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px'}}>
              
              {/* GAUCHE : IDENTITÉ */}
              <div>
                <div style={{fontWeight: '800', fontSize: '1.1rem', color: '#111827'}}>
                  {ex.student?.lastName.toUpperCase()} {ex.student?.firstName}
                </div>
                <div style={{color: '#6b7280', fontSize: '0.9rem', marginBottom: '5px'}}>
                  {ex.student?.classe}
                </div>
                
                {/* Badge Type */}
                <span style={{
                  backgroundColor: ex.type === 'full' ? '#fee2e2' : '#ffedd5',
                  color: ex.type === 'full' ? '#dc2626' : '#c2410c',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  display: 'inline-block'
                }}>
                  {ex.type === 'full' ? 'INAPTE TOTAL' : `PARTIEL (${ex.sport})`}
                </span>

                {/* Justificatif : consultable d'un clic, et repérable
                    d'un coup d'œil quand il manque. */}
                <div style={{marginTop: '8px'}}>
                  {ex.photo ? (
                    <JustificatifViewer photo={ex.photo} compact />
                  ) : (
                    <span style={{fontSize: '0.7rem', color: '#f59e0b', fontWeight: 'bold'}}>
                      ⚠️ Sans justificatif
                    </span>
                  )}
                </div>
              </div>

              {/* DROITE : COMPTE À REBOURS */}
              <div style={{textAlign: 'right'}}>
                <div style={{
                  fontSize: '0.9rem', 
                  fontWeight: 'bold', 
                  color: '#2563eb',
                  backgroundColor: '#eff6ff',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe'
                }}>
                  {getDaysRemaining(ex.endDate)}
                </div>
                <div style={{fontSize: '0.7rem', color: '#9ca3af', marginTop: '5px'}}>
                  Jusqu'au {new Date(ex.endDate).toLocaleDateString()}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};