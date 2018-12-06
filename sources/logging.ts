/*
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

import * as bunyan from 'bunyan';
import * as http from 'http';
import * as path from 'path';

import {AppSettings} from './appSettings';

let logger: bunyan.ILogger = null;
let requestLogger: bunyan.ILogger = null;
let jupyterLogger: bunyan.ILogger = null;

/**
 * Gets the logger for generating debug logs.
 * @returns the logger configured for debugging logging.
 */
export function getLogger(): bunyan.ILogger {
  return logger;
}

/**
 * Logs a request and the corresponding response.
 * @param request the request to be logged.
 * @param response the response to be logged.
 */
export function logRequest(request: http.ServerRequest, response: http.ServerResponse): void {
  requestLogger.info({ url: request.url, method: request.method }, 'Received a new request');
  response.on('finish', () => {
    requestLogger.info({ url: request.url, method: request.method, status: response.statusCode });
  });
}

/**
 * Logs the output from Jupyter.
 * @param text the output text to log.
 * @param error whether the text is error text or not.
 */
export function logJupyterOutput(text: string, error: boolean): void {
  // All Jupyter output seems to be generated on stderr, so ignore the
  // error parameter, and log as info...
  jupyterLogger.info(text);
}

/**
 * Initializes loggers used within the application.
 */
export function initializeLoggers(settings: AppSettings): void {
  // We configure our loggers as follows:
  //  * our base logger tags all log records with `"name":"app"`, and sends logs
  //    to stderr (including logs of all children)
  //  * one child logger adds `"type":"request"`, and records method/URL for all
  //    HTTP requests to the app, and method/URL/response code for all responses
  //  * one child logger adds `"type":"jupyter"`, and records all messages from
  //    the jupyter notebook server. These logs are also sent to a file on disk
  //    (to assist user debugging).
  //
  // For more about bunyan, see:
  //   https://github.com/trentm/node-bunyan/tree/f21007d46c0e64072617380b70d3f542368318a8
  const jupyterLogPath =
      path.join(settings.datalabRoot, '/var/log/colab-jupyter.log');
  logger = bunyan.createLogger({
    name: 'app',
    streams: [
      {level: 'debug', type: 'stream', stream: process.stderr},
    ]
  });
  requestLogger = logger.child({type: 'request'});
  // TODO(b/33253129): Enable disk logging unconditionally.
  const jupyterStreams = settings.jupyterDiskLogs ?
      [{level: 'info', type: 'rotating-file', path: jupyterLogPath}] :
      [];
  // TODO(b/33253129): Switch the logging level here to INFO.
  jupyterLogger = logger.child({type: 'jupyter', streams: jupyterStreams});
}
