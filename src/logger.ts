import { Disposable, OutputChannel, window } from "vscode"

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
        this.debugText(`[${Date.now()}] ${name}`)
    }

    debug(message: string) {
        this.debugText(`  ${message}`)
    }

    private debugText(message: string) {
        this.outputChannel.appendLine(message)
    }
}

