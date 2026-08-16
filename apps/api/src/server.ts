import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import reportRoutes from './routes/reports';

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(pinoHttp({
  level: process.env.LOG_LEVEL || 'info',
  autoLogging: true
}));

app.use('/api/reports', reportRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  req.log.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An internal error occurred' } });
});

app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});
