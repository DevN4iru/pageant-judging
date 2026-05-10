const app = require('./legacy/server');

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
