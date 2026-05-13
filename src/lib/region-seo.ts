/**
 * region-seo.ts
 * Contenu éditorial SEO pour chaque région de France.
 * Chaque région a un texte UNIQUE, une histoire LGBT locale, et des keywords ciblés.
 * → Boost SEO important : 13+ pages indexées avec contenu original sur lgbtfrance.fr.
 */

export type RegionSEO = {
  slug: string;
  name: string;
  intro: string;          // 200-300 mots intro éditoriale unique
  history: string;        // 150 mots histoire LGBT régionale
  topCities: string[];    // top villes LGBT de la région
  keywords: string[];     // mots-clés SEO ciblés
  pridePrincipale?: string; // Marche des Fiertés principale
};

export const REGIONS_SEO: Record<string, RegionSEO> = {
  'ile-de-france': {
    slug: 'ile-de-france',
    name: 'Île-de-France',
    intro: "L'Île-de-France concentre la plus grande communauté LGBTQIA+ de France, avec Paris comme épicentre historique. Le Marais, quartier emblématique du 4ème arrondissement, abrite depuis les années 1980 une scène queer riche : bars, clubs, librairies, associations. Au-delà de Paris, des villes comme Saint-Denis, Boulogne-Billancourt et Versailles développent leurs propres lieux LGBT-friendly. La région compte plus de 600 adresses LGBT recensées : saunas, cabarets, restaurants drag-friendly, centres de santé sexuelle (CeGIDD), associations militantes (SOS Homophobie, Centre LGBT Paris-IDF, AIDES, Inter-LGBT). C'est aussi en Île-de-France que se déroule chaque année la plus grande Marche des Fiertés de France, fin juin.",
    history: "L'Île-de-France a vu naître le mouvement LGBT français moderne : du Carrousel de Paris (1947) aux émeutes du Quartier Latin (1971), des premières assos comme Arcadie (1954) au FHAR (1971) et au CUARH (1979). C'est à Paris qu'a eu lieu la première Marche des Fiertés en 1977, devenue depuis un rendez-vous international.",
    topCities: ['Paris', 'Saint-Denis', 'Boulogne-Billancourt', 'Versailles', 'Argenteuil'],
    keywords: ['LGBT Paris', 'bar gay Paris', 'sauna gay Paris', 'cruising Paris', 'Marche des Fiertés', 'CeGIDD Paris', 'centre LGBT Paris', 'queer Paris'],
    pridePrincipale: 'Marche des Fiertés Paris (fin juin)'
  },
  'provence-alpes-cote-dazur': {
    slug: 'provence-alpes-cote-dazur',
    name: "Provence-Alpes-Côte d'Azur",
    intro: "La Côte d'Azur et la Provence forment un haut lieu du tourisme LGBT en France, avec Nice, Marseille, Cannes et Saint-Tropez comme points phares. Plus de 275 établissements LGBT-friendly y sont recensés : saunas, bars cruising, clubs, hôtels gay-friendly. Marseille, en particulier, a vu sa scène queer exploser ces dernières années avec Pride Marseille (début juillet) et des collectifs comme Massilia Pride. Nice héberge plusieurs cabarets historiques et le Festival international du film LGBT InOutFest. La région bénéficie aussi de plages naturistes et gay-friendly comme la baie des Anges, Le Layet (Cavalaire) ou la plage de la Batterie (Hyères).",
    history: "Le Festival de Cannes a longtemps accompagné le cinéma LGBT (Queer Palm depuis 2010). Saint-Tropez fut historiquement une destination LGBT dès les années 1970 avec Brigitte Bardot et la communauté artistique. Marseille a accueilli plusieurs marches dissidentes ces dernières années (Pride radicale).",
    topCities: ['Marseille', 'Nice', 'Cannes', 'Saint-Tropez', 'Aix-en-Provence', 'Toulon', 'Avignon'],
    keywords: ['LGBT Marseille', 'bar gay Nice', 'sauna PACA', 'cruising Côte d\'Azur', 'Pride Marseille', 'plage gay PACA'],
    pridePrincipale: 'Pride Marseille (début juillet)'
  },
  'occitanie': {
    slug: 'occitanie',
    name: 'Occitanie',
    intro: "L'Occitanie regroupe deux pôles LGBT majeurs : Toulouse et Montpellier. Toulouse, la ville rose, héberge plus de 60 établissements LGBT (bars, saunas, clubs) et organise chaque année une grande Marche des Fiertés début juin. Montpellier, ville étudiante, a une scène queer vibrante autour de l'Écusson et du quartier Boutonnet, avec Pride Montpellier mi-juillet. Nîmes, Perpignan, Béziers et Carcassonne complètent l'offre régionale (~279 listings au total). La région bénéficie également d'une forte présence associative LGBT (Acceptess-T, AIDES, Le Refuge) et de centres de santé sexuelle dans toutes les grandes villes.",
    history: "Toulouse a été pionnière en organisant l'une des premières Pride françaises dès les années 1980. Montpellier a vu naître l'association Voies Lactées et Le Refuge (premier hébergement pour jeunes LGBT en rupture familiale, fondé à Montpellier).",
    topCities: ['Toulouse', 'Montpellier', 'Nîmes', 'Perpignan', 'Béziers', 'Carcassonne'],
    keywords: ['LGBT Toulouse', 'LGBT Montpellier', 'bar gay Toulouse', 'sauna Montpellier', 'Pride Toulouse', 'Le Refuge Montpellier'],
    pridePrincipale: 'Marche des Fiertés Toulouse (début juin) / Pride Montpellier (mi-juillet)'
  },
  'auvergne-rhone-alpes': {
    slug: 'auvergne-rhone-alpes',
    name: 'Auvergne-Rhône-Alpes',
    intro: "Auvergne-Rhône-Alpes est la deuxième région LGBT de France après l'Île-de-France, dominée par Lyon, capitale historique LGBT française. Plus de 260 lieux y sont recensés : bars, clubs, saunas, restaurants, cabarets. Le Marais lyonnais autour du quartier des Pentes de la Croix-Rousse et Bellecour concentre l'essentiel de la nuit gay. Grenoble, Saint-Étienne, Clermont-Ferrand et Annecy ont aussi développé leurs lieux LGBT. La Marche des Fiertés Lyon est l'une des plus importantes de France (mi-juin), et le festival Écrans Mixtes (cinéma LGBT) y est devenu une référence internationale.",
    history: "Lyon est la deuxième ville française pour le tissu associatif LGBT : Forum Gay et Lesbien de Lyon (1974), C-L Lyon (Centre LGBTI), Chrysalide (assoc. trans). C'est dans cette région que l'écrivain René Crevel a vécu, et que de nombreux artistes queer ont marqué la culture française.",
    topCities: ['Lyon', 'Grenoble', 'Saint-Étienne', 'Clermont-Ferrand', 'Annecy', 'Valence', 'Chambéry'],
    keywords: ['LGBT Lyon', 'bar gay Lyon', 'sauna Lyon', 'Pride Lyon', 'cruising Lyon', 'Forum Gay Lyon'],
    pridePrincipale: 'Marche des Fiertés Lyon (mi-juin)'
  },
  'nouvelle-aquitaine': {
    slug: 'nouvelle-aquitaine',
    name: 'Nouvelle-Aquitaine',
    intro: "La Nouvelle-Aquitaine, plus grande région de France, compte plus de 220 adresses LGBT autour de ses pôles : Bordeaux, La Rochelle, Limoges, Poitiers, Pau, Bayonne. Bordeaux concentre l'essentiel de la nuit queer régionale avec une trentaine de bars et clubs. La région est connue pour ses plages naturistes du Bassin d'Arcachon (Lège-Cap-Ferret) et le sud des Landes. Pride Bordeaux a lieu début juin et attire toute la façade atlantique. La présence associative est forte : AIDES Aquitaine, ADAGE 33, Wake Up! (transidentité).",
    history: "Bordeaux a accueilli plusieurs figures LGBT historiques. La région a été pionnière dans l'accueil des personnes séropositives dans les années 1980-1990, avec un fort tissu d'associations de santé.",
    topCities: ['Bordeaux', 'La Rochelle', 'Limoges', 'Poitiers', 'Pau', 'Bayonne', 'Biarritz'],
    keywords: ['LGBT Bordeaux', 'bar gay Bordeaux', 'plage naturiste gay', 'Pride Bordeaux', 'sauna Aquitaine'],
    pridePrincipale: 'Pride Bordeaux (début juin)'
  },
  'hauts-de-france': {
    slug: 'hauts-de-france',
    name: 'Hauts-de-France',
    intro: "Les Hauts-de-France concentrent leur scène LGBT autour de Lille, capitale du Nord. Plus de 210 lieux LGBT-friendly recensés, avec un Marais lillois actif (Vieux-Lille, quartier Wazemmes) et une dizaine d'établissements emblématiques. Pride Lille (fin mai-début juin) est l'une des plus festives de France et attire jusqu'à 30 000 personnes. Amiens, Calais, Dunkerque et Reims complètent l'offre. La région a une histoire LGBT marquée par l'activisme étudiant lillois et l'association Flag! (LGBT police).",
    history: "Lille a été l'un des bastions de la lutte contre le SIDA avec AIDES Nord-Pas-de-Calais, et plusieurs maisons closes historiques étaient connues comme lieux de tolérance LGBT au début du XXe siècle.",
    topCities: ['Lille', 'Amiens', 'Calais', 'Dunkerque', 'Roubaix', 'Tourcoing', 'Valenciennes'],
    keywords: ['LGBT Lille', 'bar gay Lille', 'Pride Lille', 'sauna Hauts-de-France'],
    pridePrincipale: 'Pride Lille (fin mai)'
  },
  'grand-est': {
    slug: 'grand-est',
    name: 'Grand Est',
    intro: "Le Grand Est, à la frontière belge, luxembourgeoise, allemande et suisse, compte plus de 140 lieux LGBT répartis entre Strasbourg, Metz, Nancy, Reims et Mulhouse. Strasbourg, ville européenne, a une scène queer cosmopolite et le festival Strasbourg Pride (Festigays, mi-juin) est l'un des plus internationaux de France. La proximité avec Bruxelles, Cologne et Berlin enrichit l'offre culturelle queer de la région.",
    history: "Strasbourg a été un haut lieu de la résistance LGBT pendant la Seconde Guerre mondiale (où des homosexuels alsaciens ont été déportés à Schirmeck-Vorbruck et Natzweiler-Struthof). Mémoire LGBT en Alsace existe pour préserver cette histoire.",
    topCities: ['Strasbourg', 'Metz', 'Nancy', 'Reims', 'Mulhouse', 'Colmar', 'Troyes'],
    keywords: ['LGBT Strasbourg', 'bar gay Strasbourg', 'Pride Strasbourg', 'Festigays', 'sauna Grand Est'],
    pridePrincipale: 'Festigays Strasbourg (mi-juin)'
  },
  'normandie': {
    slug: 'normandie',
    name: 'Normandie',
    intro: "La Normandie compte plus de 120 lieux LGBT autour de Rouen, Le Havre, Caen et Cherbourg. Pride Rouen (fin mai) a lieu chaque année dans une ambiance familiale. La région se distingue par son tourisme LGBT côtier (Honfleur, Deauville, Étretat) très apprécié des couples gays parisiens en week-end.",
    history: "Rouen a accueilli plusieurs associations historiques LGBT comme HéSAHM (1990). La région a connu des avancées notables sur la PMA et l'adoption dans les années 2010.",
    topCities: ['Rouen', 'Le Havre', 'Caen', 'Cherbourg', 'Évreux', 'Honfleur', 'Deauville'],
    keywords: ['LGBT Rouen', 'bar gay Rouen', 'Pride Normandie', 'sauna Caen'],
    pridePrincipale: 'Pride Rouen (fin mai)'
  },
  'bretagne': {
    slug: 'bretagne',
    name: 'Bretagne',
    intro: "La Bretagne, longtemps considérée comme une région catholique conservatrice, a vu sa scène LGBT exploser depuis les années 2010. Rennes, ville étudiante, héberge Pride Rennes (début juin) et plus de 30 lieux LGBT. Brest, Nantes (historiquement en Bretagne), Quimper et Saint-Brieuc complètent l'offre régionale (~106 adresses). La région a une forte tradition d'associations LGBT et de festivals queer.",
    history: "Rennes a vu naître le premier centre LGBT breton (LGBT+ Rennes) et plusieurs assos pionnières comme Iskis (Centre LGBT de Rennes). La région est un haut lieu du militantisme LGBT-féministe.",
    topCities: ['Rennes', 'Brest', 'Quimper', 'Saint-Brieuc', 'Lorient', 'Vannes'],
    keywords: ['LGBT Rennes', 'bar gay Rennes', 'Pride Rennes', 'sauna Bretagne'],
    pridePrincipale: 'Pride Rennes (début juin)'
  },
  'pays-de-la-loire': {
    slug: 'pays-de-la-loire',
    name: 'Pays de la Loire',
    intro: "Les Pays de la Loire concentrent leur scène LGBT autour de Nantes (capitale régionale), avec plus de 100 lieux recensés. Nantes est connue pour sa Pride Nantes (mi-juin) et son ambiance queer décomplexée autour de l'Île de Nantes et du quartier Bouffay. Angers, Le Mans, La Roche-sur-Yon et Cholet complètent l'offre.",
    history: "Nantes a une histoire LGBT marquée par l'activisme étudiant et l'asso Gay Pride Nantes (devenue Pride Atlantique). La ville a été pionnière dans la création d'un centre LGBT municipal.",
    topCities: ['Nantes', 'Angers', 'Le Mans', 'La Roche-sur-Yon', 'Saint-Nazaire', 'Cholet'],
    keywords: ['LGBT Nantes', 'bar gay Nantes', 'Pride Nantes', 'Pride Atlantique'],
    pridePrincipale: 'Pride Atlantique Nantes (mi-juin)'
  },
  'bourgogne-franche-comte': {
    slug: 'bourgogne-franche-comte',
    name: 'Bourgogne-Franche-Comté',
    intro: "La Bourgogne-Franche-Comté concentre une soixantaine de lieux LGBT autour de Dijon (Pride mi-juin), Besançon, Mâcon et Belfort. Région à dominante rurale, elle s'appuie surtout sur des associations LGBT locales actives et des bars-cafés communautaires.",
    history: "Dijon a une longue tradition d'associations LGBT comme Diversity Dijon. La région a souvent été en première ligne pour défendre les droits des personnes LGBT en milieu rural.",
    topCities: ['Dijon', 'Besançon', 'Mâcon', 'Belfort', 'Auxerre', 'Nevers'],
    keywords: ['LGBT Dijon', 'bar gay Dijon', 'Pride Bourgogne'],
    pridePrincipale: 'Pride Dijon (mi-juin)'
  },
  'centre-val-de-loire': {
    slug: 'centre-val-de-loire',
    name: 'Centre-Val de Loire',
    intro: "Le Centre-Val de Loire compte une soixantaine de lieux LGBT autour de Tours, Orléans, Bourges, Chartres et Blois. Pride Tours (fin mai) et Pride Orléans (début juin) animent la région. Les châteaux de la Loire attirent un tourisme LGBT culturel de toute l'Europe.",
    history: "Orléans a accueilli plusieurs initiatives associatives LGBT pionnières dans les années 2000. La région s'est dotée d'un réseau associatif solide ces 10 dernières années.",
    topCities: ['Tours', 'Orléans', 'Bourges', 'Chartres', 'Blois', 'Châteauroux'],
    keywords: ['LGBT Tours', 'LGBT Orléans', 'bar gay Tours', 'Pride Tours', 'Pride Orléans'],
    pridePrincipale: 'Pride Tours (fin mai)'
  },
  'corse': {
    slug: 'corse',
    name: 'Corse',
    intro: "La Corse, longtemps discrète sur les questions LGBT, voit sa scène queer se développer doucement autour d'Ajaccio et Bastia. Une vingtaine de lieux gay-friendly sont recensés, principalement des hôtels, restaurants et plages naturistes. Pride Corsica (été) reste modeste mais croissante. L'île attire un tourisme LGBT estival apprécié pour ses plages préservées comme Saleccia ou Roccapina.",
    history: "Les premières marches LGBT en Corse sont récentes (années 2010). L'association Corsica Trans Network a marqué l'histoire récente du militantisme LGBT insulaire.",
    topCities: ['Ajaccio', 'Bastia', 'Porto-Vecchio', 'Calvi'],
    keywords: ['LGBT Corse', 'plage naturiste Corse', 'hôtel gay-friendly Corse', 'Pride Corsica'],
    pridePrincipale: 'Pride Corsica (été)'
  }
};

export function getRegionSEO(slug: string): RegionSEO | null {
  return REGIONS_SEO[slug] ?? null;
}

export function listRegionsSEO(): RegionSEO[] {
  return Object.values(REGIONS_SEO);
}
