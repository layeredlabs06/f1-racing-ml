# F1 Racing ML 🏎️

Neural network-powered cars that learn to race around a track using neuroevolution.

![Demo](demo.gif)

## How It Works

**Neural Network Architecture:**
- **Input:** 5 distance sensors (normalized 0-1)
- **Hidden Layer:** 4 neurons with tanh activation
- **Output:** 2 values — steering (-1 to 1) and acceleration (-1 to 1)

**Evolution:**
- 30 cars race simultaneously
- Top 20% survive each generation
- Children inherit parent weights + random mutations
- Cars that go off-track or get stuck are eliminated

## Run Locally

```bash
# Just open index.html in your browser
open index.html

# Or use a local server
python -m http.server 8000
# Then visit http://localhost:8000
```

## Tech Stack

- [p5.js](https://p5js.org/) — Canvas rendering
- Vanilla JavaScript — Neural network & genetic algorithm

## License

MIT
