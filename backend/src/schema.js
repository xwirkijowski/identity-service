import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from 'fs';
import { makeExecutableSchema } from "@graphql-tools/schema";
import { mergeResolvers } from "@graphql-tools/merge";
import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeTypeDefs } from "@graphql-tools/merge";

import resolvers from "./schema/resolvers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const typeDefs =readFileSync(path.join(__dirname, './schema/typeDefs.graphql'), {encoding: 'utf-8'});

const resolversArr = loadFilesSync(path.join(__dirname, './schema/**/*.resolvers'), { extensions: ['js']});
const typeDefsArr = loadFilesSync( path.join(__dirname, './schema/**/*'), { extensions: ['graphql']});

export default makeExecutableSchema({
	typeDefs: mergeTypeDefs([typeDefs, typeDefsArr]),
	resolvers: mergeResolvers([resolvers, resolversArr])
}, );