# Virtual Ecosystem Simulation

A predator–prey–plant simulation that runs in your browser. Herbivores roam, eat plants and reproduce; carnivores hunt the herbivores; plants grow back. Watch the populations oscillate — and sometimes collapse.

## Estado del revival (2026-10)

- **🧠 Motor separado de la UI**: `src/simulation.js` es puro JavaScript (cero DOM, cero dependencias). La UI (`src/main.js`) solo renderiza y escucha eventos.
- **🧪 12 tests** con `node --test` (runner nativo, sin dependencias): herbívoros comen, carnívoros cazan, muertes por energía/edad, reproducción con cooldown, cap de plantas, colapso, reproducibilidad con RNG sembrado.
- **💉 RNG inyectable**: tests deterministas; la UI usa `Math.random`.
- **🔬 Simulación headless verificada**: 500 días sin NaN, poblaciones estables (plantas saturando el cap de 500).
- **🚀 Deploy a GitHub Pages** vía workflow (`node --test` corre como gate antes de publicar).
- **✨ UX nueva**: selector de velocidad (0.5×–8×), click en el canvas para spawnear herbívoros, botón muestra "Collapsed" cuando el ecosistema muere.

## Live

Disponible en GitHub Pages tras mergear a `main` (workflow incluido).

## Estructura

```
ecosystem/
├── index.html                  # markup + Tailwind por CDN (sin build)
├── src/
│   ├── simulation.js           # motor puro: plantas, criaturas, step()
│   └── main.js                 # canvas + DOM + loop de 100ms
├── test/
│   └── simulation.test.js      # 12 tests deterministas
└── .github/workflows/
    └── pages.yml               # test + deploy a GitHub Pages
```

## Uso local

Abrí `index.html` con un server estático (los módulos ES necesitan HTTP, no `file://`):

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

## Tests

```bash
node --test
```

## Parámetros del modelo

| Parámetro | Default | Efecto |
|---|---|---|
| `initialHerbivores` | 20 | población inicial |
| `initialCarnivores` | 5 | población inicial |
| `initialPlants` | 100 | población inicial |
| `plantGrowthRate` | 2/día | nuevas plantas por tick |
| `PLANTS_MAX` | 500 | tope de plantas |
| energía herbívoro | come planta: +20 | reproduce >150 (cuesta 50) |
| energía carnívoro | come presa: +50% de su energía | reproduce >200 (cuesta 100) |
| vida máxima | 300 días | muerte por vejez |

**Nota honesta del modelo**: con plantas saturando el cap, los herbívoros tienen comida casi infinita y la población crece sin control clásico depredador-presa. Es el comportamiento del diseño original — para dinámicas más interesantes habría que bajar `plantGrowthRate` o añadir competencia.

## Licencia

MIT — ver [LICENSE](LICENSE).

## Autor

[FernandoMay](https://github.com/FernandoMay)
