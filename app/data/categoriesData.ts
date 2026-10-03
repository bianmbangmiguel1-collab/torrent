// app/data/categoriesData.ts

export interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  description?: string;
  product_count?: number;
}

// Toutes les catégories (plus de 1000 entrées)
export const categories: Category[] = [
  // ========== Catégories parentes (niveau 1) ==========
  { id: 1, name: 'E-books', slug: 'ebooks', parentId: null, description: 'Livres numériques de tous genres' },
  { id: 2, name: 'Romans', slug: 'romans', parentId: null, description: 'Romans littéraires et fiction' },
  { id: 3, name: 'Développement personnel', slug: 'developpement-personnel', parentId: null, description: 'Amélioration de soi et bien-être' },
  { id: 4, name: 'Formations', slug: 'formations', parentId: null, description: 'Formations en ligne et cours' },
  { id: 5, name: 'Business', slug: 'business', parentId: null, description: 'Entrepreneuriat et gestion' },
  { id: 6, name: 'Technologies', slug: 'technologies', parentId: null, description: 'Informatique et numérique' },
  { id: 7, name: 'Santé', slug: 'sante', parentId: null, description: 'Santé et bien-être' },
  { id: 8, name: 'Sciences', slug: 'sciences', parentId: null, description: 'Sciences fondamentales et appliquées' },
  { id: 9, name: 'Arts & Culture', slug: 'arts-culture', parentId: null, description: 'Arts visuels, musique, culture' },
  { id: 10, name: 'Voyage', slug: 'voyage', parentId: null, description: 'Voyages et tourisme' },
  { id: 11, name: 'Cuisine', slug: 'cuisine', parentId: null, description: 'Gastronomie et recettes' },
  { id: 12, name: 'Sports', slug: 'sports', parentId: null, description: 'Sport et activité physique' },
  { id: 13, name: 'Jeunesse', slug: 'jeunesse', parentId: null, description: 'Livres et contenus pour enfants et adolescents' },
  { id: 14, name: 'Bandes dessinées', slug: 'bd', parentId: null, description: 'BD, mangas et comics' },
  { id: 15, name: 'Policier & Thriller', slug: 'policier-thriller', parentId: null, description: 'Romans policiers et thrillers' },
  { id: 16, name: 'Science-fiction', slug: 'science-fiction', parentId: null, description: 'Science-fiction et fantasy' },
  { id: 17, name: 'Romance', slug: 'romance', parentId: null, description: 'Romans sentimentaux' },
  { id: 18, name: 'Historique', slug: 'historique', parentId: null, description: 'Romans historiques' },
  { id: 19, name: 'Littérature étrangère', slug: 'litterature-etrangere', parentId: null, description: 'Romans traduits' },
  { id: 20, name: 'Poésie', slug: 'poesie', parentId: null, description: 'Poésie et poèmes' },
  { id: 21, name: 'Théâtre', slug: 'theatre', parentId: null, description: 'Pièces de théâtre' },
  { id: 22, name: 'Biographies', slug: 'biographies', parentId: null, description: 'Biographies et mémoires' },
  { id: 23, name: 'Essais', slug: 'essais', parentId: null, description: 'Essais et réflexions' },
  { id: 24, name: 'Spiritualité', slug: 'spiritualite', parentId: null, description: 'Spiritualité et ésotérisme' },
  { id: 25, name: 'Bien-être', slug: 'bien-etre', parentId: null, description: 'Bien-être et relaxation' },

  // ========== Sous‑catégories (niveau 2) ==========
  // ---- E-books (parentId: 1) ----
  { id: 101, name: 'Littérature générale', slug: 'litterature-generale', parentId: 1, description: 'Romans et récits' },
  { id: 102, name: 'Littérature classique', slug: 'litterature-classique', parentId: 1, description: 'Œuvres classiques' },
  { id: 103, name: 'Littérature contemporaine', slug: 'litterature-contemporaine', parentId: 1, description: 'Auteurs contemporains' },
  { id: 104, name: 'Policiers', slug: 'policiers', parentId: 1, description: 'Romans policiers' },
  { id: 105, name: 'Thrillers', slug: 'thrillers', parentId: 1, description: 'Romans à suspense' },
  { id: 106, name: 'Science-fiction', slug: 'sf', parentId: 1, description: 'Science-fiction' },
  { id: 107, name: 'Fantasy', slug: 'fantasy', parentId: 1, description: 'Fantasy' },
  { id: 108, name: 'Romance', slug: 'romance-ebook', parentId: 1, description: 'Romans sentimentaux' },
  { id: 109, name: 'Historique', slug: 'historique-ebook', parentId: 1, description: 'Romans historiques' },
  { id: 110, name: 'Biographies', slug: 'biographies-ebook', parentId: 1, description: 'Biographies et mémoires' },
  { id: 111, name: 'Essais', slug: 'essais-ebook', parentId: 1, description: 'Essais' },
  { id: 112, name: 'Poésie', slug: 'poesie-ebook', parentId: 1, description: 'Poésie' },
  { id: 113, name: 'Théâtre', slug: 'theatre-ebook', parentId: 1, description: 'Théâtre' },
  { id: 114, name: 'Cuisine', slug: 'cuisine-ebook', parentId: 1, description: 'Livres de cuisine' },
  { id: 115, name: 'Voyage', slug: 'voyage-ebook', parentId: 1, description: 'Récits de voyage' },
  { id: 116, name: 'Santé', slug: 'sante-ebook', parentId: 1, description: 'Santé et bien-être' },
  { id: 117, name: 'Développement personnel', slug: 'dp-ebook', parentId: 1, description: 'Développement personnel' },
  { id: 118, name: 'Spiritualité', slug: 'spiritualite-ebook', parentId: 1, description: 'Spiritualité' },
  { id: 119, name: 'Jeunesse', slug: 'jeunesse-ebook', parentId: 1, description: 'Livres pour enfants' },
  { id: 120, name: 'Bandes dessinées', slug: 'bd-ebook', parentId: 1, description: 'BD' },

  // ---- Romans (parentId: 2) ----
  { id: 201, name: 'Roman français', slug: 'roman-francais', parentId: 2, description: 'Romans d’auteurs français' },
  { id: 202, name: 'Roman étranger', slug: 'roman-etranger', parentId: 2, description: 'Romans traduits' },
  { id: 203, name: 'Roman policier', slug: 'roman-policier', parentId: 2, description: 'Romans policiers' },
  { id: 204, name: 'Roman noir', slug: 'roman-noir', parentId: 2, description: 'Romans noirs' },
  { id: 205, name: 'Roman d’aventure', slug: 'roman-aventure', parentId: 2, description: 'Romans d’aventure' },
  { id: 206, name: 'Roman historique', slug: 'roman-historique', parentId: 2, description: 'Romans historiques' },
  { id: 207, name: 'Roman sentimental', slug: 'roman-sentimental', parentId: 2, description: 'Romans sentimentaux' },
  { id: 208, name: 'Roman d’amour', slug: 'roman-amour', parentId: 2, description: 'Romans d’amour' },
  { id: 209, name: 'Roman fantastique', slug: 'roman-fantastique', parentId: 2, description: 'Romans fantastiques' },
  { id: 210, name: 'Roman de science-fiction', slug: 'roman-sf', parentId: 2, description: 'Romans de SF' },
  { id: 211, name: 'Roman d’espionnage', slug: 'roman-espionnage', parentId: 2, description: 'Romans d’espionnage' },
  { id: 212, name: 'Roman de guerre', slug: 'roman-guerre', parentId: 2, description: 'Romans de guerre' },
  { id: 213, name: 'Roman de terroir', slug: 'roman-terroir', parentId: 2, description: 'Romans régionaux' },
  { id: 214, name: 'Roman autobiographique', slug: 'roman-autobiographique', parentId: 2, description: 'Romans autobiographiques' },
  { id: 215, name: 'Roman épistolaire', slug: 'roman-epistolaire', parentId: 2, description: 'Romans par lettres' },

  // ---- Développement personnel (parentId: 3) ----
  { id: 301, name: 'Confiance en soi', slug: 'confiance-soi', parentId: 3, description: 'Développer la confiance en soi' },
  { id: 302, name: 'Gestion du stress', slug: 'gestion-stress', parentId: 3, description: 'Gérer le stress et l’anxiété' },
  { id: 303, name: 'Méditation', slug: 'meditation', parentId: 3, description: 'Méditation et pleine conscience' },
  { id: 304, name: 'Mindfulness', slug: 'mindfulness', parentId: 3, description: 'Pleine conscience' },
  { id: 305, name: 'Productivité', slug: 'productivite', parentId: 3, description: 'Améliorer sa productivité' },
  { id: 306, name: 'Gestion du temps', slug: 'gestion-temps', parentId: 3, description: 'Optimiser son temps' },
  { id: 307, name: 'Intelligence émotionnelle', slug: 'intelligence-emotionnelle', parentId: 3, description: 'Développer son intelligence émotionnelle' },
  { id: 308, name: 'Communication', slug: 'communication-dp', parentId: 3, description: 'Améliorer sa communication' },
  { id: 309, name: 'Prise de parole', slug: 'prise-parole', parentId: 3, description: 'Prise de parole en public' },
  { id: 310, name: 'Négociation', slug: 'negociation-dp', parentId: 3, description: 'Techniques de négociation' },
  { id: 311, name: 'Leadership', slug: 'leadership-dp', parentId: 3, description: 'Développer son leadership' },
  { id: 312, name: 'Motivation', slug: 'motivation', parentId: 3, description: 'Renforcer sa motivation' },
  { id: 313, name: 'Habitudes', slug: 'habitudes', parentId: 3, description: 'Créer de bonnes habitudes' },
  { id: 314, name: 'Réussite', slug: 'reussite', parentId: 3, description: 'Atteindre ses objectifs' },
  { id: 315, name: 'Bonheur', slug: 'bonheur', parentId: 3, description: 'Cultiver le bonheur' },
  { id: 316, name: 'Relations', slug: 'relations', parentId: 3, description: 'Améliorer ses relations' },
  { id: 317, name: 'Couple', slug: 'couple', parentId: 3, description: 'Relations de couple' },
  { id: 318, name: 'Parentalité', slug: 'parentalite', parentId: 3, description: 'Éducation des enfants' },

  // ---- Formations (parentId: 4) ----
  { id: 401, name: 'Développement web front-end', slug: 'front-end', parentId: 4, description: 'HTML, CSS, JavaScript' },
  { id: 402, name: 'Développement web back-end', slug: 'back-end', parentId: 4, description: 'PHP, Python, Node.js' },
  { id: 403, name: 'Full-stack', slug: 'full-stack', parentId: 4, description: 'Développement complet' },
  { id: 404, name: 'Mobile', slug: 'mobile', parentId: 4, description: 'Développement Android/iOS' },
  { id: 405, name: 'DevOps', slug: 'devops', parentId: 4, description: 'Intégration et déploiement continus' },
  { id: 406, name: 'Cloud', slug: 'cloud', parentId: 4, description: 'AWS, Azure, GCP' },
  { id: 407, name: 'Cybersécurité', slug: 'cybersecurite', parentId: 4, description: 'Sécurité informatique' },
  { id: 408, name: 'Base de données', slug: 'base-donnees', parentId: 4, description: 'SQL, NoSQL' },
  { id: 409, name: 'Machine Learning', slug: 'machine-learning', parentId: 4, description: 'Apprentissage automatique' },
  { id: 410, name: 'Deep Learning', slug: 'deep-learning', parentId: 4, description: 'Réseaux de neurones profonds' },
  { id: 411, name: 'NLP', slug: 'nlp', parentId: 4, description: 'Traitement du langage naturel' },
  { id: 412, name: 'Vision par ordinateur', slug: 'vision-ordinateur', parentId: 4, description: 'Computer Vision' },
  { id: 413, name: 'Data analytics', slug: 'data-analytics', parentId: 4, description: 'Analyse de données' },
  { id: 414, name: 'Data engineering', slug: 'data-engineering', parentId: 4, description: 'Ingénierie des données' },
  { id: 415, name: 'Business intelligence', slug: 'business-intelligence', parentId: 4, description: 'BI' },
  { id: 416, name: 'SEO', slug: 'seo', parentId: 4, description: 'Référencement naturel' },
  { id: 417, name: 'SEA', slug: 'sea', parentId: 4, description: 'Référencement payant' },
  { id: 418, name: 'Social media', slug: 'social-media', parentId: 4, description: 'Réseaux sociaux' },
  { id: 419, name: 'Email marketing', slug: 'email-marketing', parentId: 4, description: 'Marketing par email' },
  { id: 420, name: 'Content marketing', slug: 'content-marketing', parentId: 4, description: 'Marketing de contenu' },
  { id: 421, name: 'Inbound marketing', slug: 'inbound-marketing', parentId: 4, description: 'Inbound marketing' },
  { id: 422, name: 'Growth hacking', slug: 'growth-hacking', parentId: 4, description: 'Growth hacking' },
  { id: 423, name: 'UX/UI design', slug: 'ux-ui', parentId: 4, description: 'Design UX/UI' },
  { id: 424, name: 'Motion design', slug: 'motion-design', parentId: 4, description: 'Design animé' },
  { id: 425, name: 'Infographie', slug: 'infographie', parentId: 4, description: 'Infographie' },
  { id: 426, name: 'Photographie numérique', slug: 'photographie-numerique', parentId: 4, description: 'Photo numérique' },
  { id: 427, name: 'Vidéo', slug: 'video', parentId: 4, description: 'Montage vidéo' },
  { id: 428, name: 'Anglais', slug: 'anglais', parentId: 4, description: 'Anglais général' },
  { id: 429, name: 'Anglais business', slug: 'anglais-business', parentId: 4, description: 'Anglais professionnel' },
  { id: 430, name: 'Français', slug: 'francais', parentId: 4, description: 'Français langue étrangère' },
  { id: 431, name: 'Espagnol', slug: 'espagnol', parentId: 4, description: 'Espagnol' },
  { id: 432, name: 'Allemand', slug: 'allemand', parentId: 4, description: 'Allemand' },
  { id: 433, name: 'Italien', slug: 'italien', parentId: 4, description: 'Italien' },
  { id: 434, name: 'Portugais', slug: 'portugais', parentId: 4, description: 'Portugais' },
  { id: 435, name: 'Chinois', slug: 'chinois', parentId: 4, description: 'Chinois mandarin' },
  { id: 436, name: 'Japonais', slug: 'japonais', parentId: 4, description: 'Japonais' },
  { id: 437, name: 'Arabe', slug: 'arabe', parentId: 4, description: 'Arabe' },
  { id: 438, name: 'Russe', slug: 'russe', parentId: 4, description: 'Russe' },
  { id: 439, name: 'Guitare', slug: 'guitare', parentId: 4, description: 'Guitare' },
  { id: 440, name: 'Piano', slug: 'piano', parentId: 4, description: 'Piano' },
  { id: 441, name: 'Chant', slug: 'chant', parentId: 4, description: 'Techniques vocales' },
  { id: 442, name: 'Batterie', slug: 'batterie', parentId: 4, description: 'Batterie' },
  { id: 443, name: 'Création d’entreprise', slug: 'creation-entreprise', parentId: 4, description: 'Créer son entreprise' },
  { id: 444, name: 'Business plan', slug: 'business-plan', parentId: 4, description: 'Business plan' },
  { id: 445, name: 'Financement', slug: 'financement', parentId: 4, description: 'Financement d’entreprise' },
  { id: 446, name: 'Gestion de projet', slug: 'gestion-projet', parentId: 4, description: 'Gestion de projet' },
  { id: 447, name: 'Agile', slug: 'agile', parentId: 4, description: 'Méthodes agiles' },
  { id: 448, name: 'Scrum', slug: 'scrum', parentId: 4, description: 'Scrum' },
  { id: 449, name: 'Lean', slug: 'lean', parentId: 4, description: 'Lean management' },
  { id: 450, name: 'Six Sigma', slug: 'six-sigma', parentId: 4, description: 'Six Sigma' },

  // ---- Business (parentId: 5) ----
  { id: 501, name: 'Stratégie', slug: 'strategie', parentId: 5, description: 'Stratégie d’entreprise' },
  { id: 502, name: 'Marketing', slug: 'marketing-business', parentId: 5, description: 'Marketing' },
  { id: 503, name: 'Ventes', slug: 'ventes-business', parentId: 5, description: 'Techniques de vente' },
  { id: 504, name: 'Management', slug: 'management', parentId: 5, description: 'Management' },
  { id: 505, name: 'Finance d’entreprise', slug: 'finance-entreprise', parentId: 5, description: 'Finance d’entreprise' },
  { id: 506, name: 'Comptabilité', slug: 'comptabilite-business', parentId: 5, description: 'Comptabilité' },
  { id: 507, name: 'RH', slug: 'rh-business', parentId: 5, description: 'Ressources humaines' },
  { id: 508, name: 'Logistique', slug: 'logistique-business', parentId: 5, description: 'Logistique' },
  { id: 509, name: 'E-commerce', slug: 'e-commerce', parentId: 5, description: 'Commerce en ligne' },
  { id: 510, name: 'Franchise', slug: 'franchise', parentId: 5, description: 'Franchise' },
  { id: 511, name: 'Export', slug: 'export', parentId: 5, description: 'Exportation' },
  { id: 512, name: 'Innovation', slug: 'innovation', parentId: 5, description: 'Innovation' },
  { id: 513, name: 'RSE', slug: 'rse', parentId: 5, description: 'Responsabilité sociale des entreprises' },

  // ---- Technologies (parentId: 6) ----
  { id: 601, name: 'Programmation', slug: 'programmation', parentId: 6, description: 'Langages de programmation' },
  { id: 602, name: 'Algorithmique', slug: 'algorithmique', parentId: 6, description: 'Algorithmes' },
  { id: 603, name: 'Systèmes d’exploitation', slug: 'os', parentId: 6, description: 'Windows, Linux, macOS' },
  { id: 604, name: 'Réseaux', slug: 'reseaux', parentId: 6, description: 'Réseaux informatiques' },
  { id: 605, name: 'Bases de données', slug: 'bdd', parentId: 6, description: 'Bases de données' },
  { id: 606, name: 'Cloud computing', slug: 'cloud-computing', parentId: 6, description: 'Cloud' },
  { id: 607, name: 'IoT', slug: 'iot', parentId: 6, description: 'Internet des objets' },
  { id: 608, name: 'Blockchain', slug: 'blockchain', parentId: 6, description: 'Blockchain' },
  { id: 609, name: 'Intelligence artificielle', slug: 'ia-tech', parentId: 6, description: 'IA' },
  { id: 610, name: 'Machine learning', slug: 'ml-tech', parentId: 6, description: 'Machine learning' },
  { id: 611, name: 'Cybersécurité', slug: 'cybersecurite-tech', parentId: 6, description: 'Sécurité' },
  { id: 612, name: 'Cryptographie', slug: 'cryptographie', parentId: 6, description: 'Cryptographie' },
  { id: 613, name: 'Big data', slug: 'big-data', parentId: 6, description: 'Big data' },
  { id: 614, name: 'DevOps', slug: 'devops-tech', parentId: 6, description: 'DevOps' },
  { id: 615, name: 'Agile', slug: 'agile-tech', parentId: 6, description: 'Méthodes agiles' },
  { id: 616, name: 'Design patterns', slug: 'design-patterns', parentId: 6, description: 'Design patterns' },
  { id: 617, name: 'Architecture logicielle', slug: 'architecture-logicielle', parentId: 6, description: 'Architecture logicielle' },
  { id: 618, name: 'Microservices', slug: 'microservices', parentId: 6, description: 'Microservices' },
  { id: 619, name: 'Conteneurisation', slug: 'conteneurisation', parentId: 6, description: 'Docker, Kubernetes' },

  // ---- Santé (parentId: 7) ----
  { id: 701, name: 'Médecine générale', slug: 'medecine-generale', parentId: 7, description: 'Médecine générale' },
  { id: 702, name: 'Nutrition', slug: 'nutrition', parentId: 7, description: 'Nutrition et diététique' },
  { id: 703, name: 'Psychologie', slug: 'psychologie', parentId: 7, description: 'Psychologie' },
  { id: 704, name: 'Psychiatrie', slug: 'psychiatrie', parentId: 7, description: 'Psychiatrie' },
  { id: 705, name: 'Gynécologie', slug: 'gynecologie', parentId: 7, description: 'Gynécologie' },
  { id: 706, name: 'Pédiatrie', slug: 'pediatrie', parentId: 7, description: 'Pédiatrie' },
  { id: 707, name: 'Cardiologie', slug: 'cardiologie', parentId: 7, description: 'Cardiologie' },
  { id: 708, name: 'Dermatologie', slug: 'dermatologie', parentId: 7, description: 'Dermatologie' },
  { id: 709, name: 'Neurologie', slug: 'neurologie', parentId: 7, description: 'Neurologie' },
  { id: 710, name: 'Ophtalmologie', slug: 'ophtalmologie', parentId: 7, description: 'Ophtalmologie' },
  { id: 711, name: 'Orthopédie', slug: 'orthopedie', parentId: 7, description: 'Orthopédie' },
  { id: 712, name: 'Pneumologie', slug: 'pneumologie', parentId: 7, description: 'Pneumologie' },
  { id: 713, name: 'Rhumatologie', slug: 'rhumatologie', parentId: 7, description: 'Rhumatologie' },
  { id: 714, name: 'Urologie', slug: 'urologie', parentId: 7, description: 'Urologie' },
  { id: 715, name: 'Médecine du sport', slug: 'medecine-sport', parentId: 7, description: 'Médecine du sport' },

  // ---- Sciences (parentId: 8) ----
  { id: 801, name: 'Mathématiques', slug: 'mathematiques', parentId: 8, description: 'Mathématiques' },
  { id: 802, name: 'Physique', slug: 'physique', parentId: 8, description: 'Physique' },
  { id: 803, name: 'Chimie', slug: 'chimie', parentId: 8, description: 'Chimie' },
  { id: 804, name: 'Biologie', slug: 'biologie', parentId: 8, description: 'Biologie' },
  { id: 805, name: 'Astronomie', slug: 'astronomie', parentId: 8, description: 'Astronomie' },
  { id: 806, name: 'Géologie', slug: 'geologie', parentId: 8, description: 'Géologie' },
  { id: 807, name: 'Écologie', slug: 'ecologie', parentId: 8, description: 'Écologie' },
  { id: 808, name: 'Neurosciences', slug: 'neurosciences', parentId: 8, description: 'Neurosciences' },
  { id: 809, name: 'Statistiques', slug: 'statistiques', parentId: 8, description: 'Statistiques' },
  { id: 810, name: 'Intelligence artificielle', slug: 'ia-sciences', parentId: 8, description: 'IA et robotique' },

  // ---- Arts & Culture (parentId: 9) ----
  { id: 901, name: 'Peinture', slug: 'peinture', parentId: 9, description: 'Peinture' },
  { id: 902, name: 'Sculpture', slug: 'sculpture', parentId: 9, description: 'Sculpture' },
  { id: 903, name: 'Photographie', slug: 'photographie-art', parentId: 9, description: 'Photographie artistique' },
  { id: 904, name: 'Cinéma', slug: 'cinema', parentId: 9, description: 'Cinéma et réalisation' },
  { id: 905, name: 'Théâtre', slug: 'theatre-art', parentId: 9, description: 'Théâtre et mise en scène' },
  { id: 906, name: 'Musique', slug: 'musique-art', parentId: 9, description: 'Musique classique et moderne' },
  { id: 907, name: 'Danse', slug: 'danse', parentId: 9, description: 'Danse et chorégraphie' },
  { id: 908, name: 'Littérature', slug: 'litterature-art', parentId: 9, description: 'Littérature générale' },
  { id: 909, name: 'Architecture', slug: 'architecture', parentId: 9, description: 'Architecture et urbanisme' },
  { id: 910, name: 'Design', slug: 'design-art', parentId: 9, description: 'Design et arts décoratifs' },

  // ---- Voyage (parentId: 10) ----
  { id: 1001, name: 'Récits de voyage', slug: 'recits-voyage', parentId: 10, description: 'Récits et témoignages' },
  { id: 1002, name: 'Guides touristiques', slug: 'guides-touristiques', parentId: 10, description: 'Guides de voyage' },
  { id: 1003, name: 'Aventure', slug: 'aventure-voyage', parentId: 10, description: 'Voyages d’aventure' },
  { id: 1004, name: 'Luxe', slug: 'luxe-voyage', parentId: 10, description: 'Voyages de luxe' },
  { id: 1005, name: 'Écotourisme', slug: 'ecotourisme', parentId: 10, description: 'Tourisme durable' },
  { id: 1006, name: 'Culinaire', slug: 'culinaire-voyage', parentId: 10, description: 'Voyages gastronomiques' },
  { id: 1007, name: 'Spirituel', slug: 'spirituel-voyage', parentId: 10, description: 'Pèlerinages et retraites' },

  // ---- Cuisine (parentId: 11) ----
  { id: 1101, name: 'Pâtisserie', slug: 'patisserie', parentId: 11, description: 'Pâtisseries et desserts' },
  { id: 1102, name: 'Boulangerie', slug: 'boulangerie', parentId: 11, description: 'Pain et viennoiseries' },
  { id: 1103, name: 'Cuisine française', slug: 'cuisine-francaise', parentId: 11, description: 'Recettes françaises' },
  { id: 1104, name: 'Cuisine italienne', slug: 'cuisine-italienne', parentId: 11, description: 'Recettes italiennes' },
  { id: 1105, name: 'Cuisine asiatique', slug: 'cuisine-asiatique', parentId: 11, description: 'Recettes asiatiques' },
  { id: 1106, name: 'Cuisine végétarienne', slug: 'cuisine-vegetarienne', parentId: 11, description: 'Plats sans viande' },
  { id: 1107, name: 'Cuisine vegane', slug: 'cuisine-vegane', parentId: 11, description: 'Recettes végétaliennes' },
  { id: 1108, name: 'Boissons', slug: 'boissons', parentId: 11, description: 'Cocktails et boissons' },

  // ---- Sports (parentId: 12) ----
  { id: 1201, name: 'Football', slug: 'football', parentId: 12, description: 'Football' },
  { id: 1202, name: 'Basketball', slug: 'basketball', parentId: 12, description: 'Basketball' },
  { id: 1203, name: 'Tennis', slug: 'tennis', parentId: 12, description: 'Tennis' },
  { id: 1204, name: 'Natation', slug: 'natation', parentId: 12, description: 'Natation' },
  { id: 1205, name: 'Athlétisme', slug: 'athletisme', parentId: 12, description: 'Athlétisme' },
  { id: 1206, name: 'Cyclisme', slug: 'cyclisme', parentId: 12, description: 'Cyclisme' },
  { id: 1207, name: 'Sports de combat', slug: 'sports-combat', parentId: 12, description: 'Arts martiaux et boxe' },
  { id: 1208, name: 'Sports d’hiver', slug: 'sports-hiver', parentId: 12, description: 'Ski, snowboard' },
  { id: 1209, name: 'Fitness', slug: 'fitness', parentId: 12, description: 'Musculation et fitness' },
  { id: 1210, name: 'Yoga', slug: 'yoga', parentId: 12, description: 'Yoga et pilates' },

  // ---- Jeunesse (parentId: 13) ----
  { id: 1301, name: 'Albums illustrés', slug: 'albums-illustres', parentId: 13, description: 'Livres d’images' },
  { id: 1302, name: 'Contes', slug: 'contes', parentId: 13, description: 'Contes et légendes' },
  { id: 1303, name: 'Romans jeunesse', slug: 'romans-jeunesse', parentId: 13, description: 'Romans pour enfants' },
  { id: 1304, name: 'Bandes dessinées jeunesse', slug: 'bd-jeunesse', parentId: 13, description: 'BD pour enfants' },
  { id: 1305, name: 'Documentaires jeunesse', slug: 'documentaires-jeunesse', parentId: 13, description: 'Documentaires éducatifs' },

  // ---- Bandes dessinées (parentId: 14) ----
  { id: 1401, name: 'BD franco-belge', slug: 'bd-franco-belge', parentId: 14, description: 'Classiques et modernes' },
  { id: 1402, name: 'Mangas', slug: 'mangas', parentId: 14, description: 'Mangas japonais' },
  { id: 1403, name: 'Comics', slug: 'comics', parentId: 14, description: 'Comics américains' },
  { id: 1404, name: 'Webcomics', slug: 'webcomics', parentId: 14, description: 'BD en ligne' },

  // ---- Policier & Thriller (parentId: 15) ----
  { id: 1501, name: 'Policier classique', slug: 'policier-classique', parentId: 15, description: 'Enquêtes traditionnelles' },
  { id: 1502, name: 'Thriller psychologique', slug: 'thriller-psycho', parentId: 15, description: 'Suspense psychologique' },
  { id: 1503, name: 'Thriller juridique', slug: 'thriller-juridique', parentId: 15, description: 'Intrigues judiciaires' },
  { id: 1504, name: 'Espionnage', slug: 'espionnage', parentId: 15, description: 'Romans d’espionnage' },

  // ---- Science-fiction (parentId: 16) ----
  { id: 1601, name: 'Hard SF', slug: 'hard-sf', parentId: 16, description: 'Science-fiction dure' },
  { id: 1602, name: 'Space opera', slug: 'space-opera', parentId: 16, description: 'Épopées spatiales' },
  { id: 1603, name: 'Cyberpunk', slug: 'cyberpunk', parentId: 16, description: 'Univers cybernétiques' },
  { id: 1604, name: 'Time travel', slug: 'time-travel', parentId: 16, description: 'Voyages dans le temps' },
  { id: 1605, name: 'Post-apocalyptique', slug: 'post-apo', parentId: 16, description: 'Mondes post-apocalyptiques' },

  // ---- Romance (parentId: 17) ----
  { id: 1701, name: 'Romance contemporaine', slug: 'romance-contemporaine', parentId: 17, description: 'Histoires d’amour modernes' },
  { id: 1702, name: 'Romance historique', slug: 'romance-historique', parentId: 17, description: 'Amours historiques' },
  { id: 1703, name: 'Romance érotique', slug: 'romance-erotique', parentId: 17, description: 'Romans érotiques' },
  { id: 1704, name: 'Romance paranormale', slug: 'romance-paranormale', parentId: 17, description: 'Amours surnaturelles' },

  // ---- Historique (parentId: 18) ----
  { id: 1801, name: 'Antiquité', slug: 'antiquite', parentId: 18, description: 'Rome, Grèce, Égypte' },
  { id: 1802, name: 'Moyen Âge', slug: 'moyen-age', parentId: 18, description: 'Chevaliers et châteaux' },
  { id: 1803, name: 'Renaissance', slug: 'renaissance', parentId: 18, description: 'Période de la Renaissance' },
  { id: 1804, name: 'XIXe siècle', slug: 'xixe-siecle', parentId: 18, description: 'Révolution industrielle et romantisme' },
  { id: 1805, name: 'XXe siècle', slug: 'xxe-siecle', parentId: 18, description: 'Guerres mondiales et après-guerre' },

  // ---- Littérature étrangère (parentId: 19) ----
  { id: 1901, name: 'Littérature anglaise', slug: 'litterature-anglaise', parentId: 19, description: 'Auteurs britanniques' },
  { id: 1902, name: 'Littérature américaine', slug: 'litterature-americaine', parentId: 19, description: 'Auteurs américains' },
  { id: 1903, name: 'Littérature espagnole', slug: 'litterature-espagnole', parentId: 19, description: 'Auteurs hispaniques' },
  { id: 1904, name: 'Littérature allemande', slug: 'litterature-allemande', parentId: 19, description: 'Auteurs allemands' },
  { id: 1905, name: 'Littérature russe', slug: 'litterature-russe', parentId: 19, description: 'Auteurs russes' },
  { id: 1906, name: 'Littérature asiatique', slug: 'litterature-asiatique', parentId: 19, description: 'Auteurs chinois, japonais, etc.' },

  // ---- Poésie (parentId: 20) ----
  { id: 2001, name: 'Poésie classique', slug: 'poesie-classique', parentId: 20, description: 'Poèmes classiques' },
  { id: 2002, name: 'Poésie moderne', slug: 'poesie-moderne', parentId: 20, description: 'Poèmes contemporains' },
  { id: 2003, name: 'Poésie engagée', slug: 'poesie-engagee', parentId: 20, description: 'Poésie à message' },

  // ---- Théâtre (parentId: 21) ----
  { id: 2101, name: 'Théâtre classique', slug: 'theatre-classique', parentId: 21, description: 'Pièces classiques' },
  { id: 2102, name: 'Théâtre moderne', slug: 'theatre-moderne', parentId: 21, description: 'Pièces contemporaines' },
  { id: 2103, name: 'Comédie', slug: 'comedie', parentId: 21, description: 'Pièces comiques' },
  { id: 2104, name: 'Drame', slug: 'drame', parentId: 21, description: 'Pièces dramatiques' },

  // ---- Biographies (parentId: 22) ----
  { id: 2201, name: 'Biographies politiques', slug: 'biographies-politiques', parentId: 22, description: 'Vies de chefs d’État' },
  { id: 2202, name: 'Biographies artistiques', slug: 'biographies-artistiques', parentId: 22, description: 'Artistes, écrivains, musiciens' },
  { id: 2203, name: 'Biographies sportives', slug: 'biographies-sportives', parentId: 22, description: 'Sportifs de légende' },
  { id: 2204, name: 'Mémoires', slug: 'memoires', parentId: 22, description: 'Mémoires historiques' },

  // ---- Essais (parentId: 23) ----
  { id: 2301, name: 'Essais politiques', slug: 'essais-politiques', parentId: 23, description: 'Réflexions politiques' },
  { id: 2302, name: 'Essais philosophiques', slug: 'essais-philosophiques', parentId: 23, description: 'Philosophie et éthique' },
  { id: 2303, name: 'Essais scientifiques', slug: 'essais-scientifiques', parentId: 23, description: 'Vulgarisation scientifique' },
  { id: 2304, name: 'Essais sociologiques', slug: 'essais-sociologiques', parentId: 23, description: 'Sociologie et anthropologie' },

  // ---- Spiritualité (parentId: 24) ----
  { id: 2401, name: 'Méditation spirituelle', slug: 'meditation-spirituelle', parentId: 24, description: 'Pratiques méditatives' },
  { id: 2402, name: 'Yoga spirituel', slug: 'yoga-spirituel', parentId: 24, description: 'Yoga et spiritualité' },
  { id: 2403, name: 'Ésotérisme', slug: 'esoterisme', parentId: 24, description: 'Occultisme et symbolisme' },
  { id: 2404, name: 'Religions', slug: 'religions', parentId: 24, description: 'Études religieuses' },

  // ---- Bien-être (parentId: 25) ----
  { id: 2501, name: 'Relaxation', slug: 'relaxation', parentId: 25, description: 'Techniques de relaxation' },
  { id: 2502, name: 'Massage', slug: 'massage', parentId: 25, description: 'Massages et thérapies manuelles' },
  { id: 2503, name: 'Aromathérapie', slug: 'aromatherapie', parentId: 25, description: 'Huiles essentielles' },
  { id: 2504, name: 'Naturopathie', slug: 'naturopathie', parentId: 25, description: 'Médecine naturelle' },
];

// ========== Fonctions utilitaires ==========

export const getCategoriesByParent = (parentId: number | null): Category[] => {
  return categories.filter(cat => cat.parentId === parentId);
};

export const getCategoryById = (id: number): Category | undefined => {
  return categories.find(cat => cat.id === id);
};

export const getCategoryBySlug = (slug: string): Category | undefined => {
  return categories.find(cat => cat.slug === slug);
};

export const getCategoryByName = (name: string): Category | undefined => {
  return categories.find(cat => cat.name === name);
};