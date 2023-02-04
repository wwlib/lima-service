const dotenv = require('dotenv')
const readline = require("readline")
const axios = require('axios')

dotenv.config()

/*

curl --location --request POST 'http://localhost:8084/metadata'


curl --location --request POST 'http://localhost:8084/auth' \
     --header 'Content-Type: application/json' \
     --data-raw '{
       "accountId": "device1",
       "password": "12345!"
     }'
*/

let authData

async function getAuthData() {
    if (process.env.AUTH_URL && process.env.DEVICE_ACCOUNT_ID && process.env.DEVICE_PASSWORD) {
        return new Promise((resolve, reject) => {
            axios.post(process.env.AUTH_URL, {
                accountId: process.env.DEVICE_ACCOUNT_ID,
                password: process.env.DEVICE_PASSWORD
            },
                {
                    headers: { 'Content-Type': 'application/json' }
                })
                .then(function (response) {
                    // console.log(response)
                    resolve(response.data)
                })
                .catch(function (error) {
                    console.log(error?.message)
                    reject()
                })

        })
    } else {
        throw new Error('Unable to get authData.')
    }
}

async function refreshAuth() {
    authData = await getAuthData()
    console.log(authData)
}

async function callLima(path, body, authData) {
    return new Promise((resolve, reject) => {
        const url = `${process.env.URL}/${path}`
        const contentType = (typeof body === 'string') ? 'text/html' : 'application/json'
        axios.post(`${process.env.URL}/${path}`, body,
            {
                headers: {
                    'Content-Type': contentType,
                    cookie: 'access_token=' + authData.access_token,
                }
            })
            .then(async function (response) {
                if (response.status === 200) {
                    if (response.request?.path === '/signin/') { // i.e. auth expired
                        await refreshAuth()
                        resolve('refreshed auth. try again.')
                    } else {
                        //console.log(response)
                        resolve(response.data)
                    }
                } else {
                    reject(`response.status is not 200`)
                }

            })
            .catch(function (error) {
                console.log(url)
                console.log(body)
                console.log(authData)
                console.log(error?.message)
                reject()
            })
    })
}

let lastTransaction = undefined

async function handleInput(input, authData) {
    let result = undefined
    const args = input.split(':')
    console.log(args)
    switch (args[0]) {
        case 'metadata':
            result = await callLima('metadata', {}, authData)
            console.log(result)
            break
        case 'users':
            result = await callLima('users', {}, authData)
            console.log(result)
            break
        case 'luis':
            result = await callLima('transaction', {
                clientId: 'client-id',
                sessionId: 'session-id',
                input: args[1] || 'i would like to play a game',
                inputData: 'input-data',
                type: 'user',
                serviceType: 'luis',
                appName: 'luis/robo-dispatch',
                accountId: 'accountId-1',
                environment: 'environment',
            }, authData)
            lastTransaction = result.response
            console.log(result)
            break;
        case 'gpt3':
            result = await callLima('transaction', {
                clientId: 'client-id',
                sessionId: 'session-id',
                input: args[1] ? args[1] + '->' : 'do you like ice cream->',
                inputData: 'input-data',
                type: 'user',
                serviceType: 'gpt3text',
                appName: 'gpt3text/robo-chitchat-jan-2023',
                accountId: 'accountId-2',
                environment: 'environment',
            }, authData)
            lastTransaction = result.response
            console.log(result)
            break;
        case 'transactions':
            result = await callLima('transactions', { serviceType: 'gpt3text|luis' }, authData)
            console.log(result)
            break
        case 'annotation':
            console.log(lastTransaction)
            if (lastTransaction) {
                const annotation = {
                    type: 'user',
                    clientId: 'lima-cli',
                    accountId: lastTransaction.id,
                    sessionId: lastTransaction.sessionId,
                    transactionId: lastTransaction.id,
                    status: 'open',
                    issueType: 'wrongAnswer',
                    priority: 'high',
                    assignedTo: 'tbd',
                    // datestamp: undefined,
                    intentId: 'tbd',
                    deidentifiedInput: 'tbd',
                    notes: 'notes',
                    jiraIds: 'jira',
                    appSpecificData: 'appSpecificData',
                    revision: 0,
                }
                result = await callLima('annotation', annotation, authData)
                console.log(result)
            }
            break;
        case 'annotations':
            result = await callLima('annotations', { criteriaString: '*' }, authData)
            console.log(result)
            break
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

const ask = (prompt) => {
    rl.question(prompt, async function (input) {
        if (input === 'quit') {
            process.exit(0)
        } else {
            await handleInput(input, authData)
            ask("> ")
        }
    })
}

async function main() {
    await refreshAuth()
    
    rl.on("close", function () {
        console.log("\nBYE BYE !!!")
        process.exit(0)
    })

    ask("> ")
}

process.on('uncaughtException', function (exception) {
    const errorTimestamp = new Date().toLocaleString()
    console.error(`[${errorTimestamp}] uncaughtException:`, exception);
    ask("> ")
});

process.on('unhandledRejection', (reason, p) => {
    const errorTimestamp = new Date().toLocaleString()
    console.error(`[${errorTimestamp}] unhandledRejection at: Promise`, p, " reason: ", reason);
    ask("> ")
});

main().catch((error) => {
    const errorTimestamp = new Date().toLocaleString()
    console.error(`[${errorTimestamp}] Detected an unrecoverable error. Stopping!`)
    console.error(error)
    ask("> ")
})
