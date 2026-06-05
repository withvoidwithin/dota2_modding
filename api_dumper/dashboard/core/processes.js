const { exec } = require("child_process");

function checkProcesses(callback) {
    exec("tasklist", (err, stdout) => {
        if (err) return callback(err, null);

        callback(null, {
            dota: stdout.includes("dota2.exe"),
            vconsole: stdout.includes("vconsole2.exe"),
        });
    });
}

module.exports = { checkProcesses };