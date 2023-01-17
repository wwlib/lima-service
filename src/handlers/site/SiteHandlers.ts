import { Request, Response, Handler } from 'express'
import { AuthRequest } from '@types'
import { StatusCodes } from 'http-status-codes'
import { Model } from '@model'

const fs = require('fs-extra')
const path = require('path')

// handlebars templates are loaded by WebPack using handlebars-loader
// https://www.npmjs.com/package/handlebars-loader
// see webpack.config.js for handlebars-loader config
const signin_handlebars = require('./signin.handlebars.html');
const dashboard_handlebars = require('./dashboard.handlebars.html');
const console_handlebars = require('./console.handlebars.html');

export class SiteHandlers {

    static redirectToDashboardHandler: Handler = async (req: AuthRequest, res: Response) => {
        res.status(StatusCodes.OK).redirect('/dashboard/');
    }

    static redirectToConsoleHandler: Handler = async (req: AuthRequest, res: Response) => {
        res.status(StatusCodes.OK).redirect('/console/');
    }

    static signinHandler: Handler = async (req: AuthRequest, res: Response) => {
        console.log('signinHandler')
        Model.getInstance().onRequest()
        res.status(StatusCodes.OK).send(SiteHandlers.getSigninContent(req.auth?.accountId))
    }

    static getSigninContent(accountId?: string) {
        return signin_handlebars({ accountId: accountId })
    }

    static dashboardHandler: Handler = async (req: AuthRequest, res: Response) => {
        console.log('dashboardHandler')
        Model.getInstance().onRequest()
        res.status(StatusCodes.OK).send(SiteHandlers.getDashboardContent(req.auth?.accountId))
    }

    static getDashboardContent(accountId?: string) {
        const data = []
        for (let i=0; i<7; i++) {
            data.push(15000 + Math.floor(Math.random()*5000))
        }
        return dashboard_handlebars({ linkStates: { dashboard: 'active', console: '' }, accountId: accountId, requestCount: Model.getInstance().requestCount, chartData: data.join(',') })
    }

    static consoleHandler: Handler = async (req: AuthRequest, res: Response) => {
        console.log('consoleHandler')
        Model.getInstance().onRequest()
        const command: string = req.query?.command ? `${req.query?.command}` : ''
        let summary = ''
        let details = ''
        if (command === 'reset') {
            Model.getInstance().resetRequestCount()
            summary = 'Model:resetRequestCount.'
            details = 'requestCount reset successfully.'
        }
        res.status(StatusCodes.OK).send(SiteHandlers.getConsoleContent(req.auth?.accountId, command, summary, details))
    }

    static getConsoleContent(accountId: string | undefined, command: string, summary: string, details: string) {
        return console_handlebars({ linkStates: { dashboard: '', console: 'active' }, accountId: accountId, command, requestCount: Model.getInstance().requestCount, summary, details })
    }

    static limaAppHandler: Handler = async (req: AuthRequest, res: Response) => {
        console.log(`limaAppHandler: ${req.originalUrl}, ${req.baseUrl}, ${req.path}`)
        Model.getInstance().onRequest() // analytics
        const fileUrl = req.baseUrl + req.path
        const appPath = process.env.LIMA_APP_PATH
        const timestamp = new Date().toLocaleString()

        if (__dirname && appPath && fileUrl) {
            const filePath = path.join(__dirname, appPath, 'build', fileUrl)
            if (fs.existsSync(filePath)) {
                console.log(`limaAppHandler: [${timestamp}] Sending ${filePath}`)
                try {
                    res.status(StatusCodes.OK).sendFile(filePath)
                } catch (error) {
                    console.error(`limaAppHandler: [${timestamp}] Error sending ${filePath}:  LIMA_APP index.html, __dirname: ${__dirname}, appPath: ${appPath}, requested url: ${req.originalUrl}`)
                    console.error(error)
                    res.status(StatusCodes.NOT_FOUND).send('Error: 404 (Not found)')
                }
            } else {
                console.error(`limaAppHandler: [${timestamp}] Error file not found: ${filePath}, __dirname: ${__dirname}, appPath: ${appPath}, requested url: ${req.originalUrl}`)
                res.status(StatusCodes.NOT_FOUND).send('Error: 404 (Not found)')
            }
        }
    }

    static forbiddenHandler: Handler = async (req: AuthRequest, res: Response) => {
        console.log('forbiddenHandler')
        Model.getInstance().onRequest()
        res.status(StatusCodes.OK).json({ error: 'Forbidden.' })
    }
}
