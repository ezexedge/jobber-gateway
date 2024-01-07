import { Application } from "express";
import { healthRoutes } from '@gateway/routes/health';

export const appRoutes = (app: Application) => {
    console.log("sss11")
    app.use('', healthRoutes.routes());

  };