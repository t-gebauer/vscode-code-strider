// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { util } from "chai"
import { Disposable, OutputChannel, window } from "vscode"
import { Logger } from "./logger"

export class OutputChannelLogger implements Logger, Disposable {
    outputChannel: OutputChannel

    constructor(channelName: string) {
        this.outputChannel = window.createOutputChannel(channelName)
    }

    dispose() {
        this.outputChannel.dispose()
    }

    context(name: string) {
        this.outputChannel.appendLine(Logger.contextDelimiter)
        this.outputChannel.appendLine(Logger.formatContext(name))
    }

    log(message: unknown) {
        if (typeof message === "object") {
            message = util.inspect(message)
        }
        this.outputChannel.appendLine(Logger.formatMessage(message))
    }

    show() {
        this.outputChannel.show(true)
    }
}
