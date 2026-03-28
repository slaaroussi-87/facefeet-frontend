import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://facefeet-backend.onrender.com';

function Dashboard() {
  const [ventes, setVentes] = useState([]);
  const [alertesStock, setAlertesStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ventesRes, alertesRes] = await Promise.all([
        axios.get(`${API}/ventes/`),
        axios.get(`${API}/stock/alertes`),
      ]);
      setVentes(ventesRes.data);
      setAlertesStock(alertesRes.data);
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

  const produitsQte = {};
  ventes.forEach((v) => {
    (v.lignes_vente || []).forEach((l) => {
      const nom = l.nom_produit || '—';
      if (!produitsQte[nom]) produitsQte[nom] = 0;
      produitsQte[nom] += l.quantite || 0;
    });
  });
  const top5 = Object.entries(produitsQte)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

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

      {/* Alertes stock */}
      {alertesStock.length > 0 && (
        <div className="dash-alertes-stock">
          <div className="dash-alertes-header">
            <span className="dash-alertes-titre">Stock faible</span>
            <span className="dash-alertes-count">{alertesStock.length} produit{alertesStock.length > 1 ? 's' : ''}</span>
          </div>
          <div className="dash-alertes-liste">
            {alertesStock.map((p) => {
              const stock = p.stock ?? 0;
              const seuil = p.seuil_alerte ?? 5;
              const pct = seuil > 0 ? Math.min(Math.round((stock / seuil) * 100), 100) : 0;
              const critique = stock === 0;
              return (
                <div key={p.id} className="dash-alerte-item">
                  <div className="dash-alerte-top">
                    <span className="dash-alerte-nom">{p.nom}</span>
                    <span className={`dash-alerte-qty ${critique ? 'critique' : ''}`}>
                      {critique ? 'Rupture' : `${stock} unité${stock > 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div className="dash-alerte-bar-bg">
                    <div
                      className="dash-alerte-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background: critique ? '#e74c3c' : '#f39c12',
                      }}
                    />
                  </div>
                  <div className="dash-alerte-seuil">seuil : {seuil}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Graphiques côte à côte */}
      <div className="charts-grid">

      {/* Graphique CA par jour */}
      {Object.keys(ventesParDate).length > 0 && (() => {
        const jours = Object.entries(ventesParDate)
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-14);
        const maxCA = Math.max(...jours.map(([, d]) => d.total));
        return (
          <div className="section-card" style={{ marginBottom: 20 }}>
            <h2>📈 CA par jour</h2>
            <div className="chart-bars">
              {jours.map(([date, data]) => {
                const hauteur = maxCA > 0 ? Math.round((data.total / maxCA) * 80) : 0;
                const isToday = date === today;
                return (
                  <div key={date} className="chart-col">
                    <div className="chart-value">{data.total.toFixed(0)} DH</div>
                    <div className="chart-bar-wrap">
                      <div
                        className="chart-bar"
                        style={{
                          height: hauteur,
                          background: isToday ? '#27ae60' : '#7ab07e',
                        }}
                      />
                    </div>
                    <div className="chart-label">{date.slice(5)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Graphique Top 5 produits */}
      {top5.length > 0 && (
        <div className="section-card" style={{ marginBottom: 20 }}>
          <h2>🏆 Top 5 produits vendus</h2>
          <div className="top5-bars">
            {top5.map(([nom, qte], i) => {
              const maxQte = top5[0][1];
              const largeur = Math.round((qte / maxQte) * 100);
              const couleurs = ['#27ae60', '#7ab07e', '#95c49a', '#b0d4b4', '#cce4ce'];
              return (
                <div key={nom} className="top5-row">
                  <div className="top5-label">
                    <span className="top5-rank">#{i + 1}</span>
                    <span className="top5-nom">{nom}</span>
                  </div>
                  <div className="top5-bar-wrap">
                    <div
                      className="top5-bar"
                      style={{ width: `${largeur}%`, background: couleurs[i] }}
                    />
                    <span className="top5-qte">{qte} unité{qte > 1 ? 's' : ''}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      </div>{/* fin charts-grid */}

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