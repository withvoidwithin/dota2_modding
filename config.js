const path = require("path");
const ROOT = __dirname;

module.exports = {
    DATA_DIR:      path.join(ROOT, "docs", "data"),
    MANIFEST_PATH: path.join(ROOT, "docs", "manifest.json"),
};