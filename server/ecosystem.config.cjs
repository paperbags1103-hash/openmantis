module.exports = {
  apps: [{
    name: 'clawire-server',
    script: 'dist/index.js',
    cwd: __dirname,
    env: { NODE_ENV: 'production' },
    restart_delay: 5000,
    max_restarts: 10,
  }]
};
