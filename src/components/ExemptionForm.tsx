import React, { useState, useMemo } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Minus, Plus } from 'lucide-react'; // Icônes pour le stepper
import { compressImage, formatSize } from '../utils/image';

export const ExemptionForm = () => {
  // --- DONNÉES ---
  const allStudents = useLiveQuery(() => db.students.toArray());
  
  // Récupération des classes uniques et triées
  const classes = allStudents 
    ? [...new Set(allStudents.map(s => s.classe))].sort() 
    : [];

  // --- ÉTATS ---
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  
  // NOUVEAU : Gestion par Durée
  const [duration, setDuration] = useState<number>(1);
  
  const [type, setType] = useState<'full' | 'partial'>('full');
  const [sport, setSport] = useState('');
  
  // Fichier & Prévisualisation
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Blob réellement enregistré (image compressée, ou fichier original si PDF)
  const [compressed, setCompressed] = useState<Blob | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // --- LOGIQUE ---
  // Tri alphabétique des élèves. On copie avant de trier pour ne pas muter
  // le tableau renvoyé par useLiveQuery.
  const filteredStudents = [...(allStudents?.filter(s => s.classe === selectedClass) || [])]
    .sort((a, b) => a.lastName.localeCompare(b.lastName));

  // CALCUL AUTOMATIQUE DE LA DATE DE FIN.
  // Dérivée de startDate + duration : pas besoin d'un état séparé.
  const endDate = useMemo(() => {
    if (!startDate) return today;
    const start = new Date(startDate);
    // On ajoute (durée - 1) car si durée = 1 jour, début = fin
    start.setDate(start.getDate() + (duration - 1));
    return start.toISOString().split('T')[0];
  }, [startDate, duration, today]);

  // Gestion du fichier (Image ou PDF)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setIsCompressing(true);

    // On compresse les images avant stockage : une photo de téléphone
    // pèse plusieurs Mo et rendrait la sauvegarde JSON inexploitable.
    const blob = await compressImage(selected);
    setCompressed(blob);
    setIsCompressing(false);

    if (selected.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(blob));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!selectedStudentId) { alert("⚠️ Sélectionnez un élève !"); return; }
    
    try {
      await db.exemptions.add({
        studentId: Number(selectedStudentId),
        startDate, 
        endDate, // On enregistre la date calculée
        type,
        sport: type === 'partial' ? sport : undefined,
        photo: compressed || file || undefined,
        createdAt: new Date()
      });
      alert(`✅ Dispense de ${duration} jour(s) enregistrée !`);
      
      // Reset intelligent
      setSelectedStudentId(null);
      setFile(null);
      setCompressed(null);
      setPreviewUrl(null);
      setSport('');
      setType('full');
      setDuration(1); // Retour à 1 jour par défaut
    } catch (error) { console.error(error); }
  };

  return (
    <div className="form-container">
      <h2 style={{fontSize: '1.2rem', marginBottom: '15px', color: '#111827', textAlign: 'center'}}>
        Nouvelle Dispense
      </h2>
      
      <form onSubmit={handleSubmit}>
        
        {/* 1. SÉLECTEUR DE CLASSE (Scroll Horizontal) */}
        <div style={{marginBottom: '20px'}}>
          <label className="form-label">Classe :</label>
          <div className="class-selector">
            {classes.map(c => (
              <div 
                key={c} 
                className={`class-chip ${selectedClass === c ? 'active' : ''}`}
                onClick={() => { setSelectedClass(c); setSelectedStudentId(null); }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* 2. GRILLE DES ÉLÈVES (Responsive Grid) */}
        {selectedClass && (
          <div style={{marginBottom: '25px', animation: 'fadeIn 0.3s'}}>
            <label className="form-label">
              Élève ({filteredStudents.length}) :
            </label>
            
            {filteredStudents.length === 0 ? (
              <p style={{color:'#999', textAlign:'center', padding:'20px'}}>Aucun élève.</p>
            ) : (
              <div className="student-grid">
                {filteredStudents.map(s => (
                  <div 
                    key={s.id}
                    className={`student-card ${selectedStudentId === s.id ? 'selected' : ''}`}
                    onClick={() => setSelectedStudentId(s.id!)}
                  >
                    <strong>{s.lastName.toUpperCase()}</strong>
                    <small>{s.firstName}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. DÉTAILS (Apparaît si élève choisi) */}
        {selectedStudentId && (
          <div className="details-section" style={{animation: 'slideUp 0.3s'}}>
            
            {/* DATE DE DÉBUT */}
            <div style={{background: '#f9fafb', padding: '15px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '20px'}}>
              <label className="form-label">Date de début :</label>
              <input 
                type="date" 
                className="input-field" 
                value={startDate} 
                onChange={e => setStartDate(e.target.value)} 
                required 
              />

              {/* DURÉE : BOUTONS RAPIDES */}
              <label className="form-label" style={{marginTop: '15px'}}>Durée de la dispense :</label>
              <div style={{display: 'flex', gap: '8px', marginBottom: '10px'}}>
                {[1, 7, 14, 30].map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: duration === d ? '#2563eb' : 'white',
                      color: duration === d ? 'white' : '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    {d === 1 ? '1j' : `${d}j`}
                  </button>
                ))}
              </div>

              {/* DURÉE : STEPPER TACTILE (Gros boutons + / -) */}
              <div className="stepper-container">
                <button 
                  type="button" 
                  className="stepper-btn"
                  onClick={() => setDuration(prev => Math.max(1, prev - 1))}
                >
                  <Minus size={28} strokeWidth={3} />
                </button>

                <div className="stepper-value">
                  {duration} {duration > 1 ? 'Jours' : 'Jour'}
                </div>

                <button 
                  type="button" 
                  className="stepper-btn"
                  onClick={() => setDuration(prev => prev + 1)}
                >
                  <Plus size={28} strokeWidth={3} />
                </button>
              </div>

              {/* RAPPEL DATE DE FIN */}
              <div style={{textAlign: 'center', marginTop: '10px', color: '#4b5563', fontSize: '0.9rem'}}>
                Jusqu'au : <strong>{new Date(endDate).toLocaleDateString()}</strong> inclus
              </div>
            </div>

            {/* TYPE (Gros boutons tactiles) */}
            <div className="type-selector">
              <div 
                className={`type-btn ${type === 'full' ? 'active-red' : ''}`}
                onClick={() => setType('full')}
              >
                🔴 Inapte Total
              </div>
              <div 
                className={`type-btn ${type === 'partial' ? 'active-orange' : ''}`}
                onClick={() => setType('partial')}
              >
                🟠 Partiel
              </div>
            </div>

            {/* SPORT (Si partiel) */}
            {type === 'partial' && (
              <div style={{marginBottom: '15px', animation: 'fadeIn 0.2s'}}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Quel sport est interdit ? (ex: Acrosport)" 
                  value={sport}
                  onChange={e => setSport(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            {/* UPLOAD PHOTO/PDF */}
            <label className={`upload-zone ${file ? 'has-file' : ''}`}>
              <input 
                type="file" 
                accept="image/*,application/pdf" 
                onChange={handleFileChange}
                style={{display: 'none'}}
              />
              
              {!file && (
                <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'5px'}}>
                  <span style={{fontSize:'1.5rem'}}>📷</span>
                  <span>Ajouter une photo ou un PDF</span>
                </div>
              )}

              {file && (
                <div style={{display:'flex', alignItems:'center', gap:'10px', width: '100%'}}>
                  {/* Aperçu */}
                  {previewUrl ? (
                    <img src={previewUrl} alt="Aperçu" style={{width:'50px', height:'50px', objectFit:'cover', borderRadius:'6px'}} />
                  ) : (
                    <span style={{fontSize:'2rem'}}>📄</span>
                  )}
                  <div style={{flex: 1, overflow:'hidden', textAlign:'left'}}>
                    <strong style={{display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                      {file.name}
                    </strong>
                    <small style={{color:'#6b7280'}}>
                      {isCompressing
                        ? 'Optimisation…'
                        : compressed && compressed.size < file.size
                          ? `${formatSize(file.size)} → ${formatSize(compressed.size)} (optimisé)`
                          : formatSize(file.size)}
                    </small>
                  </div>
                  <span style={{color: '#16a34a', fontSize:'1.2rem', fontWeight: 'bold'}}>
                    {isCompressing ? '⏳' : '✓'}
                  </span>
                </div>
              )}
            </label>

            {/* BOUTON VALIDATION */}
            <button type="submit" className="btn validate-btn" disabled={isCompressing}>
              {isCompressing ? 'Optimisation du justificatif…' : 'Valider la dispense'}
            </button>
          </div>
        )}

      </form>
    </div>
  );
};