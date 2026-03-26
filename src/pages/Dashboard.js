import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'http://127.0.0.1:8000';

function Dashboard() {
  const [ventes, setVentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await axios.get(`${API}/ventes/`);
      setVentes(res.data);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportJournee = () => {
    const today = new Date().toISOString().split('T')[0];
    window.open(`${API}/export/jour/${today}`, '_blank');
  };

  const exportMois = () => {
    const today = new Date().toISOString().split('T')[0];
    const mois = today.slice(0, 7);
    window.open(`${API}/export/mois/${mois}`, '_blank');
  };

  const reinitialiserVentes = async () => {
    if (window.confirm('⚠️ Supprimer TOUTES les ventes de test ? Cette action est irréversible.')) {
      try {
        await axios.delete(`${API}/ventes/`);
        fetchData();
        alert('Ventes réinitialisées !');
      } catch (err) {
        console.error('Erreur:', err);
        alert('Erreur lors de la réinitialisation');
      }
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  const today = new Date().toISOString().split('T')[0];
  const currentMonth = today.slice(0, 7);

  const ventesAujourdhui = ventes.filter((v) => v.date === today);
  const ventesCeMois = ventes.filter((v) => v.date && v.date.startsWith(currentMonth));

  const caAujourdhui = ventesAujourdhui.reduce((sum, v) => sum + (v.total_net || 0), 0);
  const caMois = ventesCeMois.reduce((sum, v) => sum + (v.total_net || 0), 0);
  const caTotal = ventes.reduce((sum, v) => sum + (v.total_net || 0), 0);

  const ventesParDate = {};
  ventes.forEach((v) => {
    const date = v.date || 'Sans date';
    if (!ventesParDate[date]) ventesParDate[date] = { count: 0, total: 0 };
    ventesParDate[date].count += 1;
    ventesParDate[date].total += v.total_net || 0;
  });

  const dernieresVentes = [...ventes]
    .sort((a, b) => {
      const dateA = `${a.date || ''} ${a.heure || ''}`;
      const dateB = `${b.date || ''} ${b.heure || ''}`;
      return dateB.localeCompare(dateA);
    })
    .slice(0, 10);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Tableau de bord</h1>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
          <button className="btn-primary" onClick={exportJournee}>
            📥 Export journée
          </button>
          <button className="btn-primary" onClick={exportMois} style={{background: '#4a7a4e'}}>
            📊 Export mois
          </button>
          <button className="btn-danger" onClick={reinitialiserVentes}>
            🗑️ Réinitialiser
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🧾</div>
          <div className="stat-value">{ventesAujourdhui.length}</div>
          <div className="stat-label">Ventes aujourd'hui</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💵</div>
          <div className="stat-value">{caAujourdhui.toFixed(2)} DH</div>
          <div className="stat-label">CA aujourd'hui</div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-icon">📅</div>
          <div className="stat-value">{caMois.toFixed(2)} DH</div>
          <div className="stat-label">CA ce mois</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-value">{caTotal.toFixed(2)} DH</div>
          <div className="stat-label">CA total</div>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="section-card">
          <h2>Détail des ventes</h2>
          {dernieresVentes.length === 0 ? (
            <p className="panier-vide">Aucune vente enregistrée</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>N° Vente</th>
                  <th>Date</th>
                  <th>Article</th>
                  <th>Qté</th>
                  <th>Prix unit.</th>
                  <th>Total ligne</th>
                </tr>
              </thead>
              <tbody>
                {dernieresVentes.flatMap((v, index) =>
                  (v.lignes_vente || []).map((l, i) => (
                    <tr key={`${v.id}-${i}`} style={i === 0 ? {borderTop: '3px solid #7ab07e'} : {}}>
                      <td>{i === 0 ? `V-${String(index + 1).padStart(3, '0')}` : ''}</td>
                      <td>{i === 0 ? v.date : ''}</td>
                      <td>{l.nom_produit || l.produits?.nom || '—'}</td>
                      <td>{l.quantite}</td>
                      <td>{l.prix_vente} DH</td>
                      <td className="prix-vente">{(l.prix_vente * l.quantite).toFixed(2)} DH</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="section-card">
          <h2>Ventes par jour</h2>
          {Object.keys(ventesParDate).length === 0 ? (
            <p className="panier-vide">Aucune vente enregistrée</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Nb ventes</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(ventesParDate)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([date, data]) => (
                    <tr key={date}>
                      <td>{date}</td>
                      <td>{data.count}</td>
                      <td className="prix-vente">{data.total.toFixed(2)} DH</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;