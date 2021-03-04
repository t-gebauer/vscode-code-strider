// Original source: https://github.com/mochajs/mocha-examples/blob/eae0c4be617dc12b35dfa54b5a1ea568191ffdb0/packages/programmatic-usage/tests/run_mocha.js

import * as fs from "fs"
import * as Mocha from "mocha"
import * as path from "path"

// Instantiate a Mocha with options
const mocha = new Mocha({
    reporter: "list",
})

const testRoot = path.resolve(__dirname, "unit")

fs.readdirSync(testRoot)
    .filter((file) => file.endsWith(".test.js"))
    .forEach((file) => mocha.addFile(path.join(testRoot, file)))

mocha.run(function (failures) {
    process.exitCode = failures ? 1 : 0 // exit with non-zero status if there were failures
})
