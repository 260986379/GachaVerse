const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

const errorHandler = (err, req, res, next) => {
  logger.error({ message: err.message, stack: err.stack, path: req.path });
  const status = err.status || 500;
  // Only errors raised deliberately (with an explicit status) carry user-facing
  // messages. Anything else — pg errors, driver failures, bugs — may leak schema
  // detail, so the client gets a generic message and the logs keep the rest.
  const safe = err.status ? err.message : 'Internal Server Error';
  res.status(status).json({ message: safe || 'Internal Server Error' });
};

module.exports = errorHandler;
