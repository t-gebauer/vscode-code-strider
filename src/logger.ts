import { Disposable, OutputChannel, window } from "vscode"
import * as util from 'util'

const contextDelimiter = `-`.repeat(80)

export interface Logger {
    log(message: unknown): void
    context(name: string): void
    show?: () => void
}

export class ConsoleOutLogger implements Logger {
    log(message: unknown) {
        if (typeof message === 'object') {
            message = util.inspect(message)
        }
        console.log(formatMessage(message))
    }
    context(name: string) {
        console.log(contextDelimiter)
        console.log(formatContext(name))
    }
}

export class OutputChannelLogger implements Logger, Disposable {
    outputChannel: OutputChannel

    constructor(channelName: string) {
        this.outputChannel = window.createOutputChannel(channelName)
    }

    dispose() {
        this.outputChannel.dispose()
    }

    context(name: string) {
        this.outputChannel.appendLine(contextDelimiter)
        this.outputChannel.appendLine(formatContext(name))
    }

    log(message: unknown) {
        if (typeof message === 'object') {
            message = util.inspect(message)
        }
        this.outputChannel.appendLine(formatMessage(message))
    }

    show() {
        this.outputChannel.show(true)
    }
}

function formatMessage(message: unknown): string {
    const ms = `${Date.now() % 1000}`.padStart(3, "0")
    return `${ms}| ${message}`
}

function formatContext(name: string): string {
    const now = new Date()
    const hours = now.getHours().toString().padStart(2, "0")
    const minutes = now.getMinutes().toString().padStart(2, "0")
    const seconds = now.getSeconds().toString().padStart(2, "0")
    const ms = now.getMilliseconds().toString().padStart(3, "0")
    return `[${hours}:${minutes}:${seconds}.${ms}] ${name}`
}
