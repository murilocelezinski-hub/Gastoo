const { DEFAULT_CATEGORIES } = require('../src/theme');
const phosphor = require('phosphor-react');

describe('Categorias - ícones', () => {
  test('DEFAULT_CATEGORIES sempre possuem icon válido no Phosphor', () => {
    for (const c of DEFAULT_CATEGORIES) {
      expect(typeof c.icon).toBe('string');
      expect(c.icon.length).toBeGreaterThan(0);
      expect(phosphor[c.icon]).toBeDefined();
    }
  });

  test('PRESET_ICONS do modal estão todos disponíveis no Phosphor', () => {
    // Espelha PRESET_ICONS de CategoriesSettingsScreen
    const PRESET_ICONS = [
      'ForkKnife','Car','House','Pill','GameController','Books','TShirt','DeviceMobile',
      'ChartLine','Package','Gift','Lightning','Airplane','Dog','Cat','Coffee','Pizza',
      'FilmSlate','MusicNote','SoccerBall','Receipt','Lightbulb','Wrench','Baby','Briefcase',
      'ShoppingCart','Bicycle','Barbell','PaintBrush','NotePencil','Laptop','Globe','Target',
      'Hamburger','Umbrella','GraduationCap','Key','Sparkle','Camera','Taxi','GasPump','Cake',
      'CreditCard','TrendUp',
    ];
    const missing = PRESET_ICONS.filter((n) => !phosphor[n]);
    expect(missing).toEqual([]);
  });
});
