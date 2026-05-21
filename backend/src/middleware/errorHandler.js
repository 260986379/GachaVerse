const winston = require('winston');

const logger = winston.createLogger({
  level: 'error',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

const errorHandler = (err, req, res, next) => {
  logger.error({ message: err.message, stack: err.stack, path: req.path });
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
};

module.exports = errorHandler;
