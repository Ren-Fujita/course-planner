const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');

function loadRuntime() {
  const order = JSON.parse(fs.readFileSync(path.join(root, 'source-order.json'), 'utf8'));
  const persistencePath = path.join(root, 'src/core/persistence.js');
  return {
    data: fs.readFileSync(path.join(root, 'data/courses.json'), 'utf8'),
    engineSource: fs.readFileSync(path.join(root, 'src/domain/engine.js'), 'utf8'),
    persistenceSource: fs.existsSync(persistencePath) ? fs.readFileSync(persistencePath, 'utf8') : '',
    applicationSource: order.map(file => fs.readFileSync(path.join(root, 'src', file), 'utf8')).join('\n\n'),
  };
}

module.exports = { root, loadRuntime };
