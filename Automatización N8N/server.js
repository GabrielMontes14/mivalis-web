const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve the dashboard as static files
app.use(express.static(path.join(__dirname, 'dashboard')));

// SPA fallback: all routes serve index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Oceanman dashboard running on port ${PORT}`);
});
