module.exports = {
  apps: [
    {
      name: 'fitnes-client',
      script: 'npm',
      args: 'start',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
