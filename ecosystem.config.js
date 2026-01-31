module.exports = {
  apps: [
    {
      name: 'pms-api',
      script: 'current/dist/main.js',
      exec_mode: 'fork',
      instances: 1,
      env_file: './shared/.env',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
