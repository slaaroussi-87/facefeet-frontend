import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API from '../config';

const PAGE_SIZE = 15;

function Ventes() {
  const [produits, setProduits] = useState([]);
  const [ventes, setVentes] = useState([]);
  const [panier, setPanier] = useState([]);
  const [remise, setRemise] = useState(0);
  const [selectedProduit, setSelectedProduit] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null); // { type: 'succes'|'erreur'|'warning', texte }
  const [stockWarnings, setStockWarnings] = useState([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const showMessage = (type, texte) => {
    setMessage({ type, texte });
    setTimeout(() => setMessage(null), 5000);
  };

  const fetchData = async () => {
    try {
      const [prodRes, ventesRes] = await Promise.all([
        axios.get(`${API}/produits/`),
        axios.get(`${API}/ventes/`)
      ]);
      setProduits(prodRes.data);
      setVentes(ventesRes.data);
    } catch (err) {
      showMessage('erreur', 'Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  const ajouterAuPanier = () => {
    if (!selectedProduit) return;
    const produit = produits.find((p) => p.id === selectedProduit);
    if (!produit) return;

    const existe = panier.find((p) => p.produit_id === produit.id);
    if (existe) {
      setPanier(panier.map((p) =>
        p.produit_id === produit.id ? { ...p, quantite: p.quantite + 1 } : p
      ));
    } else {
      setPanier([...panier, {
        produit_id: produit.id,
        nom: produit.nom,
        prix_unitaire: produit.prix_vente,
        quantite: 1
      }]);
    }
    setSelectedProduit('');
  };

  const retirerDuPanier = (produit_id) => {
    setPanier(panier.filter((p) => p.produit_id !== produit_id));
  };

  const modifierQuantite = (produit_id, qte) => {
    if (qte < 1) return;
    setPanier(panier.map((p) =>
      p.produit_id === produit_id ? { ...p, quantite: qte } : p
    ));
  };

  const sousTotal = panier.reduce((sum, p) => sum + p.prix_unitaire * p.quantite, 0);
  const totalApresRemise = sousTotal * (1 - remise / 100);

  const validerVente = async () => {
    if (panier.length === 0) {
      showMessage('erreur', 'Le panier est vide !');
      return;
    }
    try {
      const data = {
        date_vente: new Date().toISOString().split('T')[0],
        remise_pourcent: remise,
        total: totalApresRemise,
        lignes: panier.map((p) => ({
          produit_id: p.produit_id,
          quantite: p.quantite,
          prix_unitaire: p.prix_unitaire
        }))
      };
      const res = await axios.post(`${API}/ventes/`, data);
      const warnings = res.data?.warnings || [];

      setPanier([]);
      setRemise(0);
      setStockWarnings(warnings);
      fetchData();
      showMessage('succes', 'Vente enregistrée avec succès !');
    } catch (err) {
      const detail = err.response?.data?.detail;
      showMessage('erreur', detail || 'Erreur lors de l\'enregistrement de la vente.');
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  const sortedVentes = [...ventes].sort((a, b) => {
    const dateA = `${a.date || ''} ${a.heure || ''}`;
    const dateB = `${b.date || ''} ${b.heure || ''}`;
    return dateB.localeCompare(dateA);
  });

  const totalPages = Math.max(1, Math.ceil(sortedVentes.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const ventesPaginees = sortedVentes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="page">
      <h1>Enregistrer une vente</h1>

      {message && (
        <div className={`vente-message vente-${message.type}`}>{message.texte}</div>
      )}

      {stockWarnings.length > 0 && (
        <div className="vente-message vente-warning">
          <strong>⚠ Alerte stock après vente :</strong>
          <ul style={{ margin: '6px 0 0 16px' }}>
            {stockWarnings.map((w, i) => (
              <li key={i}>
                <strong>{w.produit}</strong> — {w.stock_restant} unité{w.stock_restant > 1 ? 's' : ''} restante{w.stock_restant > 1 ? 's' : ''} (seuil : {w.seuil_alerte})
              </li>
            ))}
          </ul>
          <button
            style={{ marginTop: 8, background: 'none', border: 'none', color: '#b8860b', cursor: 'pointer', fontSize: '0.8rem' }}
            onClick={() => setStockWarnings([])}
          >Fermer</button>
        </div>
      )}

      <div className="vente-compact">
        <div className="select-produit">
          <select
            value={selectedProduit}
            onChange={(e) => setSelectedProduit(e.target.value)}
          >
            <option value="">-- Choisir un article --</option>
            {produits.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nom} — {p.prix_vente} DH ({p.categories?.nom || ''})
              </option>
            ))}
          </select>
          <button className="btn-primary" onClick={ajouterAuPanier}>
            ➕ Ajouter
          </button>
        </div>

        <div className="panier">
          <h2>Panier</h2>
          {panier.length === 0 ? (
            <p className="panier-vide">Sélectionnez un article et cliquez Ajouter</p>
          ) : (
            <>
              {panier.map((p) => (
                <div key={p.produit_id} className="panier-item">
                  <div className="panier-info">
                    <span className="panier-nom">{p.nom}</span>
                    <span className="panier-prix">{(p.prix_unitaire * p.quantite).toFixed(2)} DH</span>
                  </div>
                  <div className="panier-actions">
                    <button onClick={() => modifierQuantite(p.produit_id, p.quantite - 1)}>−</button>
                    <span>{p.quantite}</span>
                    <button onClick={() => modifierQuantite(p.produit_id, p.quantite + 1)}>+</button>
                    <button className="btn-delete" onClick={() => retirerDuPanier(p.produit_id)}>🗑️</button>
                  </div>
                </div>
              ))}

              <div className="panier-remise">
                <label>Remise (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={remise}
                  onChange={(e) => setRemise(Number(e.target.value))}
                />
              </div>

              <div className="panier-total">
                <div>Sous-total : <strong>{sousTotal.toFixed(2)} DH</strong></div>
                {remise > 0 && <div>Remise : <strong>-{remise}%</strong></div>}
                <div className="total-final">Total : <strong>{totalApresRemise.toFixed(2)} DH</strong></div>
              </div>

              <button className="btn-primary btn-valider" onClick={validerVente}>
                Valider la vente
              </button>
            </>
          )}
        </div>
      </div>

      <div className="historique">
        <h2>Historique des ventes</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Heure</th>
                <th>Articles</th>
                <th>Remise</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {ventesPaginees.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#aaa' }}>
                  Aucune vente enregistrée
                </td></tr>
              ) : ventesPaginees.map((v) => (
                <tr key={v.id}>
                  <td>{v.date}</td>
                  <td style={{ color: '#aaa', fontSize: '0.85rem' }}>{v.heure || '—'}</td>
                  <td>{v.lignes_vente?.map((l) => l.nom_produit || l.produits?.nom).join(', ') || '—'}</td>
                  <td>{v.total_remise > 0 ? `${v.total_remise.toFixed(2)} DH` : '—'}</td>
                  <td className="prix-vente">{(v.total_net || 0).toFixed(2)} DH</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>‹ Préc.</button>
            <span className="page-info">Page {currentPage} / {totalPages} — {sortedVentes.length} vente{sortedVentes.length > 1 ? 's' : ''}</span>
            <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Suiv. ›</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Ventes;
