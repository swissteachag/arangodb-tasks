import tl = require('azure-pipelines-task-lib/task');
import axios from 'axios';
import process = require('process');
import { readFileSync, readdirSync } from 'fs';

async function run() {
    try {
        
        const requiredVersion = '20'; // specify the required major version
        const currentVersion = process.versions.node.split('.')[0];
        
        if (currentVersion !== requiredVersion) {
          console.error(`Error: Custom task requires Node.js version ${requiredVersion}, but current version is ${currentVersion}.`);
          process.exit(1);
        }


        const baseURL: string | undefined = tl.getInput('arangobbServer', true);
        const username: string | undefined = tl.getInput('username', true);
        const password: string | undefined = tl.getInput('password', true);
        const database: string | undefined = tl.getInput('database', true);
        const collection: string | undefined = tl.getInput('collection', true);
        const dropDocuments: boolean | undefined = tl.getBoolInput('dropDocuments', true);
        const soureFolder: string | undefined = tl.getInput('soureFolder', true);
        const contents: string | undefined = tl.getInput('contents', true);

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
        let arangoDBBearer: string | undefined;
        const auth_response = await axios.post(baseURL + '/_system' +'/_open/auth', {
            "username": username,
            "password": password
        });

        if (auth_response.status === 200 && auth_response.data) {
            arangoDBBearer = auth_response.data.jwt;
        }
        else {
            tl.setResult(tl.TaskResult.Failed, 'No response from server');
            return;
        };

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
        let docKeys: string | undefined;
        const allDocs_response = await axios.post(baseURL + '/' + database + '/_api/cursor', {
            "query": "FOR doc IN " + collection + " RETURN doc._key"
        }, axiosconfig);

        if (allDocs_response && allDocs_response.data) {
            docKeys =  allDocs_response.data.result;
        }
        else {
            tl.setResult(tl.TaskResult.Failed, 'No response from server');
            return;        
        };

        // ================================================================================

        // Delete documents if dropDocuments is set to true ===============================
        if (dropDocuments) 
            {
                const deleteDocs_response = await axios.delete(baseURL + '/' + database + '/_api/document/' + collection, {
                    data: docKeys,
                    headers: axiosconfig.headers
                });

                if (deleteDocs_response && deleteDocs_response.data) {
                    console.log(`Deletion status: ${deleteDocs_response.data}`);
                }
                else {
                    tl.setResult(tl.TaskResult.Failed, 'No response from server');
                    return;
                };
            }
        // ================================================================================

        // Read and create documents ======================================================
        const file = readdirSync(soureFolder).filter((allFilesPaths:string) => 
        allFilesPaths.match(RegExp("\\" + contents + "$")) !== null);

        for (const docfile of file) {
            try {
                const fileContents = readFileSync(soureFolder + docfile, 'utf8');
                const createdoc_response = await axios.post(baseURL + '/' + database + '/_api/document/' + collection, {
                    "contents": JSON.parse(fileContents)
                }, axiosconfig);

                console.log(createdoc_response);
                
            } catch (err) {
                tl.setResult(tl.TaskResult.Failed, (err as Error).message);
            }
        }
        // ================================================================================

    }
    catch (err) {
        tl.setResult(tl.TaskResult.Failed, (err as Error).message);
    }
}

run();