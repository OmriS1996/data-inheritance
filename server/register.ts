import { Strapi } from "@strapi/strapi";
import middlewares from "./middlewares";

export default ({ strapi }: { strapi: Strapi }) => {
  // registeration phase
  strapi.server.use(middlewares.dataInherit);
};
