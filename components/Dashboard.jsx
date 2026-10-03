// components/Dashboard.jsx
import { useState, useEffect } from 'react';
import { dashboard } from '../services/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('token');
        const result = await dashboard.get(token);
        setData(result.dashboard);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) return <div className="loading-spinner">Chargement...</div>;
  if (!data) return <div>Erreur de chargement</div>;

  return (
    <div className="dashboard">
      {/* En-tête personnalisé */}
      <header className="dashboard-header">
        <h1>{data.welcome.message}</h1>
        <p>{data.welcome.suggestion}</p>
      </header>

      {/* Statistiques */}
      <section className="stats-grid">
        <StatCard icon="📦" label="Achats" value={data.stats.totalPurchases} />
        <StatCard icon="❤️" label="Favoris" value={data.stats.totalFavorites} />
        <StatCard icon="⭐" label="Avis" value={data.stats.totalReviews} />
        <StatCard icon="👁️" label="Vues" value={data.stats.totalViews} />
      </section>

      {/* Notifications */}
      {data.notifications.length > 0 && (
        <section className="notifications">
          {data.notifications.map((notif, i) => (
            <div key={i} className={`notification ${notif.type}`}>
              {notif.message}
            </div>
          ))}
        </section>
      )}

      {/* Recommandations */}
      <section className="recommendations">
        <h2>Recommandé pour vous</h2>
        <div className="products-grid">
          {data.recommendations.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Tendances */}
      <section className="trending">
        <h2>🔥 Tendances</h2>
        <div className="products-grid">
          {data.trending.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Nouveautés */}
      <section className="new-arrivals">
        <h2>✨ Nouveautés</h2>
        <div className="products-grid">
          {data.newArrivals.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}

// Composants auxiliaires
function StatCard({ icon, label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-icon">{icon}</span>
      <div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function ProductCard({ product }) {
  return (
    <div className="product-card">
      <img src={product.image} alt={product.title} />
      <h3>{product.title}</h3>
      <p className="price">{product.price} €</p>
      {product.badge && <span className="badge">{product.badge}</span>}
      <button className="btn-add">Ajouter au panier</button>
    </div>
  );
}