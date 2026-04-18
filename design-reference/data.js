// Shared mock data for the Sommelyx Personal Dashboard

window.SOMMELYX_DATA = (() => {
  const YEAR = 2026;

  const wines = [
    { id: "w1", name: "Château Margaux", producer: "Château Margaux", country: "França", region: "Bordeaux", grape: "Cabernet Sauvignon", vintage: 2015, style: "tinto", quantity: 2, purchase_price: 2800, current_value: 3400, rating: 9.2, drink_from: 2024, drink_until: 2030, location: "Adega · A-12", pairing: "Cordeiro, queijos curados" },
    { id: "w2", name: "Dom Pérignon Vintage", producer: "Moët & Chandon", country: "França", region: "Champagne", grape: "Chardonnay / Pinot Noir", vintage: 2012, style: "espumante", quantity: 3, purchase_price: 1200, current_value: 1450, rating: 9.0, drink_from: 2022, drink_until: 2028, location: "Geladeira · 2º", pairing: "Ostras, aperitivo" },
    { id: "w3", name: "Sassicaia", producer: "Tenuta San Guido", country: "Itália", region: "Bolgheri", grape: "Cabernet / Merlot", vintage: 2017, style: "tinto", quantity: 4, purchase_price: 1800, current_value: 2100, rating: 9.4, drink_from: 2025, drink_until: 2035, location: "Adega · B-04", pairing: "Bife à milanesa, massas ragu" },
    { id: "w4", name: "Cloudy Bay Sauvignon Blanc", producer: "Cloudy Bay", country: "Nova Zelândia", region: "Marlborough", grape: "Sauvignon Blanc", vintage: 2023, style: "branco", quantity: 6, purchase_price: 320, current_value: 340, rating: 8.5, drink_from: 2024, drink_until: 2026, location: "Geladeira · 1º", pairing: "Peixes grelhados, aspargos" },
    { id: "w5", name: "Vega Sicilia Único", producer: "Vega Sicilia", country: "Espanha", region: "Ribera del Duero", grape: "Tempranillo / Cabernet", vintage: 2011, style: "tinto", quantity: 1, purchase_price: 3500, current_value: 4200, rating: 9.6, drink_from: 2023, drink_until: 2040, location: "Adega · A-01", pairing: "Carnes de caça, jantar longo" },
    { id: "w6", name: "Penfolds Bin 389", producer: "Penfolds", country: "Austrália", region: "South Australia", grape: "Cabernet Shiraz", vintage: 2018, style: "tinto", quantity: 3, purchase_price: 580, current_value: 640, rating: 8.8, drink_from: 2025, drink_until: 2032, location: "Adega · C-08", pairing: "Churrasco, cordeiro" },
    { id: "w7", name: "Meursault Premier Cru", producer: "Domaine Leflaive", country: "França", region: "Borgonha", grape: "Chardonnay", vintage: 2019, style: "branco", quantity: 2, purchase_price: 1450, current_value: 1620, rating: 9.1, drink_from: 2023, drink_until: 2028, location: "Geladeira · 2º", pairing: "Lagosta, risoto de trufas" },
    { id: "w8", name: "Amarone della Valpolicella", producer: "Masi", country: "Itália", region: "Veneto", grape: "Corvina / Rondinella", vintage: 2016, style: "tinto", quantity: 2, purchase_price: 720, current_value: 810, rating: 8.9, drink_from: 2024, drink_until: 2031, location: "Adega · B-11", pairing: "Risoto, ossobuco" },
    { id: "w9", name: "Pingus", producer: "Dominio de Pingus", country: "Espanha", region: "Ribera del Duero", grape: "Tinta del País", vintage: 2014, style: "tinto", quantity: 1, purchase_price: 4800, current_value: 5500, rating: 9.7, drink_from: 2022, drink_until: 2038, location: "Adega · A-03", pairing: "Ocasião especial" },
    { id: "w10", name: "Opus One", producer: "Opus One", country: "EUA", region: "Napa Valley", grape: "Cabernet Sauvignon", vintage: 2018, style: "tinto", quantity: 3, purchase_price: 2400, current_value: 2700, rating: 9.3, drink_from: 2026, drink_until: 2036, location: "Adega · A-07", pairing: "Filé mignon, jantar formal" },
    { id: "w11", name: "Barolo Brunate", producer: "Giuseppe Rinaldi", country: "Itália", region: "Piemonte", grape: "Nebbiolo", vintage: 2017, style: "tinto", quantity: 2, purchase_price: 1100, current_value: 1350, rating: 9.2, drink_from: 2027, drink_until: 2040, location: "Adega · B-02", pairing: "Trufa branca, carnes longas" },
    { id: "w12", name: "Sauternes Château Climens", producer: "Château Climens", country: "França", region: "Sauternes", grape: "Sémillon", vintage: 2015, style: "sobremesa", quantity: 2, purchase_price: 680, current_value: 740, rating: 9.0, drink_from: 2023, drink_until: 2045, location: "Geladeira · 3º", pairing: "Foie gras, tortas de frutas" },
    { id: "w13", name: "Chablis Grand Cru Les Clos", producer: "William Fèvre", country: "França", region: "Chablis", grape: "Chardonnay", vintage: 2020, style: "branco", quantity: 4, purchase_price: 620, current_value: 680, rating: 8.9, drink_from: 2024, drink_until: 2030, location: "Geladeira · 2º", pairing: "Frutos do mar, ostras" },
    { id: "w14", name: "Rosé Château d'Esclans", producer: "Château d'Esclans", country: "França", region: "Provença", grape: "Grenache / Cinsault", vintage: 2023, style: "rosé", quantity: 5, purchase_price: 280, current_value: 300, rating: 8.4, drink_from: 2024, drink_until: 2026, location: "Geladeira · 1º", pairing: "Verão, aperitivo" },
    { id: "w15", name: "Dominus Estate", producer: "Dominus Estate", country: "EUA", region: "Napa Valley", grape: "Bordeaux Blend", vintage: 2016, style: "tinto", quantity: 2, purchase_price: 1950, current_value: 2250, rating: 9.3, drink_from: 2023, drink_until: 2036, location: "Adega · A-09", pairing: "Costela braseada" },
  ];

  // Recent consumption events (for chart + last-opened)
  const consumption = [
    { wineId: "w4", wine_name: "Cloudy Bay Sauvignon Blanc", consumed_at: "2026-04-14", occasion: "Jantar casa" },
    { wineId: "w7", wine_name: "Meursault Premier Cru", consumed_at: "2026-04-06", occasion: "Aniversário Ana" },
    { wineId: "w2", wine_name: "Dom Pérignon 2012", consumed_at: "2026-03-28", occasion: "Brinde de promoção" },
    { wineId: "w8", wine_name: "Amarone Masi", consumed_at: "2026-03-12", occasion: "Jantar com pais" },
    { wineId: "w14", wine_name: "Esclans Rosé", consumed_at: "2026-03-02", occasion: "Almoço domingo" },
    { wineId: "w13", wine_name: "Chablis Grand Cru", consumed_at: "2026-02-22", occasion: "Ostras" },
    { wineId: "w1", wine_name: "Château Margaux 2015", consumed_at: "2026-02-08", occasion: "Jantar especial" },
    { wineId: "w4", wine_name: "Cloudy Bay", consumed_at: "2026-01-28", occasion: "Casual" },
    { wineId: "w6", wine_name: "Penfolds Bin 389", consumed_at: "2026-01-15", occasion: "Churrasco" },
    { wineId: "w14", wine_name: "Esclans Rosé", consumed_at: "2025-12-30", occasion: "Reveillon" },
    { wineId: "w2", wine_name: "Dom Pérignon", consumed_at: "2025-12-24", occasion: "Natal" },
    { wineId: "w3", wine_name: "Sassicaia 2017", consumed_at: "2025-11-20", occasion: "Jantar em família" },
  ];

  const countries = Array.from(new Set(wines.map((w) => w.country)));
  const styles = Array.from(new Set(wines.map((w) => w.style)));

  // Computed metrics
  const metrics = (list) => {
    const totalBottles = list.reduce((s, w) => s + w.quantity, 0);
    const totalValue = list.reduce((s, w) => s + (w.current_value || 0) * w.quantity, 0);
    const drinkNow = list.filter((w) => w.quantity > 0 && YEAR >= w.drink_from && YEAR <= w.drink_until).length;
    const inGuard = list.filter((w) => w.quantity > 0 && YEAR < w.drink_from).length;
    const pastPeak = list.filter((w) => w.quantity > 0 && YEAR > w.drink_until).length;
    return { totalBottles, totalValue, drinkNow, inGuard, pastPeak };
  };

  const styleColor = {
    tinto: "#7B1E2B",
    branco: "#C9B469",
    rosé: "#D89BA0",
    espumante: "#B8C49A",
    sobremesa: "#B4793F",
  };

  return { YEAR, wines, consumption, countries, styles, metrics, styleColor };
})();
