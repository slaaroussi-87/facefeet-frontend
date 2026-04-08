import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API from '../config';

const PAGE_SIZE = 20;

function Catalogue() {
  const [produits, setProduits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ nom: '', categorie_id: '', prix_achat: '', prix_vente: '', reference: '' });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'succes'|'erreur', texte }
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const showMessage = (type, texte) => {
    setMessage({ type, texte });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        axios.get(`${API}/produits/`),
        axios.get(`${API}/categories/`)
      ]);
      setProduits(prodRes.data);
      setCategories(catRes.data);
    } catch (err) {
      showMessage('erreur', 'Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/produits/`, {
        nom: form.nom,
        categorie_id: form.categorie_id,
        prix_achat: parseFloat(form.prix_achat),
        prix_vente: parseFloat(form.prix_vente),
        reference: form.reference || '',
        stock: 0,
        actif: true
      });
      setForm({ nom: '', categorie_id: '', prix_achat: '', prix_vente: '', reference: '' });
      setShowForm(false);
      showMessage('succes', 'Produit ajouté avec succès.');
      fetchData();
    } catch (err) {
      showMessage('erreur', 'Erreur lors de l\'ajout du produit.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce produit ?')) return;
    try {
      await axios.delete(`${API}/produits/${id}`);
      showMessage('succes', 'Produit supprimé.');
      fetchData();
    } catch (err) {
      showMessage('erreur', 'Erreur lors de la suppression.');
    }
  };

  const startEdit = (p) => {
    setEditId(p.id);
    setEditForm({
      nom: p.nom,
      categorie_id: p.categorie_id || '',
      prix_achat: p.prix_achat,
      prix_vente: p.prix_vente,
      reference: p.reference || ''
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm({});
  };

  const saveEdit = async (id) => {
    try {
      await axios.put(`${API}/produits/${id}`, {
        nom: editForm.nom,
        categorie_id: editForm.categorie_id,
        prix_achat: parseFloat(editForm.prix_achat),
        prix_vente: parseFloat(editForm.prix_vente),
        reference: editForm.reference || ''
      });
      setEditId(null);
      showMessage('succes', 'Produit modifié avec succès.');
      fetchData();
    } catch (err) {
      showMessage('erreur', 'Erreur lors de la modification.');
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  const produitsFiltres = produits.filter((p) =>
    p.nom.toLowerCase().includes(search.toLowerCase()) ||
    (p.categories?.nom || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.reference || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(produitsFiltres.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const produitsPagines = produitsFiltres.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Catalogue Produits</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Fermer' : '➕ Nouveau produit'}
        </button>
      </div>

      {message && (
        <div className={`vente-message vente-${message.type}`}>{message.texte}</div>
      )}

      {showForm && (
        <form className="form-card" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Nom du produit"
            value={form.nom}
            onChange={(e) => setForm({ ...form, nom: e.target.value })}
            required
          />
          <select
            value={form.categorie_id}
            onChange={(e) => setForm({ ...form, categorie_id: e.target.value })}
            required
          >
            <option value="">-- Catégorie --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Référence (optionnel)"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
          />
          <input
            type="number"
            placeholder="Prix d'achat (DH)"
            value={form.prix_achat}
            onChange={(e) => setForm({ ...form, prix_achat: e.target.value })}
            min="0"
            step="0.01"
            required
          />
          <input
            type="number"
            placeholder="Prix de vente (DH)"
            value={form.prix_vente}
            onChange={(e) => setForm({ ...form, prix_vente: e.target.value })}
            min="0"
            step="0.01"
            required
          />
          <button type="submit" className="btn-primary">Ajouter</button>
        </form>
      )}

      {/* Barre de recherche */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Rechercher par nom, catégorie ou référence…"
          value={search}
          onChange={handleSearchChange}
        />
        {search && (
          <button className="search-clear" onClick={() => { setSearch(''); setPage(1); }}>✕</button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Référence</th>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Prix Achat</th>
              <th>Prix Vente</th>
              <th>Marge</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {produitsPagines.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: '#aaa' }}>
                Aucun produit trouvé
              </td></tr>
            ) : produitsPagines.map((p) => (
              editId === p.id ? (
                <tr key={p.id} style={{ background: '#f0faf0' }}>
                  <td>
                    <input
                      className="edit-input"
                      value={editForm.reference}
                      onChange={(e) => setEditForm({ ...editForm, reference: e.target.value })}
                      placeholder="Référence"
                    />
                  </td>
                  <td>
                    <input
                      className="edit-input"
                      value={editForm.nom}
                      onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                      required
                    />
                  </td>
                  <td>
                    <select
                      className="edit-input"
                      value={editForm.categorie_id}
                      onChange={(e) => setEditForm({ ...editForm, categorie_id: e.target.value })}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="edit-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.prix_achat}
                      onChange={(e) => setEditForm({ ...editForm, prix_achat: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="edit-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.prix_vente}
                      onChange={(e) => setEditForm({ ...editForm, prix_vente: e.target.value })}
                    />
                  </td>
                  <td className="marge">
                    {(parseFloat(editForm.prix_vente || 0) - parseFloat(editForm.prix_achat || 0)).toFixed(2)} DH
                  </td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'nowrap' }}>
                    <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.85rem' }} onClick={() => saveEdit(p.id)}>✓ Sauv.</button>
                    <button className="btn-delete" style={{ fontSize: '0.85rem', opacity: 1, color: '#999' }} onClick={cancelEdit}>✕</button>
                  </td>
                </tr>
              ) : (
                <tr key={p.id}>
                  <td style={{ color: '#aaa', fontSize: '0.82rem' }}>{p.reference || '—'}</td>
                  <td>{p.nom}</td>
                  <td><span className="badge">{p.categories?.nom || '—'}</span></td>
                  <td>{p.prix_achat} DH</td>
                  <td className="prix-vente">{p.prix_vente} DH</td>
                  <td className="marge">{(p.prix_vente - p.prix_achat).toFixed(2)} DH</td>
                  <td style={{ display: 'flex', gap: 8, flexWrap: 'nowrap' }}>
                    <button className="btn-edit" onClick={() => startEdit(p)} title="Modifier">✎</button>
                    <button className="btn-delete" onClick={() => handleDelete(p.id)} title="Supprimer">🗑️</button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >‹ Préc.</button>
          <span className="page-info">Page {currentPage} / {totalPages} — {produitsFiltres.length} produit{produitsFiltres.length > 1 ? 's' : ''}</span>
          <button
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
          >Suiv. ›</button>
        </div>
      )}
    </div>
  );
}

export default Catalogue;
