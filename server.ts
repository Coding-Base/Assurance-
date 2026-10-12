import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn } from 'child_process';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '10mb' }));

  // Python Solver Health Endpoint
  app.get('/api/v1/health', (req, res) => {
    res.json({
      status: 'healthy',
      runtime: 'Full-Stack Express + Python 3.10 Engine + Django REST Framework Schema',
      port: PORT,
    });
  });

  // Run Python Physics Test Suite
  app.get('/api/v1/python-test', (req, res) => {
    const pythonProc = spawn('python3', [path.resolve(process.cwd(), 'backend/test_solver.py')]);
    let output = '';
    let errorOutput = '';

    pythonProc.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProc.on('close', (code) => {
      res.json({
        exitCode: code,
        passed: code === 0,
        output: output + errorOutput,
      });
    });
  });

  // Main Simulation Route: Executes real Python Beggs & Brill Solver
  app.post('/api/v1/simulations/run', (req, res) => {
    const payload = req.body;

    if (!payload || !payload.network_chain) {
      return res.status(400).json({ error: 'Missing network_chain in simulation request payload' });
    }

    const scriptPath = path.resolve(process.cwd(), 'backend/run_solver.py');
    const pythonProc = spawn('python3', [scriptPath]);

    let stdoutData = '';
    let stderrData = '';

    pythonProc.stdin.write(JSON.stringify(payload));
    pythonProc.stdin.end();

    pythonProc.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    pythonProc.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    pythonProc.on('close', (code) => {
      if (code === 0) {
        try {
          const parsed = JSON.parse(stdoutData);
          return res.json({
            ...parsed,
            engine: 'Python 3.10 Beggs & Brill Solver (Django Backend Protocol)',
          });
        } catch (parseErr) {
          return res.status(500).json({
            error: 'Failed to parse Python solver JSON response',
            raw: stdoutData,
          });
        }
      } else {
        console.error('Python solver process failed:', stderrData);
        return res.status(500).json({
          error: 'Python solver execution error',
          details: stderrData,
        });
      }
    });
  });

  // Vite middleware in development
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SubseaFlow CAD Platform running on http://0.0.0.0:${PORT}`);
    console.log(`🐍 Python 3 Beggs & Brill solver active at POST /api/v1/simulations/run`);
  });
}

startServer().catch((err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});
