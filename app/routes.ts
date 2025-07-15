import {type RouteConfig} from '@remix-run/route-config';
import {flatRoutes} from '@remix-run/fs-routes';

export default [...(await flatRoutes())] satisfies RouteConfig;
