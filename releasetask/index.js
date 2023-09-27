"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tl = require("azure-pipelines-task-lib/task");
const axios_1 = __importDefault(require("axios"));
const process = require("process");
const fs_1 = require("fs");
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const requiredVersion = '18'; // specify the required major version
            const currentVersion = process.versions.node.split('.')[0];
            if (currentVersion !== requiredVersion) {
                console.error(`Error: Custom task requires Node.js version ${requiredVersion}, but current version is ${currentVersion}.`);
                process.exit(1);
            }
            const baseURL = tl.getInput('arangoDbServer', true);
            const username = tl.getInput('username', true);
            const password = tl.getInput('password', true);
            const database = tl.getInput('database', true);
            const collection = tl.getInput('collection', true);
            const dropDocuments = tl.getBoolInput('dropDocuments', true);
            const soureFolder = tl.getInput('soureFolder', true);
            const contents = tl.getInput('contents', true);
            if (!baseURL) {
                tl.setResult(tl.TaskResult.Failed, 'Base URL is required');
                return;
            }
            if (!username) {
                tl.setResult(tl.TaskResult.Failed, 'Username is required');
                return;
            }
            if (!password) {
                tl.setResult(tl.TaskResult.Failed, 'Password is required');
                return;
            }
            if (!database) {
                tl.setResult(tl.TaskResult.Failed, 'Database is required');
                return;
            }
            if (!collection) {
                tl.setResult(tl.TaskResult.Failed, 'Collection is required');
                return;
            }
            if (!soureFolder) {
                tl.setResult(tl.TaskResult.Failed, 'Source folder is required');
                return;
            }
            if (!contents) {
                tl.setResult(tl.TaskResult.Failed, 'Contents is required');
                return;
            }
            // Authorization - Get Bearer Token ==============================================
            let arangoDBBearer;
            const auth_response = yield axios_1.default.post(baseURL + '/_system' + '/_open/auth', {
                "username": username,
                "password": password
            });
            if (auth_response.status === 200 && auth_response.data) {
                arangoDBBearer = auth_response.data.jwt;
            }
            else {
                tl.setResult(tl.TaskResult.Failed, 'No response from server');
                return;
            }
            ;
            // ================================================================================
            // Set Axios header ===============================================================
            const axiosconfig = {
                headers: {
                    "Authorization": `Bearer ${arangoDBBearer}`,
                    "Content-Type": "application/json",
                },
            };
            // ================================================================================
            // Get all documents from collection ==============================================
            let docKeys;
            const allDocs_response = yield axios_1.default.post(baseURL + '/' + database + '/_api/cursor', {
                "query": "FOR doc IN " + collection + " RETURN doc._key"
            }, axiosconfig);
            if (allDocs_response && allDocs_response.data) {
                docKeys = allDocs_response.data.result;
            }
            else {
                tl.setResult(tl.TaskResult.Failed, 'No response from server');
                return;
            }
            ;
            // ================================================================================
            // Delete documents if dropDocuments is set to true ===============================
            if (dropDocuments) {
                const deleteDocs_response = yield axios_1.default.delete(baseURL + '/' + database + '/_api/document/' + collection, {
                    data: docKeys,
                    headers: axiosconfig.headers
                });
                if (deleteDocs_response && deleteDocs_response.data) {
                    console.log(`Deletion status: ${deleteDocs_response.data}`);
                }
                else {
                    tl.setResult(tl.TaskResult.Failed, 'No response from server');
                    return;
                }
                ;
            }
            // ================================================================================
            // Read and create documents ======================================================
            const file = (0, fs_1.readdirSync)(soureFolder).filter((allFilesPaths) => allFilesPaths.match(RegExp("\\" + contents + "$")) !== null);
            for (const docfile of file) {
                try {
                    const fileContents = (0, fs_1.readFileSync)(soureFolder + docfile, 'utf8');
                    const createdoc_response = yield axios_1.default.post(baseURL + '/' + database + '/_api/document/' + collection, {
                        "contents": JSON.parse(fileContents)
                    }, axiosconfig);
                    console.log(createdoc_response);
                }
                catch (err) {
                    tl.setResult(tl.TaskResult.Failed, err.message);
                }
            }
            // ================================================================================
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, err.message);
        }
    });
}
run();
