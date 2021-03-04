// Copyright 2021 Timo Gebauer
// GNU General Public License version 3.0 (or later)
// See COPYING or https://www.gnu.org/licenses/gpl-3.0.txt

import { expect } from "chai"
import * as vscode from "vscode"
import { toSelection } from "../../utilities/conversion-utilities"
import { waitUntilExtensionReady, executeCommand } from "../integration-test-utils"

describe("Editing Commands", () => {
    const source = `<html>
        <body>
        </body>
        <div attribute="value">
            text inside
        </div>
        Text behind
    </html>`

    let editor: vscode.TextEditor
    let document: vscode.TextDocument

    beforeEach(async () => {
        document = await vscode.workspace.openTextDocument({ language: "html", content: source })
        editor = await vscode.window.showTextDocument(document)
        const state = await waitUntilExtensionReady()
        expect(editor.selection).to.deep.equal(toSelection(state.currentNode))
        expect(document.getText(editor.selection)).to.equal("<html>")
    })

    describe("targeting the div element", () => {
        beforeEach(async () => {
            await executeCommand("move-down")
            await executeCommand("move-down")
        })

        it("slurp left", async () => {
            await executeCommand("slurp-left")
            expect(document.getText()).to.match(
                /.+html.+div.+body.+\/body.+text inside.+\/div.+Text behind.+\/html.+/s
            )
        })

        it("slurp right", async () => {
            await executeCommand("slurp-right")
            expect(document.getText()).to.match(
                /.+html.+body.+\/body.+div.+text inside.+Text behind.+\/div.+\/html.+/s
            )
        })

        it("barf left", async () => {
            await executeCommand("barf-left")
            expect(document.getText()).to.match(
                /.+html.+body.+\/body.+text inside.+div attr.+\/div.+Text behind.+\/html.+/s
            )
        })

        it("barf right", async () => {
            await executeCommand("barf-right")
            expect(document.getText()).to.match(
                /.+html.+body.+\/body.+div.+\/div.+text inside.+Text behind.+\/html.+/s
            )
        })
    })
})
