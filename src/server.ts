import compression from "compression";
import { CustomError, IErrorResponse, winstonLogger } from "@ezexedge/helper-social-app";
import http from 'http';

import { Application, json, urlencoded ,Response , NextFunction , Request } from "express";
import cookieSession from 'cookie-session';
import cors from 'cors';
import hpp from 'hpp';
import helmet from 'helmet';
import { Logger } from "winston";
import { StatusCodes } from "http-status-codes";
import { config } from "./config";
import { appRoutes } from "./routes";
import { elasticSearch } from "./elasticsearch";

const SERVER_PORT = 4000;
//const DEFAULT_ERROR_CODE = 500;
const log: Logger = winstonLogger(`${config.ELASTIC_SEARCH_URL}`, 'apiGatewayServer', 'debug');

export class GatewayServer {
    private app: Application;
  
    constructor(app: Application) {
      this.app = app;
    }
  
    public start(): void {
      this.securityMiddleware(this.app);
      this.standardMiddleware(this.app);
      this.routesMiddleware(this.app);
      this.startElasticSearch();
      this.errorHandler(this.app);
      this.startServer(this.app);
    }

    private securityMiddleware(app: Application): void {
        app.set('trust proxy', 1);
        app.use(
          cookieSession({
            name: 'session',
            keys: [],
            maxAge: 24 * 7 * 3600000,
            secure: config.NODE_ENV !== 'development',
            ...(config.NODE_ENV !== 'development' && {
             // sameSite: 'none'
            })
          })
        );
        app.use(hpp());
        app.use(helmet());
        app.use(cors({
          origin: config.CLIENT_URL,
          credentials: true,
          methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
        }));
    
     
      }

      private errorHandler(app: Application): void {
        app.use('*', (req: Request, res: Response, next: NextFunction) => {
          const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
          log.log('error', `${fullUrl} endpoint does not exist.`, '');
          res.status(StatusCodes.NOT_FOUND).json({ message: 'The endpoint called does not exist.'});
          next();
        });
    
        app.use((error: IErrorResponse, _req: Request, res: Response, next: NextFunction) => {
          if (error instanceof CustomError) {
            log.log('error', `GatewayService ${error.comingFrom}:`, error);
            res.status(error.statusCode).json(error.serializeErrors());
          }
    
       next()
        })
      }
    
    
    
      private standardMiddleware(app: Application): void {
        app.use(compression());
        app.use(json({ limit: '200mb' }));
        app.use(urlencoded({ extended: true, limit: '200mb' }));
      }

      private startElasticSearch(): void {
          elasticSearch.checkConnection();
      }
    
    
      private routesMiddleware(app: Application): void {
        appRoutes(app);
      }
      private async startServer(app: Application): Promise<void> {
        try {
          const httpServer: http.Server = new http.Server(app);
          this.startHttpServer(httpServer);
        } catch (error) {
          log.log('error', 'GatewayService startServer() error method:', error);
        }
      }
    
    
    
      private async startHttpServer(httpServer: http.Server): Promise<void> {
        try {
          log.info(`Gateway server has started with process id ${process.pid}`);
          httpServer.listen(SERVER_PORT, () => {
            log.info(`Gateway server running on port ${SERVER_PORT}`);
          });
        } catch (error) {
          log.log('error', 'GatewayService startServer() error method:', error);
        }
      }
    
}  