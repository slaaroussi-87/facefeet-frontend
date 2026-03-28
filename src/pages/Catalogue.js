import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://facefeet-backend.onrender.com';

function Catalogue() {
  const [produits, setProduits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ nom: '', categorie_id: '', prix_achat: '', prix_vente: '' });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        axios.get(`${API}/produits/`),
        axios.get(`${API}/categories/`)
      ]);
      setProduits(prodRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error('Erreur:', err);
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
        stock: 0,
        actif: true
      });
      setForm({ nom: '', categorie_id: '', prix_achat: '', prix_vente: '' });
      setShowForm(false);
      fetchData();
    } catch (err) {
      console.error('Erreur ajout:', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Supprimer ce produit ?')) {
      await axios.delete(`${API}/produits/${id}`);
      fetchData();
    }
  };

  if (loading) return <div className="loading">Chargement...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Catalogue Produits</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Fermer' : '➕ Nouveau produit'}
        </button>
      </div>

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
            type="number"
            placeholder="Prix d'achat (DH)"
            value={form.prix_achat}
            onChange={(e) => setForm({ ...form, prix_achat: e.target.value })}
            required
          />
          <input
            type="number"
            placeholder="Prix de vente (DH)"
            value={form.prix_vente}
            onChange={(e) => setForm({ ...form, prix_vente: e.target.value })}
            required
          />
          <button type="submit" className="btn-primary">Ajouter</button>
        </form>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Prix Achat</th>
              <th>Prix Vente</th>
              <th>Marge</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {produits.map((p) => (
              <tr key={p.id}>
                <td>{p.nom}</td>
                <td><span className="badge">{p.categories?.nom || '—'}</span></td>
                <td>{p.prix_achat} DH</td>
                <td className="prix-vente">{p.prix_vente} DH</td>
                <td className="marge">{p.prix_vente - p.prix_achat} DH</td>
                <td>
                  <button className="btn-delete" onClick={() => handleDelete(p.id)}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Catalogue;