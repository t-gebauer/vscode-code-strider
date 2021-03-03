// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

export class Delayer {
    private timeoutId?: NodeJS.Timeout

    constructor(private readonly timeout: number) {}

    /** Debounce the execution of `callback`. Discards any previously registered `callback`s. */
    delay(callback: (args: any[]) => void) {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
        }
        this.timeoutId = setTimeout(callback, this.timeout)
    }
}
