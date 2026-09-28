/**
 * Express application setup.
 *
 * PRD §61 (Security): helmet for baseline HTTP security headers, CORS
 * restricted to known client origins (§92/§93 environment strategy),
 * morgan for request logging, cookie-parser for httpOnly auth cookies
 * (§30). Central error handling (§72) is attached last so it can catch
 * anything thrown anywhere upstream.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
    credentials: true, // required so httpOnly auth cookies are sent cross-origin (public/admin subdomains)
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (!env.isTest) {
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'safarup-backend', env: env.nodeEnv });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
