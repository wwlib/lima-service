const dotenv = require('dotenv')
const readline = require("readline")
const axios = require('axios')

dotenv.config()

/*

curl --location --request POST 'http://localhost:5005/metadata'


curl --location --request POST 'http://localhost:5005/auth' \
     --header 'Content-Type: application/json' \
     --data-raw '{
       "accountId": "device1",
       "password": "12345!"
     }'
*/

async function getAuthData() {
    if (process.env.TOKEN) {
        return process.env.TOKEN
    } else if (process.env.AUTH_URL && process.env.DEVICE_ACCOUNT_ID && process.env.DEVICE_PASSWORD) {
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
                    console.log(error)
                    reject()
                })

        })
    } else {
        throw new Error('Unable to get authData.')
    }
}

async function callLima(path, body, authData) {
    return new Promise((resolve, reject) => {
        axios.post(`${process.env.URL}/${path}`, body,
            {
                headers: {
                    'Content-Type': 'application/json',
                    cookie: 'access_token=' + authData.access_token,
                }
            })
            .then(function (response) {
                // console.log(response)
                resolve(response.data)
            })
            .catch(function (error) {
                console.log(error)
                reject()
            })
    })
}


async function handleInput(input, authData) {
    let result = undefined
    switch (input) {
        case 'metadata':
            result = await callLima('metadata', {}, authData)
            console.log(result)
            break
        case 'users':
            result = await callLima('users', {}, authData)
            console.log(result)
            break
        case 'transaction':
            result = await callLima('transaction', {
                clientId: 'client-id',
                sessionId: 'session-id',
                input: 'i would like to play a game',
                inputData: 'input-data',
                type: 'user',
                serviceType: 'luis',
                appName: 'luis/robo-dispatch',
                userId: 'user-id',
                environment: 'environment',
            }, authData)
            console.log(result)
            break;
        case 'transactions':
            result = await callLima('transactions', { type: 'user'}, authData)
            console.log(result)
            break
    }
}

async function doIt() {
    const authData = await getAuthData()
    console.log(authData)
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

    rl.on("close", function () {
        console.log("\nBYE BYE !!!")
        process.exit(0)
    })

    ask("> ")
}

doIt()
