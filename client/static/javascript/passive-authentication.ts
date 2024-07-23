import { initPassiveLogin, onload } from "./authentication.ts";

onload.push(initPassiveLogin);
