const winston = require('winston');
const { v4: uuidv4 } = require('uuid');

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white'
};

winston.addColors(colors);

const logFormat = winston.format.printf(info => {
    let message = `${info.timestamp} ${info.level}: ${info.message}`;
    if (info.level.includes('error')) {
        message += ` | ID: ${uuidv4()}`;
    }
    return message;
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        logFormat
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({
                    all: true
                }),
                logFormat
            )
        }),
        new winston.transports.File({ filename: 'alerts.log' })
    ]
});

module.exports = logger;
