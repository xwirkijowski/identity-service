import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from 'fs';
import { makeExecutableSchema } from "@graphql-tools/schema";
import { mergeResolvers } from "@graphql-tools/merge";
import { loadFilesSync } from "@graphql-tools/load-files";
import { mergeTypeDefs } from "@graphql-tools/merge";

// Root resolvers
import resolvers from "./schema/resolvers.js";

// `__dirname` workaround for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Root type definitions
const typeDefs = readFileSync(path.join(__dirname, './schema/typeDefs.graphql'), {encoding: 'utf-8'});

// Import resolvers and type definitions from all domains
const resolversArr = loadFilesSync(path.join(__dirname, './schema/**/*.resolvers'), { extensions: ['js']}); // Import
const typeDefsArr = loadFilesSync( path.join(__dirname, './schema/**/*'), { extensions: ['graphql']});

// Create a final schema object form merged root and domain-specific type definitions and their resolvers
export default makeExecutableSchema({
	typeDefs: mergeTypeDefs([typeDefs, typeDefsArr]),
	resolvers: mergeResolvers([resolvers, resolversArr])
}, );