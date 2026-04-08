import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API from '../config';

function Stock() {
  const [produits, setProduits] = useState([]);
  const [alertes, setAlertes] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [editSeuil, setEditSeuil] = useState('');
  const [editStockId, setEditStockId] = useState(null);
  const [editStockVal, setEditStockVal] = useState('');
  const [message, setMessage] = useState(null);
  const intervalRef = useRef(null);

  const showMessage = (type, texte) => {
    setMessage({ type, texte });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchData = async () => {
    try {
      const [stockRes, alertesRes, mouvRes] = await Promise.all([
        axios.get(`${API}/stock/`),
        axios.get(`${API}/stock/alertes`),
        axios.get(`${API}/stock/mouvements`),
      ]);
      setProduits(stockRes.data);
      setAlertes(alertesRes.data);
      setMouvements(mouvRes.data);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(fetchData, 30000);
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    fetchData();
    startPolling();

    // Pause le polling quand l'onglet est caché (fix 17)
    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchData();
        startPolling();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // ── Ajustement +/- via POST /stock/mouvement (fix 11 : trace dans l'historique)
  const ajusterStock = async (produit, delta) => {
    const nouveauStock = (produit.stock ?? 0) + delta;
    if (nouveauStock < 0) return;
    try {
      const type = delta > 0 ? 'entree' : 'sortie';
      const res = await axios.post(`${API}/stock/mouvement`, {
        produit_id: produit.id,
        type,
        quantite: Math.abs(delta),
        motif: 'Ajustement manuel',
      });
      const stockApres = res.data.nouveau_stock;

      setProduits(prev =>
        prev.map(p => p.id === produit.id ? { ...p, stock: stockApres } : p)
      );
      const seuil = produit.seuil_alerte ?? 5;
      if (stockApres <= seuil) {
        setAlertes(prev => {
          const dejaDedans = prev.some(a => a.id === produit.id);
          if (dejaDedans) return prev.map(a => a.id === produit.id ? { ...a, stock: stockApres } : a);
          return [...prev, { ...produit, stock: stockApres }];
        });
      } else {
        setAlertes(prev => prev.filter(a => a.id !== produit.id));
      }
      // Rafraîchir l'historique des mouvements
      const mouvRes = await axios.get(`${API}/stock/mouvements`);
      setMouvements(mouvRes.data);
    } catch (err) {
      showMessage('erreur', err.response?.data?.detail || 'Erreur lors de l\'ajustement du stock.');
    }
  };

  const saveStock = async (produit) => {
    const val = parseInt(editStockVal);
    if (isNaN(val) || val < 0) { setEditStockId(null); return; }
    try {
      const stockActuel = produit.stock ?? 0;
      const delta = val - stockActuel;
      if (delta !== 0) {
        const type = delta > 0 ? 'entree' : 'sortie';
        await axios.post(`${API}/stock/mouvement`, {
          produit_id: produit.id,
          type,
          quantite: Math.abs(delta),
          motif: 'Saisie directe',
        });
      } else {
        await axios.put(`${API}/stock/${produit.id}`, {
          stock: val,
          seuil_alerte: produit.seuil_alerte ?? 5,
        });
      }
      const seuil = produit.seuil_alerte ?? 5;
      setProduits(prev =>
        prev.map(p => p.id === produit.id ? { ...p, stock: val } : p)
      );
      if (val <= seuil) {
        setAlertes(prev => {
          const dejaDedans = prev.some(a => a.id === produit.id);
          if (dejaDedans) return prev.map(a => a.id === produit.id ? { ...a, stock: val } : a);
          return [...prev, { ...produit, stock: val }];
        });
      } else {
        setAlertes(prev => prev.filter(a => a.id !== produit.id));
      }
      const mouvRes = await axios.get(`${API}/stock/mouvements`);
      setMouvements(mouvRes.data);
    } catch (err) {
      showMessage('erreur', err.response?.data?.detail || 'Erreur lors de la sauvegarde du stock.');
    } finally {
      setEditStockId(null);
    }
  };

  const saveSeuil = async (produit) => {
    const val = parseInt(editSeuil);
    if (isNaN(val) || val < 0) { setEditId(null); return; }
    try {
      await axios.put(`${API}/stock/${produit.id}`, {
        stock: produit.stock ?? 0,
        seuil_alerte: val,
      });
      setEditId(null);
      fetchData();
    } catch (err) {
      showMessage('erreur', 'Erreur lors de la mise à jour du seuil.');
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Gestion du Stock</h1>
        <span style={{ fontSize: '0.9rem', color: '#888' }}>
          {produits.length} produit{produits.length > 1 ? 's' : ''}
        </span>
      </div>

      {message && (
        <div className={`vente-message vente-${message.type}`}>{message.texte}</div>
      )}

      {/* Alertes */}
      {alertes.length > 0 && (
        <div className="stock-alertes">
          <div className="stock-alertes-titre">
            ⚠️ Stock faible — {alertes.length} produit{alertes.length > 1 ? 's' : ''} à réapprovisionner
          </div>
          <div className="alertes-grid">
            {alertes.map((p) => (
              <div key={p.id} className="alerte-card">
                <div className="alerte-nom">{p.nom}</div>
                <div className="alerte-cat">{p.categories?.nom || '—'}</div>
                <div className="alerte-stock">
                  {p.stock ?? 0} unité{(p.stock ?? 0) > 1 ? 's' : ''} restante{(p.stock ?? 0) > 1 ? 's' : ''}
                </div>
                <div className="alerte-seuil">seuil : {p.seuil_alerte ?? 5}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventaire */}
      <div className="section-card" style={{ marginBottom: 20 }}>
        <h2>Inventaire</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Produit</th>
                <th>Catégorie</th>
                <th>Stock actuel</th>
                <th>Seuil alerte</th>
                <th>Statut</th>
                <th>Ajuster</th>
              </tr>
            </thead>
            <tbody>
              {produits.map((p) => {
                const stock = p.stock ?? 0;
                const seuil = p.seuil_alerte ?? 5;
                const ok = stock > seuil;
                return (
                  <tr key={p.id}>
                    <td><strong>{p.nom}</strong></td>
                    <td><span className="badge">{p.categories?.nom || '—'}</span></td>
                    <td style={{ fontWeight: 700, fontSize: '1.05rem' }}>{stock}</td>
                    <td>
                      {editId === p.id ? (
                        <span className="seuil-edit-row">
                          <input
                            type="number"
                            value={editSeuil}
                            onChange={(e) => setEditSeuil(e.target.value)}
                            className="seuil-input"
                          />
                          <button className="btn-primary" style={{ padding: '3px 10px', fontSize: '0.8rem' }} onClick={() => saveSeuil(p)}>✓</button>
                          <button className="btn-delete" onClick={() => setEditId(null)}>✕</button>
                        </span>
                      ) : (
                        <span
                          className="seuil-value"
                          onClick={() => { setEditId(p.id); setEditSeuil(seuil); }}
                          title="Cliquer pour modifier"
                        >
                          {seuil} <span className="edit-hint">✎</span>
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`stock-badge ${ok ? 'stock-ok' : 'stock-low'}`}>
                        {ok ? '● OK' : '● Faible'}
                      </span>
                    </td>
                    <td>
                      <div className="stock-controls">
                        <button
                          className="btn-stock-minus"
                          onClick={() => ajusterStock(p, -1)}
                          disabled={stock === 0}
                          title="Retirer 1"
                        >−</button>
                        {editStockId === p.id ? (
                          <input
                            className="stock-input"
                            type="number"
                            min="0"
                            value={editStockVal}
                            autoFocus
                            onChange={(e) => setEditStockVal(e.target.value)}
                            onBlur={() => saveStock(p)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveStock(p);
                              if (e.key === 'Escape') setEditStockId(null);
                            }}
                          />
                        ) : (
                          <span
                            className="stock-qty stock-qty-editable"
                            onClick={() => { setEditStockId(p.id); setEditStockVal(stock); }}
                            title="Cliquer pour saisir manuellement"
                          >{stock}</span>
                        )}
                        <button
                          className="btn-stock-plus"
                          onClick={() => ajusterStock(p, +1)}
                          title="Ajouter 1"
                        >+</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historique mouvements */}
      <div className="section-card">
        <h2>Historique des mouvements</h2>
        {mouvements.length === 0 ? (
          <p className="panier-vide">Aucun mouvement enregistré</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Heure</th>
                  <th>Produit</th>
                  <th>Type</th>
                  <th>Quantité</th>
                  <th>Motif</th>
                </tr>
              </thead>
              <tbody>
                {mouvements.map((m) => (
                  <tr key={m.id}>
                    <td>{m.date}</td>
                    <td>{m.heure}</td>
                    <td>{m.produits?.nom || '—'}</td>
                    <td>
                      <span className={`stock-badge ${m.type === 'entree' ? 'stock-ok' : 'stock-low'}`}>
                        {m.type === 'entree' ? '▲ Entrée' : '▼ Sortie'}
                      </span>
                    </td>
                    <td>{m.quantite}</td>
                    <td style={{ color: '#666' }}>{m.motif || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Stock;
