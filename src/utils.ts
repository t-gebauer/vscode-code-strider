export class Delayer {
    private timeoutId?: NodeJS.Timeout

    constructor(private readonly timeout: number) {}

    delay(callback: (args: any[]) => void) {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId)
        }
        this.timeoutId = setTimeout(callback, this.timeout)
    }
}