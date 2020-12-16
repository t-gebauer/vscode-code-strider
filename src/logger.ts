import { Disposable, OutputChannel, window } from "vscode"

const contextDelimiter = `-`.repeat(80)

export interface Logger {
    log(message: string): void
    context(name: string): void
}

export class ConsoleOutLogger implements Logger {
    log(message: string) {
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
        this.outputChannel.show(true)
    }

    dispose() {
        this.outputChannel.dispose()
    }

    context(name: string) {
        this.outputChannel.appendLine(contextDelimiter)
        this.outputChannel.appendLine(formatContext(name))
    }

    log(message: string) {
        this.outputChannel.appendLine(formatMessage(message))
    }
}

function formatMessage(message: string): string {
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
