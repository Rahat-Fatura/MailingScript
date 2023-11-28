const XSLX = require("xlsx");

class Utils {
    static get() {
        return "utils";
    }

    xslxToJson(fileName) {
        const workbook = XSLX.readFile(fileName);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XSLX.utils.sheet_to_json(sheet);
        return data;
    }

    saveToExcel(fileName, data) {
        const workbook = XSLX.utils.book_new();
        const sheet = XSLX.utils.json_to_sheet(data);
        XSLX.utils.book_append_sheet(workbook, sheet, "Sheet1");
        XSLX.writeFile(workbook, fileName);
    }
}

module.exports = Utils;
