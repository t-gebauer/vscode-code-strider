import * as path from "path"
import * as process from "process"

import { runTests } from "vscode-test"

async function main() {
    try {
        // The folder containing the Extension Manifest package.json
        // Passed to `--extensionDevelopmentPath`
        const extensionDevelopmentPath = path.resolve(__dirname, "../../")

        // The path to test runner
        // Passed to --extensionTestsPath
        const extensionTestsPath = path.resolve(__dirname, "./suite/index")

        // The executable to use. Would automatically download `version` when no path is provided
        const vscodeExecutablePath = `${process.env.CODIUM_PATH}/lib/vscode/codium`

        // Run the integration test
        await runTests({  extensionDevelopmentPath, extensionTestsPath, vscodeExecutablePath })
    } catch (err) {
        console.error(err)
        console.error("Failed to run tests")
        process.exit(1)
    }
}

main()
