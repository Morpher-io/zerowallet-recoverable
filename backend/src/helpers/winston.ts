const { createLogger, format, transports } = require('winston');

const CloudWatchTransport = require('winston-aws-cloudwatch');

const path = require('path');

const mainModuleName = path.basename(process.mainModule.filename);

const logStreamName = mainModuleName;

export const Logger = createLogger({
    level: 'info',
    json: true,
    format: format.combine(
        format.timestamp({
            format: 'DD-MM-YYYY HH:mm:ss'
        }),
        format.simple(),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    defaultMeta: {
        service: logStreamName
    },
    transports: [
        new transports.Console({
            level: 'debug',
            handleExceptions: false
        }),
        new CloudWatchTransport({
            logGroupName: 'morpher-wallet-' + process.env.ENVIRONMENT, // REQUIRED
            logStreamName, // REQUIRED
            createLogGroup: true,
            createLogStream: true,
            submissionInterval: 2000,
            submissionRetryCount: 1,
            batchSize: 1,
            awsConfig: {
                accessKeyId: process.env.ACCESS_KEY_ID,
                secretAccessKey: process.env.ACCESS_KEY_SECRET,
                region: 'eu-central-1'
            },
            formatLog: item => JSON.stringify(item)
        })
    ],
    exitOnError: false
});