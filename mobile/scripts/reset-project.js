const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Remove generated folders
['node_modules', '.expo', 'android', 'ios'].forEach(dir => {
  const full = path.join(root, dir);
  if (fs.existsSync(full)) {
    console.log(`Removing ${dir}...`);
    fs.rmSync(full, { recursive: true, force: true });
  }
});

console.log('Cleaned. Run npm install to reinstall.');
