// This code was originally generated by the Visual Studio Code extension generator.
// Copyright (c) Microsoft Corporation
// https://github.com/Microsoft/vscode-generator-code

// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import * as path from "path"
import * as Mocha from "mocha"
import * as glob from "glob"

export function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: "bdd",
        color: true,
    })

    const testsRoot = path.resolve(__dirname)

    return new Promise((c, e) => {
        glob("**/**.test.js", { cwd: testsRoot }, (err, files) => {
            if (err) {
                return e(err)
            }

            // Add files to the test suite
            files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)))

            try {
                // Run the mocha test
                mocha.run((failures) => {
                    if (failures > 0) {
                        e(new Error(`${failures} tests failed.`))
                    } else {
                        c()
                    }
                })
            } catch (err) {
                e(err)
            }
        })
    })
}
