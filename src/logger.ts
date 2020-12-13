import { Disposable, OutputChannel, window } from "vscode"

const contextDelimiter = `-`.repeat(80)

export class Logger implements Disposable {
    outputChannel: OutputChannel

    constructor(channelName: string) {
        this.outputChannel = window.createOutputChannel(channelName)
        this.outputChannel.show(true)
    }

    dispose() {
        this.outputChannel.dispose()
    }

    debugContext(name: string) {
        this.outputChannel.appendLine(contextDelimiter)
        const now = new Date()
        const hours = now.getHours().toString().padStart(2, "0")
        const minutes = now.getMinutes().toString().padStart(2, "0")
        const seconds = now.getSeconds().toString().padStart(2, "0")
        const ms = now.getMilliseconds().toString().padStart(3, "0")
        this.outputChannel.appendLine(`[${hours}:${minutes}:${seconds}.${ms}] ${name}`)
    }

    debug(message: string) {
        const ms = `${Date.now() % 1000}`.padStart(3, "0")
        this.outputChannel.appendLine(`${ms}| ${message}`)
    }
}
